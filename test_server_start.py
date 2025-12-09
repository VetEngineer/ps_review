#!/usr/bin/env python3
"""서버 시작 시 모듈 import 테스트"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

print("=" * 60)
print("서버 시작 시 모듈 import 테스트")
print("=" * 60)
print()

# .env 파일 로드
try:
    from dotenv import load_dotenv
    load_dotenv()
    logger.info(".env 파일 로드 완료")
except ImportError:
    logger.warning("python-dotenv 패키지가 설치되지 않았습니다.")

# 크롤링 모듈 import 테스트
CRAWLER_AVAILABLE = False
print("\n크롤링 모듈 import 테스트:")
print("-" * 60)
try:
    from playstore_crawler import (
        search_apps,
        get_app_reviews,
        get_multiple_app_reviews,
        merge_app_info_and_reviews
    )
    CRAWLER_AVAILABLE = True
    logger.info("크롤링 기능이 활성화되었습니다.")
    print(f"✓ CRAWLER_AVAILABLE = {CRAWLER_AVAILABLE}")
except ImportError as e:
    logger.error(f"playstore_crawler.py 모듈을 import할 수 없습니다: {e}")
    logger.warning("크롤링 기능이 비활성화됩니다.")
    print(f"✗ ImportError: {e}")
except Exception as e:
    logger.error(f"playstore_crawler 모듈 로드 중 예상치 못한 오류: {e}", exc_info=True)
    print(f"✗ Exception: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print(f"최종 상태: CRAWLER_AVAILABLE = {CRAWLER_AVAILABLE}")
print("=" * 60)
