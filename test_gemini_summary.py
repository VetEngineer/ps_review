#!/usr/bin/env python3
"""
Gemini API 요약 기능 테스트 스크립트
"""
import requests
import json
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# API 서버 URL (포트 확인)
API_URL = os.getenv('PYTHON_API_URL', 'http://localhost:5001')
if not API_URL.startswith('http'):
    API_URL = f'http://{API_URL}'

print(f"API 서버 URL: {API_URL}")
print("-" * 60)

# 1. 헬스 체크
print("\n1. 헬스 체크...")
try:
    response = requests.get(f"{API_URL}/health", timeout=5)
    if response.status_code == 200:
        health_data = response.json()
        print(f"✓ 서버 상태: {health_data.get('status')}")
        print(f"  - Gemini 사용 가능: {health_data.get('gemini_available', False)}")
        print(f"  - HuggingFace 사용 가능: {health_data.get('hf_available', False)}")
    else:
        print(f"✗ 서버 응답 오류: {response.status_code}")
        exit(1)
except requests.exceptions.ConnectionError:
    print("✗ 서버에 연결할 수 없습니다.")
    print(f"  서버가 {API_URL}에서 실행 중인지 확인하세요.")
    exit(1)
except Exception as e:
    print(f"✗ 오류 발생: {e}")
    exit(1)

# 2. Gemini API 키 확인
print("\n2. Gemini API 키 확인...")
gemini_key = os.getenv('GEMINI_API_KEY')
if gemini_key:
    print(f"✓ GEMINI_API_KEY가 설정되어 있습니다. (길이: {len(gemini_key)}자)")
else:
    print("⚠ GEMINI_API_KEY가 설정되지 않았습니다.")
    print("  요약 기능은 원본 텍스트를 반환합니다.")

# 3. 앱 검색 및 요약 테스트
print("\n3. 앱 검색 및 요약 테스트...")
test_keyword = "스도쿠"
print(f"검색 키워드: {test_keyword}")

try:
    payload = {
        "keyword": test_keyword,
        "max_apps": 3,  # 테스트를 위해 3개만 요청
        "max_reviews": 10  # 리뷰는 적게 수집
    }
    
    print(f"\n요청 전송 중... (이 작업은 시간이 걸릴 수 있습니다)")
    response = requests.post(
        f"{API_URL}/api/search-and-collect",
        json=payload,
        timeout=60
    )
    
    if response.status_code == 200:
        data = response.json()
        
        if data.get('success'):
            apps = data.get('apps', [])
            print(f"\n✓ 검색 성공: {len(apps)}개 앱 발견")
            
            if apps:
                print("\n" + "=" * 60)
                print("앱 소개 요약 결과:")
                print("=" * 60)
                
                for i, app in enumerate(apps[:3], 1):  # 최대 3개만 표시
                    print(f"\n[{i}] {app.get('title', '앱 이름 없음')}")
                    print(f"    App ID: {app.get('app_id', 'N/A')}")
                    
                    # 원본 소개
                    intro = app.get('intro', '')
                    if intro:
                        intro_preview = intro[:100] + "..." if len(intro) > 100 else intro
                        print(f"    원본 소개 (길이: {len(intro)}자):")
                        print(f"    {intro_preview}")
                    
                    # AI 요약
                    ai_summary = app.get('ai_summary', '')
                    if ai_summary:
                        print(f"    ✓ AI 요약 (길이: {len(ai_summary)}자):")
                        print(f"    {ai_summary}")
                    else:
                        print(f"    ⚠ AI 요약이 없습니다.")
                    
                    print("-" * 60)
            else:
                print("⚠ 검색된 앱이 없습니다.")
        else:
            print(f"✗ 검색 실패: {data.get('error', '알 수 없는 오류')}")
    else:
        print(f"✗ HTTP 오류: {response.status_code}")
        try:
            error_data = response.json()
            print(f"  오류 메시지: {error_data.get('error', '알 수 없는 오류')}")
        except:
            print(f"  응답: {response.text[:200]}")
            
except requests.exceptions.Timeout:
    print("✗ 요청 시간 초과 (60초)")
except Exception as e:
    print(f"✗ 오류 발생: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("테스트 완료")
