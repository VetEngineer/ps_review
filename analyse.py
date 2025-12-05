import pandas as pd
import re
import json
import logging
import argparse
from pathlib import Path
from typing import Optional, Dict, List, Tuple
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# 키워드 그룹 정의
KEYWORD_GROUPS = {
    "광고": ["광고", "ad", "애드"],
    "난이도": ["난이도", "레벨", "difficulty", "쉬움", "어려움"],
    "과금": ["과금", "결제", "유료", "돈", "아이템"],
    "오류": ["오류", "버그", "튕김", "멈춤", "강제종료"],
    "UI": ["UI", "디자인", "화면", "레이아웃", "색감"],
    "기능 다양성": ["타임어택", "챌린지", "기록", "저장", "모드"]
}


def get_keyword_groups_df() -> pd.DataFrame:
    """
    키워드 그룹 딕셔너리를 DataFrame으로 변환
    
    Returns:
        keyword_group과 keyword 컬럼을 가진 DataFrame
    """
    rows = []
    for keyword_group, keywords in KEYWORD_GROUPS.items():
        for keyword in keywords:
            rows.append({
                'keyword_group': keyword_group,
                'keyword': keyword
            })
    return pd.DataFrame(rows)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# HuggingFace 사용 가능 여부 확인
HF_AVAILABLE = False
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    import torch
    HF_AVAILABLE = True
except ImportError:
    logger.warning("HuggingFace transformers가 설치되지 않았습니다. 텍스트 분석 기능을 사용할 수 없습니다.")


def preprocess(text: str) -> str:
    """
    한국어 리뷰 텍스트 전처리
    - 공백 정규화
    - 특수문자 일부 제거 (이모지, URL 등은 유지할지 결정 필요)
    - 연속된 공백 제거
    """
    if pd.isna(text) or not isinstance(text, str):
        return ""
    
    # 공백 정규화 및 연속 공백 제거
    text = re.sub(r'\s+', ' ', text.strip())
    
    # 필요시 추가 전처리: 이모지, URL, 특수문자 처리 등
    # text = re.sub(r'http\S+', '', text)  # URL 제거 (선택사항)
    
    return text


def rating_to_score(rating: int) -> float:
    """
    별점(1-5)을 감정 스코어(-1.0 ~ 1.0)로 변환
    """
    mapping = {1: -1.0, 2: -0.5, 3: 0.0, 4: 0.5, 5: 1.0}
    return mapping.get(int(rating), 0.0)


# HuggingFace 모델 전역 변수
_sentiment_pipeline = None


def load_sentiment_model(model_name: Optional[str] = None, use_gpu: bool = False):
    """
    HuggingFace 감성분석 모델 로드
    한국어 감성분석에 적합한 모델 사용
    
    Args:
        model_name: 사용할 모델 이름 (None이면 자동 선택)
        use_gpu: GPU 사용 여부
    """
    global _sentiment_pipeline
    
    if not HF_AVAILABLE:
        logger.warning("HuggingFace를 사용할 수 없습니다. 별점 기반 분석만 수행합니다.")
        return None
    
    if _sentiment_pipeline is not None:
        return _sentiment_pipeline
    
    try:
        # GPU 사용 가능 여부 확인
        device = 0 if use_gpu and torch.cuda.is_available() else -1
        
        # 모델 자동 선택 (한국어 감성분석에 적합한 모델 우선)
        if model_name is None:
            # 한국어 감성분석 모델 목록 (우선순위 순)
            model_candidates = [
                "beomi/KcELECTRA-base-v2022",  # 한국어 ELECTRA 모델
                "monologg/koelectra-base-v3-discriminator",  # 한국어 ELECTRA
            ]
        else:
            model_candidates = [model_name]
        
        # 모델 로드 시도
        for candidate_model in model_candidates:
            try:
                logger.info(f"감성분석 모델 로딩 시도: {candidate_model}")
                
                # text-classification pipeline 사용
                _sentiment_pipeline = pipeline(
                    "text-classification",
                    model=candidate_model,
                    device=device,
                    return_all_scores=False  # 가장 높은 점수만 반환
                )
                
                logger.info(f"모델 로드 성공: {candidate_model}")
                return _sentiment_pipeline
                
            except Exception as e:
                logger.debug(f"모델 {candidate_model} 로드 실패: {e}")
                continue
        
        # 모든 모델 로드 실패 시 기본 감성분석 모델 시도
        logger.warning("한국어 모델 로드 실패. 기본 감성분석 모델 사용 시도 중...")
        try:
            _sentiment_pipeline = pipeline(
                "sentiment-analysis",
                device=device
            )
            logger.info("기본 감성분석 모델 로드 완료 (영어 위주)")
            return _sentiment_pipeline
        except Exception as e2:
            logger.error(f"모든 모델 로드 실패: {e2}")
            return None
        
    except Exception as e:
        logger.error(f"모델 로드 중 오류 발생: {e}")
        return None


