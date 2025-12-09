"""
Flask API 서버 - 리뷰 감정 분석 API
Railway, Render, Fly.io 등에 배포 가능

환경 변수:
- PORT: 서버 포트 (기본값: 5000)
- DEBUG: 디버그 모드 (기본값: False)
- ENABLE_HF: HuggingFace 모델 사용 여부 (기본값: True, 감정 분석 필수)
- GEMINI_API_KEY: Gemini API 키 (앱 소개 요약 및 감정 분석 기능용)
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

# .env 파일 로드
try:
    from dotenv import load_dotenv
    load_dotenv()
    logger.info(".env 파일 로드 완료")
except ImportError:
    logger.warning("python-dotenv 패키지가 설치되지 않았습니다. .env 파일을 자동으로 로드할 수 없습니다.")

# 환경 변수 확인 및 로깅 (디버깅용)
logger.info("=" * 60)
logger.info("환경 변수 확인 시작")
logger.info("=" * 60)

# 모든 환경 변수 키 목록 (디버깅용, 민감한 값은 제외)
all_env_keys = sorted(os.environ.keys())
logger.info(f"총 환경 변수 개수: {len(all_env_keys)}")

# GEMINI 관련 환경 변수 확인
gemini_related = [k for k in all_env_keys if 'GEMINI' in k.upper() or ('GOOGLE' in k.upper() and 'API' in k.upper())]
if gemini_related:
    logger.info(f"✓ Gemini 관련 환경 변수 발견: {gemini_related}")
    for key in gemini_related:
        value = os.environ.get(key, '')
        if value:
            logger.info(f"  - {key}: 길이={len(value)}자, 시작={value[:15]}...")
        else:
            logger.warning(f"  - {key}: 값이 비어있음")
else:
    logger.warning("✗ Gemini 관련 환경 변수를 찾을 수 없습니다.")

# GEMINI_API_KEY 직접 확인
gemini_key_check = os.environ.get('GEMINI_API_KEY')
if gemini_key_check and gemini_key_check.strip():
    logger.info(f"✓ GEMINI_API_KEY가 설정되어 있습니다. (길이: {len(gemini_key_check)}자, 시작: {gemini_key_check[:15]}...)")
else:
    logger.warning("✗ GEMINI_API_KEY가 설정되지 않았거나 비어있습니다.")
    logger.warning("💡 Railway Variables에서 다음을 확인하세요:")
    logger.warning("   1. 서비스 레벨에서 Variables 탭 확인 (프로젝트 레벨이 아닌)")
    logger.warning("   2. 변수 이름이 정확히 'GEMINI_API_KEY'인지 확인 (대소문자 구분)")
    logger.warning("   3. 값이 비어있지 않은지 확인")
    logger.warning("   4. 저장 후 재배포 확인")

logger.info("=" * 60)

# Gemini API import
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai 패키지가 설치되지 않았습니다. Gemini API 기능을 사용할 수 없습니다.")

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
_model_loading_lock = None
_model_loading_failed = False  # 모델 로딩 실패 플래그 (재시도 방지)

# threading 모듈 import (thread-safe 모델 로딩용)
try:
    import threading
    _model_loading_lock = threading.Lock()
except ImportError:
    logger.warning("threading 모듈을 import할 수 없습니다. thread-safe 모델 로딩이 비활성화됩니다.")


def initialize_model():
    """서버 시작 시 모델 로드 (thread-safe, 메모리 안전)"""
    global _sentiment_pipeline, _model_loading_failed

    # 이미 로드되었거나 실패한 경우 스킵
    if _sentiment_pipeline is not None:
        return
    if _model_loading_failed:
        logger.debug("모델 로딩이 이전에 실패했습니다. 재시도하지 않습니다.")
        return

    # 기본적으로 HuggingFace 모델 로딩 비활성화 (Gemini API 사용 권장)
    # 메모리 문제를 피하기 위해 기본값을 false로 변경
    enable_hf = os.environ.get("ENABLE_HF", "false").lower() == "true"
    if not enable_hf:
        logger.info("HuggingFace 모델 로딩이 비활성화되어 있습니다. Gemini API를 사용합니다.")
        logger.info("💡 HuggingFace 모델을 사용하려면 Railway Variables에서 ENABLE_HF=true로 설정하세요.")
        _model_loading_failed = True  # 의도적으로 비활성화된 경우도 플래그 설정
        return
    
    # Thread-safe 모델 로딩
    if _model_loading_lock:
        with _model_loading_lock:
            # Lock 획득 후 다시 확인 (다른 스레드가 이미 로드했을 수 있음)
            if _sentiment_pipeline is not None or _model_loading_failed:
                return
            _load_model_internal()
    else:
        # Lock이 없으면 직접 로드
        if _sentiment_pipeline is None and not _model_loading_failed:
            _load_model_internal()


def _load_model_internal():
    """내부 모델 로딩 함수 (메모리 안전, 재시도 방지)"""
    global _sentiment_pipeline, _model_loading_failed
    
    if not HF_AVAILABLE:
        logger.warning("HuggingFace를 사용할 수 없습니다. 별점 기반 분석만 사용합니다.")
        _model_loading_failed = True
        return
    
    try:
        logger.info("감성분석 모델 초기화 중...")
        logger.info("⚠️ 모델 로딩은 메모리를 많이 사용합니다. Railway 메모리 제한에 주의하세요.")
        
        # 메모리 부족 시 OSError나 MemoryError 발생 가능
        # 또한 프로세스가 SIGKILL로 종료될 수 있으므로 타임아웃 고려 필요
        _sentiment_pipeline = load_sentiment_model(use_gpu=False)
        
        if _sentiment_pipeline:
            logger.info("✓ 감성분석 모델 로드 완료")
        else:
            logger.warning("✗ 감성분석 모델 로드 실패 - 별점 기반 분석만 사용")
            _model_loading_failed = True
            
    except (OSError, MemoryError) as e:
        logger.error(f"✗ 모델 초기화 중 메모리 부족 오류: {e}")
        logger.warning("별점 기반 분석만 사용합니다. Railway 메모리 제한을 확인하세요.")
        logger.warning("💡 해결 방법: Railway 플랜 업그레이드 또는 ENABLE_HF=false 설정")
        _sentiment_pipeline = None
        _model_loading_failed = True  # 재시도 방지
        
    except Exception as e:
        logger.error(f"✗ 모델 초기화 오류: {e}")
        logger.warning("별점 기반 분석만 사용합니다.")
        _sentiment_pipeline = None
        _model_loading_failed = True  # 재시도 방지


def analyze_sentiment_with_gemini(text: str) -> Optional[float]:
    """
    Gemini API를 사용하여 텍스트 감정 분석 수행
    
    Args:
        text: 분석할 텍스트
        
    Returns:
        -1.0 (부정) ~ 1.0 (긍정) 사이의 감정 스코어, None (분석 실패)
    """
    if not text or not text.strip():
        return 0.0
    
    # Gemini API 키 확인 (여러 방법 시도)
    gemini_api_key = (
        os.environ.get('GEMINI_API_KEY') or 
        os.environ.get('GEMINI_API') or
        os.environ.get('GOOGLE_API_KEY')
    )
    
    if not gemini_api_key:
        logger.debug("GEMINI_API_KEY가 설정되지 않았습니다. 감정 분석을 건너뜁니다.")
        return None
    
    # API 키가 비어있거나 공백만 있는 경우
    if not gemini_api_key.strip():
        logger.warning("GEMINI_API_KEY가 비어있습니다.")
        return None
    
    if not GEMINI_AVAILABLE:
        logger.debug("google-generativeai 패키지가 설치되지 않았습니다. 감정 분석을 건너뜁니다.")
        return None
    
    try:
        # Gemini API 설정
        genai.configure(api_key=gemini_api_key)
        
        # 모델 선택 (gemini-1.5-flash가 더 빠르고 경제적)
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
        except Exception:
            model = genai.GenerativeModel('gemini-pro')
        
        # 감정 분석 프롬프트
        prompt = f"""다음 리뷰 텍스트의 감정을 분석해주세요. 
