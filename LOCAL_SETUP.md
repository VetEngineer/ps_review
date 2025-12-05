# 로컬 개발 환경 설정 가이드

이 문서는 프로젝트를 로컬에서 실행하고 테스트하는 방법을 안내합니다.

## 목차

1. [사전 요구사항](#사전-요구사항)
2. [환경 확인](#환경-확인)
3. [Python API 서버 설정](#python-api-서버-설정)
4. [Next.js 프론트엔드 설정](#nextjs-프론트엔드-설정)
5. [로컬 실행](#로컬-실행)
6. [테스트 방법](#테스트-방법)
7. [문제 해결](#문제-해결)

## 사전 요구사항

- **Python 3.8 이상** (현재 시스템: Python 3.13.7)
- **Node.js 16 이상** (현재 시스템: Node.js v22.17.0)
- **npm** 또는 **yarn**
- **Git**

## 환경 확인

프로젝트 루트에서 환경 확인 스크립트를 실행하세요:

```bash
./check_env.sh
```

이 스크립트는 다음을 확인합니다:
- Python 설치 및 버전
- Python 가상환경 설정
- Python 의존성 설치 상태
- Node.js 설치 및 버전
- Next.js 의존성 설치 상태
- 필수 파일 존재 여부
- 데이터 파일 존재 여부

## Python API 서버 설정

### 1. 가상환경 생성 및 활성화

```bash
# 가상환경 생성 (아직 없는 경우)
python3 -m venv venv

# 가상환경 활성화
# macOS/Linux:
source venv/bin/activate

# Windows:
# venv\Scripts\activate
```

가상환경이 활성화되면 프롬프트 앞에 `(venv)`가 표시됩니다.

### 2. Python 의존성 설치

```bash
# requirements.txt의 모든 패키지 설치
pip install --upgrade pip
pip install -r requirements.txt
```

**주의**: PyTorch는 CPU 버전으로 설치됩니다. GPU를 사용하려면 `requirements.txt`를 수정하세요.

### 3. 환경 변수 설정 (선택사항)

```bash
# .env.example을 복사하여 .env 파일 생성
cp .env.example .env

# 필요시 .env 파일 편집
# 기본값:
# PORT=5000
# DEBUG=false
# ENABLE_HF=false
```

### 4. 데이터 파일 확인

프로젝트 루트에 다음 파일이 있어야 합니다:
- `reviews.csv`: 리뷰 데이터 (선택사항, API로 업로드 가능)
- `keywords.csv`: 키워드 데이터 (필수, API로 업로드 가능)

샘플 파일이 있다면 사용할 수 있습니다:
- `reviews_sample.csv`
- `keywords_sample.csv`

## Next.js 프론트엔드 설정

### 1. reviewalyze 폴더로 이동

```bash
cd reviewalyze
```

### 2. Node.js 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

```bash
# .env.example을 복사하여 .env.local 파일 생성
cp .env.example .env.local

# .env.local 파일 편집
# PYTHON_API_URL=http://localhost:5000
```

## 로컬 실행

### 방법 1: 수동 실행 (권장)

#### 터미널 1: Python API 서버 실행

```bash
# 프로젝트 루트에서
source venv/bin/activate  # 가상환경 활성화
python api_server.py
```

서버가 `http://localhost:5000`에서 실행됩니다.

#### 터미널 2: Next.js 프론트엔드 실행

```bash
# reviewalyze 폴더에서
cd reviewalyze
npm run dev
```

프론트엔드가 `http://localhost:3000`에서 실행됩니다.

### 방법 2: 자동화 스크립트 사용

```bash
# 프로젝트 루트에서
./test_local.sh
```

이 스크립트는 환경 확인, 서버 시작, 테스트를 자동으로 수행합니다.

## 테스트 방법

### 1. Python API 서버 헬스 체크

브라우저에서 접속:
```
http://localhost:5000/health
```

또는 curl 사용:
```bash
curl http://localhost:5000/health
```

예상 응답:
```json
{
  "status": "healthy",
  "hf_available": true,
  "model_loaded": false
}
```

### 2. API 엔드포인트 테스트

```bash
# 키워드 파일과 리뷰 파일을 사용하여 분석 요청
curl -X POST http://localhost:5000/analyze \
  -F "keywords=@keywords.csv" \
  -F "reviews=@reviews.csv"
```

### 3. 프론트엔드 테스트

1. 브라우저에서 `http://localhost:3000` 접속
2. 키워드 CSV 파일 업로드
3. 리뷰 CSV 파일 업로드 (선택사항)
4. "분석 실행" 버튼 클릭
5. 결과 확인

### 4. 전체 플로우 테스트

1. Python API 서버가 실행 중인지 확인 (`http://localhost:5000/health`)
2. Next.js 프론트엔드가 실행 중인지 확인 (`http://localhost:3000`)
3. 프론트엔드에서 파일 업로드 및 분석 실행
4. 결과가 올바르게 표시되는지 확인

## 문제 해결

### Python API 서버가 시작되지 않음

**문제**: `python api_server.py` 실행 시 오류 발생

**해결 방법**:
1. 가상환경이 활성화되었는지 확인: `which python` (venv 경로여야 함)
2. 의존성이 설치되었는지 확인: `pip list`
3. 포트가 사용 중인지 확인: `lsof -i :5000`
4. 다른 포트 사용: `PORT=5001 python api_server.py`

### Next.js 프론트엔드가 시작되지 않음

**문제**: `npm run dev` 실행 시 오류 발생

**해결 방법**:
1. Node.js 버전 확인: `node --version` (16 이상)
2. 의존성 재설치: `rm -rf node_modules package-lock.json && npm install`
3. 포트가 사용 중인지 확인: `lsof -i :3000`
4. 다른 포트 사용: `PORT=3001 npm run dev`

### API 서버에 연결할 수 없음

**문제**: 프론트엔드에서 "Python API 서버에 연결할 수 없습니다" 오류

**해결 방법**:
1. Python API 서버가 실행 중인지 확인
2. `reviewalyze/.env.local` 파일의 `PYTHON_API_URL` 확인
3. CORS 설정 확인 (`api_server.py`에서 `CORS(app)` 확인)
4. 브라우저 콘솔에서 네트워크 오류 확인

### 분석이 실패함

**문제**: 분석 요청 시 오류 발생

**해결 방법**:
1. Python API 서버 로그 확인 (터미널 출력)
2. CSV 파일 형식 확인:
   - `reviews.csv`: `review_id`, `text`, `rating` 컬럼 필수
   - `keywords.csv`: 한 줄에 하나씩 키워드
3. 파일 인코딩 확인 (UTF-8 권장)
4. 파일 크기 확인 (너무 큰 파일은 처리 시간이 오래 걸릴 수 있음)

### HuggingFace 모델 로드 실패

**문제**: 모델 로드 시 메모리 부족 또는 다운로드 실패

**해결 방법**:
1. `.env` 파일에서 `ENABLE_HF=false`로 설정 (별점 기반 분석만 사용)
2. Railway FREE 플랜 사용 시 메모리 제한으로 인해 모델 로드 불가능할 수 있음
3. 로컬에서는 `ENABLE_HF=true`로 설정하여 테스트 가능

### 포트 충돌

**문제**: 포트가 이미 사용 중

**해결 방법**:
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :5000  # Python API 서버
lsof -i :3000  # Next.js 프론트엔드

# 프로세스 종료
kill -9 <PID>
```

또는 다른 포트 사용:
```bash
# Python API 서버
PORT=5001 python api_server.py

# Next.js 프론트엔드
PORT=3001 npm run dev
# .env.local 파일도 수정 필요
```

## 다음 단계

로컬 환경이 정상적으로 작동하면:

1. **Railway 배포**: `DEPLOYMENT.md` 참조
2. **Vercel 배포**: `DEPLOYMENT.md` 참조
3. **코드 수정 및 테스트**: 로컬에서 개발 후 배포

## 추가 리소스

- [Flask 공식 문서](https://flask.palletsprojects.com/)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Railway 문서](https://docs.railway.app/)
- [Vercel 문서](https://vercel.com/docs)
