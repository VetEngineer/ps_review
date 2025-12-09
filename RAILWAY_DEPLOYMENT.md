# Railway 배포 가이드

## 필수 사항 확인

### 1. requirements.txt 확인
모든 필수 패키지가 포함되어 있습니다:
- ✅ `torch>=2.2.0` - PyTorch (HuggingFace 모델 필수)
- ✅ `transformers>=4.30.0` - HuggingFace Transformers
- ✅ `sentencepiece>=0.1.99` - 토크나이저
- ✅ `pandas>=2.0.0` - 데이터 처리
- ✅ `flask>=3.0.0` - 웹 프레임워크
- ✅ `flask-cors>=4.0.0` - CORS 지원
- ✅ `google-play-scraper>=1.2.0` - Play Store 크롤링
- ✅ `beautifulsoup4>=4.12.0` - HTML 파싱
- ✅ `requests>=2.31.0` - HTTP 요청
- ✅ `lxml>=4.9.0` - XML/HTML 파서
- ✅ `google-generativeai>=0.3.0` - Gemini API
- ✅ `python-dotenv>=1.0.0` - 환경 변수 관리

### 2. 필수 파일 확인
- ✅ `requirements.txt` - 모든 의존성 포함
- ✅ `Procfile` - `web: python api_server.py`
- ✅ `nixpacks.toml` - 빌드 설정

## Railway 배포 단계

### 1. Railway 프로젝트 생성

1. [Railway](https://railway.app)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 연결 또는 "Deploy from GitHub repo" 선택
4. 저장소 선택

### 2. 환경 변수 설정 (중요!)

Railway 대시보드에서 **Variables** 탭으로 이동하여 다음 환경 변수를 설정하세요:

#### 필수 환경 변수

```bash
# 서버 포트 (Railway가 자동 할당하므로 설정 불필요하지만, 명시적으로 설정 가능)
PORT=5000

# 디버그 모드 (프로덕션에서는 false)
DEBUG=false

# ⚠️ 중요: HuggingFace 모델 활성화 (감정 분석 필수)
ENABLE_HF=true

# Gemini API 키 (앱 소개 요약 기능용)
GEMINI_API_KEY=your-gemini-api-key-here
```

#### 환경 변수 설명

- **ENABLE_HF=true**: 
  - **반드시 `true`로 설정해야 합니다!**
  - 이 값이 `false`이면 HuggingFace 모델이 로드되지 않아 감정 분석이 작동하지 않습니다.
  - 별점 기반 분석만 수행됩니다.

- **GEMINI_API_KEY**: 
  - Gemini API 키 (앱 소개 요약 기능용)
  - 없으면 앱 소개 요약이 원본 텍스트로 대체됩니다.

### 3. 빌드 및 배포

Railway가 자동으로:
1. `requirements.txt`를 읽어 모든 패키지 설치
2. `Procfile`을 사용하여 서버 시작
3. `nixpacks.toml` 설정에 따라 빌드

### 4. 배포 확인

배포 완료 후:

1. **헬스 체크**:
   ```
   https://your-app.railway.app/health
   ```

2. **예상 응답**:
   ```json
   {
     "status": "healthy",
     "hf_available": true,
     "model_loaded": true,
     "gemini_available": true
   }
   ```

3. **로그 확인**:
   Railway 대시보드의 **Deployments** 탭에서 로그를 확인하세요.
   다음 메시지가 보여야 합니다:
   ```
   감성분석 모델 초기화 중...
   감성분석 모델 로드 완료
   ```

## 문제 해결

### 문제 1: HuggingFace 모델이 로드되지 않음

**증상**: 로그에 "HuggingFace 모델 로드를 건너뜁니다" 메시지

**해결책**:
1. Railway 환경 변수에서 `ENABLE_HF=true` 확인
2. 대소문자 구분 없이 `true`로 설정되어 있는지 확인
3. 재배포

### 문제 2: 메모리 부족 오류

**증상**: 배포 중 또는 런타임에 메모리 오류 발생

**해결책**:
1. Railway 플랜 업그레이드 고려 (HuggingFace 모델은 메모리를 많이 사용)
2. 또는 `ENABLE_HF=false`로 설정 (별점 기반 분석만 사용, 감정 분석 기능 제한)

### 문제 3: 빌드 시간이 너무 김

**증상**: PyTorch 설치에 시간이 오래 걸림

**해결책**:
- 정상적인 현상입니다. PyTorch는 큰 패키지이므로 설치에 시간이 걸립니다.
- Railway는 빌드 결과를 캐시하므로 이후 배포는 더 빠릅니다.

## 예상 빌드 시간

- **첫 배포**: 5-10분 (PyTorch 설치 포함)
- **이후 배포**: 2-5분 (캐시 사용)

## 메모리 요구사항

- **최소**: 512MB RAM
- **권장**: 1GB RAM 이상
- HuggingFace 모델 로드 시 약 500MB-1GB 메모리 사용

## 참고사항

1. **첫 배포 시 모델 다운로드**: 
   - HuggingFace 모델이 처음 로드될 때 다운로드되므로 시간이 걸릴 수 있습니다.
   - 모델은 캐시되어 이후에는 빠르게 로드됩니다.

2. **Railway 무료 플랜 제한**:
   - 무료 플랜은 제한된 리소스를 제공합니다.
   - 프로덕션 환경에서는 유료 플랜 사용을 권장합니다.

3. **환경 변수 보안**:
   - `GEMINI_API_KEY`는 민감한 정보이므로 Railway의 환경 변수 기능을 사용하세요.
   - 코드에 직접 포함하지 마세요.