텍스트가 긍정적인지 부정적인지 판단하여 -1.0 (매우 부정)부터 1.0 (매우 긍정) 사이의 숫자로만 응답해주세요.
소수점 한 자리까지 표시해주세요. (예: 0.5, -0.3, 1.0, -1.0)

리뷰 텍스트:
{text}

감정 점수 (-1.0 ~ 1.0):"""
        
        # API 호출
        generation_config = {
            "temperature": 0.1,  # 낮은 temperature로 일관된 결과
            "top_p": 0.8,
            "top_k": 40,
        }
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        # 응답에서 숫자 추출
        result_text = response.text.strip()
        
        # 숫자 추출 (정규식 사용)
        numbers = re.findall(r'-?\d+\.?\d*', result_text)
        
        if numbers:
            score = float(numbers[0])
            # 범위 제한 (-1.0 ~ 1.0)
            score = max(-1.0, min(1.0, score))
            return score
        else:
            logger.warning(f"Gemini 감정 분석 응답에서 숫자를 찾을 수 없습니다: {result_text}")
            return None
        
    except Exception as e:
        logger.error(f"Gemini 감정 분석 실패: {e}")
        return None


def summarize_app_intro(intro_text: str) -> str:
    """
    Gemini API를 사용하여 앱 소개 텍스트를 200자 내외의 한국어로 요약
    
    Args:
        intro_text: 앱 소개 텍스트
        
    Returns:
        200자 내외의 한국어 요약 텍스트
    """
    if not intro_text or not intro_text.strip():
        return "앱 소개 정보가 없습니다."
    
    # Gemini API 키 확인 (여러 방법 시도)
    gemini_api_key = (
        os.environ.get('GEMINI_API_KEY') or 
        os.environ.get('GEMINI_API') or
        os.environ.get('GOOGLE_API_KEY')
    )
    
    if not gemini_api_key or not gemini_api_key.strip():
        logger.warning("GEMINI_API_KEY가 설정되지 않았습니다. 원본 텍스트를 반환합니다.")
        logger.warning("💡 Railway Variables에서 GEMINI_API_KEY를 확인하세요.")
        # 원본이 너무 길면 앞부분만 반환
        if len(intro_text) > 200:
            return intro_text[:197] + "..."
        return intro_text
    
    if not GEMINI_AVAILABLE:
        logger.warning("google-generativeai 패키지가 설치되지 않았습니다. 원본 텍스트를 반환합니다.")
        if len(intro_text) > 200:
            return intro_text[:197] + "..."
        return intro_text
    
    try:
        # Gemini API 설정
        genai.configure(api_key=gemini_api_key)
        
        # 모델 선택 (gemini-pro 또는 gemini-1.5-flash)
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
        except Exception:
            # fallback to gemini-pro
            model = genai.GenerativeModel('gemini-pro')
        
        # 요약 프롬프트 (한국어로 강제)
        prompt = f"""다음 앱 소개 텍스트를 200자 내외의 간결한 한국어로 요약해주세요. 
