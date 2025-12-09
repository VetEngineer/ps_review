"""
구글 플레이 스토어 크롤링 모듈
- 앱 검색
- 앱 정보 수집
- 리뷰 수집
"""

import requests
from bs4 import BeautifulSoup
from google_play_scraper import Sort, reviews, app as get_app_info
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


def mask_username(name: str) -> str:
    """사용자명 마스킹"""
    if not isinstance(name, str):
        return name
    
    if len(name) <= 1:
        return "*"
    else:
        return name[0] + "*" * (len(name) - 1)


def search_apps(keyword: str, max_results: int = 30) -> List[Dict]:
    """
    구글 플레이 스토어에서 키워드로 앱 검색
    
    Args:
        keyword: 검색 키워드
        max_results: 최대 결과 수 (기본값: 30)
    
    Returns:
        앱 정보 리스트 (app_id, title, img_link, intro, rate, download 포함)
    """
    try:
        url = "https://play.google.com"
        link = f"https://play.google.com/store/search?q={keyword}&c=apps"
        
        logger.info(f'앱 검색 시작: keyword={keyword}')
        
        response = requests.get(link)
        response.raise_for_status()
        
        html = response.text
        soup = BeautifulSoup(html, 'lxml')
        
        # 앱 리스트 컨테이너 찾기
        app_list = soup.find('div', attrs={'class': 'fUEl2e NIkkXb'})
        if not app_list:
            logger.warning('앱 리스트를 찾을 수 없습니다.')
            return []
        
        g_list = app_list.find_all('div', attrs={'class': 'ULeU3b'})
        
        link_list = []
        app_ids = []
        
        for item in g_list:
            try:
                link_tag = item.find('a')
                if not link_tag or 'href' not in link_tag.attrs:
                    continue
                    
                href = link_tag['href']
                g_link = url + href
                link_list.append(g_link)
                
                # app_id 추출
                if 'id=' in href:
                    app_id = href.split('id=')[1].split('&')[0]
                    app_ids.append(app_id)
            except Exception as e:
                logger.warning(f'앱 링크 파싱 오류: {e}')
                continue
        
        # 최대 결과 수만큼만 가져오기
        link_list = link_list[:max_results]
        app_ids = app_ids[:max_results]
        
        logger.info(f'앱 ID 추출 완료: {len(app_ids)}개')
        
        # 각 앱의 상세 정보 수집
        result = []
        for idx, (app_link, app_id) in enumerate(zip(link_list, app_ids), 1):
            try:
                logger.info(f'앱 정보 수집 중 ({idx}/{len(app_ids)}): {app_id}')
                
                response = requests.get(app_link)
                response.raise_for_status()
                
                html = response.text
                soup = BeautifulSoup(html, 'lxml')
                
                # 앱 정보 추출
                title_elem = soup.find('span', attrs={'class': 'AfwdI'})
                title = title_elem.text if title_elem else '알 수 없음'
                
                img_elem = soup.select_one('div > img')
                img_link = img_elem['src'] if img_elem and 'src' in img_elem.attrs else ''
                
                intro_elem = soup.find('div', attrs={'class': 'bARER'})
                intro = intro_elem.text if intro_elem else ''
                
                # 평점 및 다운로드 수 추출
                box = soup.find('div', attrs={'class': 'w7Iutd'})
                grade = '0'
                d_num = '0'
                
                if box:
                    wvq_ob = box.find_all('div', attrs={'class': 'wVqUob'})
                    if len(wvq_ob) >= 1:
                        grade_text = wvq_ob[0].text
                        if 'star' in grade_text:
                            grade = grade_text.split('star')[0].strip()
                    if len(wvq_ob) >= 2:
                        download_text = wvq_ob[1].text
                        if '+' in download_text:
                            d_num = download_text.split('+')[0].strip()
                
                result.append({
                    'app_id': app_id,
                    'title': title,
                    'img_link': img_link,
                    'intro': intro,
                    'rate': grade,
                    'download': d_num
                })
                
            except Exception as e:
                logger.error(f'앱 정보 수집 오류 ({app_id}): {e}')
                # 오류가 발생해도 기본 정보는 추가
                result.append({
                    'app_id': app_id,
                    'title': '알 수 없음',
                    'img_link': '',
                    'intro': '',
                    'rate': '0',
                    'download': '0'
                })
                continue
        
        logger.info(f'앱 검색 완료: {len(result)}개')
        return result
        
    except Exception as e:
        logger.error(f'앱 검색 오류: {e}', exc_info=True)
        return []


