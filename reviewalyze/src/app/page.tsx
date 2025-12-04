'use client';

import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { FileUpload } from '../components/ui/file-upload';
import { useToast } from '../hooks/use-toast';
import { Upload, FileText, BarChart3, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  keyword: string;
  total_reviews: number;
  avg_sentiment: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  sentiment_label: string;
}

export default function Home() {
  const { toast } = useToast();
  const [reviewsFile, setReviewsFile] = useState<File | null>(null);
  const [keywordsFile, setKeywordsFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [appName, setAppName] = useState<string>('');

  const handleReviewsFileChange = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: '오류',
        description: 'CSV 파일만 업로드할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }
    setReviewsFile(file);
    toast({
      title: '파일 업로드 완료',
      description: `${file.name} 파일이 업로드되었습니다.`,
    });
  };

  const handleKeywordsFileChange = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: '오류',
        description: 'CSV 파일만 업로드할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }
    setKeywordsFile(file);
    toast({
      title: '파일 업로드 완료',
      description: `${file.name} 파일이 업로드되었습니다.`,
    });
  };

  const handleAnalyze = async () => {
    if (!keywordsFile) {
      toast({
        title: '파일 누락',
        description: '키워드 파일을 업로드해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResults([]);

    try {
      const formData = new FormData();
      if (reviewsFile) {
        formData.append('reviews', reviewsFile);
      }
      formData.append('keywords', keywordsFile);

      console.log('분석 시작...');
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      console.log('응답 상태:', response.status, response.statusText);

      let data;
      try {
        data = await response.json();
        console.log('응답 데이터:', data);
      } catch (jsonError) {
        const text = await response.text();
        console.error('JSON 파싱 실패:', text);
        throw new Error(`서버 응답을 파싱할 수 없습니다: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || `서버 오류 (${response.status})`);
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
      const errorMessage = error.message || '분석 중 오류가 발생했습니다.';
      toast({
        title: '분석 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const COLORS = ['#10b981', '#ef4444', '#6b7280'];

  const sentimentChartData = analysisResults.map((result) => ({
    keyword: result.keyword,
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">리뷰 분석 대시보드</h1>
          <p className="text-muted-foreground">
            CSV 파일을 업로드하여 키워드별 감정 분석을 수행하세요
          </p>
        </div>

        {/* 파일 업로드 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>파일 업로드</CardTitle>
            <CardDescription>
              키워드 파일은 필수입니다. 리뷰 파일은 선택사항입니다 (없으면 기본 reviews.csv 사용)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* 리뷰 파일 업로드 */}
              <FileUpload
                onFileChange={handleReviewsFileChange}
                accept=".csv"
                className="flex flex-col items-center justify-center p-8 min-h-[150px]"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm font-medium">
                  {reviewsFile ? reviewsFile.name : 'reviews.csv 업로드 (선택사항)'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  리뷰 데이터 CSV 파일 (없으면 기본 파일 사용)
                </p>
              </FileUpload>

              {/* 키워드 파일 업로드 */}
              <FileUpload
                onFileChange={handleKeywordsFileChange}
                accept=".csv"
                className="flex flex-col items-center justify-center p-8 min-h-[150px] border-2 border-blue-300"
              >
                <FileText className="w-12 h-12 text-blue-400 mb-2" />
                <p className="text-sm font-medium">
                  {keywordsFile ? keywordsFile.name : 'keywords.csv 업로드 (필수)'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  키워드 목록 CSV 파일
                </p>
              </FileUpload>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!keywordsFile || isAnalyzing}
              className="w-full"
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

        {/* 결과 섹션 */}
        {analysisResults.length > 0 && (
          <div className="space-y-6">
            {/* 앱 정보 */}
            {appName && (
              <Card>
                <CardHeader>
                  <CardTitle>앱 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{appName}</p>
                </CardContent>
              </Card>
            )}

            {/* 감정 분포 파이 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>전체 감정 분포</CardTitle>
                <CardDescription>모든 키워드의 감정 분포 요약</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
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

            {/* 키워드별 감정 분석 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>키워드별 감정 분석</CardTitle>
                <CardDescription>각 키워드에 대한 긍정/부정/중립 리뷰 수</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sentimentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="keyword"
                      angle={-45}
                      textAnchor="end"
                      height={100}
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

            {/* 상세 결과 테이블 */}
            <Card>
              <CardHeader>
                <CardTitle>상세 분석 결과</CardTitle>
                <CardDescription>키워드별 상세 통계</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">키워드</th>
                        <th className="text-right p-2">총 리뷰</th>
                        <th className="text-right p-2">평균 감정</th>
                        <th className="text-right p-2">긍정</th>
                        <th className="text-right p-2">부정</th>
                        <th className="text-right p-2">중립</th>
                        <th className="text-center p-2">감정 라벨</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResults.map((result, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{result.keyword}</td>
                          <td className="text-right p-2">{result.total_reviews}</td>
                          <td className="text-right p-2">
                            <div className="flex items-center justify-end gap-1">
                              {result.avg_sentiment > 0.2 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : result.avg_sentiment < -0.2 ? (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              ) : (
                                <Minus className="w-4 h-4 text-gray-500" />
                              )}
                              {result.avg_sentiment.toFixed(3)}
                            </div>
                          </td>
                          <td className="text-right p-2 text-green-600">
                            {result.positive_count}
                          </td>
                          <td className="text-right p-2 text-red-600">
                            {result.negative_count}
                          </td>
                          <td className="text-right p-2 text-gray-600">
                            {result.neutral_count}
                          </td>
                          <td className="text-center p-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                result.sentiment_label === 'positive'
                                  ? 'bg-green-100 text-green-800'
                                  : result.sentiment_label === 'negative'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {result.sentiment_label === 'positive'
                                ? '긍정'
                                : result.sentiment_label === 'negative'
                                ? '부정'
                                : '중립'}
                            </span>
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
