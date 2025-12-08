제공해주신 PRD와 설정(Navigation: None, Auth: None)을 바탕으로 작성된 \*\*정보 구조 설계서(Information Architecture Document)\*\*입니다.

본 문서는 **'단일 목적(검색 및 비교)'에 집중한 선형적 구조**를 가지며, 사용자가 이탈 없이 앱 비교 후 다운로드로 이어지게 하는 **Conversion 중심의 설계**를 지향합니다.

-----

# 정보 구조 설계서 (Information Architecture Definition)

**프로젝트명:** Smart App Picker (개인화 가중치 기반 AI 앱 추천 서비스)
**문서 버전:** 1.0
**작성일:** 2025년 12월 08일

-----

## 1\. 사이트 맵 (Site Map)

내비게이션 바(GNB)가 없는 단일 페이지 애플리케이션(SPA) 구조를 채택하여, 사용자가 '탐색 → 결과'의 흐름에만 집중하도록 설계했습니다.

```mermaid
graph TD
    A[Home (Landing)] -->|검색어 입력| B[Loading (AI Analyzing)]
    B --> C[Result (Comparison Report)]
    C -->|세부 정보 클릭| D[Detail Modal (App Info)]
    C -->|가중치 재설정| C
    C -->|다운로드 버튼| E((External Store Link))
    
    subgraph Footer [Footer Area]
        F[이용약관]
        G[개인정보처리방침]
        H[Contact]
    end
```

  * **구조 특징:** 깊이(Depth)를 최소화한 **Flat Structure**.
  * **핵심 경로:** Landing $\rightarrow$ Result $\rightarrow$ Action.

-----

## 2\. 사용자 흐름 (User Flow)

로그인 절차 없이 즉각적인 가치를 제공하는 흐름입니다.

| 단계 | 페이지/상태 | 사용자 행동 (User Action) | 시스템 반응 (System Response) |
| :--- | :--- | :--- | :--- |
| **1. 진입** | **Home** | 서비스 접속 | 검색창 및 추천 키워드(Chips) 노출 |
| **2. 탐색** | **Home** | "광고 없는 무료 알람 앱" 입력 후 엔터 | 검색어 유효성 검사 후 로딩 화면 전환 |
| **3. 대기** | **Loading** | (대기) | 진행률 표시바 및 "리뷰 3,200개 분석 중..." 텍스트 애니메이션 노출 |
| **4. 결과 확인** | **Result** | 비교표(Comparison Table) 확인 | Top 3 앱의 스펙 및 AI 추천 점수 렌더링 |
| **5. 최적화** | **Result** | '광고 없음' 가중치 슬라이더를 최대로 높임 | 점수 재계산 후 앱 순위 실시간 재정렬 (Reranking) |
| **6. 검증** | **Detail Modal** | 1위 앱의 '단점' 항목 클릭 | 해당 단점과 관련된 구체적인 리뷰 요약 팝업 표시 |
| **7. 전환** | **Result** | [스토어 바로가기] 버튼 클릭 | 새 탭에서 구글 플레이스토어/앱스토어 해당 앱 페이지 열기 |

-----

## 3\. 내비게이션 구조 (Navigation Structure)

Global Navigation Bar(GNB)를 제거하고, 과업 수행을 돕는 \*\*문맥 기반 내비게이션(Contextual Navigation)\*\*만 제공합니다.

### 3.1 주요 내비게이션 요소

  * **Step Navigation:** 별도의 메뉴 없이 프로세스 진행(입력 -\> 분석 -\> 결과)에 따른 자동 화면 전환.
  * **Search Reset (Sticky):** 결과 페이지 상단에 검색창을 유지(Sticky Header)하여 언제든 새로운 검색 가능.
  * **Back to Top:** 결과 페이지 스크롤 시 우측 하단에 '맨 위로' 버튼 노출 (긴 비교표 대응).
  * **External Link Indicator:** 앱 스토어로 이동하는 버튼에는 외부 링크 아이콘($\nearrow$)을 명시하여 이탈을 예고.

-----

## 4\. 페이지 계층 구조 (Page Hierarchy)

각 페이지(뷰)의 정보 위계와 구역(Zone)을 정의합니다.

