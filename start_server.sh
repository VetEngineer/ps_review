#!/bin/bash

# 서버 시작 스크립트 (포트 충돌 해결)

# 포트 확인 및 대체 포트 선택
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠ 포트 5000이 사용 중입니다. 포트 5001을 사용합니다."
    PORT=5001
else
    PORT=5000
fi

# 가상환경 활성화
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "오류: venv 폴더를 찾을 수 없습니다."
    exit 1
fi

# 환경 변수 설정
export PORT=$PORT
export DEBUG=false
export ENABLE_HF=false

echo "서버 시작 중..."
echo "포트: $PORT"
echo "URL: http://localhost:$PORT"
echo ""
echo "종료하려면 Ctrl+C를 누르세요."
echo ""

# 서버 실행
python api_server.py
