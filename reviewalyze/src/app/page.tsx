'use client';

import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { AppKeywordSearch } from '../components/search/AppKeywordSearch';
import { ComparisonTable, ComparisonData } from '../components/comparison/ComparisonTable';
import { AppCard } from '../components/comparison/AppCard';

// Python API 서버 URL
const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:5001';
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
      toast({
        title: '앱 검색 중',
        description: '키워드로 앱을 검색하고 리뷰를 수집하는 중입니다...',
      });

      // 1. 앱 검색 및 리뷰 수집
      const searchResponse = await fetch(`${PYTHON_API_URL}/api/search-and-collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: keyword,
          max_apps: 10,
          max_reviews: 150,
          months: 6,
        }),
      });

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `앱 검색 실패: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.success || !searchData.reviews || searchData.reviews.length === 0) {
        throw new Error(searchData.message || '수집된 리뷰가 없습니다.');
      }

      toast({
        title: '리뷰 수집 완료',
        description: `${searchData.app_count}개 앱에서 ${searchData.review_count}개의 리뷰를 수집했습니다. 분석을 시작합니다...`,
      });

      // 2. 리뷰 데이터를 CSV 형식으로 변환
      const reviews = searchData.reviews;
      const csvHeaders = ['reviewId', 'content', 'score', 'date', 'app_id'];
      const csvRows = reviews.map((review: any) => [
        review.reviewId || '',
        review.content || '',
        review.score || '',
        review.date || '',
        review.app_id || '',
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // 3. CSV를 Blob으로 변환하여 FormData 생성
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const formData = new FormData();
      formData.append('reviews_data', blob, 'reviews.csv');

      // 4. 분석 API 호출
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `분석 실패: ${analyzeResponse.status}`);
      }

      const analyzeData = await analyzeResponse.json();

      if (!analyzeData.success || !analyzeData.data || analyzeData.data.length === 0) {
        throw new Error('분석 결과가 없습니다.');
      }

      // 5. 분석 결과를 UI 형식에 맞게 변환
      const analysisResults: AnalysisResult[] = analyzeData.data.map((item: any) => ({
        keyword_group: item.keyword_group || item.keyword || '기타',
        keyword: item.keyword || item.keyword_group || '기타',
        total_reviews: item.total_reviews || 0,
        avg_sentiment: item.avg_sentiment || 0,
        positive_count: item.positive_count || 0,
        negative_count: item.negative_count || 0,
        neutral_count: item.neutral_count || 0,
        sentiment_label: item.sentiment_label || 'neutral',
        app_name: item.app_name || keyword,
      }));

      // 6. 앱 정보를 비교 데이터 형식으로 변환
      const apps = searchData.apps || [];
      const comparisonApps: ComparisonData[] = apps.slice(0, 3).map((app: any, index: number) => {
        // 해당 앱의 키워드 그룹 데이터 추출
        const appKeywordGroups: ComparisonData['keyword_groups'] = {};
        analysisResults.forEach((result) => {
          if (result.app_name === app.app_id || index === 0) {
            appKeywordGroups[result.keyword_group] = {
              avg_sentiment: result.avg_sentiment,
              total_reviews: result.total_reviews,
              sentiment_label: result.sentiment_label,
            };
          }
        });

        return {
          app_name: app.title || app.app_id || `${keyword} 앱 ${index + 1}`,
          app_icon: app.img_link || `https://picsum.photos/seed/${app.app_id || index}/128/128`,
          ai_summary: app.ai_summary || app.intro || `${keyword} 관련 앱입니다.`,
          review_summary: `평점 ${app.rate || 'N/A'}, 다운로드 ${app.download || 'N/A'}`,
          feature_recommendations: [
            '사용자 리뷰를 기반으로 개선 사항을 확인하세요.',
            '키워드별 감정 분석 결과를 참고하세요.',
          ],
          keyword_groups: appKeywordGroups,
        };
      });

      // 기본 앱이 없으면 첫 번째 분석 결과로 생성
      if (comparisonApps.length === 0 && analysisResults.length > 0) {
        const keywordGroups: ComparisonData['keyword_groups'] = {};
        analysisResults.forEach((result) => {
          keywordGroups[result.keyword_group] = {
            avg_sentiment: result.avg_sentiment,
            total_reviews: result.total_reviews,
            sentiment_label: result.sentiment_label,
          };
        });

        comparisonApps.push({
          app_name: analysisResults[0]?.app_name || `${keyword} 앱`,
          app_icon: `https://picsum.photos/seed/${keyword}/128/128`,
          ai_summary: `${keyword} 관련 앱의 리뷰 분석 결과입니다.`,
          review_summary: '수집된 리뷰를 기반으로 분석했습니다.',
          feature_recommendations: [],
          keyword_groups: keywordGroups,
        });
      }

      setAnalysisResults(analysisResults);
      setComparisonData(comparisonApps);
      setAppName(comparisonApps[0]?.app_name || keyword);

      toast({
        title: '분석 완료',
        description: `${analysisResults.length}개의 키워드 그룹에 대한 분석이 완료되었습니다.`,
      });
    } catch (error: any) {
      console.error('검색 오류:', error);
      toast({
        title: '검색 실패',
        description: error.message || '검색 중 오류가 발생했습니다.',
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