### 4.1 Home (Landing Page)

  * **Hero Zone**
      * 메인 타이틀 ("AI로 찾는 인생 앱")
      * **자연어 검색 입력창 (핵심 기능)**
      * 입력 예시 (Placeholder: "예: 필기감 좋은 아이패드 노트 앱")
  * **Recommendation Zone**
      * 트렌딩 키워드 (Chips UI: \#광고없는, \#다크모드, \#오프라인지원)
  * **Value Proposition Zone**
      * 서비스 사용법 3단계 안내
      * 신뢰도 지표 (분석된 리뷰 수 등)

### 4.2 Result Page (Comparison View)

  * **Header Zone (Sticky)**
      * 검색어 수정 입력창
      * 재검색 버튼
  * **Control Zone (Filter)**
      * **페르소나 가중치 조절 슬라이더** (기능, 감성, 가격, 편의성 등)
      * 플랫폼 필터 (Android / iOS)
  * **Winner Zone**
      * AI 추천 1위 앱 하이라이트 카드 (가장 크게 강조)
      * 핵심 선정 이유 1줄 요약
  * **Table Zone (Comparison Matrix)**
      * 앱 이름 및 아이콘 (Column Header)
      * 비교 항목 (Row Header): 가격, 평점, 주요 기능(O/X), 단점 요약
  * **Action Zone**
      * [앱 다운로드 하러 가기] 버튼 (CTA)

-----

## 5\. 콘텐츠 구성 (Content Organization)

데이터의 우선순위와 정보 유형을 정의합니다. 모바일 환경을 고려하여 정보 밀도를 조절합니다.

| 정보 그룹 | 포함 데이터 (Data Fields) | 우선순위 | 표기 방식 |
| :--- | :--- | :--- | :--- |
| **앱 기본 정보** | 앱 아이콘, 앱 이름, 개발사, 가격 | High | 이미지 + 텍스트 |
| **AI 분석 점수** | **종합 점수(Total Score)**, 항목별 점수 | High | 숫자(100점 만점) + 원형 차트 |
| **핵심 요약** | 장점 3가지, 치명적 단점 1가지(Warning) | High | 불렛 포인트 리스트 |
| **기능 명세** | 다크모드 여부, 백업 지원, 위젯 유무 등 | Medium | 아이콘 (Check/Cross) |
| **감성 분석** | 긍정 키워드(빠름, 예쁨), 부정 키워드(오류, 비쌈) | Medium | 태그 클라우드 또는 색상 텍스트 |

-----

## 6\. 인터랙션 패턴 (Interaction Patterns)

사용자와 시스템 간의 미세 상호작용 정의입니다.

  * **Smart Search Input:**
      * 사용자가 타이핑을 멈추면(0.5초) 추천 검색어 자동 완성 레이어 노출.
      * 엔터 키 입력 시 즉시 로딩 상태로 전환.
  * **Dynamic Slider Feedback:**
      * 가중치 슬라이더 조절 시, 마우스/터치를 떼는 순간(MouseUp/TouchEnd) 비교표의 점수와 순위가 애니메이션과 함께 재정렬됨.
  * **Details on Demand (Progressive Disclosure):**
      * 초기에는 핵심 정보만 노출하고, 표 내부의 셀(Cell)을 클릭하면 모달(Modal)이나 아코디언(Accordion)으로 상세 리뷰 원문을 보여줌.
  * **Skeleton Loading:**
      * 분석 시간이 3초 이상 소요될 경우, 뼈대 UI(Skeleton)를 먼저 노출하여 체감 대기 시간 감소.

-----

## 7\. URL 구조 (URL Structure)

SEO 최적화 및 결과 공유를 위한 파라미터 기반 URL 구조입니다.

  * **메인 홈:** `https://domain.com/`
  * **검색 결과:** `https://domain.com/search?q={keyword}&os={android|ios}`
      * *예시:* `https://domain.com/search?q=무료+스캔앱&os=android`
      * 검색 결과 페이지는 URL 파라미터를 통해 언제든 동일한 결과를 다시 볼 수 있어야 함(Shareable).
  * **이용 약관:** `https://domain.com/terms`

-----

## 8\. 컴포넌트 계층 (Component Hierarchy)

재사용성과 일관성을 위한 UI 컴포넌트 분류(Atomic Design)입니다.

### 8.1 Atoms (최소 단위)

  * **Inputs:** SearchField, Slider(Range), Checkbox.
  * **Buttons:** Primary CTA(다운로드), Secondary(재검색), IconBtn(닫기, 정보).
  * **Display:** ScoreBadge(원형 점수), Tag(키워드), AppIcon.
  * **Typography:** Headings, Body, Caption(법적 고지).

### 8.2 Molecules (조합)

  * **App Header:** [아이콘 + 앱 이름 + 가격] 조합.
  * **Score Card:** [점수 배지 + 점수 설명 텍스트] 조합.
  * **Review Summary:** [감정 아이콘(😊/☹️) + 요약 텍스트] 조합.
  * **Feature Row:** [기능명 텍스트 + 지원 여부 아이콘들] 조합.

### 8.3 Organisms (복합체)

  * **Search Hero:** [메인 타이틀 + 검색창 + 추천 키워드] 그룹.
  * **Comparison Table:** [Header Row + App Columns + Feature Rows]로 구성된 매트릭스.
      * *Responsive:* 데스크탑에서는 표(Table), 모바일에서는 카드 스와이프(Carousel) 또는 수직 나열로 변형.
  * **Weight Controller:** [항목별 슬라이더 모음 + 초기화 버튼].

### 8.4 Templates (페이지 레이아웃)

  * **Single Column Layout:** Home 및 Loading 화면용 (중앙 정렬).
  * **Dashboard Layout:** Result 화면용 (상단 고정 헤더 + 좌측/상단 컨트롤러 + 메인 콘텐츠 영역).

-----

## 9\. 접근성 및 반응형 고려 (Accessibility & Responsive)

  * **접근성(A11y):**
      * 모든 슬라이더 입력에 `aria-label` 및 `role="slider"` 적용.
      * 비교표의 데이터 셀은 스크린 리더가 행/열 헤더를 읽을 수 있도록 `scope="row/col"` 속성 준수.
      * 색상(Color)만으로 긍정/부정을 구분하지 않고 아이콘을 병행 표기 (색각 이상자 배려).
  * **반응형(Responsive):**
      * **Desktop:** 4개 이상의 앱을 가로로 넓게 비교하는 **Table View**.
      * **Mobile:** 가로 스크롤이 불편하므로, 메인 앱 1개를 중심으로 다른 앱을 스와이프하여 1:1로 비교하는 **Card View** 또는 **Stacked List** 형태로 전환.