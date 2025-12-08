# UI/UX 디자인 가이드: Smart App Picker

**작성자:** Senior UI/UX Designer
**버전:** 1.0
**날짜:** 2025년 12월 08일
**프로젝트 테마:** Playful & Intelligent (Gen Z 타겟)

-----

## 1\. 디자인 시스템 개요 (Design System Overview)

본 프로젝트는 20대 사용자를 타겟으로 **"지루한 검색을 놀이처럼"** 느끼게 하는 **Playful Tech** 컨셉을 지향합니다. 딱딱한 데이터 테이블 대신, 장난감 블록을 조립하듯 둥글고 입체적인 UI 요소와 보색 대비가 뚜렷한 컬러 스킴을 사용하여 시각적 즐거움을 제공합니다.

  * **Design Principle:**
      * **Bouncy & Round:** 모든 버튼과 컨테이너는 큰 R값(Border-radius)을 가집니다.
      * **High Contrast:** 보색(Complementary) 관계를 활용하여 중요 정보(Call To Action, 1위 추천)를 확실하게 강조합니다.
      * **Instant Feedback:** 사용자의 모든 조작(슬라이더, 입력)에 즉각적이고 생동감 있는 반응을 보입니다.
  * **Typography:**
      * 한글: **Pretendard** (가독성과 현대적인 느낌)
      * 영문: **Poppins** (기하학적이고 둥근 느낌이 Playful 무드와 적합)

-----

## 2\. 컬러 팔레트 (Color Palette for TailwindCSS)

**전략:** 기본 색상으로 \*\*Vivid Violet (지성, AI)\*\*을 사용하고, 보색인 \*\*Sunny Amber (에너지, 강조)\*\*를 사용하여 톡톡 튀는 느낌을 줍니다.

### Tailwind Config (`tailwind.config.js`)

```javascript
module.exports = {
  theme: {
    colors: {
      // Primary: AI, Intelligence, Trust (Violet 계열)
      primary: {
        50: '#F5F3FF',
        100: '#EDE9FE',
        300: '#C4B5FD',
        500: '#8B5CF6', // Main Brand Color
        600: '#7C3AED', // Hover
        900: '#4C1D95',
      },
      // Secondary: Complementary, Warning, Highlights (Amber/Yellow 계열)
      secondary: {
        50: '#FFFBEB',
        100: '#FEF3C7',
        400: '#FBBF24',
        500: '#F59E0B', // Accent / Highlight
        600: '#D97706',
      },
      // Neutral: Text & Backgrounds (Cool Gray 계열 - 차분함 유지)
      neutral: {
        50: '#F8FAFC', // Page Background
        100: '#F1F5F9', // Card Background
        200: '#E2E8F0', // Borders
        400: '#94A3B8', // Placeholder / Disabled
        800: '#1E293B', // Body Text
        900: '#0F172A', // Heading Text
      },
      // Functional Colors
      success: '#10B981', // Emerald 500
      error: '#EF4444',   // Red 500
      info: '#3B82F6',    // Blue 500
    }
  }
}
```

### 컬러 사용 가이드

  * **Primary-500:** 주요 버튼(CTA), 헤더 텍스트 강조, 활성화된 상태.
  * **Secondary-500:** 1위 랭킹 뱃지, "강력 추천" 태그, 알림 점(Dot).
  * **Neutral-50:** 전체 페이지 배경색 (완전한 흰색보다는 아주 연한 회색으로 눈의 피로 감소).
  * **Neutral-900:** 주요 타이틀 텍스트 (완전한 검정 `#000` 지양).

-----

## 3\. 레이아웃 컴포넌트 (Layout Components)

### 3.1 Root Layout (App Shell)

  * **적용 경로:** 모든 페이지 (`/`, `/search`, `/result`)
  * **구조:** Header(Sticky) + Main Content + Footer
  * **그리드 시스템:**
      * **Mobile:** 4 Columns (Gap 16px, Margin 20px)
      * **Tablet:** 8 Columns (Gap 24px, Margin 40px)
      * **Desktop:** 12 Columns (Gap 32px, Max-width 1200px)

