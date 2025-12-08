# 프론트엔드 연결 문제 해결

## 문제
프론트엔드가 `http://localhost:5000`을 호출하지만 서버는 `5001`에서 실행 중입니다.

## 해결 방법

### 1. 환경 변수 확인 및 수정

`reviewalyze/.env.local` 파일이 올바르게 설정되어 있는지 확인:

```bash
cd reviewalyze
cat .env.local
```

다음과 같이 표시되어야 합니다:
```
PYTHON_API_URL=http://localhost:5001
```

### 2. Next.js 개발 서버 재시작

**중요**: Next.js는 환경 변수를 서버 시작 시에만 읽습니다. 환경 변수를 변경한 후에는 반드시 서버를 재시작해야 합니다.

1. 현재 실행 중인 Next.js 서버를 중지 (`Ctrl+C`)
2. 다시 시작:
```bash
cd reviewalyze
npm run dev
```

### 3. 환경 변수 확인 (서버 재시작 후)

브라우저 콘솔에서 다음 로그를 확인하세요:
```
API 호출 시작 { pythonApiUrl: 'http://localhost:5001' }
```

`5001`로 표시되어야 합니다.

### 4. CORS 문제 해결 (필요시)

만약 여전히 403 Forbidden 오류가 발생한다면:

1. Python API 서버의 CORS 설정 확인 (`api_server.py`):
```python
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

2. Python 서버 재시작

### 5. 전체 테스트

1. Python API 서버가 실행 중인지 확인:
```bash
curl http://localhost:5001/health
```

2. 프론트엔드에서 파일 업로드 및 분석 실행

## 빠른 해결 스크립트

```bash
# 1. 환경 변수 설정
cd reviewalyze
echo "PYTHON_API_URL=http://localhost:5001" > .env.local

# 2. Next.js 서버 재시작
# (현재 실행 중인 서버를 Ctrl+C로 중지한 후)
npm run dev
```

## 문제가 계속되면

1. 브라우저 캐시 삭제 (Hard Refresh: Cmd+Shift+R)
2. Next.js 캐시 삭제:
```bash
cd reviewalyze
rm -rf .next
npm run dev
```