def analyze_text_sentiment(text: str, pipeline_obj=None) -> Optional[float]:
    """
    HuggingFace를 사용하여 텍스트 감성분석 수행
    반환값: -1.0 (부정) ~ 1.0 (긍정), None (분석 실패)
    """
    if not HF_AVAILABLE or pipeline_obj is None:
        return None
    
    if not text or len(text.strip()) == 0:
        return 0.0
    
    try:
        # 텍스트 길이 제한 (모델 최대 길이 고려)
        max_length = 512
        if len(text) > max_length:
            text = text[:max_length]
        
        # 감성분석 수행
        result = pipeline_obj(text)
        
        # 결과 파싱
        # pipeline 결과 형식: {'label': 'POSITIVE', 'score': 0.9} 또는 {'label': 'LABEL_1', 'score': 0.9}
        
        if isinstance(result, dict):
            label = str(result.get('label', '')).upper()
            score = float(result.get('score', 0.0))
            
            # 라벨에 따른 감정 스코어 변환
            # 긍정 라벨: POSITIVE, 긍정, LABEL_1, 1 등
            # 부정 라벨: NEGATIVE, 부정, LABEL_0, 0 등
            
            if any(keyword in label for keyword in ['POS', '긍정', 'LABEL_1', '1', 'POSITIVE']):
                # 긍정: 0~1 점수를 -1~1로 변환 (0.5 기준)
                return (score - 0.5) * 2  # 0.5 -> 0, 1.0 -> 1.0, 0.0 -> -1.0
            elif any(keyword in label for keyword in ['NEG', '부정', 'LABEL_0', '0', 'NEGATIVE']):
                # 부정: 점수를 반전하여 -1~0 범위로 변환
                return -(score - 0.5) * 2  # 0.5 -> 0, 1.0 -> -1.0, 0.0 -> 1.0
            else:
                # 라벨을 알 수 없는 경우, 점수 기반으로 추정
                # 높은 점수면 긍정, 낮은 점수면 부정으로 가정
                return (score - 0.5) * 2
        
        elif isinstance(result, list) and len(result) > 0:
            # 리스트 형태인 경우 첫 번째 결과 사용
            return analyze_text_sentiment(text, pipeline_obj)
        
        return 0.0
        
    except Exception as e:
        logger.debug(f"텍스트 분석 중 오류: {e}")
        return None


def calculate_hybrid_sentiment(rating_score: float, text_score: Optional[float], 
                              rating_weight: float = 0.3, text_weight: float = 0.7) -> float:
    """
    별점과 텍스트 분석 결과를 결합한 하이브리드 감정 스코어 계산
    
    Args:
        rating_score: 별점 기반 스코어 (-1.0 ~ 1.0)
        text_score: 텍스트 분석 스코어 (-1.0 ~ 1.0) 또는 None
        rating_weight: 별점 가중치 (기본값: 0.4)
        text_weight: 텍스트 가중치 (기본값: 0.6)
    
    Returns:
        결합된 감정 스코어 (-1.0 ~ 1.0)
    """
    if text_score is None:
        # 텍스트 분석이 불가능한 경우 별점만 사용
        return rating_score
    
    # 가중치 정규화
    total_weight = rating_weight + text_weight
    rating_weight = rating_weight / total_weight
    text_weight = text_weight / total_weight
    
    # 가중 평균 계산
    hybrid_score = (rating_score * rating_weight) + (text_score * text_weight)
    
    # 범위 제한
    return max(-1.0, min(1.0, hybrid_score))