### 3.2 Core Components

#### A. Sticky Search Header (검색 결과 페이지용)

  * **설명:** 스크롤 시 상단에 붙어 재검색을 돕는 헤더.
  * **반응형 동작:**
      * Desktop: 로고와 검색창이 가로로 배치 (`flex-row`).
      * Mobile: 로고는 아이콘으로 축소되고 검색창이 전체 너비 차지.

#### B. Footer

  * **설명:** 법적 고지 및 연락처.
  * **디자인:** `neutral-100` 배경색의 심플한 단단(Single column) 레이아웃.

-----

## 4\. 페이지별 상세 디자인 (Page Implementations)

### 4.1 Home (Landing Page)

**Core Purpose:** 사용자의 호기심 자극 및 자연어 검색 유도.

**Key Components & Design:**

1.  **Hero Section (Center Aligned)**

      * **Text:**
          * H1: "나한테 딱 맞는 앱, \<span class="text-primary-500"\>3초 만에\</span\> 찾아줄게\!"
          * Sub: "광고 없는 무료 앱 찾기 힘들죠? AI가 대신 비교해 드려요."
      * **Visual:** 3D 일러스트나 추상적인 도형이 떠다니는 배경으로 Playful 무드 조성.
      * **Search Input (The "Big" Bar):**
          * Height: 64px (매우 큼직하게)
          * Radius: `rounded-full` (캡슐 형태)
          * Shadow: `shadow-xl` (깊은 그림자로 붕 떠있는 느낌)
          * Border: Focus 시 `border-4 border-primary-300` (두꺼운 테두리로 강조)

2.  **Trending Chips (추천 키워드)**

      * **Style:** `bg-white` + `text-primary-600` + `border-primary-100`.
      * **Hover:** `hover:-translate-y-1` (살짝 떠오름) + `hover:bg-primary-50`.
      * **Content:** `#광고없는`, `#대학생필수`, `#다크모드`, `#아이패드꿀템`

**Layout Structure:**

  * 화면 중앙 정렬 (Flex Center).
  * 모바일에서는 세로로 긴 여백을 주어 시원한 느낌 유지.

-----

### 4.2 Loading (Analyzing View)

**Core Purpose:** 대기 시간을 지루하지 않게 만들고 시스템이 "열일"하고 있음을 시각화.

**Key Components:**

  * **Analyzing Animation:**
      * 중앙에 앱 아이콘들이 회전하거나 AI 뇌파가 움직이는 Lottie 애니메이션.
      * Text: "리뷰 3,240개를 읽고 있어요... 🧐", "광고 많은 앱은 거르는 중\! 🧹" (문구가 2초마다 바뀜).
  * **Process Bar:**
      * Style: `h-4`, `rounded-full`, `bg-neutral-200`.
      * Fill: `bg-gradient-to-r from-primary-400 to-secondary-400` (Striped animation).

**Rationale:** 대기 시간(약 3\~5초) 동안 위트 있는 문구를 보여주어 이탈률 방지.

-----

### 4.3 Result Page (Comparison View)

**Core Purpose:** 복잡한 정보를 직관적으로 비교하고 결정 확신(Confidence) 제공.

**Layout Structure:**

  * **Top:** Filter Controller (가중치 슬라이더).
  * **Middle:** Comparison Table (메인).
  * **Bottom:** CTA Button.

**Key Components:**

1.  **Persona Weight Controller (가중치 조절)**

      * **UI:** Range Slider.
      * **Interaction:** 핸들(Handle)을 잡고 움직일 때 이모지 표정이 변함 (😐 -\> 😆).
      * **Color:** Slider Track은 `neutral-200`, Fill은 `primary-500`.

