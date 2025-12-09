#!/usr/bin/env python3
"""
간단한 Gemini API 요약 기능 테스트
서버가 실행 중이어야 합니다.
"""
import sys
import os

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 직접 함수 테스트
try:
    from api_server import summarize_app_intro
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    print("=" * 60)
    print("Gemini API 요약 함수 직접 테스트")
    print("=" * 60)
    print()
    
    # 테스트용 긴 텍스트
    test_intro = """
    스도쿠는 논리 기반의 숫자 퍼즐 게임입니다. 
    9x9 격자에 1부터 9까지의 숫자를 채워넣어야 하며, 
    각 행, 열, 3x3 박스에는 각 숫자가 한 번씩만 나타나야 합니다.
    이 게임은 두뇌 훈련과 집중력 향상에 도움이 되며, 
    다양한 난이도로 제공되어 초보자부터 전문가까지 즐길 수 있습니다.
    깔끔한 인터페이스와 직관적인 조작으로 누구나 쉽게 플레이할 수 있으며,
    일일 도전 과제와 성취 시스템을 통해 지속적인 동기부여를 제공합니다.
    오프라인 모드도 지원하여 언제 어디서나 즐길 수 있습니다.
    """
    
    print(f"원본 텍스트 길이: {len(test_intro.strip())}자")
    print(f"\n원본 텍스트:\n{test_intro.strip()[:200]}...")
    print("\n" + "-" * 60)
    print("\n요약 생성 중...\n")
    
    # 요약 실행
    summary = summarize_app_intro(test_intro.strip())
    
    print(f"✓ 요약 완료!")
    print(f"\n요약 텍스트 길이: {len(summary)}자")
    print(f"\n요약 결과:\n{summary}")
    print("\n" + "=" * 60)
    
    # Gemini API 키 확인
    gemini_key = os.getenv('GEMINI_API_KEY')
    if gemini_key:
        print(f"\n✓ GEMINI_API_KEY가 설정되어 있습니다.")
    else:
        print(f"\n⚠ GEMINI_API_KEY가 설정되지 않았습니다.")
        print("  원본 텍스트의 앞부분이 반환되었습니다.")
    
except ImportError as e:
    print(f"✗ 모듈을 import할 수 없습니다: {e}")
    print("\n서버를 먼저 실행하거나, api_server.py가 같은 디렉토리에 있는지 확인하세요.")
except Exception as e:
    print(f"✗ 오류 발생: {e}")
    import traceback
    traceback.print_exc()
