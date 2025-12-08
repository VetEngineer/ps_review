'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

export interface AppFeature {
  feature: string;
  [appName: string]: string | number | boolean;
}

export interface ComparisonData {
  app_name: string;
  app_icon?: string;
  ai_summary?: string;
  review_summary?: string;
  feature_recommendations?: string[];
  ai_score?: number;
  pros?: string[];
  cons?: string[];
  features?: Record<string, 'O' | 'X' | number | string>;
  keyword_groups?: Record<string, {
    avg_sentiment: number;
    total_reviews: number;
    sentiment_label: string;
  }>;
}

interface ComparisonTableProps {
  apps: ComparisonData[];
  features?: AppFeature[];
  className?: string;
}

const columnHelper = createColumnHelper<Record<string, any>>();

export function ComparisonTable({ apps, features, className }: ComparisonTableProps) {
  const tableData: Record<string, any>[] = [];

  // 핵심 비교 행
  if (apps.length > 0) {
    const baseRows: Record<string, any>[] = [
      { feature: '앱 이름' },
      { feature: '주요 특징 요약 (AI)' },
      { feature: '리뷰 분석 요약' },
      { feature: '총 리뷰 수' },
      { feature: '평균 감정 점수' },
      { feature: '긍정 비율' },
      { feature: '기능 추천' },
    ];

    apps.forEach((app) => {
      const keywordStats = app.keyword_groups
        ? Object.values(app.keyword_groups)
        : [];
      const totalReviews = keywordStats.reduce((acc, item) => acc + item.total_reviews, 0);
      const avgSentiment = keywordStats.length
        ? keywordStats.reduce((acc, item) => acc + item.avg_sentiment, 0) / keywordStats.length
        : undefined;
      
      const sentimentDistribution = keywordStats.reduce(
        (acc, kg) => {
          const ratio = kg.total_reviews / totalReviews || 0;
          if (kg.sentiment_label === 'positive') {
            acc.positive += ratio;
          } else if (kg.sentiment_label === 'negative') {
            acc.negative += ratio;
          } else {
            acc.neutral += ratio;
          }
          return acc;
        },
        { positive: 0, negative: 0, neutral: 0 }
      );
      const positiveRatio = Math.round(sentimentDistribution.positive * 100);

      const reviewSummary =
        app.review_summary ??
        (avgSentiment !== undefined
          ? `${avgSentiment > 0.2 ? '긍정적' : avgSentiment < -0.2 ? '부정적' : '중립적'} (${avgSentiment.toFixed(2)})`
          : null);

      const sentimentLabel = avgSentiment !== undefined
        ? avgSentiment > 0.2
          ? '좋음'
          : avgSentiment < -0.2
          ? '나쁨'
          : '보통'
        : null;

      baseRows[0][app.app_name] = { name: app.app_name, icon: app.app_icon };
      baseRows[1][app.app_name] = app.ai_summary ?? null;
      baseRows[2][app.app_name] = reviewSummary;
      baseRows[3][app.app_name] = totalReviews > 0 ? totalReviews.toLocaleString() : null;
      baseRows[4][app.app_name] = sentimentLabel ? { label: sentimentLabel, value: avgSentiment } : null;
      baseRows[5][app.app_name] = positiveRatio > 0 ? `${positiveRatio}%` : null;
      baseRows[6][app.app_name] = app.feature_recommendations?.length ? app.feature_recommendations : null;
    });

    tableData.push(...baseRows);
  }

  if (features && features.length > 0) {
    // features prop이 제공된 경우
    features.forEach((feature) => {
      const row: Record<string, any> = { feature: feature.feature };
      apps.forEach((app) => {
        row[app.app_name] = feature[app.app_name] ?? null;
      });
      tableData.push(row);
    });
  }

  // 컬럼 정의
  const columns = [
    columnHelper.accessor('feature', {
      header: '기능/특징',
      cell: (info) => (
        <span className="font-semibold text-slate-900">{info.getValue()}</span>
      ),
    }),
    ...apps.map((app) =>
      columnHelper.accessor(app.app_name, {
        header: () => (
          <div className="flex items-center gap-2">
            <img
              src={app.app_icon || `https://picsum.photos/seed/${app.app_name}/64/64`}
              alt={app.app_name}
              className="h-8 w-8 rounded-lg object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://picsum.photos/seed/${app.app_name}/64/64`;
              }}
            />
            <span>{app.app_name}</span>
          </div>
        ),
        cell: (info) => {
          const value = info.getValue();
          if (!value) return <span className="text-slate-400">—</span>;

          // 앱 이름과 아이콘 객체인 경우
          if (typeof value === 'object' && 'name' in value && 'icon' in value) {
            return (
              <div className="flex items-center gap-2">
                <img
                  src={value.icon || `https://picsum.photos/seed/${value.name}/64/64`}
                  alt={value.name}
                  className="h-10 w-10 rounded-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://picsum.photos/seed/${value.name}/64/64`;
                  }}
                />
                <span className="font-semibold text-slate-900">{value.name}</span>
              </div>
            );
          }

          if (Array.isArray(value)) {
            return (
              <ul className="space-y-1">
                {value.map((item, index) => (
                  <li key={index} className="text-sm text-slate-700">
                    • {item}
                  </li>
                ))}
              </ul>
            );
          }

          // 평균 감정 점수 객체인 경우 (label과 value를 가진 객체)
          if (typeof value === 'object' && 'label' in value && 'value' in value) {
            const sentimentValue = value.value as number;
            const sentimentLabel = value.label as string;
            const colorClass =
              sentimentLabel === '좋음'
                ? 'text-emerald-600'
                : sentimentLabel === '나쁨'
                ? 'text-rose-600'
                : 'text-slate-600';
            
            return (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${colorClass}`}>
                  {sentimentLabel}
                </span>
                <span className="text-xs text-slate-500">
                  ({sentimentValue > 0 ? '+' : ''}{sentimentValue.toFixed(2)})
                </span>
              </div>
            );
          }

          // 숫자나 문자열인 경우
          if (typeof value === 'string' || typeof value === 'number') {
            return <span className="text-sm text-slate-700">{value}</span>;
          }

          // 간단한 값인 경우
          if (value === 'O' || value === true) {
            return (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>지원</span>
              </div>
            );
          }
          if (value === 'X' || value === false) {
            return (
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="h-5 w-5" />
                <span>미지원</span>
              </div>
            );
          }
          if (typeof value === 'number') {
            return <span className="font-medium">{value}</span>;
          }
          return <span>{String(value)}</span>;
        },
      })
    ),
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (apps.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-slate-500">
          비교할 앱 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>앱 비교표</CardTitle>
        <CardDescription>기능 및 특징별 앱 비교</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-200">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-semibold text-slate-700"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

