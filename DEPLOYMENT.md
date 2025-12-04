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
   - `PORT`: 5000 (자동 설정됨)
   - `DEBUG`: false
6. `api_server.py`를 메인 파일로 설정:
   - Settings > Deploy > Start Command: `python api_server.py`
   - 또는 `Procfile` 생성: `web: python api_server.py`
7. 배포 완료 후 생성된 URL 확인 (예: `https://your-app.railway.app`)

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
PORT=5000
DEBUG=false
```

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

### Python API 서버 헬스 체크

```bash
curl http://localhost:5000/health
```

또는 브라우저에서 `http://localhost:5000/health` 접속

### 전체 플로우 테스트

1. 프론트엔드 접속: `http://localhost:3000`
2. 키워드 CSV 파일 업로드
3. 리뷰 CSV 파일 업로드 (선택사항)
4. "분석 실행" 버튼 클릭
5. 결과 확인

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

- [ ] Python API 서버 배포 완료
- [ ] Vercel 환경 변수 `PYTHON_API_URL` 설정 완료
- [ ] CORS 설정 확인
- [ ] 헬스 체크 엔드포인트 동작 확인
- [ ] 전체 플로우 테스트 완료
- [ ] 에러 핸들링 확인