def get_app_reviews(
    app_id: str,
    lang: str = 'ko',
    country: str = 'kr',
    max_reviews: int = 150,
    months: int = 6
) -> pd.DataFrame:
    """
    앱의 리뷰를 수집
    
    Args:
        app_id: 앱 ID
        lang: 언어 (기본값: 'ko')
        country: 국가 (기본값: 'kr')
        max_reviews: 최대 리뷰 수 (기본값: 150)
        months: 수집할 기간 (개월, 기본값: 6)
    
    Returns:
        리뷰 데이터프레임 (reviewId, content, score, date 포함)
    """
    try:
        logger.info(f'리뷰 수집 시작: app_id={app_id}, max_reviews={max_reviews}, months={months}')
        
        # 날짜 기준 계산
        target_date = datetime.now() - timedelta(days=months * 30)
        
        # 리뷰 수집 (최대 300개까지 가져와서 필터링)
        review_count = max_reviews * 2  # 필터링을 위해 더 많이 수집
        review_list, _ = reviews(
            app_id,
            lang=lang,
            country=country,
            sort=Sort.NEWEST,
            count=review_count
        )
        
        if not review_list:
            logger.warning(f'리뷰를 찾을 수 없습니다: {app_id}')
            return pd.DataFrame(columns=['reviewId', 'content', 'score', 'date'])
        
        df = pd.DataFrame(review_list)
        
        # 날짜 컬럼 추가 및 변환
        df["date"] = df["at"].apply(lambda x: x.strftime("%Y-%m-%d") if pd.notnull(x) else None)
        df["at"] = pd.to_datetime(df["at"])
        
        # 날짜 필터링 (6개월 또는 1년)
        filtered_df = df[df["at"] >= target_date]
        
        # 6개월 내 리뷰가 150개 미만이면 1년치로 확장
        if len(filtered_df) < max_reviews:
            one_year_ago = datetime.now() - timedelta(days=365)
            filtered_df = df[df["at"] >= one_year_ago]
            logger.info(f'6개월 내 리뷰 부족, 1년치로 확장: {len(filtered_df)}개')
        
        # 최대 개수만큼만 선택
        final_df = filtered_df.head(max_reviews) if len(filtered_df) > max_reviews else filtered_df
        
        # 필요한 컬럼만 선택
        if 'reviewId' in final_df.columns:
            final_df = final_df[["reviewId", "content", "date", "score"]]
        else:
            # 컬럼명이 다른 경우 대응
            column_mapping = {
                'reviewId': 'reviewId',
                'content': 'content',
                'score': 'score',
                'date': 'date'
            }
            available_cols = [col for col in column_mapping.values() if col in final_df.columns]
            final_df = final_df[available_cols]
        
        # 사용자명 마스킹 (userName 컬럼이 있는 경우)
        if "userName" in final_df.columns:
            final_df["userName"] = final_df["userName"].apply(mask_username)
        
        logger.info(f'리뷰 수집 완료: {len(final_df)}개')
        return final_df
        
    except Exception as e:
        logger.error(f'리뷰 수집 오류 ({app_id}): {e}', exc_info=True)
        return pd.DataFrame(columns=['reviewId', 'content', 'score', 'date'])


def get_multiple_app_reviews(
    app_ids: List[str],
    lang: str = 'ko',
    country: str = 'kr',
    max_reviews_per_app: int = 150,
    months: int = 6
) -> pd.DataFrame:
    """
    여러 앱의 리뷰를 일괄 수집
    
    Args:
        app_ids: 앱 ID 리스트
        lang: 언어 (기본값: 'ko')
        country: 국가 (기본값: 'kr')
        max_reviews_per_app: 앱당 최대 리뷰 수 (기본값: 150)
        months: 수집할 기간 (개월, 기본값: 6)
    
    Returns:
        모든 앱의 리뷰를 합친 데이터프레임 (app_id 컬럼 포함)
    """
    df_final = pd.DataFrame()
    
    for idx, app_id in enumerate(app_ids, start=1):
        logger.info(f'앱 리뷰 수집 중 ({idx}/{len(app_ids)}): {app_id}')
        
        df = get_app_reviews(
            app_id=app_id,
            lang=lang,
            country=country,
            max_reviews=max_reviews_per_app,
            months=months
        )
        
        if not df.empty:
            df["app_id"] = app_id
            df_final = pd.concat([df_final, df], axis=0, ignore_index=True)
    
    logger.info(f'전체 리뷰 수집 완료: {len(df_final)}개')
    return df_final


def merge_app_info_and_reviews(
    app_info_df: pd.DataFrame,
    reviews_df: pd.DataFrame
) -> pd.DataFrame:
    """
    앱 정보와 리뷰 데이터를 병합
    
    Args:
        app_info_df: 앱 정보 데이터프레임 (app_id 컬럼 포함)
        reviews_df: 리뷰 데이터프레임 (app_id 컬럼 포함)
    
    Returns:
        병합된 데이터프레임
    """
    if app_info_df.empty or reviews_df.empty:
        return pd.DataFrame()
    
    # 컬럼명 통일
    if 'app_ids' in app_info_df.columns:
        app_info_df = app_info_df.rename(columns={'app_ids': 'app_id'})
    if 'app_ids' in reviews_df.columns:
        reviews_df = reviews_df.rename(columns={'app_ids': 'app_id'})
    
    merged_df = pd.merge(reviews_df, app_info_df, on='app_id', how='left')
    return merged_df
