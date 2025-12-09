# 문제 해결 가이드

## 웹서버 검색이 작동하지 않는 경우

### 1. 환경 변수 확인

프론트엔드 `.env.local` 파일에 다음이 설정되어 있어야 합니다:
```
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:5001
```

**중요**: Next.js에서는 클라이언트 측에서 사용하는 환경 변수는 `NEXT_PUBLIC_` 접두사가 필요합니다.

### 2. 서버 재시작

환경 변수를 변경한 후에는 Next.js 서버를 재시작해야 합니다:

```bash
# Next.js 서버 재시작
cd reviewalyze
npm run dev
```

### 3. Python 서버 확인

Python 서버가 실행 중인지 확인:
```bash
curl http://localhost:5001/health
```

예상 응답:
```json
{
  "status": "healthy",
  "hf_available": false,
  "model_loaded": false,
  "gemini_available": true
}
```

### 4. 크롤링 기능 확인

Python 서버 로그에서 다음 메시지를 확인:
- ✅ `크롤링 기능이 활성화됩니다.` - 정상
- ❌ `크롤링 기능이 비활성화됩니다.` - 문제 있음

크롤링 기능이 비활성화된 경우:
```bash
pip install beautifulsoup4 lxml
```

### 5. 브라우저 콘솔 확인

브라우저 개발자 도구(F12) > Console 탭에서 에러 메시지 확인:
- CORS 오류: Python 서버의 CORS 설정 확인
- 네트워크 오류: Python 서버가 실행 중인지 확인
- 404 오류: API 엔드포인트 URL 확인

### 6. API 직접 테스트

터미널에서 직접 API를 테스트:
```bash
curl -X POST http://localhost:5001/api/search-and-collect \
  -H "Content-Type: application/json" \
  -d '{"keyword": "스도쿠", "max_apps": 3, "max_reviews": 10}'
```

## 일반적인 문제

### 문제 1: "Python API 서버에 연결할 수 없습니다"

**원인**: Python 서버가 실행되지 않음

**해결**:
1. Python 서버 실행 확인
2. 포트 확인 (기본값: 5001)
3. 방화벽 설정 확인

### 문제 2: CORS 오류

**원인**: Python 서버의 CORS 설정 문제

**해결**: `api_server.py`에서 CORS가 올바르게 설정되어 있는지 확인:
```python
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

### 문제 3: 크롤링 기능 비활성화

**원인**: 필요한 패키지가 설치되지 않음

**해결**:
```bash
pip install beautifulsoup4 lxml google-play-scraper
```

### 문제 4: 환경 변수가 적용되지 않음

**원인**: Next.js 서버를 재시작하지 않음

**해결**:
1. Next.js 서버 종료 (Ctrl+C)
2. `.env.local` 파일 확인
3. 서버 재시작: `npm run dev`

## 디버깅 팁

1. **Python 서버 로그 확인**: 서버 실행 터미널에서 에러 메시지 확인
2. **브라우저 네트워크 탭**: 개발자 도구 > Network 탭에서 요청/응답 확인
3. **브라우저 콘솔**: 개발자 도구 > Console 탭에서 JavaScript 에러 확인
4. **API 직접 테스트**: curl 또는 Postman으로 API 직접 호출
