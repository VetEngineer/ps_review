#!/usr/bin/env python3
"""
누락된 패키지 설치 스크립트
"""
import subprocess
import sys

packages = [
    "google-generativeai",
    "beautifulsoup4",
    "torch",
    "transformers",
    "sentencepiece",
    "python-dotenv"
]

print("=" * 60)
print("누락된 패키지 설치 중...")
print("=" * 60)
print()

for package in packages:
    print(f"설치 중: {package}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✓ {package} 설치 완료")
    except subprocess.CalledProcessError as e:
        print(f"✗ {package} 설치 실패: {e}")
    print()

print("=" * 60)
print("설치 완료!")
print("=" * 60)
print()
print("설치된 패키지 확인:")
subprocess.call([sys.executable, "-m", "pip", "list", "|", "grep", "-E", "(google-generativeai|beautifulsoup4|torch|transformers|sentencepiece|python-dotenv)"])