반드시 한국어로만 작성해주세요. 영어나 다른 언어를 사용하지 마세요.
핵심 기능과 특징만 포함하고, 불필요한 설명은 제외해주세요.

앱 소개:
{intro_text}

요약 (한국어로만 작성):"""
        
        # API 호출 (한국어 응답 강제)
        generation_config = {
            "temperature": 0.3,
            "top_p": 0.8,
            "top_k": 40,
        }
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        # 응답 추출
        summary = response.text.strip()
        
        # 응답이 영어인지 확인하고 재요청
        if summary and not any('\uac00' <= char <= '\ud7a3' for char in summary[:50]):
            # 한국어 문자가 없으면 다시 요청
            logger.warning("응답이 영어로 나왔습니다. 한국어로 재요청합니다.")
            prompt_korean = f"""Summarize the following app description in Korean language only (한국어로만). 
Write in 200 characters or less. Focus on core features and characteristics.

App description:
{intro_text}

Summary (한국어로만):"""
            response = model.generate_content(prompt_korean, generation_config=generation_config)
            summary = response.text.strip()
        
        # 길이 제한 (200자 내외)
        if len(summary) > 220:
            summary = summary[:217] + "..."
        
        logger.info(f"앱 소개 요약 완료: 원본 {len(intro_text)}자 -> 요약 {len(summary)}자")
        return summary
        
    except Exception as e:
        logger.error(f"Gemini API 요약 실패: {e}", exc_info=True)
        # 에러 발생 시 원본 텍스트 반환 (길이 제한)
        if len(intro_text) > 200:
            return intro_text[:197] + "..."
        return intro_text


@app.route('/health', methods=['GET'])
def health_check():
    """헬스 체크 엔드포인트 - 모델 로딩 전에도 빠르게 응답"""
    # 헬스체크는 모델 로딩 없이도 즉시 응답 (Railway 헬스체크 타임아웃 방지)
    # 모델 로딩은 백그라운드에서 비동기로 수행하거나 첫 실제 요청 시 수행됨
    return jsonify({
        'status': 'healthy',
        'hf_available': HF_AVAILABLE,
        'model_loaded': _sentiment_pipeline is not None,
        'gemini_available': GEMINI_AVAILABLE,
        'crawler_available': CRAWLER_AVAILABLE
    }), 200


# 크롤링 모듈 import
CRAWLER_AVAILABLE = False
search_apps = None
get_app_reviews = None
get_multiple_app_reviews = None
merge_app_info_and_reviews = None

try:
    logger.info("크롤링 모듈 import 시도 중...")
    from playstore_crawler import (
        search_apps,
        get_app_reviews,
        get_multiple_app_reviews,
        merge_app_info_and_reviews
    )
    CRAWLER_AVAILABLE = True
    logger.info("✓ 크롤링 기능이 활성화되었습니다.")
except ImportError as e:
    logger.error(f"✗ playstore_crawler.py 모듈을 import할 수 없습니다: {e}")
    logger.warning("크롤링 기능이 비활성화됩니다.")
    CRAWLER_AVAILABLE = False
    # 더미 함수 정의 (에러 방지)
    def search_apps(*args, **kwargs):
        logger.error("크롤링 기능이 비활성화되어 있습니다. playstore_crawler 모듈을 확인하세요.")
        return []
    def get_app_reviews(*args, **kwargs):
        return []
    def get_multiple_app_reviews(*args, **kwargs):
        import pandas as pd
        return pd.DataFrame()
    def merge_app_info_and_reviews(*args, **kwargs):
        import pandas as pd
        return pd.DataFrame()
except Exception as e:
    logger.error(f"✗ playstore_crawler 모듈 로드 중 예상치 못한 오류: {e}", exc_info=True)
    logger.warning("크롤링 기능이 비활성화됩니다.")
    CRAWLER_AVAILABLE = False
    # 더미 함수 정의
    def search_apps(*args, **kwargs):
        logger.error("크롤링 기능이 비활성화되어 있습니다.")
        return []
    def get_app_reviews(*args, **kwargs):
        return []
    def get_multiple_app_reviews(*args, **kwargs):
        import pandas as pd
        return pd.DataFrame()
    def merge_app_info_and_reviews(*args, **kwargs):
        import pandas as pd
        return pd.DataFrame()

# 최종 상태 로깅
logger.info(f"크롤링 기능 상태: CRAWLER_AVAILABLE = {CRAWLER_AVAILABLE}")


@app.route('/api/search-apps', methods=['POST'])
def search_apps_endpoint():
    """
    앱 검색 API 엔드포인트
    
    요청 형식:
    {
        "keyword": "스도쿠",
        "max_results": 30  # 선택사항, 기본값: 30
    }
    
    응답 형식:
    {
        "success": true,
        "apps": [
            {
                "app_id": "com.example.app",
                "title": "앱 이름",
                "img_link": "https://...",
                "intro": "앱 소개",
                "rate": "4.5",
                "download": "1000000"
            }
        ],
        "count": 10
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'keyword' not in data:
            return jsonify({
                'error': '키워드가 필요합니다.',
                'success': False
            }), 400
        
        keyword = data['keyword'].strip()
        if not keyword:
            return jsonify({
                'error': '키워드를 입력해주세요.',
                'success': False
            }), 400
        
        max_results = data.get('max_results', 30)
        
        logger.info(f'앱 검색 요청: keyword={keyword}, max_results={max_results}')
        
        # 크롤링 기능 확인
        if not CRAWLER_AVAILABLE:
            return jsonify({
                'error': '크롤링 기능이 비활성화되어 있습니다. playstore_crawler 모듈을 확인하세요.',
                'success': False
            }), 503
        
        apps = search_apps(keyword, max_results=max_results)
        
        return jsonify({
            'success': True,
            'apps': apps,
            'count': len(apps)
        }), 200
        
    except Exception as e:
        logger.error(f'앱 검색 오류: {e}', exc_info=True)
        return jsonify({
            'error': f'앱 검색 중 오류가 발생했습니다: {str(e)}',
            'success': False
        }), 500


@app.route('/api/get-app-reviews', methods=['POST'])
def get_app_reviews_endpoint():
    """
    앱 리뷰 수집 API 엔드포인트
    
    요청 형식:
    {
        "app_ids": ["com.example.app1", "com.example.app2"],
        "max_reviews": 150,  # 선택사항, 기본값: 150
        "months": 6  # 선택사항, 기본값: 6
    }
    
    응답 형식:
    {
        "success": true,
        "reviews": [
            {
                "reviewId": "...",
                "content": "리뷰 내용",
                "score": 5,
                "date": "2024-01-01",
                "app_id": "com.example.app"
            }
        ],
        "count": 150
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'app_ids' not in data:
            return jsonify({
                'error': 'app_ids가 필요합니다.',
                'success': False
            }), 400
        
        app_ids = data['app_ids']
        if not isinstance(app_ids, list) or len(app_ids) == 0:
            return jsonify({
                'error': 'app_ids는 비어있지 않은 리스트여야 합니다.',
                'success': False
            }), 400
        
        max_reviews = data.get('max_reviews', 150)
        months = data.get('months', 6)
        
        logger.info(f'리뷰 수집 요청: app_ids={app_ids}, max_reviews={max_reviews}, months={months}')
        
        reviews_df = get_multiple_app_reviews(
            app_ids=app_ids,
            max_reviews_per_app=max_reviews,
            months=months
        )
        
        if reviews_df.empty:
            return jsonify({
                'success': True,
                'reviews': [],
                'count': 0,
                'message': '수집된 리뷰가 없습니다.'
            }), 200
        
        # DataFrame을 JSON으로 변환
        reviews_list = reviews_df.to_dict('records')
        
        return jsonify({
            'success': True,
            'reviews': reviews_list,
            'count': len(reviews_list)
        }), 200
        
    except Exception as e:
        logger.error(f'리뷰 수집 오류: {e}', exc_info=True)
        return jsonify({
            'error': f'리뷰 수집 중 오류가 발생했습니다: {str(e)}',
            'success': False
        }), 500


@app.route('/api/search-and-collect', methods=['POST'])
def search_and_collect_endpoint():
    """
    앱 검색 및 리뷰 수집 통합 API 엔드포인트
    
    요청 형식:
    {
        "keyword": "스도쿠",
        "max_apps": 10,  # 선택사항, 기본값: 10
        "max_reviews": 150,  # 선택사항, 기본값: 150
        "months": 6  # 선택사항, 기본값: 6
    }
    
    응답 형식:
    {
        "success": true,
        "apps": [...],  # 앱 정보
        "reviews": [...],  # 리뷰 데이터
        "app_count": 10,
        "review_count": 1500
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'keyword' not in data:
            return jsonify({
                'error': '키워드가 필요합니다.',
                'success': False
            }), 400
        
        keyword = data['keyword'].strip()
        if not keyword:
            return jsonify({
                'error': '키워드를 입력해주세요.',
                'success': False
            }), 400
        
        max_apps = data.get('max_apps', 10)
        max_reviews = data.get('max_reviews', 150)
        months = data.get('months', 6)
        
        logger.info(f'통합 검색 및 수집 요청: keyword={keyword}, max_apps={max_apps}, max_reviews={max_reviews}')
        
        # 크롤링 기능 확인
        if not CRAWLER_AVAILABLE:
            return jsonify({
                'error': '크롤링 기능이 비활성화되어 있습니다. playstore_crawler 모듈을 확인하세요.',
                'success': False
            }), 503
        
        # 1. 앱 검색
        apps = search_apps(keyword, max_results=max_apps)
        
        if not apps:
            return jsonify({
                'success': True,
                'apps': [],
                'reviews': [],
                'app_count': 0,
                'review_count': 0,
                'message': '검색된 앱이 없습니다.'
            }), 200
        
        # 1.5. 각 앱의 소개를 Gemini API로 요약하여 ai_summary 추가
        logger.info(f'{len(apps)}개 앱의 소개 요약 시작...')
        for app in apps:
            intro_text = app.get('intro', '')
            if intro_text:
                app['ai_summary'] = summarize_app_intro(intro_text)
            else:
                app['ai_summary'] = f'{keyword} 관련 앱입니다.'
        logger.info('앱 소개 요약 완료')
        
        # 2. 앱 ID 추출
        app_ids = [app['app_id'] for app in apps]
        
        # 3. 리뷰 수집
        reviews_df = get_multiple_app_reviews(
            app_ids=app_ids,
            max_reviews_per_app=max_reviews,
            months=months
        )
        
        # 4. 앱 정보와 리뷰 병합
        app_info_df = pd.DataFrame(apps)
        merged_df = merge_app_info_and_reviews(app_info_df, reviews_df)
        
        # 5. 결과 변환
        reviews_list = merged_df.to_dict('records') if not merged_df.empty else []
        
        return jsonify({
            'success': True,
            'apps': apps,
            'reviews': reviews_list,
            'app_count': len(apps),
            'review_count': len(reviews_list)
        }), 200
        
    except Exception as e:
        logger.error(f'통합 검색 및 수집 오류: {e}', exc_info=True)
        return jsonify({
            'error': f'검색 및 수집 중 오류가 발생했습니다: {str(e)}',
            'success': False
        }), 500


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
    # HuggingFace 모델 로딩 제거 - Gemini API만 사용
    # 메모리 문제를 피하기 위해 HuggingFace 모델은 사용하지 않음
    # Gemini API가 없으면 별점 기반 분석만 사용
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
                logger.info('감정 스코어 계산 중...')
                
                # Gemini API를 사용한 감정 분석 시도 (여러 환경 변수 이름 확인)
                gemini_api_key = (
                    os.environ.get('GEMINI_API_KEY') or 
                    os.environ.get('GEMINI_API') or
                    os.environ.get('GOOGLE_API_KEY')
                )
                use_gemini = gemini_api_key and gemini_api_key.strip() and GEMINI_AVAILABLE
                
                if gemini_api_key:
                    logger.info(f"✓ Gemini API 키 발견 (길이: {len(gemini_api_key)}자)")
                else:
                    logger.warning("✗ Gemini API 키를 찾을 수 없습니다. 별점 기반 분석만 사용합니다.")
                    logger.warning("💡 Railway Variables에서 GEMINI_API_KEY를 확인하세요.")
                
                if use_gemini:
                    logger.info('Gemini API를 사용하여 감정 분석 수행 중...')
                    logger.info(f'총 {len(reviews)}개 리뷰 분석 예정')
                    
                    sentiment_scores = []
                    total_reviews = len(reviews)
                    gemini_success_count = 0
                    gemini_fail_count = 0
                    
                    for idx, row in reviews.iterrows():
                        # 진행 상황 로깅 (50개마다)
                        if (idx + 1) % 50 == 0:
                            logger.info(f'감정 분석 진행 중: {idx+1}/{total_reviews} (Gemini 성공: {gemini_success_count}, 실패: {gemini_fail_count})')
                        
                        text = row.get('text', '') or row.get('content', '')
                        rating = row.get('rating', 3)
                        rating_score = rating_to_score(rating) if 'rating' in row else 0.0
                        
                        if text and len(text.strip()) > 0:
                            # Gemini로 감정 분석 시도
                            gemini_score = analyze_sentiment_with_gemini(text)
                            
                            if gemini_score is not None:
                                gemini_success_count += 1
                                # 하이브리드 스코어: Gemini 70%, 별점 30%
                                hybrid_score = gemini_score * 0.7 + rating_score * 0.3
                                sentiment_scores.append(hybrid_score)
                            else:
                                gemini_fail_count += 1
                                # Gemini 실패 시 별점만 사용
                                sentiment_scores.append(rating_score)
                        else:
                            # 텍스트가 없으면 별점만 사용
                            sentiment_scores.append(rating_score)
                    
                    reviews['sentiment_score'] = sentiment_scores
                    logger.info(f'Gemini 기반 감정 분석 완료: 성공 {gemini_success_count}개, 실패 {gemini_fail_count}개, 별점만 사용 {total_reviews - gemini_success_count - gemini_fail_count}개')
                else:
                    # Gemini를 사용할 수 없으면 별점 기반으로만 계산
                    logger.info('Gemini API를 사용할 수 없습니다. 별점 기반 감정 분석만 수행합니다.')
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


# Gunicorn을 사용할 때는 이 블록이 실행되지 않음
# 하지만 개발 환경이나 직접 실행할 때를 위해 유지
if __name__ == '__main__':
    # 모델 초기화
    initialize_model()
    
    # 서버 실행
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f'서버 시작: port={port}, debug={debug}')
    app.run(host='0.0.0.0', port=port, debug=debug)

# Gunicorn 사용 시: 모델 로딩은 지연 로딩 방식으로 처리됨
# - 헬스체크는 모델 로딩 없이도 즉시 응답 가능
# - 실제 분석 요청 시 필요하면 자동으로 모델 로드됨
# - 메모리 절약 및 서버 시작 시간 단축
