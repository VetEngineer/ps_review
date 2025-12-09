'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Settings2, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

export interface WeightConfig {
  [keywordGroup: string]: number;
}

interface WeightAdjustmentProps {
  keywordGroups?: string[];
  defaultWeights?: WeightConfig;
  onWeightsChange?: (weights: WeightConfig) => void;
  className?: string;
}

const DEFAULT_KEYWORD_GROUPS = [
  '광고',
  '난이도',
  '과금',
  '오류',
  'UI',
  '기능 다양성',
];

export function WeightAdjustment({
  keywordGroups = DEFAULT_KEYWORD_GROUPS,
  defaultWeights,
  onWeightsChange,
  className,
}: WeightAdjustmentProps) {
  const [weights, setWeights] = useState<WeightConfig>(() => {
    if (defaultWeights) {
      return defaultWeights;
    }
    // 기본값: 모든 그룹에 동일한 가중치
    const initial: WeightConfig = {};
    keywordGroups.forEach((group) => {
      initial[group] = 50; // 0-100 범위
    });
    return initial;
  });

  useEffect(() => {
    if (onWeightsChange) {
      onWeightsChange(weights);
    }
  }, [weights, onWeightsChange]);

  const handleWeightChange = (group: string, value: number[]) => {
    setWeights((prev) => ({
      ...prev,
      [group]: value[0],
    }));
  };

  const handleReset = () => {
    const reset: WeightConfig = {};
    keywordGroups.forEach((group) => {
      reset[group] = 50;
    });
    setWeights(reset);
  };

  const getWeightLabel = (weight: number) => {
    if (weight >= 75) return '매우 중요';
    if (weight >= 50) return '중요';
    if (weight >= 25) return '보통';
    return '낮음';
  };

  const getWeightColor = (weight: number) => {
    if (weight >= 75) return 'text-emerald-600';
    if (weight >= 50) return 'text-blue-600';
    if (weight >= 25) return 'text-slate-600';
    return 'text-slate-400';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>개인화 가중치 설정</CardTitle>
              <CardDescription>
                각 항목의 중요도를 조정하여 맞춤형 추천을 받으세요
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            초기화
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {keywordGroups.map((group) => {
          const weight = weights[group] || 50;
          return (
            <div key={group} className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor={`weight-${group}`} className="text-sm font-semibold">
                  {group}
                </Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={getWeightColor(weight)}>
                    {getWeightLabel(weight)}
                  </Badge>
                  <span className="text-sm font-medium text-slate-600 w-12 text-right">
                    {weight}%
                  </span>
                </div>
              </div>
              <Slider
                id={`weight-${group}`}
                value={[weight]}
                onValueChange={(value) => handleWeightChange(group, value)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 px-1">
                <span>낮음</span>
                <span>보통</span>
                <span>중요</span>
                <span>매우 중요</span>
              </div>
            </div>
          );
        })}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-600">
            <strong>팁:</strong> 가중치를 조정하면 해당 항목이 추천 점수 계산에 더 큰 영향을 미칩니다.
            예를 들어, &apos;광고&apos; 항목의 가중치를 높이면 광고가 없는 앱이 더 높은 점수를 받습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

