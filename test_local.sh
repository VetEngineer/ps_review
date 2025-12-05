#!/bin/bash

# 로컬 테스트 자동화 스크립트
# 환경 확인, 서버 시작, 테스트를 자동으로 수행

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "로컬 테스트 자동화 스크립트"
echo "=========================================="
echo ""

# 함수: 서버 프로세스 종료
cleanup() {
    echo ""
    echo -e "${YELLOW}정리 중...${NC}"
    
    # Python API 서버 종료
    if [ -n "$PYTHON_PID" ]; then
        echo "Python API 서버 종료 중 (PID: $PYTHON_PID)..."
        kill $PYTHON_PID 2>/dev/null || true
    fi
    
    # Next.js 서버 종료
    if [ -n "$NEXTJS_PID" ]; then
        echo "Next.js 서버 종료 중 (PID: $NEXTJS_PID)..."
        kill $NEXTJS_PID 2>/dev/null || true
    fi
    
    # 포트 사용 중인 프로세스 종료 (선택사항)
    if [ "$1" = "force" ]; then
        echo "포트 정리 중..."
        lsof -ti:5000 | xargs kill -9 2>/dev/null || true
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    fi
    
    echo -e "${GREEN}정리 완료${NC}"
    exit 0
}

# 시그널 핸들러 등록
trap cleanup EXIT INT TERM

# 1. 환경 확인
echo -e "${BLUE}1. 환경 확인${NC}"
echo "-------------------"
if [ -f "check_env.sh" ]; then
    bash check_env.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}환경 확인 실패. 문제를 해결한 후 다시 시도하세요.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ check_env.sh 파일이 없습니다. 환경 확인을 건너뜁니다.${NC}"
fi
echo ""

# 2. Python 가상환경 확인 및 활성화
echo -e "${BLUE}2. Python 가상환경 확인${NC}"
echo "-------------------"
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠ venv 폴더가 없습니다. 생성 중...${NC}"
    python3 -m venv venv
fi

if [ -z "$VIRTUAL_ENV" ]; then
    echo "가상환경 활성화 중..."
    source venv/bin/activate
    echo -e "${GREEN}✓ 가상환경 활성화됨${NC}"
else
    echo -e "${GREEN}✓ 가상환경이 이미 활성화됨${NC}"
fi
echo ""

# 3. Python 의존성 확인
echo -e "${BLUE}3. Python 의존성 확인${NC}"
echo "-------------------"
if ! pip show flask &>/dev/null; then
    echo "Python 의존성 설치 중..."
    pip install --upgrade pip
    pip install -r requirements.txt
    echo -e "${GREEN}✓ 의존성 설치 완료${NC}"
else
    echo -e "${GREEN}✓ Python 의존성 확인됨${NC}"
fi
echo ""

# 4. Next.js 의존성 확인
echo -e "${BLUE}4. Next.js 의존성 확인${NC}"
echo "-------------------"
if [ ! -d "reviewalyze/node_modules" ]; then
    echo "Next.js 의존성 설치 중..."
    cd reviewalyze
    npm install
    cd ..
    echo -e "${GREEN}✓ Next.js 의존성 설치 완료${NC}"
else
    echo -e "${GREEN}✓ Next.js 의존성 확인됨${NC}"
fi
echo ""

# 5. 환경 변수 파일 확인
echo -e "${BLUE}5. 환경 변수 파일 확인${NC}"
echo "-------------------"
if [ ! -f "reviewalyze/.env.local" ]; then
    if [ -f "reviewalyze/.env.example" ]; then
        echo "reviewalyze/.env.local 파일 생성 중..."
        cp reviewalyze/.env.example reviewalyze/.env.local
        echo -e "${GREEN}✓ .env.local 파일 생성됨${NC}"
    else
        echo -e "${YELLOW}⚠ .env.example 파일이 없습니다.${NC}"
    fi
else
    echo -e "${GREEN}✓ .env.local 파일 존재${NC}"
fi
echo ""

# 6. 포트 확인 및 정리
echo -e "${BLUE}6. 포트 확인${NC}"
echo "-------------------"
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ 포트 5000이 사용 중입니다.${NC}"
    read -p "포트를 정리하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:5000 | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✓ 포트 5000 정리 완료${NC}"
    fi
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ 포트 3000이 사용 중입니다.${NC}"
    read -p "포트를 정리하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✓ 포트 3000 정리 완료${NC}"
    fi
fi
echo ""

# 7. Python API 서버 시작
echo -e "${BLUE}7. Python API 서버 시작${NC}"
echo "-------------------"
echo "Python API 서버를 백그라운드에서 시작합니다..."
python api_server.py > /tmp/python_api.log 2>&1 &
PYTHON_PID=$!
echo "Python API 서버 PID: $PYTHON_PID"

# 서버가 시작될 때까지 대기
echo "서버 시작 대기 중..."
for i in {1..30}; do
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Python API 서버 시작 완료 (http://localhost:5000)${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Python API 서버 시작 실패 (30초 타임아웃)${NC}"
        echo "로그 확인: tail -f /tmp/python_api.log"
        exit 1
    fi
    sleep 1
done
echo ""

# 8. Next.js 프론트엔드 시작
echo -e "${BLUE}8. Next.js 프론트엔드 시작${NC}"
echo "-------------------"
echo "Next.js 프론트엔드를 백그라운드에서 시작합니다..."
cd reviewalyze
npm run dev > /tmp/nextjs.log 2>&1 &
NEXTJS_PID=$!
cd ..
echo "Next.js 서버 PID: $NEXTJS_PID"

# 서버가 시작될 때까지 대기
echo "서버 시작 대기 중..."
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Next.js 프론트엔드 시작 완료 (http://localhost:3000)${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Next.js 프론트엔드 시작 실패 (60초 타임아웃)${NC}"
        echo "로그 확인: tail -f /tmp/nextjs.log"
        exit 1
    fi
    sleep 1
done
echo ""

# 9. 헬스 체크 테스트
echo -e "${BLUE}9. 헬스 체크 테스트${NC}"
echo "-------------------"
echo "Python API 서버 헬스 체크 중..."
HEALTH_RESPONSE=$(curl -s http://localhost:5000/health)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✓ 헬스 체크 성공${NC}"
    echo "응답: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ 헬스 체크 실패${NC}"
    echo "응답: $HEALTH_RESPONSE"
fi
echo ""

# 10. 최종 안내
echo "=========================================="
echo -e "${GREEN}로컬 테스트 환경 준비 완료!${NC}"
echo "=========================================="
echo ""
echo "서버 정보:"
echo "  - Python API 서버: http://localhost:5000"
echo "  - Next.js 프론트엔드: http://localhost:3000"
echo ""
echo "로그 확인:"
echo "  - Python API: tail -f /tmp/python_api.log"
echo "  - Next.js: tail -f /tmp/nextjs.log"
echo ""
echo "서버를 중지하려면 Ctrl+C를 누르세요."
echo ""

# 사용자 입력 대기 (Ctrl+C로 종료)
echo "서버가 실행 중입니다. 브라우저에서 http://localhost:3000 을 열어 테스트하세요."
echo "종료하려면 Ctrl+C를 누르세요."
echo ""

# 무한 대기
wait
