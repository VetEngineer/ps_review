"""
Flask API 서버 - 리뷰 감정 분석 API
Railway, Render, Fly.io 등에 배포 가능
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import re
import json
import logging
import tempfile
import os
from pathlib import Path
from typing import Optional, Dict, List, Tuple
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# 로깅 설정 (import 전에 설정)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# analyse.py의 함수들을 import
# 같은 디렉토리에 있으므로 직접 import 가능
try:
    from analyse import (
        preprocess,
        rating_to_score,
        load_sentiment_model,
        analyze_text_sentiment,
        calculate_hybrid_sentiment,
        load_data,
        match_keywords,
        aggregate_by_keyword,
        get_app_name,
        HF_AVAILABLE
    )
except ImportError as e:
    logger.error(f"analyse.py 모듈을 import할 수 없습니다: {e}")
    logger.error("현재 디렉토리:", os.path.dirname(os.path.abspath(__file__)))
    raise

app = Flask(__name__)
# CORS 설정 - 모든 origin 허용 (프로덕션에서는 특정 origin만 허용하도록 수정 권장)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# 전역 변수: 감성분석 모델 (한 번만 로드)
_sentiment_pipeline = None


def initialize_model():
    """서버 시작 시 모델 로드"""
    global _sentiment_pipeline

    # Render/FREE 플랜 메모리 절약: 기본적으로 HF 모델 로딩을 끔
    enable_hf = os.environ.get("ENABLE_HF", "false").lower() == "true"
    if not enable_hf:
        logger.info("환경변수 ENABLE_HF=false로 설정됨. HuggingFace 모델 로드를 건너뜁니다.")
        return

    if HF_AVAILABLE and _sentiment_pipeline is None:
        try:
            logger.info("감성분석 모델 초기화 중...")
            _sentiment_pipeline = load_sentiment_model(use_gpu=False)
            if _sentiment_pipeline:
                logger.info("감성분석 모델 로드 완료")
            else:
                logger.warning("감성분석 모델 로드 실패 - 별점 기반 분석만 사용")
        except Exception as e:
            logger.error(f"모델 초기화 오류: {e}")
            _sentiment_pipeline = None


@app.route('/health', methods=['GET'])
def health_check():
    """헬스 체크 엔드포인트"""
    return jsonify({
        'status': 'healthy',
        'hf_available': HF_AVAILABLE,
        'model_loaded': _sentiment_pipeline is not None
    }), 200


@app.route('/analyze', methods=['POST'])
def analyze_reviews():
    """
    리뷰 분석 API 엔드포인트
    
    요청 형식:
    - reviews: CSV 파일 (multipart/form-data)
    - keywords: CSV 파일 (multipart/form-data, 필수)
    
    응답 형식:
    {
        "success": true,
        "data": [
            {
                "keyword": "렉",
                "total_reviews": 10,
                "avg_sentiment": -0.5,
                "positive_count": 0,
                "negative_count": 8,
                "neutral_count": 2,
                "sentiment_label": "negative",
                "app_name": "com.example.app"
            }
        ]
    }
    """
    try:
        # 파일 확인
        if 'keywords' not in request.files:
            return jsonify({
                'error': '키워드 파일이 필요합니다.',
                'success': False
            }), 400
        
        keywords_file = request.files['keywords']
        reviews_file = request.files.get('reviews', None)
        
        if keywords_file.filename == '':
            return jsonify({
                'error': '키워드 파일이 비어있습니다.',
                'success': False
            }), 400
        
        logger.info(f'파일 수신: keywords={keywords_file.filename}, reviews={reviews_file.filename if reviews_file else "없음"}')
        
        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            # 파일 저장
            keywords_path = os.path.join(temp_dir, 'keywords.csv')
            keywords_file.save(keywords_path)
            logger.info(f'키워드 파일 저장: {keywords_path}')
            
            reviews_path = None
            if reviews_file and reviews_file.filename:
                reviews_path = os.path.join(temp_dir, 'reviews.csv')
                reviews_file.save(reviews_path)
                logger.info(f'리뷰 파일 저장: {reviews_path}')
            else:
                # 기본 reviews.csv 사용 (프로젝트 루트에서 찾기)
                default_reviews = os.path.join(os.path.dirname(__file__), 'reviews.csv')
                if os.path.exists(default_reviews):
                    reviews_path = default_reviews
                    logger.info(f'기본 리뷰 파일 사용: {reviews_path}')
                else:
                    return jsonify({
                        'error': '리뷰 파일이 업로드되지 않았고 기본 reviews.csv 파일도 찾을 수 없습니다.',
                        'success': False
                    }), 400
            
            # 데이터 로드
            logger.info('데이터 로드 중...')
            reviews, keywords = load_data(reviews_path, keywords_path)
            
            # 앱 이름 추출
            app_name = get_app_name(reviews)
            logger.info(f'앱 이름: {app_name}')
            
            # 전처리
            logger.info('리뷰 텍스트 전처리 중...')
            reviews['clean_text'] = reviews['text'].apply(preprocess)
            reviews = reviews[reviews['clean_text'].str.len() > 0]
            
            # 감정 스코어 계산
            logger.info('감정 스코어 계산 중...')
            reviews['rating_score'] = reviews['rating'].apply(rating_to_score)
            
            # 텍스트 분석 (HuggingFace)
            if HF_AVAILABLE and _sentiment_pipeline:
                logger.info('텍스트 기반 감성분석 수행 중...')
                texts = reviews['clean_text'].tolist()
                text_scores_list = []
                
                for i, text in enumerate(texts):
                    if (i + 1) % 100 == 0:
                        logger.info(f'텍스트 분석 진행 중: {i+1}/{len(texts)}')
                    
                    score = analyze_text_sentiment(text, _sentiment_pipeline)
                    text_scores_list.append(score)
                
                reviews['text_score'] = text_scores_list
                logger.info('텍스트 분석 완료')
            else:
                reviews['text_score'] = None
                logger.info('별점 기반 분석만 수행')
            
            # 하이브리드 스코어 계산
            logger.info('하이브리드 감정 스코어 계산 중...')
            reviews['sentiment_score'] = reviews.apply(
                lambda row: calculate_hybrid_sentiment(
                    row['rating_score'],
                    row.get('text_score'),
                    rating_weight=0.4,
                    text_weight=0.6
                ),
                axis=1
            )
            
            # 키워드 매칭
            logger.info('키워드 매칭 중...')
            kw_df = match_keywords(reviews, keywords)
            
            if kw_df.empty:
                return jsonify({
                    'error': '키워드 매칭 결과가 없습니다. 키워드나 리뷰 데이터를 확인해주세요.',
                    'success': False
                }), 400
            
            # 키워드별 집계
            logger.info('키워드별 집계 중...')
            summary = aggregate_by_keyword(kw_df)
            
            # 앱 이름 추가
            summary['app_name'] = app_name
            
            # DataFrame을 JSON으로 변환
            result_data = summary.to_dict('records')
            
            logger.info(f'분석 완료: {len(result_data)}개 키워드')
            
            return jsonify({
                'success': True,
                'data': result_data,
                'message': '분석이 완료되었습니다.'
            }), 200
            
    except FileNotFoundError as e:
        logger.error(f'파일을 찾을 수 없습니다: {e}')
        return jsonify({
            'error': f'파일을 찾을 수 없습니다: {str(e)}',
            'success': False
        }), 404
        
    except ValueError as e:
        logger.error(f'데이터 검증 오류: {e}')
        return jsonify({
            'error': f'데이터 검증 오류: {str(e)}',
            'success': False
        }), 400
        
    except Exception as e:
        logger.error(f'분석 중 오류 발생: {e}', exc_info=True)
        return jsonify({
            'error': f'분석 중 오류가 발생했습니다: {str(e)}',
            'success': False
        }), 500


if __name__ == '__main__':
    # 모델 초기화
    initialize_model()
    
    # 서버 실행
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f'서버 시작: port={port}, debug={debug}')
    app.run(host='0.0.0.0', port=port, debug=debug)
