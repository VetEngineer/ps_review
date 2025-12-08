'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Star, Sparkles, Lightbulb, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ComparisonData } from './ComparisonTable';

interface AppCardProps {
  app: ComparisonData;
  className?: string;
}

export function AppCard({ app, className }: AppCardProps) {
  const {
    app_name,
    app_icon,
    ai_score,
    ai_summary,
    review_summary,
    feature_recommendations,
    keyword_groups,
  } = app;

  let avgSentiment = 0;
  let totalReviews = 0;
  if (keyword_groups) {
    const sentiments = Object.values(keyword_groups).map((kg) => kg.avg_sentiment);
    avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length || 0;
    totalReviews = Object.values(keyword_groups).reduce((acc, kg) => acc + kg.total_reviews, 0);
  }

  const reviewSummary =
    review_summary ??
    (keyword_groups
      ? `${avgSentiment > 0.2 ? '긍정적' : avgSentiment < -0.2 ? '부정적' : '중립적'} (${avgSentiment.toFixed(2)}) · 리뷰 ${totalReviews.toLocaleString()}개`
      : '리뷰 데이터가 충분하지 않습니다.');

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <img
              src={app_icon || `https://picsum.photos/seed/${app_name}/128/128`}
              alt={app_name}
              className="h-16 w-16 rounded-xl object-cover shadow-sm"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://picsum.photos/seed/${app_name}/128/128`;
              }}
            />
            <div className="space-y-1">
              <CardTitle className="text-xl">{app_name}</CardTitle>
              {ai_score !== undefined && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-semibold">{ai_score.toFixed(1)}</span>
                  <span className="text-sm text-slate-500">AI 추천 점수</span>
                </div>
              )}
            </div>
          </div>
          {keyword_groups && (
            <Badge
              variant={avgSentiment > 0.2 ? 'default' : avgSentiment < -0.2 ? 'destructive' : 'secondary'}
              className="text-sm"
            >
              {avgSentiment > 0.2 ? '긍정적' : avgSentiment < -0.2 ? '부정적' : '중립적'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            주요 특징 요약 (AI)
          </h4>
          <p className="text-sm text-slate-700">
            {ai_summary ?? '요약 정보가 없습니다.'}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            리뷰 분석
          </h4>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            {avgSentiment > 0.2 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : avgSentiment < -0.2 ? (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            ) : (
              <Minus className="h-4 w-4 text-slate-400" />
            )}
            <span>{reviewSummary}</span>
          </div>
        </div>

        {feature_recommendations && feature_recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              기능 추천
            </h4>
            <ul className="space-y-1">
              {feature_recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-slate-700">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {keyword_groups && Object.keys(keyword_groups).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-700">주요 특징</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(keyword_groups)
                .slice(0, 6)
                .map(([group, data]) => (
                  <Badge
                    key={group}
                    variant={
                      data.sentiment_label === 'positive'
                        ? 'default'
                        : data.sentiment_label === 'negative'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-xs"
                  >
                    {group}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

