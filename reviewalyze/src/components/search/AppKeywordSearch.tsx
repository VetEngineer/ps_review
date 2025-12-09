'use client';

import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Search, Loader2, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AppKeywordSearchProps {
  onSearch?: (keyword: string) => void;
  disabled?: boolean;
  className?: string;
}

const EXAMPLE_KEYWORDS = ['노트', '스캐너', '할일관리', '일기', '메모'];

export function AppKeywordSearch({
  onSearch,
  disabled = false,
  className,
}: AppKeywordSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast({
        title: '키워드를 입력해주세요',
        description: '검색할 앱의 키워드를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    try {
      if (onSearch) {
        await onSearch(keyword.trim());
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast({
          title: '검색 기능 준비 중',
          description: '앱 키워드 검색 기능은 곧 제공될 예정입니다.',
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
    setKeyword(example);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled && !isSearching && keyword.trim()) {
      handleSearch();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>앱 키워드 검색</CardTitle>
            <CardDescription>검색할 앱의 키워드를 입력하세요</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="예: 노트, 스캐너, 할일관리..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSearching}
            className="text-base"
          />
          <Button
            onClick={handleSearch}
            disabled={disabled || isSearching || !keyword.trim()}
            className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 text-white shadow-lg transition hover:shadow-xl"
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
                검색
              </>
            )}
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">검색 예시:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_KEYWORDS.map((example, index) => (
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
      </CardContent>
    </Card>
  );
}




