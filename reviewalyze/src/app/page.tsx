'use client';

import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { AppKeywordSearch } from '../components/search/AppKeywordSearch';
import { ComparisonTable, ComparisonData } from '../components/comparison/ComparisonTable';
import { AppCard } from '../components/comparison/AppCard';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ShieldCheck,
  Clock3,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalysisResult {
  keyword_group: string;
  keyword: string;
  total_reviews: number;
  avg_sentiment: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  sentiment_label: string;
  app_name?: string;
}

export default function Home() {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [appName, setAppName] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);

  const handleKeywordSearch = async (keyword: string) => {
    setIsAnalyzing(true);
    setAnalysisResults([]);
    setComparisonData([]);

    try {
      // 추후 백엔드 API 연결 예정.
      // 현재는 모의 데이터로 비교 UI를 확인합니다.
      await new Promise((resolve) => setTimeout(resolve, 400));

      const mockResults: AnalysisResult[] = [
        {
          keyword_group: '광고',
          keyword: '광고',
          total_reviews: 120,
          avg_sentiment: -0.35,
          positive_count: 10,
          negative_count: 90,
          neutral_count: 20,
          sentiment_label: 'negative',
          app_name: `${keyword} 앱`,
        },
        {
          keyword_group: 'UI',
          keyword: '디자인',
          total_reviews: 80,
          avg_sentiment: 0.45,
          positive_count: 55,
          negative_count: 10,
          neutral_count: 15,
          sentiment_label: 'positive',
          app_name: `${keyword} 앱`,
        },
        {
          keyword_group: '기능 다양성',
          keyword: '기능',
          total_reviews: 70,
          avg_sentiment: 0.1,
          positive_count: 25,
          negative_count: 20,
          neutral_count: 25,
          sentiment_label: 'neutral',
          app_name: `${keyword} 앱`,
        },
      ];

      const keywordGroups: ComparisonData['keyword_groups'] = {};
      mockResults.forEach((result) => {
        keywordGroups[result.keyword_group] = {
          avg_sentiment: result.avg_sentiment,
          total_reviews: result.total_reviews,
          sentiment_label: result.sentiment_label,
        };
      });

      const primaryApp: ComparisonData = {
        app_name: `${keyword} 앱 A`,
        app_icon: `https://picsum.photos/seed/${keyword}-app-a/128/128`,
        ai_summary: `${keyword} 중심으로 사용성을 강화한 표준 버전입니다. 광고 노출을 줄이고 UI 가독성을 높여 첫 방문 이탈을 줄이는 데 초점을 맞춥니다.`,
        review_summary: '광고 노출에 대한 불만이 있으나 UI 개선과 기능 다양성에 대한 긍정이 우세합니다.',
        feature_recommendations: [
          '온보딩 튜토리얼을 2단계로 축소하여 첫 경험 단순화',
          '광고 빈도 제어 설정과 프리미엄 플랜 안내 배치',
          '접근성 모드(고대비·큰 글씨) 토글 추가',
        ],
        keyword_groups: keywordGroups,
      };

      const alternativeApp: ComparisonData = {
        app_name: `${keyword} Insight`,
        app_icon: `https://picsum.photos/seed/${keyword}-insight/128/128`,
        ai_summary: '가벼운 UX와 빠른 응답성을 강조한 라이트 버전입니다. 심플한 네비게이션으로 탐색 속도를 높입니다.',
        review_summary: '속도와 디자인 평가는 긍정적이지만 업데이트 품질 편차로 불만이 일부 존재합니다.',
        feature_recommendations: [
          '릴리스 노트에 “해결된 이슈” 섹션을 고정 표시',
          '오프라인 캐시를 확대해 네트워크 이슈 시 속도 유지',
          '크래시 리포트 수집 후 자동 롤백 알림 제공',
        ],
        keyword_groups: {
          사용성: { avg_sentiment: 0.38, total_reviews: 200, sentiment_label: 'positive' },
          성능: { avg_sentiment: 0.15, total_reviews: 150, sentiment_label: 'neutral' },
          업데이트: { avg_sentiment: -0.18, total_reviews: 80, sentiment_label: 'negative' },
        },
      };

      const premiumApp: ComparisonData = {
        app_name: `${keyword} Studio`,
        app_icon: `https://picsum.photos/seed/${keyword}-studio/128/128`,
        ai_summary: 'AI 추천 정밀도와 커뮤니티 피드백을 결합한 확장형 버전입니다. 고급 필터와 협업 공유 기능을 제공합니다.',
        review_summary: '개인화 추천 정확도는 호평이나 가격·구독 모델에 대한 불만이 존재합니다.',
        feature_recommendations: [
          '무료 체험 후 전환율을 높이기 위한 1개월 할인 프로모션',
          '커뮤니티 Q&A에 AI 요약 답변을 함께 표시',
          '추천 알고리즘 결과에 “이유 보기” 툴팁 제공',
        ],
        keyword_groups: {
          개인화: { avg_sentiment: 0.22, total_reviews: 160, sentiment_label: 'positive' },
          추천_정확도: { avg_sentiment: 0.05, total_reviews: 140, sentiment_label: 'neutral' },
          가격: { avg_sentiment: -0.28, total_reviews: 110, sentiment_label: 'negative' },
        },
      };

      setAnalysisResults(mockResults);
      setComparisonData([primaryApp, alternativeApp, premiumApp]);
      setAppName(primaryApp.app_name);

      toast({
        title: '모의 결과 표시',
        description: '실제 API 연동 전에 UI를 확인할 수 있습니다.',
      });
    } catch (error: any) {
      toast({
        title: '검색 실패',
        description: '검색 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };


  const totalReviews = comparisonData.length > 0
    ? comparisonData.reduce((acc, app) => {
        if (!app.keyword_groups) return acc;
        const keywordStats = Object.values(app.keyword_groups);
        return acc + keywordStats.reduce((sum, kg) => sum + kg.total_reviews, 0);
      }, 0)
    : analysisResults.reduce((acc, result) => acc + result.total_reviews, 0);

  const averageSentiment = comparisonData.length > 0
    ? comparisonData.reduce((acc, app) => {
        if (!app.keyword_groups) return acc;
        const keywordStats = Object.values(app.keyword_groups);
        const avgSentiment = keywordStats.length
          ? keywordStats.reduce((sum, kg) => sum + kg.avg_sentiment, 0) / keywordStats.length
          : 0;
        return acc + avgSentiment;
      }, 0) / comparisonData.length
    : analysisResults.length
    ? analysisResults.reduce((acc, result) => acc + result.avg_sentiment, 0) /
      analysisResults.length
    : 0;

  const dominantSentiment =
    averageSentiment > 0.2
      ? '긍정적'
      : averageSentiment < -0.2
      ? '부정적'
      : '중립적';

  const COLORS = ['#10b981', '#ef4444', '#6b7280'];

  const getAppChartData = (app: ComparisonData) => {
    if (!app.keyword_groups) return { pieChartData: [], barChartData: [] };

    const keywordGroups = Object.entries(app.keyword_groups);
    const totalReviews = keywordGroups.reduce(
      (acc, [, data]) => acc + data.total_reviews,
      0
    );

    const sentimentDistribution = keywordGroups.reduce(
      (acc, [, data]) => {
        if (data.sentiment_label === 'positive') {
          acc.positive += Math.round(data.total_reviews * 0.6);
          acc.neutral += Math.round(data.total_reviews * 0.2);
          acc.negative += Math.round(data.total_reviews * 0.2);
        } else if (data.sentiment_label === 'negative') {
          acc.negative += Math.round(data.total_reviews * 0.6);
          acc.neutral += Math.round(data.total_reviews * 0.2);
          acc.positive += Math.round(data.total_reviews * 0.2);
        } else {
          acc.neutral += Math.round(data.total_reviews * 0.5);
          acc.positive += Math.round(data.total_reviews * 0.25);
          acc.negative += Math.round(data.total_reviews * 0.25);
        }
        return acc;
      },
      { positive: 0, negative: 0, neutral: 0 }
    );

    const pieChartData = [
      { name: '긍정', value: sentimentDistribution.positive },
      { name: '부정', value: sentimentDistribution.negative },
      { name: '중립', value: sentimentDistribution.neutral },
    ];

    const barChartData = keywordGroups.map(([group, data]) => ({
      keyword: group,
      긍정: Math.round(data.total_reviews * (data.sentiment_label === 'positive' ? 0.6 : data.sentiment_label === 'negative' ? 0.2 : 0.25)),
      부정: Math.round(data.total_reviews * (data.sentiment_label === 'negative' ? 0.6 : data.sentiment_label === 'positive' ? 0.2 : 0.25)),
      중립: Math.round(data.total_reviews * (data.sentiment_label === 'neutral' ? 0.5 : 0.2)),
    }));

    return { pieChartData, barChartData };
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_30%)]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:120px_120px] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white to-white/95" />
      <div className="relative mx-auto max-w-6xl space-y-10 px-4 py-10 text-slate-900">
        <header className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <Badge className="border border-slate-200 bg-white/80 text-slate-900 shadow-sm" variant="secondary">
              Play Store 리뷰
            </Badge>
            <span className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-slate-600 shadow-sm">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              shadcn 스타일 대시보드
            </span>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold tracking-tight">
                  앱 리뷰 분석 대시보드
                </h1>
                <p className="text-lg text-slate-600">
                  앱 키워드로 검색하여 리뷰 분석 결과를 확인하세요.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  앱 키워드 검색
                </span>
                <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <Clock3 className="h-4 w-4 text-indigo-500" />
                  실시간 분석 진행
                </span>
                <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <Info className="h-4 w-4 text-slate-500" />
                  키워드별 감정 요약 제공
                </span>
              </div>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-3">
              <Card className="border-slate-200/80 bg-white/90 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      총 리뷰 수
                    </p>
                    <p className="text-xl font-semibold">
                      {totalReviews.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white/90 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      평균 감정 점수
                    </p>
                    <p className="text-xl font-semibold">
                      {averageSentiment.toFixed(3)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white/90 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      우세 감정
                    </p>
                    <p className="text-xl font-semibold">{dominantSentiment}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </header>

        {/* 앱 키워드 검색 섹션 */}
        <AppKeywordSearch
          onSearch={handleKeywordSearch}
          disabled={isAnalyzing}
        />

        {analysisResults.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">분석 결과</h2>

            {/* 앱 카드 및 비교표 섹션 */}
            {comparisonData.length > 0 && (
              <>
                <div className="grid gap-6 lg:grid-cols-3">
                  {comparisonData.map((app, index) => (
                    <AppCard key={app.app_name || index} app={app} />
                  ))}
                </div>
                <ComparisonTable apps={comparisonData} />
              </>
            )}

            {/* 감정분석 차트 */}
            {comparisonData.length > 0 && (
              <div className="space-y-8">
                {comparisonData.map((app, appIndex) => {
                  const { pieChartData, barChartData } = getAppChartData(app);
                  return (
                    <div key={app.app_name || appIndex} className="space-y-4">
                      <h3 className="text-xl font-semibold text-slate-900">{app.app_name}</h3>
                      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <Card className="border-slate-200 bg-white/90 shadow-sm">
                          <CardHeader>
                            <CardTitle>전체 감정 분포</CardTitle>
                            <CardDescription className="text-slate-600">
                              모든 키워드의 감정 분포 요약
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <ResponsiveContainer width="100%" height={320}>
                              <PieChart>
                                <Pie
                                  data={pieChartData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) =>
                                    `${name}: ${(percent * 100).toFixed(0)}%`
                                  }
                                  outerRadius={120}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {pieChartData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${appIndex}-${index}`}
                                      fill={COLORS[index % COLORS.length]}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <Card className="border-slate-200 bg-white/90 shadow-sm">
                          <CardHeader>
                            <CardTitle>키워드별 감정 분석</CardTitle>
                            <CardDescription className="text-slate-600">
                              각 키워드에 대한 긍정/부정/중립 리뷰 수
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={320}>
                              <BarChart data={barChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                  dataKey="keyword"
                                  angle={-35}
                                  textAnchor="end"
                                  height={80}
                                />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="긍정" fill="#10b981" />
                                <Bar dataKey="부정" fill="#ef4444" />
                                <Bar dataKey="중립" fill="#6b7280" />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
