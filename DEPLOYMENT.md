# 배포 가이드

이 프로젝트는 Next.js 프론트엔드와 Python Flask API 서버로 구성되어 있습니다.

## 아키텍처

- **프론트엔드**: Next.js (Vercel에 배포)
- **백엔드**: Python Flask API (Railway, Render, Fly.io 등에 배포)

## 1. Python API 서버 배포

### Railway 배포 (권장)

1. [Railway](https://railway.app)에 가입 및 로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택 (또는 "Empty Project" 후 GitHub 연결)
4. 저장소 선택 후 배포 시작
5. Settings에서 환경 변수 설정:
   - `PORT`: 5000 (자동 설정됨, Railway가 자동으로 설정)
   - `DEBUG`: false (프로덕션 환경)
   - `ENABLE_HF`: false (FREE 플랜 권장, 메모리 절약)
6. `api_server.py`를 메인 파일로 설정:
   - Settings > Deploy > Start Command: `python api_server.py`
   - 또는 `Procfile` 사용: `web: python api_server.py`
   - `nixpacks.toml` 파일이 있으면 자동으로 인식됨
7. 배포 완료 후 생성된 URL 확인 (예: `https://your-app.railway.app`)

### Railway 배포 후 테스트

#### 1. 헬스 체크

배포가 완료되면 Railway 대시보드에서 제공하는 URL로 헬스 체크를 수행하세요:

```bash
# Railway URL로 헬스 체크
curl https://your-app.railway.app/health
```

예상 응답:
```json
{
  "status": "healthy",
  "hf_available": true,
  "model_loaded": false
}
```

#### 2. API 엔드포인트 테스트

```bash
# 키워드 파일과 리뷰 파일을 사용하여 분석 요청
curl -X POST https://your-app.railway.app/analyze \
  -F "keywords=@keywords.csv" \
  -F "reviews=@reviews.csv"
```

#### 3. Railway 로그 확인

Railway 대시보드의 "Deployments" 탭에서 로그를 확인할 수 있습니다:
- 배포 로그: 빌드 및 시작 과정 확인
- 런타임 로그: 서버 실행 중 오류 및 요청 로그 확인

#### 4. 로컬에서 Railway API 테스트

로컬 프론트엔드를 Railway API 서버에 연결하여 테스트할 수 있습니다:

1. `reviewalyze/.env.local` 파일 수정:
```env
PYTHON_API_URL=https://your-app.railway.app
```

2. Next.js 프론트엔드 실행:
```bash
cd reviewalyze
npm run dev
```

3. 브라우저에서 `http://localhost:3000` 접속하여 Railway API 서버와 통신 확인

#### 5. Railway 환경 변수 확인

Railway 대시보드 > Settings > Variables에서 다음 변수들이 올바르게 설정되었는지 확인:
- `PORT`: Railway가 자동 설정 (수정 불필요)
- `DEBUG`: `false` (프로덕션)
- `ENABLE_HF`: `false` (FREE 플랜 권장) 또는 `true` (유료 플랜)

### Railway 배포 문제 해결

#### 배포 실패

**문제**: Railway 배포가 실패함

**해결 방법**:
1. Railway 로그 확인 (Deployments 탭)
2. `requirements.txt` 확인 (모든 패키지가 올바른지)
3. `nixpacks.toml` 또는 `railway.json` 설정 확인
4. Python 버전 호환성 확인 (Python 3.8 이상 필요)

#### 서버가 시작되지 않음

**문제**: 배포는 성공했지만 서버가 응답하지 않음

**해결 방법**:
1. Railway 로그에서 오류 메시지 확인
2. `PORT` 환경 변수가 올바르게 설정되었는지 확인 (Railway가 자동 설정)
3. `api_server.py`의 `host='0.0.0.0'` 설정 확인
4. `Procfile` 또는 `railway.json`의 start command 확인

#### 메모리 부족 오류

**문제**: HuggingFace 모델 로드 시 메모리 부족

**해결 방법**:
1. `ENABLE_HF=false`로 설정 (별점 기반 분석만 사용)
2. Railway 플랜 업그레이드 (더 많은 메모리 할당)
3. 더 작은 모델 사용 (코드 수정 필요)

#### 타임아웃 오류

**문제**: API 요청 시 타임아웃 발생

**해결 방법**:
1. Railway 로그에서 요청 처리 시간 확인
2. 큰 파일의 경우 처리 시간이 오래 걸릴 수 있음
3. Railway 플랜의 타임아웃 제한 확인
4. 배치 처리로 분할하여 요청 (코드 수정 필요)

### Render 배포

1. [Render](https://render.com)에 가입 및 로그인
2. "New +" > "Web Service" 선택
3. GitHub 저장소 연결
4. 설정:
   - **Name**: 원하는 이름
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python api_server.py`
   - **Environment Variables**:
     - `PORT`: 5000
     - `DEBUG`: false
5. "Create Web Service" 클릭

### Fly.io 배포

1. [Fly.io](https://fly.io) CLI 설치 및 로그인
2. `fly.toml` 파일 생성:
```toml
app = "your-app-name"
primary_region = "iad"

[build]

[env]
  PORT = "5000"
  DEBUG = "false"

[[services]]
  internal_port = 5000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

3. 배포:
```bash
fly launch
fly deploy
```

## 2. Next.js 프론트엔드 배포 (Vercel)

1. [Vercel](https://vercel.com)에 가입 및 로그인
2. "Add New Project" 클릭
3. GitHub 저장소 연결
4. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: `reviewalyze`
   - **Environment Variables** 추가:
     - `PYTHON_API_URL`: Python API 서버 URL (예: `https://your-app.railway.app`)
5. "Deploy" 클릭

## 3. 환경 변수 설정

### Vercel 환경 변수

Vercel 대시보드에서 다음 환경 변수를 설정하세요:

```
PYTHON_API_URL=https://your-python-api.railway.app
```

또는 `.env.local` 파일 생성 (로컬 개발용):

```env
PYTHON_API_URL=http://localhost:5000
```

### Python API 서버 환경 변수

Railway/Render/Fly.io에서 다음 환경 변수를 설정하세요:

```
PORT=5000          # Railway는 자동으로 설정 (수정 불필요)
DEBUG=false        # 프로덕션 환경
ENABLE_HF=false   # FREE 플랜 권장 (메모리 절약)
```

**참고**: `.env.example` 파일을 참고하여 환경 변수를 설정할 수 있습니다.

## 4. 로컬 개발

### Python API 서버 실행

```bash
# 가상환경 활성화
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python api_server.py
```

서버는 `http://localhost:5000`에서 실행됩니다.

### Next.js 프론트엔드 실행

```bash
cd reviewalyze

# 의존성 설치
npm install

# 환경 변수 설정
echo "PYTHON_API_URL=http://localhost:5000" > .env.local

# 개발 서버 실행
npm run dev
```

프론트엔드는 `http://localhost:3000`에서 실행됩니다.

## 5. 테스트

### 로컬 테스트

#### Python API 서버 헬스 체크

```bash
curl http://localhost:5000/health
```

또는 브라우저에서 `http://localhost:5000/health` 접속

#### 전체 플로우 테스트 (로컬)

1. Python API 서버 실행: `python api_server.py`
2. Next.js 프론트엔드 실행: `cd reviewalyze && npm run dev`
3. 브라우저에서 `http://localhost:3000` 접속
4. 키워드 CSV 파일 업로드
5. 리뷰 CSV 파일 업로드 (선택사항)
6. "분석 실행" 버튼 클릭
7. 결과 확인

#### 자동화된 로컬 테스트

프로젝트 루트에서 다음 스크립트를 실행하면 환경 확인, 서버 시작, 테스트를 자동으로 수행합니다:

```bash
./test_local.sh
```

### Railway 배포 테스트

#### Railway API 서버 헬스 체크

```bash
curl https://your-app.railway.app/health
```

#### Railway API 엔드포인트 테스트

```bash
curl -X POST https://your-app.railway.app/analyze \
  -F "keywords=@keywords.csv" \
  -F "reviews=@reviews.csv"
```

#### 로컬 프론트엔드와 Railway API 연결 테스트

1. `reviewalyze/.env.local` 파일 수정:
```env
PYTHON_API_URL=https://your-app.railway.app
```

2. Next.js 프론트엔드 실행:
```bash
cd reviewalyze
npm run dev
```

3. 브라우저에서 `http://localhost:3000` 접속하여 Railway API 서버와 통신 확인

### 프로덕션 테스트 (Vercel + Railway)

1. Railway에 Python API 서버 배포 완료
2. Vercel에 Next.js 프론트엔드 배포 완료
3. Vercel 환경 변수 `PYTHON_API_URL` 설정 완료
4. 배포된 프론트엔드 URL 접속
5. 파일 업로드 및 분석 실행
6. 결과 확인

## 6. 문제 해결

### Python API 서버에 연결할 수 없음

- Python API 서버가 실행 중인지 확인
- `PYTHON_API_URL` 환경 변수가 올바르게 설정되었는지 확인
- CORS 설정 확인 (`api_server.py`에서 `CORS(app)` 확인)

### 분석이 실패함

- Python API 서버 로그 확인
- Vercel 함수 로그 확인
- 파일 형식 확인 (CSV 파일이 올바른 형식인지)

### 타임아웃 오류

- Python API 서버의 실행 시간 제한 확인
- 큰 파일의 경우 처리 시간이 오래 걸릴 수 있음

## 7. 프로덕션 체크리스트

### Railway 배포 체크리스트

- [ ] Railway 프로젝트 생성 및 GitHub 연결 완료
- [ ] Railway 환경 변수 설정 완료 (`DEBUG=false`, `ENABLE_HF=false`)
- [ ] Railway 배포 성공 확인
- [ ] Railway 헬스 체크 통과 (`/health` 엔드포인트)
- [ ] Railway API 엔드포인트 테스트 완료 (`/analyze` 엔드포인트)
- [ ] Railway 로그 확인 (오류 없음)

### Vercel 배포 체크리스트

- [ ] Vercel 프로젝트 생성 및 GitHub 연결 완료
- [ ] Vercel 환경 변수 `PYTHON_API_URL` 설정 완료 (Railway URL)
- [ ] Vercel 배포 성공 확인
- [ ] Vercel 프론트엔드에서 Railway API 연결 확인

### 통합 테스트 체크리스트

- [ ] 로컬 프론트엔드 + Railway API 연결 테스트 완료
- [ ] Vercel 프론트엔드 + Railway API 연결 테스트 완료
- [ ] CORS 설정 확인 (Railway API에서 모든 origin 허용)
- [ ] 전체 플로우 테스트 완료 (파일 업로드 → 분석 → 결과 표시)
- [ ] 에러 핸들링 확인 (잘못된 파일 형식, 네트워크 오류 등)
- [ ] 성능 테스트 (응답 시간, 타임아웃 등)

## 8. 추가 리소스

- [로컬 개발 가이드](./LOCAL_SETUP.md): 로컬 환경 설정 및 실행 방법
- [Railway 문서](https://docs.railway.app/): Railway 배포 및 설정 가이드
- [Vercel 문서](https://vercel.com/docs): Vercel 배포 가이드

