# 플레이스토어 리뷰 감정 분석 도구

플레이스토어 리뷰 데이터를 기반으로 키워드별 감정 분석을 수행하는 도구입니다.

## 기능

- 리뷰 텍스트 전처리 및 정제
- **하이브리드 감정 분석**: 별점 + HuggingFace 텍스트 분석 결합
- 한국어 감성분석 모델 지원 (beomi/KcELECTRA-base-v2022)
- 키워드별 리뷰 매칭 및 집계
- JSON 형식 결과 출력

## 설치

```bash
pip install -r requirements.txt
```

## 사용 방법

### 1. 데이터 파일 준비

#### reviews.csv
리뷰 데이터 파일은 다음 컬럼을 포함해야 합니다:
- `review_id`: 리뷰 고유 ID
- `app_id`: 앱 ID (선택사항)
- `text`: 리뷰 텍스트
- `rating`: 별점 (1-5)

예시:
```csv
review_id,app_id,text,rating
1,com.example.app,앱이 너무 느려요,2
2,com.example.app,정말 좋은 앱입니다!,5
```

#### keywords.csv
키워드 파일은 한 줄에 하나씩 키워드를 나열합니다:
```csv
keyword
렉
버벅임
로딩 오래 걸림
```

또는 헤더 없이:
```csv
렉
버벅임
로딩 오래 걸림
```

### 2. 실행

```bash
python analyse.py
```

### 3. 결과 확인

분석 결과는 `results/` 폴더에 저장되며, 파일명 형식은 다음과 같습니다:
- `{앱이름}_analysis_result_{타임스탬프}.json`

예시: `comexampleapp_analysis_result_20251204_091503.json`

결과는 콘솔에도 출력됩니다.

## 출력 형식

```json
[
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
```

## 결과 파일 구조

- **저장 위치**: `results/` 폴더
- **파일명 형식**: `{앱이름}_analysis_result_{YYYYMMDD_HHMMSS}.json`
- **앱 이름**: 리뷰 데이터의 `app_id` 컬럼에서 자동 추출 (없으면 "unknown_app")

## 주요 개선 사항

- ✅ 에러 핸들링 및 데이터 검증
- ✅ 한국어 텍스트 전처리 개선
- ✅ 키워드 매칭 정확도 향상 (정규식 사용)
- ✅ 로깅 기능 추가
- ✅ 코드 모듈화 및 가독성 개선
- ✅ 감정 라벨 자동 추가
- ✅ 결과 파일을 별도 폴더(`results/`)에 저장
- ✅ 앱 이름을 파일명 및 결과에 포함
- ✅ 타임스탬프를 포함한 고유 파일명 생성
- ✅ **HuggingFace 기반 텍스트 감성분석 통합**
- ✅ **하이브리드 감정 분석** (별점 40% + 텍스트 분석 60%)
- ✅ 한국어 감성분석 모델 자동 로드 및 폴백 지원

## 감정 분석 방식

### 하이브리드 분석
현재 코드는 두 가지 방법을 결합하여 감정을 분석합니다:

1. **별점 기반 분석** (가중치: 40%)
   - 사용자가 부여한 별점(1-5)을 감정 스코어로 변환

2. **텍스트 분석** (가중치: 60%)
   - HuggingFace의 한국어 모델을 사용하여 리뷰 텍스트 자체를 분석
   - 문맥과 의미를 고려한 정확한 감정 파악

### 장점
- 별점과 텍스트가 불일치하는 경우에도 정확한 분석 가능
- 예: "별점 5점이지만 정말 최악이에요" → 부정으로 정확히 분석
- 텍스트 분석 모델이 없어도 별점만으로 분석 가능 (폴백 지원)