2.  **Dynamic Comparison Table (핵심)**

      * **Card-Table Hybrid:** 데스크탑에서는 표, 모바일에서는 카드 스와이프 UI.
      * **Winner Highlight:** 1위 앱 컬럼은 `bg-primary-50` 배경색과 `border-t-4 border-secondary-500`으로 강조. 👑 왕관 아이콘 부착.
      * **Score Badge:** 도넛 차트 형태. 1위는 `text-secondary-500` (Amber)로 강조.
      * **Cells:**
          * Pros: `text-neutral-700` + 녹색 체크 아이콘.
          * Cons (Warning): `bg-red-50` + `text-error` + ⚠️ 아이콘.

3.  **Floating Action Button (Mobile only)**

      * 스크롤이 길어질 경우 우측 하단에 '재검색' 또는 'Top 1 다운로드' 버튼 노출.

-----

### 4.4 Detail Modal

**Core Purpose:** 페이지 이동 없이 상세 정보(리뷰 근거) 확인.

**Design:**

  * **Overlay:** `bg-neutral-900/50` (Backdrop blur).
  * **Container:** 화면 하단에서 올라오는 Bottom Sheet (Mobile) / 중앙 팝업 (Desktop).
  * **Header:** 앱 아이콘 + 이름 + "AI 분석 리포트" 타이틀.
  * **Content:**
      * "사용자들은 이 점을 불편해해요": 붉은색 박스에 요약문.
      * "실제 리뷰": 말풍선 UI로 리뷰 원문 표시.

-----

## 5\. 인터랙션 패턴 (Interaction Patterns)

| 트리거 | 컴포넌트 | 반응 (Feedback) | 목적 |
| :--- | :--- | :--- | :--- |
| **Hover** | 카드, 버튼 | `scale-105`, `shadow-lg` (위로 떠오름) | 클릭 가능성 암시 및 Playful 감각 |
| **Click (Active)** | 버튼 | `scale-95` (눌리는 느낌) | 물리적 타건감 제공 |
| **Drag** | 슬라이더 | 실시간으로 결과 테이블의 순위가 뒤바뀜 (Shuffle Animation) | 조작에 대한 즉각적 보상 |
| **Input Focus** | 검색창 | 배경색이 `white`에서 `neutral-50`으로 변경되고 테두리 강조 | 입력 집중도 향상 |
| **Loading** | 스켈레톤 | `animate-pulse` 적용된 회색 박스 | 체감 로딩 시간 단축 |

-----

## 6\. 브레이크포인트 (Breakpoints & Grid)

반응형 디자인을 위해 정의된 SCSS/Tailwind 기준점입니다.

| 명칭 | 값 (min-width) | Grid Columns | Container Max-Width | 디자인 전략 |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile** | `320px` | 4 Cols | 100% (padding 20px) | 1열 수직 배치. 비교표는 가로 스크롤(Swipe) 또는 카드 뷰로 변환. |
| **Tablet** | `768px` | 8 Cols | 720px | 2\~3열 배치. 필터와 결과가 상하 구조 유지. |
| **Desktop** | `1024px` | 12 Cols | 960px | 좌측 필터 패널, 우측 결과 리스트 구조 가능. 비교표 전체 노출. |
| **Wide** | `1440px` | 12 Cols | 1200px | 여백을 충분히 활용하여 시원한 레이아웃 제공. |

```scss
// SCSS Mixin Example
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'mobile' {
    @media (min-width: 320px) { @content; }
  }
  @else if $breakpoint == 'tablet' {
    @media (min-width: 768px) { @content; }
  }
  @else if $breakpoint == 'desktop' {
    @media (min-width: 1024px) { @content; }
  }
  @else if $breakpoint == 'wide' {
    @media (min-width: 1440px) { @content; }
  }
}
```

-----

## 7\. 이미지 리소스 (Image Resources)

프로토타이핑 시 사용할 수 있는 이미지 소스입니다.

  * **App Icon Placeholders:** `https://picsum.photos/100/100` (Rounded corners 적용 필수)
  * **Hero Illustration Background:** `https://picsum.photos/id/1015/1200/600` (Blur 처리하여 사용)
  * **Review User Avatar:** `https://picsum.photos/50/50`