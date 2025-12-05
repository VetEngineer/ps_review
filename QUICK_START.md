# 빠른 시작 가이드

## 현재 문제 해결

### 문제 1: 포트 5000 충돌
macOS의 AirPlay Receiver가 포트 5000을 사용 중입니다.

**해결 방법 1: 다른 포트 사용 (권장)**
```bash
PORT=5001 python api_server.py
```

**해결 방법 2: AirPlay Receiver 비활성화**
1. 시스템 설정 > 일반 > AirPlay 수신기
2. "AirPlay 수신기" 끄기

### 문제 2: PyTorch 설치 불가
Python 3.13은 PyTorch에서 아직 지원되지 않습니다. 하지만 `ENABLE_HF=false`로 설정되어 있으므로 PyTorch 없이도 작동합니다.

**현재 설정 확인:**
- `ENABLE_HF=false`: 별점 기반 분석만 사용 (PyTorch 불필요)
- 텍스트 감성분석을 사용하려면 Python 3.11 이하 버전 필요

## 서버 시작 방법

### 방법 1: 자동 포트 선택 스크립트 사용
```bash
./start_server.sh
```

### 방법 2: 수동으로 포트 지정
```bash
source venv/bin/activate
PORT=5001 python api_server.py
```

### 방법 3: .env 파일 사용
```bash
# .env 파일 생성 또는 수정
echo "PORT=5001" > .env
echo "DEBUG=false" >> .env
echo "ENABLE_HF=false" >> .env

# 서버 실행
source venv/bin/activate
python api_server.py
```

## 프론트엔드 연결

서버를 포트 5001에서 실행한 경우:

1. `reviewalyze/.env.local` 파일 수정:
```env
PYTHON_API_URL=http://localhost:5001
```

2. Next.js 프론트엔드 실행:
```bash
cd reviewalyze
npm run dev
```

## 테스트

서버가 시작되면:
```bash
curl http://localhost:5001/health
```

또는 브라우저에서 `http://localhost:5001/health` 접속
