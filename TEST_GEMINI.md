# Gemini API 요약 기능 테스트 가이드

## 사전 준비

1. **의존성 설치**
   ```bash
   pip install -r requirements.txt
   ```

2. **환경 변수 설정**
   ```bash
   # .env 파일에 추가하거나
   export GEMINI_API_KEY="your-gemini-api-key"
   ```

3. **서버 실행**
   ```bash
   # 포트 5001에서 실행 (기본값)
   python api_server.py
   
   # 또는 다른 포트 지정
   PORT=5001 python api_server.py
   ```

## 테스트 방법

### 방법 1: 테스트 스크립트 사용

```bash
python test_gemini_summary.py
```

### 방법 2: curl로 직접 테스트

```bash
# 헬스 체크
curl http://localhost:5001/health

# 앱 검색 및 요약 테스트
curl -X POST http://localhost:5001/api/search-and-collect \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "스도쿠",
    "max_apps": 3,
    "max_reviews": 10
  }' | python -m json.tool
```

### 방법 3: Python으로 직접 테스트

```python
import requests
import json

# API 호출
response = requests.post(
    "http://localhost:5001/api/search-and-collect",
    json={
        "keyword": "스도쿠",
        "max_apps": 3,
        "max_reviews": 10
    }
)

data = response.json()

# 결과 확인
if data.get('success'):
    for app in data.get('apps', []):
        print(f"\n앱: {app.get('title')}")
        print(f"원본 소개 길이: {len(app.get('intro', ''))}자")
        print(f"AI 요약: {app.get('ai_summary', 'N/A')}")
        print(f"AI 요약 길이: {len(app.get('ai_summary', ''))}자")
```

## 예상 결과

### 성공 케이스 (Gemini API 키가 설정된 경우)
- 각 앱의 `ai_summary` 필드에 200자 내외의 한국어 요약이 생성됨
- 원본 `intro`보다 훨씬 짧고 간결한 요약

### 폴백 케이스 (Gemini API 키가 없는 경우)
- 각 앱의 `ai_summary` 필드에 원본 텍스트의 앞부분(최대 200자)이 반환됨
- 서버 로그에 경고 메시지 출력

## 확인 사항

1. ✅ `ai_summary` 필드가 응답에 포함되는지
2. ✅ 요약 길이가 200자 내외인지
3. ✅ 한국어로 요약되는지
4. ✅ API 키가 없어도 서비스가 정상 동작하는지
