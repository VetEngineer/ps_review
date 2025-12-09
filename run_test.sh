#!/bin/bash

# Gemini API 요약 기능 테스트 실행 스크립트

cd "$(dirname "$0")"

echo "=========================================="
echo "Gemini API 요약 기능 테스트"
echo "=========================================="
echo ""

# 가상환경 활성화
if [ -d "venv" ]; then
    echo "가상환경 활성화 중..."
    source venv/bin/activate
fi

# Python 경로 확인
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

echo "Python 명령어: $PYTHON_CMD"
echo ""

# 테스트 스크립트 실행
echo "테스트 스크립트 실행 중..."
echo ""

$PYTHON_CMD test_gemini_summary.py

echo ""
echo "=========================================="
echo "테스트 완료"
echo "=========================================="
