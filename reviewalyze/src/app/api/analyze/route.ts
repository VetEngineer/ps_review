import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const reviewsFile = formData.get('reviews') as File | null;
    const keywordsFile = formData.get('keywords') as File;

    if (!keywordsFile) {
      return NextResponse.json(
        { error: '키워드 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 프로젝트 루트 경로 (reviewalyze의 부모 디렉토리)
    const projectRoot = join(process.cwd(), '..');
    const uploadsDir = join(projectRoot, 'uploads');
    const resultsDir = join(projectRoot, 'results');
    const defaultReviewsPath = join(projectRoot, 'reviews.csv');

    // 업로드 디렉토리 생성
    await mkdir(uploadsDir, { recursive: true });
    await mkdir(resultsDir, { recursive: true });

    // 키워드 파일 저장
    const keywordsPath = join(uploadsDir, 'keywords.csv');
    const keywordsBuffer = Buffer.from(await keywordsFile.arrayBuffer());
    await writeFile(keywordsPath, keywordsBuffer);

    // 리뷰 파일 처리: 업로드된 파일이 있으면 사용, 없으면 기본 파일 사용
    let reviewsPath: string;
    
    if (reviewsFile) {
      // 업로드된 리뷰 파일 저장
      reviewsPath = join(uploadsDir, 'reviews.csv');
      const reviewsBuffer = Buffer.from(await reviewsFile.arrayBuffer());
      await writeFile(reviewsPath, reviewsBuffer);
    } else {
      // 기본 reviews.csv 파일 사용
      if (!existsSync(defaultReviewsPath)) {
        return NextResponse.json(
          { error: '리뷰 파일이 업로드되지 않았고 기본 reviews.csv 파일도 찾을 수 없습니다.' },
          { status: 400 }
        );
      }
      reviewsPath = defaultReviewsPath;
    }

    // Python 스크립트 실행
    const pythonScriptPath = join(projectRoot, 'analyse.py');
    const command = `cd "${projectRoot}" && python3 "${pythonScriptPath}" --reviews "${reviewsPath}" --keywords "${keywordsPath}" --output "${resultsDir}"`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      });

      if (stderr && !stderr.includes('INFO') && !stderr.includes('WARNING')) {
        console.error('Python script stderr:', stderr);
      }

      // 결과 파일 찾기 (가장 최근 생성된 파일)
      const resultFiles = readdirSync(resultsDir)
        .filter((file: string) => file.endsWith('.json'))
        .map((file: string) => {
          const filePath = join(resultsDir, file);
          const stats = statSync(filePath);
          return {
            name: file,
            path: filePath,
            mtime: stats.mtime,
          };
        })
        .sort((a: any, b: any) => b.mtime - a.mtime);

      if (resultFiles.length === 0) {
        return NextResponse.json(
          { error: '분석 결과 파일을 찾을 수 없습니다.' },
          { status: 500 }
        );
      }

      // 가장 최근 결과 파일 읽기
      const latestResult = resultFiles[0];
      const resultData = JSON.parse(
        readFileSync(latestResult.path, 'utf-8')
      );

      return NextResponse.json({
        success: true,
        data: resultData,
        message: '분석이 완료되었습니다.',
      });
    } catch (error: any) {
      console.error('Python script execution error:', error);
      return NextResponse.json(
        {
          error: '분석 실행 중 오류가 발생했습니다.',
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