def load_data(reviews_path: str, keywords_path: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    CSV 파일 로드 및 검증
    """
    try:
        # 리뷰 데이터 로드
        if not Path(reviews_path).exists():
            raise FileNotFoundError(f"리뷰 파일을 찾을 수 없습니다: {reviews_path}")
        
        reviews = pd.read_csv(reviews_path)
        logger.info(f"리뷰 데이터 로드 완료: {len(reviews)}개")
        
        # 필수 컬럼 검증
        required_cols = ['review_id', 'text', 'rating']
        missing_cols = [col for col in required_cols if col not in reviews.columns]
        if missing_cols:
            raise ValueError(f"필수 컬럼이 없습니다: {missing_cols}")
        
        # 키워드 데이터 로드
        if not Path(keywords_path).exists():
            raise FileNotFoundError(f"키워드 파일을 찾을 수 없습니다: {keywords_path}")
        
        keywords = pd.read_csv(keywords_path, header=None, names=['keyword'])
        keywords = keywords.dropna()
        logger.info(f"키워드 데이터 로드 완료: {len(keywords)}개")
        
        return reviews, keywords
    
    except Exception as e:
        logger.error(f"데이터 로드 중 오류 발생: {e}")
        raise


def match_keywords(reviews: pd.DataFrame, keywords: pd.DataFrame) -> pd.DataFrame:
    """
    리뷰 텍스트에서 키워드 매칭
    개선사항: 정규식 사용, 대소문자 무시, 단어 경계 고려
    """
    rows = []
    
    for _, kw_row in keywords.iterrows():
        kw = str(kw_row["keyword"]).strip()
        if not kw:
            continue
        
        # 키워드 이스케이프 및 정규식 패턴 생성
        # 한국어의 경우 공백이 포함된 키워드도 매칭되도록 처리
        escaped_kw = re.escape(kw)
        
        # 키워드 매칭 (대소문자 무시, 부분 문자열 매칭)
        mask = reviews["clean_text"].str.contains(escaped_kw, case=False, na=False, regex=True)
        matched_reviews = reviews[mask]
        
        logger.debug(f"키워드 '{kw}': {len(matched_reviews)}개 리뷰 매칭")
        
        for _, review in matched_reviews.iterrows():
            rows.append({
                "keyword": kw,
                "review_id": review["review_id"],
                "app_id": review.get("app_id", None),
                "sentiment_score": review.get("sentiment_score", 0.0),
                "rating_score": review.get("rating_score", 0.0),
                "text_score": review.get("text_score", None),
                "rating": review["rating"],
                "text": review["text"]
            })
    
    if not rows:
        logger.warning("매칭된 리뷰가 없습니다.")
        return pd.DataFrame()
    
    return pd.DataFrame(rows)


def aggregate_by_keyword(kw_df: pd.DataFrame) -> pd.DataFrame:
    """
    키워드별 감정 분석 집계
    """
    if kw_df.empty:
        logger.warning("집계할 데이터가 없습니다.")
        return pd.DataFrame(columns=["keyword", "total_reviews", "avg_sentiment", 
                                     "positive_count", "negative_count", "neutral_count"])
    
    summary = kw_df.groupby("keyword").agg(
        total_reviews=("review_id", "nunique"),
        avg_sentiment=("sentiment_score", "mean"),
        positive_count=("sentiment_score", lambda s: (s > 0.2).sum()),
        negative_count=("sentiment_score", lambda s: (s < -0.2).sum()),
        neutral_count=("sentiment_score", lambda s: ((s >= -0.2) & (s <= 0.2)).sum())
    ).reset_index()
    
    # 소수점 반올림
    summary["avg_sentiment"] = summary["avg_sentiment"].round(3)
    
    # 감정 라벨 추가
    summary["sentiment_label"] = summary["avg_sentiment"].apply(
        lambda x: "positive" if x > 0.2 else ("negative" if x < -0.2 else "neutral")
    )
    
    return summary


def match_keyword_groups(reviews: pd.DataFrame, keyword_groups: pd.DataFrame) -> pd.DataFrame:
    """
    전처리된 리뷰 데이터와 키워드 그룹을 매칭
    리뷰 데이터에 이미 키워드 정보가 포함되어 있다고 가정
    또는 리뷰 텍스트에서 키워드를 찾아 매칭
    
    Args:
        reviews: 전처리된 리뷰 데이터 (review_id, sentiment_score 등 포함)
        keyword_groups: 키워드 그룹 데이터 (keyword_group, keyword 컬럼 포함)
    
    Returns:
        매칭된 리뷰와 키워드 그룹 정보를 포함한 DataFrame
    """
    rows = []
    
    # 리뷰 데이터에 키워드 정보가 이미 있는 경우
    if 'keyword' in reviews.columns or 'keywords' in reviews.columns:
        keyword_col = 'keyword' if 'keyword' in reviews.columns else 'keywords'
        
        for _, review in reviews.iterrows():
            review_keywords = str(review[keyword_col]).strip()
            if pd.isna(review_keywords) or not review_keywords:
                continue
            
            # 키워드가 쉼표로 구분되어 있을 수 있음
            review_keyword_list = [kw.strip() for kw in review_keywords.split(',')]
            
            # 키워드 그룹에서 매칭
            for _, kg_row in keyword_groups.iterrows():
                kg_keyword = str(kg_row['keyword']).strip()
                kg_group = str(kg_row['keyword_group']).strip()
                
                if kg_keyword in review_keyword_list:
                    rows.append({
                        "keyword_group": kg_group,
                        "keyword": kg_keyword,
                        "review_id": review["review_id"],
                        "app_id": review.get("app_id", None),
                        "sentiment_score": review.get("sentiment_score", 0.0),
                        "rating": review.get("rating", None),
                        "text": review.get("text", "")
                    })
    else:
        # 리뷰 텍스트에서 키워드 매칭
        if 'text' not in reviews.columns and 'clean_text' not in reviews.columns:
            logger.warning("리뷰 데이터에 키워드나 텍스트 정보가 없습니다.")
            return pd.DataFrame()
        
        text_col = 'clean_text' if 'clean_text' in reviews.columns else 'text'
        
        # 텍스트 전처리 (없는 경우)
        if 'clean_text' not in reviews.columns:
            reviews['clean_text'] = reviews[text_col].apply(preprocess)
        
        for _, kg_row in keyword_groups.iterrows():
            kg_keyword = str(kg_row['keyword']).strip()
            kg_group = str(kg_row['keyword_group']).strip()
            
            if not kg_keyword:
                continue
            
            # 키워드 매칭
            escaped_kw = re.escape(kg_keyword)
            mask = reviews['clean_text'].str.contains(escaped_kw, case=False, na=False, regex=True)
            matched_reviews = reviews[mask]
            
            logger.debug(f"키워드 그룹 '{kg_group}' - 키워드 '{kg_keyword}': {len(matched_reviews)}개 리뷰 매칭")
            
            for _, review in matched_reviews.iterrows():
                rows.append({
                    "keyword_group": kg_group,
                    "keyword": kg_keyword,
                    "review_id": review["review_id"],
                    "app_id": review.get("app_id", None),
                    "sentiment_score": review.get("sentiment_score", 0.0),
                    "rating": review.get("rating", None),
                    "text": review.get("text", "")
                })
    
    if not rows:
        logger.warning("매칭된 리뷰가 없습니다.")
        return pd.DataFrame()
    
    return pd.DataFrame(rows)


def aggregate_by_keyword_group(kw_df: pd.DataFrame) -> pd.DataFrame:
    """
    키워드 그룹별 감정 분석 집계
    """
    if kw_df.empty:
        logger.warning("집계할 데이터가 없습니다.")
        return pd.DataFrame(columns=["keyword_group", "keyword", "total_reviews", "avg_sentiment", 
                                     "positive_count", "negative_count", "neutral_count"])
    
    summary = kw_df.groupby(["keyword_group", "keyword"]).agg(
        total_reviews=("review_id", "nunique"),
        avg_sentiment=("sentiment_score", "mean"),
        positive_count=("sentiment_score", lambda s: (s > 0.2).sum()),
        negative_count=("sentiment_score", lambda s: (s < -0.2).sum()),
        neutral_count=("sentiment_score", lambda s: ((s >= -0.2) & (s <= 0.2)).sum())
    ).reset_index()
    
    # 소수점 반올림
    summary["avg_sentiment"] = summary["avg_sentiment"].round(3)
    
    # 감정 라벨 추가
    summary["sentiment_label"] = summary["avg_sentiment"].apply(
        lambda x: "positive" if x > 0.2 else ("negative" if x < -0.2 else "neutral")
    )
    
    return summary


def save_results(summary: pd.DataFrame, app_name: str, output_dir: str = "results"):
    """
    분석 결과를 JSON 파일로 저장
    앱 이름을 포함한 파일명으로 results 폴더에 저장
    """
    if summary.empty:
        logger.warning("저장할 결과가 없습니다.")
        return
    
    # 결과 폴더 생성
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # 파일명 생성 (앱 이름 포함, 특수문자 제거)
    safe_app_name = re.sub(r'[^\w\s-]', '', app_name).strip()
    safe_app_name = re.sub(r'[-\s]+', '_', safe_app_name)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{safe_app_name}_analysis_result_{timestamp}.json"
    filepath = output_path / filename
    
    # JSON 변환 및 저장
    json_output = summary.to_json(orient="records", force_ascii=False, indent=2)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(json_output)
    
    logger.info(f"결과 저장 완료: {filepath}")
    print(json_output)
    
    return str(filepath)


def get_app_name(reviews: pd.DataFrame) -> str:
    """
    리뷰 데이터에서 앱 이름 추출
    app_id가 있으면 사용하고, 없으면 기본값 사용
    """
    if 'app_id' in reviews.columns and not reviews['app_id'].isna().all():
        # 가장 많이 나타나는 app_id 사용
        app_id = reviews['app_id'].mode()[0] if len(reviews['app_id'].mode()) > 0 else reviews['app_id'].iloc[0]
        return str(app_id)
    else:
        return "unknown_app"


def main():
    """
    메인 실행 함수
    """
    # 명령줄 인자 파싱
    parser = argparse.ArgumentParser(description='리뷰 감정 분석 스크립트')
    parser.add_argument('--reviews', type=str, default='reviews.csv', help='리뷰 CSV 파일 경로')
    parser.add_argument('--keywords', type=str, default='keywords.csv', help='키워드 CSV 파일 경로')
    parser.add_argument('--output', type=str, default='results', help='결과 저장 디렉토리')
    
    args = parser.parse_args()
    
    try:
        # 파일 경로 설정
        reviews_path = args.reviews
        keywords_path = args.keywords
        output_dir = args.output
        
        # 1. 데이터 로드
        reviews, keywords = load_data(reviews_path, keywords_path)
        
        # 앱 이름 추출
        app_name = get_app_name(reviews)
        logger.info(f"앱 이름: {app_name}")
        
        # 2. 전처리
        logger.info("리뷰 텍스트 전처리 중...")
        reviews["clean_text"] = reviews["text"].apply(preprocess)
        
        # 결측값 제거
        reviews = reviews[reviews["clean_text"].str.len() > 0]
        
        # 3. 감정 스코어 계산
        logger.info("감정 스코어 계산 중...")
        
        # 별점 기반 스코어
        reviews["rating_score"] = reviews["rating"].apply(rating_to_score)
        
        # HuggingFace 텍스트 분석 (선택사항)
        text_scores = None
        sentiment_pipeline = None
        
        if HF_AVAILABLE:
            try:
                logger.info("HuggingFace 감성분석 모델 로딩 중...")
                sentiment_pipeline = load_sentiment_model(use_gpu=False)
                
                if sentiment_pipeline is not None:
                    logger.info("텍스트 기반 감성분석 수행 중...")
                    # 배치 처리로 성능 향상
                    texts = reviews["clean_text"].tolist()
                    text_scores_list = []
                    
                    for i, text in enumerate(texts):
                        if (i + 1) % 100 == 0:
                            logger.info(f"텍스트 분석 진행 중: {i+1}/{len(texts)}")
                        
                        score = analyze_text_sentiment(text, sentiment_pipeline)
                        text_scores_list.append(score)
                    
                    reviews["text_score"] = text_scores_list
                    logger.info("텍스트 분석 완료")
                else:
                    logger.warning("HuggingFace 모델을 사용할 수 없습니다. 별점 기반 분석만 수행합니다.")
                    reviews["text_score"] = None
            except Exception as e:
                logger.warning(f"텍스트 분석 중 오류 발생: {e}. 별점 기반 분석만 수행합니다.")
                reviews["text_score"] = None
        else:
            reviews["text_score"] = None
        
        # 하이브리드 스코어 계산 (별점 + 텍스트 분석)
        logger.info("하이브리드 감정 스코어 계산 중...")
        reviews["sentiment_score"] = reviews.apply(
            lambda row: calculate_hybrid_sentiment(
                row["rating_score"],
                row.get("text_score"),
                rating_weight=0.4,  # 별점 가중치
                text_weight=0.6      # 텍스트 분석 가중치
            ),
            axis=1
        )
        
        # 4. 키워드 매칭
        logger.info("키워드 매칭 중...")
        kw_df = match_keywords(reviews, keywords)
        
        if kw_df.empty:
            logger.error("키워드 매칭 결과가 없습니다. 키워드나 리뷰 데이터를 확인해주세요.")
            return
        
        # 5. 키워드별 집계
        logger.info("키워드별 집계 중...")
        summary = aggregate_by_keyword(kw_df)
        
        # 앱 이름을 결과에 추가
        summary["app_name"] = app_name
        
        # 6. 결과 저장 및 출력
        result_path = save_results(summary, app_name, output_dir)
        
        # 통계 출력
        logger.info(f"\n=== 분석 결과 요약 ===")
        logger.info(f"앱 이름: {app_name}")
        logger.info(f"총 키워드 수: {len(summary)}")
        logger.info(f"총 매칭 리뷰 수: {kw_df['review_id'].nunique()}")
        logger.info(f"평균 감정 스코어: {summary['avg_sentiment'].mean():.3f}")
        logger.info(f"결과 파일: {result_path}")
        
    except FileNotFoundError as e:
        logger.error(f"파일을 찾을 수 없습니다: {e}")
    except Exception as e:
        logger.error(f"오류 발생: {e}", exc_info=True)


if __name__ == "__main__":
    main()