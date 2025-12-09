#!/bin/bash

# 문제 해결 스크립트
# 1. 포트 5000 충돌 해결
# 2. PyTorch 재설치

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "문제 해결 스크립트"
echo "=========================================="
echo ""

# 프로젝트 루트로 이동
cd "$(dirname "${BASH_SOURCE[0]}")"

# 1. 포트 5000 문제 해결
echo -e "${BLUE}1. 포트 5000 충돌 확인${NC}"
echo "-------------------"
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PORT_USER=$(lsof -Pi :5000 -sTCP:LISTEN | tail -1 | awk '{print $1}')
    PORT_PID=$(lsof -Pi :5000 -sTCP:LISTEN | tail -1 | awk '{print $2}')
    
    echo -e "${YELLOW}⚠ 포트 5000이 사용 중입니다.${NC}"
    echo "  사용 중인 프로세스: $PORT_USER (PID: $PORT_PID)"
    
    if [ "$PORT_USER" = "ControlCe" ]; then
        echo -e "${YELLOW}  macOS AirPlay Receiver가 포트 5000을 사용 중입니다.${NC}"
        echo ""
        echo "해결 방법:"
        echo "  1. 시스템 설정 > 일반 > AirPlay 수신기 > 끄기"
        echo "  2. 또는 다른 포트 사용 (권장)"
        echo ""
        read -p "포트 5001을 사용하시겠습니까? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            ALTERNATIVE_PORT=5001
            echo -e "${GREEN}✓ 포트 $ALTERNATIVE_PORT 사용${NC}"
        else
            echo -e "${YELLOW}포트 5000을 사용하려면 AirPlay Receiver를 비활성화하세요.${NC}"
            ALTERNATIVE_PORT=5000
        fi
    else
        read -p "프로세스를 종료하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $PORT_PID 2>/dev/null || true
            echo -e "${GREEN}✓ 프로세스 종료됨${NC}"
            ALTERNATIVE_PORT=5000
        else
            ALTERNATIVE_PORT=5001
            echo -e "${GREEN}✓ 포트 $ALTERNATIVE_PORT 사용${NC}"
        fi
    fi
else
    echo -e "${GREEN}✓ 포트 5000 사용 가능${NC}"
    ALTERNATIVE_PORT=5000
fi
echo ""

# 2. 가상환경 확인
echo -e "${BLUE}2. 가상환경 확인${NC}"
echo "-------------------"
if [ ! -d "venv" ]; then
    echo "가상환경 생성 중..."
    python3 -m venv venv
    echo -e "${GREEN}✓ 가상환경 생성 완료${NC}"
fi

if [ -z "$VIRTUAL_ENV" ]; then
    echo "가상환경 활성화 중..."
    source venv/bin/activate
    echo -e "${GREEN}✓ 가상환경 활성화됨${NC}"
else
    echo -e "${GREEN}✓ 가상환경이 이미 활성화됨${NC}"
fi
echo ""

# 3. PyTorch 설치 확인 및 재설치
echo -e "${BLUE}3. PyTorch 및 의존성 확인${NC}"
echo "-------------------"
if ! python -c "import torch" 2>/dev/null; then
    echo "PyTorch가 설치되지 않았습니다. 설치 중..."
    echo "이 작업은 시간이 걸릴 수 있습니다..."
    
    pip install --upgrade pip
    pip install --no-cache-dir -r requirements.txt
    
    echo ""
    echo "설치 확인 중..."
    if python -c "import torch; print('PyTorch version:', torch.__version__)" 2>/dev/null; then
        echo -e "${GREEN}✓ PyTorch 설치 완료${NC}"
    else
        echo -e "${RED}✗ PyTorch 설치 실패${NC}"
        echo "수동으로 설치해주세요: pip install -r requirements.txt"
        exit 1
    fi
else
    TORCH_VERSION=$(python -c "import torch; print(torch.__version__)" 2>/dev/null)
    echo -e "${GREEN}✓ PyTorch 설치됨: $TORCH_VERSION${NC}"
fi
echo ""

# 4. 환경 변수 파일 업데이트
echo -e "${BLUE}4. 환경 변수 파일 업데이트${NC}"
echo "-------------------"
if [ "$ALTERNATIVE_PORT" != "5000" ]; then
    if [ ! -f ".env" ]; then
        cp .env.example .env 2>/dev/null || true
    fi
    
    # .env 파일에 PORT 업데이트
    if [ -f ".env" ]; then
        if grep -q "^PORT=" .env; then
            sed -i.bak "s/^PORT=.*/PORT=$ALTERNATIVE_PORT/" .env
        else
            echo "PORT=$ALTERNATIVE_PORT" >> .env
        fi
        echo -e "${GREEN}✓ .env 파일 업데이트됨 (PORT=$ALTERNATIVE_PORT)${NC}"
    fi
    
    # reviewalyze/.env.local 파일도 업데이트
    if [ ! -f "reviewalyze/.env.local" ]; then
        cp reviewalyze/.env.example reviewalyze/.env.local 2>/dev/null || true
    fi
    
    if [ -f "reviewalyze/.env.local" ]; then
        NEW_API_URL="http://localhost:$ALTERNATIVE_PORT"
        if grep -q "^PYTHON_API_URL=" reviewalyze/.env.local; then
            sed -i.bak "s|^PYTHON_API_URL=.*|PYTHON_API_URL=$NEW_API_URL|" reviewalyze/.env.local
        else
            echo "PYTHON_API_URL=$NEW_API_URL" >> reviewalyze/.env.local
        fi
        echo -e "${GREEN}✓ reviewalyze/.env.local 파일 업데이트됨 (PYTHON_API_URL=$NEW_API_URL)${NC}"
    fi
else
    echo -e "${GREEN}✓ 기본 포트 5000 사용${NC}"
fi
echo ""

# 5. 최종 안내
echo "=========================================="
echo -e "${GREEN}문제 해결 완료!${NC}"
echo "=========================================="
echo ""
echo "다음 명령어로 서버를 시작하세요:"
echo ""
if [ "$ALTERNATIVE_PORT" != "5000" ]; then
    echo "  PORT=$ALTERNATIVE_PORT python api_server.py"
    echo ""
    echo "또는 .env 파일을 사용:"
    echo "  python api_server.py"
else
    echo "  python api_server.py"
fi
echo ""
echo "서버 URL: http://localhost:$ALTERNATIVE_PORT"
echo ""







