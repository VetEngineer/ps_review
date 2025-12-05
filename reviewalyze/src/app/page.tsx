'use client';

import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { FileUpload } from '../components/ui/file-upload';
import { useToast } from '../hooks/use-toast';
import {
  Upload,
  FileText,
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ShieldCheck,
  Clock3,
  CheckCircle2,
  Info,
  Download,
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
  const [reviewsDataFile, setReviewsDataFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [appName, setAppName] = useState<string>('');

  const handleReviewsDataFileChange = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: '오류',
        description: 'CSV 파일만 업로드할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }
    setReviewsDataFile(file);
    toast({
      title: '파일 업로드 완료',
      description: `${file.name} 파일이 업로드되었습니다.`,
    });
  };

  const handleAnalyze = async () => {
    if (!reviewsDataFile) {
      toast({
        title: '파일 누락',
        description: '전처리된 리뷰 데이터 파일을 업로드해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResults([]);

    try {
      const formData = new FormData();
      formData.append('reviews_data', reviewsDataFile);

      // Railway API 서버 URL (환경 변수 또는 기본값)
      // NEXT_PUBLIC_ 접두사가 필요 (클라이언트 사이드에서 접근 가능하도록)
      const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'https://psreview-production.up.railway.app';
      
      // URL에 프로토콜이 없으면 자동으로 https:// 추가
      const apiUrl = pythonApiUrl.startsWith('http://') || pythonApiUrl.startsWith('https://') 
        ? pythonApiUrl 
        : `https://${pythonApiUrl}`;

      console.log('Railway API 호출:', `${apiUrl}/analyze`);

      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        throw new Error(`서버 응답을 파싱할 수 없습니다: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        const errorMsg = data.error || data.details || `서버 오류 (${response.status})`;
        const error = new Error(errorMsg) as any;
        error.details = data.details;
        error.suggestion = data.suggestion;
        throw error;
      }

      if (data.success && data.data) {
        setAnalysisResults(data.data);
        if (data.data.length > 0 && data.data[0].app_name) {
          setAppName(data.data[0].app_name);
        }
        toast({
          title: '분석 완료',
          description: '리뷰 분석이 성공적으로 완료되었습니다.',
        });
      } else {
        throw new Error('분석 결과를 받을 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      let errorMessage = error.message || '분석 중 오류가 발생했습니다.';

      if (error.details) {
        errorMessage = error.details;
      }

      if (errorMessage.includes('Python이 설치되어 있지 않습니다') || errorMessage.includes('command not found')) {
        errorMessage = 'Python 실행 환경이 없습니다. 외부 Python API 서버가 필요합니다.';
      }

      // 네트워크 오류인 경우 더 자세한 메시지 제공
      if (error.message?.includes('fetch failed') || error.message?.includes('Failed to fetch')) {
        errorMessage = 'Railway API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
      }

      console.error('분석 오류 상세:', error);

      toast({
        title: '분석 실패',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadJSON = () => {
    if (analysisResults.length === 0) {
      toast({
        title: '다운로드 불가',
        description: '분석 결과가 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    // JSON 형식으로 변환 (사용자 요청 형식에 맞춤)
    const jsonData = analysisResults.map((result) => ({
      keyword_group: result.keyword_group,
      total_reviews: result.total_reviews,
      avg_sentiment: result.avg_sentiment,
      positive_count: result.positive_count,
      negative_count: result.negative_count,
      neutral_count: result.neutral_count,
      sentiment_label: result.sentiment_label,
      app_name: result.app_name || 'unknown_app',
    }));

    // JSON 문자열 생성
    const jsonString = JSON.stringify(jsonData, null, 2);
    
    // Blob 생성
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // 다운로드 링크 생성 및 클릭
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `analysis_result_${timestamp}.json`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // 정리
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: '다운로드 완료',
      description: `${filename} 파일이 다운로드되었습니다.`,
    });
  };

  const COLORS = ['#10b981', '#ef4444', '#6b7280'];

  const sentimentChartData = analysisResults.map((result) => ({
    keyword: `${result.keyword_group}: ${result.keyword}`,
    긍정: result.positive_count,
    부정: result.negative_count,
    중립: result.neutral_count,
  }));

  const sentimentDistribution = analysisResults.reduce(
    (acc, result) => {
      acc.positive += result.positive_count;
      acc.negative += result.negative_count;
      acc.neutral += result.neutral_count;
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 }
  );

  const pieChartData = [
    { name: '긍정', value: sentimentDistribution.positive },
    { name: '부정', value: sentimentDistribution.negative },
    { name: '중립', value: sentimentDistribution.neutral },
  ];

  const totalReviews = analysisResults.reduce(
    (acc, result) => acc + result.total_reviews,
    0
  );

  const averageSentiment = analysisResults.length
    ? analysisResults.reduce((acc, result) => acc + result.avg_sentiment, 0) /
      analysisResults.length
    : 0;

  const topKeyword =
    analysisResults.length > 0
      ? analysisResults.reduce((top, current) =>
          current.total_reviews > top.total_reviews ? current : top
        )
      : null;

  const dominantSentiment =
    averageSentiment > 0.2
      ? '긍정적'
      : averageSentiment < -0.2
      ? '부정적'
      : '중립적';

  const positiveRatio = totalReviews
    ? Math.round((sentimentDistribution.positive / totalReviews) * 100)
    : 0;

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
                  리뷰 분석 대시보드
                </h1>
                <p className="text-lg text-slate-600">
                  CSV 파일을 업로드하여 키워드별 감정 흐름을 한눈에 확인하세요.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  CSV 유효성 검사
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

        <Card className="border-slate-200/80 bg-white/90 shadow-xl backdrop-blur">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-50 p-2 text-indigo-600">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>파일 업로드</CardTitle>
                <CardDescription className="text-slate-600">
                  전처리된 리뷰 데이터 CSV 파일을 업로드하여 분석을 시작하세요. 키워드 그룹은 자동으로 적용됩니다.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileUpload
              onFileChange={handleReviewsDataFileChange}
              accept=".csv"
              className="group relative flex h-full w-full items-start gap-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/70 px-5 py-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-white"
            >
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600 transition group-hover:scale-105 group-hover:bg-indigo-200">
                <Upload className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {reviewsDataFile ? reviewsDataFile.name : '전처리된 리뷰 데이터 CSV 업로드 (필수)'}
                </p>
                <p className="text-xs text-slate-600">
                  전처리된 리뷰 데이터 CSV 파일 (reviewId, content, score, app_ids 등 포함)
                </p>
              </div>
            </FileUpload>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>CSV 헤더와 인코딩을 확인한 뒤 분석을 시작하세요.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4" />
                <span>분석 중에는 잠시만 기다려주세요.</span>
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!reviewsDataFile || isAnalyzing}
              className="w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 text-white shadow-lg transition hover:shadow-xl"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  분석 실행
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {analysisResults.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">분석 결과</h2>
              <Button
                onClick={handleDownloadJSON}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md transition hover:shadow-lg"
              >
                <Download className="mr-2 h-4 w-4" />
                JSON 다운로드
              </Button>
            </div>
            
            {appName && (
              <Card className="border-slate-200 bg-white/90 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">앱 정보 &amp; 요약</CardTitle>
                  <CardDescription className="text-slate-600">
                    분석된 데이터에 기반한 핵심 지표를 확인하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      앱 이름
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {appName}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        긍정 비율
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {positiveRatio}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        평균 감정
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {averageSentiment.toFixed(3)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        주요 키워드
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {topKeyword ? `${topKeyword.keyword_group}: ${topKeyword.keyword}` : '—'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                            key={`cell-${index}`}
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
                    <BarChart data={sentimentChartData}>
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

            <Card className="border-slate-200 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle>상세 분석 결과</CardTitle>
                <CardDescription className="text-slate-600">
                  키워드별 상세 통계
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-b-xl border-t border-slate-200">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold">키워드 그룹</th>
                        <th className="px-4 py-3 text-left font-semibold">키워드</th>
                        <th className="px-4 py-3 text-right font-semibold">총 리뷰</th>
                        <th className="px-4 py-3 text-right font-semibold">평균 감정</th>
                        <th className="px-4 py-3 text-right font-semibold">긍정</th>
                        <th className="px-4 py-3 text-right font-semibold">부정</th>
                        <th className="px-4 py-3 text-right font-semibold">중립</th>
                        <th className="px-4 py-3 text-center font-semibold">감정 라벨</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {analysisResults.map((result, index) => (
                        <tr key={index} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {result.keyword_group}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {result.keyword}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {result.total_reviews.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            <div className="flex items-center justify-end gap-1">
                              {result.avg_sentiment > 0.2 ? (
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                              ) : result.avg_sentiment < -0.2 ? (
                                <TrendingDown className="h-4 w-4 text-rose-500" />
                              ) : (
                                <Minus className="h-4 w-4 text-slate-400" />
                              )}
                              {result.avg_sentiment.toFixed(3)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600">
                            {result.positive_count.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-rose-600">
                            {result.negative_count.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {result.neutral_count.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  result.sentiment_label === 'positive'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : result.sentiment_label === 'negative'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {result.sentiment_label === 'positive'
                                  ? '긍정'
                                  : result.sentiment_label === 'negative'
                                  ? '부정'
                                  : '중립'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
