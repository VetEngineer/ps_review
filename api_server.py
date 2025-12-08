"""
Flask API 서버 - 리뷰 감정 분석 API
Railway, Render, Fly.io 등에 배포 가능

환경 변수:
- PORT: 서버 포트 (기본값: 5000)
- DEBUG: 디버그 모드 (기본값: False)
- ENABLE_HF: HuggingFace 모델 사용 여부 (기본값: False)
- GEMINI_API_KEY: Gemini API 키 (추후 자연어 검색 기능용)
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
        match_keyword_groups,
        aggregate_by_keyword_group,
        get_app_name,
        get_keyword_groups_df,
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


# ============================================================================
# 추후 확장 예정 API 엔드포인트 (PRD 요구사항)
# ============================================================================
# 
# @app.route('/search', methods=['POST'])
# def natural_language_search():
#     """
#     자연어 검색 API 엔드포인트 (추후 구현 예정)
#     
#     요청 형식:
#     {
#         "query": "아이패드에서 필기감 좋고 PDF 내보내기 무료인 노트 앱 찾아줘",
#         "weights": {
#             "광고": 80,
#             "과금": 90,
#             ...
#         }
#     }
#     
#     응답 형식:
#     {
#         "success": true,
#         "apps": [
#             {
#                 "app_name": "com.example.app1",
#                 "ai_score": 8.5,
#                 "pros": ["장점1", "장점2", "장점3"],
#                 "cons": ["단점1", "단점2"],
#                 "features": {
#                     "PDF 내보내기": "O",
#                     "무료": "O",
#                     ...
#                 }
#             }
#         ]
#     }
#     """
#     # 추후 Gemini API 통합 예정
#     # gemini_api_key = os.environ.get('GEMINI_API_KEY')
#     pass
#
#
# @app.route('/compare', methods=['POST'])
# def compare_apps():
#     """
#     앱 비교 API 엔드포인트 (추후 구현 예정)
#     
#     여러 앱의 리뷰 데이터를 받아 비교표 형태로 반환
#     """
#     pass


@app.route('/analyze', methods=['POST'])
def analyze_reviews():
    """
    리뷰 분석 API 엔드포인트
    
    요청 형식:
    - reviews_data: CSV 파일 (multipart/form-data, 필수)
      - 전처리된 리뷰 데이터 (reviewId, content, score, app_ids 등 포함)
    
    응답 형식:
    {
        "success": true,
        "data": [
            {
                "keyword_group": "광고",
                "keyword": "광고",
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
        # 리뷰 데이터 파일 확인
        if 'reviews_data' not in request.files:
            return jsonify({
                'error': '전처리된 리뷰 데이터 파일이 필요합니다.',
                'success': False
            }), 400
        
        reviews_file = request.files['reviews_data']
        if not reviews_file.filename:
            return jsonify({
                'error': '전처리된 리뷰 데이터 파일이 비어있습니다.',
                'success': False
            }), 400
        
        logger.info(f'파일 수신: reviews_data={reviews_file.filename}')
        
        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            # 키워드 그룹 데이터 로드 (코드에 하드코딩된 딕셔너리 사용)
            logger.info('키워드 그룹 데이터 로드 중...')
            keyword_groups = get_keyword_groups_df()
            logger.info(f'키워드 그룹 데이터 로드 완료: {len(keyword_groups)}개')
            
            # 전처리된 리뷰 데이터 파일 저장 및 로드
            reviews_path = os.path.join(temp_dir, 'reviews_data.csv')
            reviews_file.save(reviews_path)
            logger.info(f'리뷰 데이터 파일 저장: {reviews_path}')
            
            # CSV를 읽어서 DataFrame으로 변환
            reviews = pd.read_csv(reviews_path)
            logger.info(f'리뷰 데이터 로드 완료: {len(reviews)}개')
            
            # 컬럼명 매핑 (output_merge.csv 구조에 맞춤)
            column_mapping = {
                'reviewId': 'review_id',
                'content': 'text',
                'score': 'rating',
                'app_ids': 'app_id'
            }
            
            # 컬럼명 변경
            reviews = reviews.rename(columns=column_mapping)
            
            # 필수 컬럼 검증
            required_cols = ['review_id']
            missing_cols = [col for col in required_cols if col not in reviews.columns]
            if missing_cols:
                return jsonify({
                    'error': f'리뷰 데이터에 필수 컬럼이 없습니다: {missing_cols}',
                    'success': False
                }), 400
            
            # text 컬럼이 없으면 content 컬럼 사용
            if 'text' not in reviews.columns and 'content' in reviews.columns:
                reviews['text'] = reviews['content']
            
            # rating이 없으면 score 사용
            if 'rating' not in reviews.columns and 'score' in reviews.columns:
                reviews['rating'] = reviews['score']
            
            # 앱 이름 추출 (리뷰 데이터에 app_id가 있는 경우)
            app_name = 'unknown_app'
            if 'app_id' in reviews.columns and not reviews['app_id'].isna().all():
                app_id = reviews['app_id'].mode()[0] if len(reviews['app_id'].mode()) > 0 else reviews['app_id'].iloc[0]
                app_name = str(app_id)
            logger.info(f'앱 이름: {app_name}')
            
            # 텍스트 전처리 (키워드 매칭을 위해)
            if 'text' in reviews.columns:
                logger.info('리뷰 텍스트 전처리 중...')
                reviews['clean_text'] = reviews['text'].apply(preprocess)
                reviews = reviews[reviews['clean_text'].str.len() > 0]
            else:
                reviews['clean_text'] = ''
            
            # 감정 스코어 계산 (전처리된 데이터에 이미 있을 수 있음)
            if 'sentiment_score' not in reviews.columns:
                # sentiment_score가 없으면 rating 기반으로 계산
                if 'rating' in reviews.columns:
                    reviews['sentiment_score'] = reviews['rating'].apply(rating_to_score)
                else:
                    return jsonify({
                        'error': '리뷰 데이터에 sentiment_score 또는 rating 컬럼이 필요합니다.',
                        'success': False
                    }), 400
            
            # 키워드 그룹별 매칭 및 집계
            logger.info('키워드 그룹별 매칭 및 집계 중...')
            kw_df = match_keyword_groups(reviews, keyword_groups)
            
            if kw_df.empty:
                return jsonify({
                    'error': '키워드 그룹 매칭 결과가 없습니다. 키워드 그룹이나 리뷰 데이터를 확인해주세요.',
                    'success': False
                }), 400
            
            # 키워드 그룹별 집계
            logger.info('키워드 그룹별 집계 중...')
            summary = aggregate_by_keyword_group(kw_df)
            
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
