'use client';

import { useState } from 'react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NaturalLanguageSearchProps {
  onSearch?: (query: string) => void;
  disabled?: boolean;
  className?: string;
}

const EXAMPLE_QUERIES = [
  '아이패드에서 필기감 좋고 PDF 내보내기 무료인 노트 앱 찾아줘',
  '광고 없고 무료인 스캐너 앱 추천해줘',
  'UI 깔끔하고 버그 없는 할 일 관리 앱',
];

export function NaturalLanguageSearch({
  onSearch,
  disabled = false,
  className,
}: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: '검색어를 입력해주세요',
        description: '원하는 앱의 조건을 자연어로 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    try {
      // 추후 백엔드 연결 예정
      if (onSearch) {
        await onSearch(query);
      } else {
        // 모의 동작
        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast({
          title: '검색 기능 준비 중',
          description: '자연어 검색 기능은 곧 제공될 예정입니다.',
        });
      }
    } catch (error) {
      toast({
        title: '검색 실패',
        description: '검색 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>AI 앱 추천 검색</CardTitle>
            <CardDescription>
              원하는 앱의 조건을 자연어로 입력하세요
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="예: 아이패드에서 필기감 좋고 PDF 내보내기 무료인 노트 앱 찾아줘"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled || isSearching}
            className="min-h-[100px] resize-none text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSearch();
              }
            }}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cmd/Ctrl + Enter로 검색</span>
            <span>{query.length}자</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">검색 예시:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                disabled={disabled || isSearching}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={disabled || isSearching || !query.trim()}
          className="w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 text-white shadow-lg transition hover:shadow-xl"
          size="lg"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              검색 중...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              AI로 앱 찾기
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

