#!/bin/bash

# 의존성 설치 스크립트

cd "$(dirname "$0")"

echo "=========================================="
echo "의존성 설치 중..."
echo "=========================================="
echo ""

# 가상환경 활성화
if [ -d "venv" ]; then
    echo "가상환경 활성화 중..."
    source venv/bin/activate
else
    echo "가상환경이 없습니다. 생성 중..."
    python3 -m venv venv
    source venv/bin/activate
fi

# pip 업그레이드
echo "pip 업그레이드 중..."
pip install --upgrade pip

# requirements.txt 설치
echo ""
echo "requirements.txt 패키지 설치 중..."
pip install -r requirements.txt

echo ""
echo "=========================================="
echo "설치 완료!"
echo "=========================================="
echo ""
echo "설치된 주요 패키지 확인:"
pip list | grep -E "(google-generativeai|beautifulsoup4|flask|pandas)"

