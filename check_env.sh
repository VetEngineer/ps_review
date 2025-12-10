#!/bin/bash

# 로컬 환경 확인 스크립트
# Python, Node.js, 필수 파일 존재 여부 확인

echo "=========================================="
echo "로컬 환경 확인 스크립트"
echo "=========================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 체크 결과 저장
ERRORS=0
WARNINGS=0

# 1. Python 확인
echo "1. Python 환경 확인"
echo "-------------------"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓${NC} Python 설치됨: $PYTHON_VERSION"
    
    # Python 버전 확인 (3.8 이상 권장)
    PYTHON_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
    PYTHON_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')
    if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 8 ]; then
        echo -e "  ${GREEN}✓${NC} Python 버전 호환됨 (3.8+)"
    else
        echo -e "  ${YELLOW}⚠${NC} Python 3.8 이상 권장"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} Python3가 설치되지 않았습니다."
    ((ERRORS++))
fi
echo ""

# 2. 가상환경 확인
echo "2. Python 가상환경 확인"
echo "-------------------"
if [ -d "venv" ]; then
    echo -e "${GREEN}✓${NC} venv 폴더 존재"
    
    # 가상환경 활성화 여부 확인
    if [ -n "$VIRTUAL_ENV" ]; then
        echo -e "  ${GREEN}✓${NC} 가상환경 활성화됨: $VIRTUAL_ENV"
    else
        echo -e "  ${YELLOW}⚠${NC} 가상환경이 활성화되지 않았습니다."
        echo -e "  ${YELLOW}  실행: source venv/bin/activate${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} venv 폴더가 없습니다."
    echo -e "  ${YELLOW}  생성: python3 -m venv venv${NC}"
    ((WARNINGS++))
fi
echo ""

# 3. Python 의존성 확인
echo "3. Python 의존성 확인"
echo "-------------------"
if [ -f "requirements.txt" ]; then
    echo -e "${GREEN}✓${NC} requirements.txt 존재"
    
    # 주요 패키지 확인
    if [ -n "$VIRTUAL_ENV" ] || [ -d "venv" ]; then
        if [ -n "$VIRTUAL_ENV" ]; then
            PIP_CMD="pip"
        else
            PIP_CMD="venv/bin/pip"
        fi
        
        if [ -f "$PIP_CMD" ] || command -v "$PIP_CMD" &> /dev/null; then
            echo "  주요 패키지 확인 중..."
            
            # 주요 패키지 목록
            PACKAGES=("flask" "pandas" "torch" "transformers")
            MISSING_PACKAGES=()
            
            for pkg in "${PACKAGES[@]}"; do
                if $PIP_CMD list | grep -qi "^$pkg "; then
                    echo -e "    ${GREEN}✓${NC} $pkg 설치됨"
                else
                    echo -e "    ${YELLOW}⚠${NC} $pkg 미설치"
                    MISSING_PACKAGES+=("$pkg")
                fi
            done
            
            if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
                echo -e "  ${YELLOW}⚠${NC} 일부 패키지가 설치되지 않았습니다."
                echo -e "  ${YELLOW}  실행: pip install -r requirements.txt${NC}"
                ((WARNINGS++))
            fi
        else
            echo -e "  ${YELLOW}⚠${NC} pip를 찾을 수 없습니다."
            ((WARNINGS++))
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} 가상환경을 활성화한 후 다시 확인하세요."
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} requirements.txt 파일이 없습니다."
    ((ERRORS++))
fi
echo ""

# 4. Node.js 확인
echo "4. Node.js 환경 확인"
echo "-------------------"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js 설치됨: $NODE_VERSION"
    
    # Node.js 버전 확인 (16 이상 권장)
    NODE_MAJOR=$(node -p "process.version.match(/^v(\d+)/)[1]")
    if [ "$NODE_MAJOR" -ge 16 ]; then
        echo -e "  ${GREEN}✓${NC} Node.js 버전 호환됨 (16+)"
    else
        echo -e "  ${YELLOW}⚠${NC} Node.js 16 이상 권장"
        ((WARNINGS++))
    fi
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo -e "  ${GREEN}✓${NC} npm 설치됨: $NPM_VERSION"
    else
        echo -e "  ${RED}✗${NC} npm이 설치되지 않았습니다."
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} Node.js가 설치되지 않았습니다."
    ((ERRORS++))
fi
echo ""

# 5. Next.js 의존성 확인
echo "5. Next.js 의존성 확인"
echo "-------------------"
if [ -d "reviewalyze" ]; then
    echo -e "${GREEN}✓${NC} reviewalyze 폴더 존재"
    
    if [ -f "reviewalyze/package.json" ]; then
        echo -e "  ${GREEN}✓${NC} package.json 존재"
        
        if [ -d "reviewalyze/node_modules" ]; then
            echo -e "  ${GREEN}✓${NC} node_modules 존재"
        else
            echo -e "  ${YELLOW}⚠${NC} node_modules가 없습니다."
            echo -e "  ${YELLOW}  실행: cd reviewalyze && npm install${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "  ${RED}✗${NC} package.json 파일이 없습니다."
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} reviewalyze 폴더가 없습니다."
    ((ERRORS++))
fi
echo ""

# 6. 필수 파일 확인
echo "6. 필수 파일 확인"
echo "-------------------"
REQUIRED_FILES=("api_server.py" "analyse.py" "requirements.txt" "railway.json" "nixpacks.toml" "Procfile")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file 존재"
    else
        echo -e "${RED}✗${NC} $file 없음"
        ((ERRORS++))
    fi
done
echo ""

# 7. 데이터 파일 확인
echo "7. 데이터 파일 확인"
echo "-------------------"
DATA_FILES=("reviews.csv" "keywords.csv")
for file in "${DATA_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file 존재"
    else
        echo -e "${YELLOW}⚠${NC} $file 없음 (선택사항, API로 업로드 가능)"
        ((WARNINGS++))
    fi
done
echo ""

# 8. 환경 변수 파일 확인
echo "8. 환경 변수 파일 확인"
echo "-------------------"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env 파일 존재"
else
    echo -e "${YELLOW}⚠${NC} .env 파일 없음 (선택사항)"
    if [ -f ".env.example" ]; then
        echo -e "  ${YELLOW}  참고: .env.example 파일을 복사하여 .env 파일을 생성하세요${NC}"
    fi
    ((WARNINGS++))
fi

if [ -f "reviewalyze/.env.local" ]; then
    echo -e "${GREEN}✓${NC} reviewalyze/.env.local 존재"
else
    echo -e "${YELLOW}⚠${NC} reviewalyze/.env.local 없음"
    echo -e "  ${YELLOW}  로컬 개발 시 PYTHON_API_URL 설정 필요${NC}"
    ((WARNINGS++))
fi
echo ""

# 결과 요약
echo "=========================================="
echo "결과 요약"
echo "=========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ 모든 확인 항목 통과${NC}"
    echo ""
    echo "다음 단계:"
    echo "  1. Python API 서버 실행: python api_server.py"
    echo "  2. Next.js 프론트엔드 실행: cd reviewalyze && npm run dev"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ 경고 $WARNINGS 개 (실행 가능하지만 권장사항 확인)${NC}"
    echo ""
    echo "경고 사항을 확인하고 필요시 수정하세요."
    exit 0
else
    echo -e "${RED}✗ 오류 $ERRORS 개, 경고 $WARNINGS 개${NC}"
    echo ""
    echo "오류를 수정한 후 다시 실행하세요."
    exit 1
fi











