import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  console.log('API 호출 시작');
  
  try {
    const formData = await request.formData();
    const reviewsFile = formData.get('reviews') as File | null;
    const keywordsFile = formData.get('keywords') as File;

    console.log('파일 확인:', {
      reviewsFile: reviewsFile ? reviewsFile.name : '없음',
      keywordsFile: keywordsFile ? keywordsFile.name : '없음',
    });

    if (!keywordsFile) {
      console.error('키워드 파일이 없습니다.');
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

    console.log('경로 설정:', {
      projectRoot,
      uploadsDir,
      resultsDir,
      defaultReviewsPath,
    });

    // 업로드 디렉토리 생성
    console.log('디렉토리 생성 중...');
    await mkdir(uploadsDir, { recursive: true });
    await mkdir(resultsDir, { recursive: true });

    // 키워드 파일 저장
    console.log('키워드 파일 저장 중...');
    const keywordsPath = join(uploadsDir, 'keywords.csv');
    const keywordsBuffer = Buffer.from(await keywordsFile.arrayBuffer());
    await writeFile(keywordsPath, keywordsBuffer);
    console.log('키워드 파일 저장 완료:', keywordsPath);

    // 리뷰 파일 처리: 업로드된 파일이 있으면 사용, 없으면 기본 파일 사용
    let reviewsPath: string;
    
    if (reviewsFile) {
      // 업로드된 리뷰 파일 저장
      console.log('리뷰 파일 저장 중...');
      reviewsPath = join(uploadsDir, 'reviews.csv');
      const reviewsBuffer = Buffer.from(await reviewsFile.arrayBuffer());
      await writeFile(reviewsPath, reviewsBuffer);
      console.log('리뷰 파일 저장 완료:', reviewsPath);
    } else {
      // 기본 reviews.csv 파일 사용
      console.log('기본 리뷰 파일 확인 중...');
      if (!existsSync(defaultReviewsPath)) {
        console.error('기본 리뷰 파일을 찾을 수 없습니다:', defaultReviewsPath);
        return NextResponse.json(
          { error: '리뷰 파일이 업로드되지 않았고 기본 reviews.csv 파일도 찾을 수 없습니다.' },
          { status: 400 }
        );
      }
      reviewsPath = defaultReviewsPath;
      console.log('기본 리뷰 파일 사용:', reviewsPath);
    }

    // Python 스크립트 실행
    const pythonScriptPath = join(projectRoot, 'analyse.py');
    // 가상 환경의 Python 사용 (있으면), 없으면 시스템 Python 사용
    const venvPython = join(projectRoot, 'venv', 'bin', 'python3');
    const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';
    const command = `cd "${projectRoot}" && "${pythonCmd}" "${pythonScriptPath}" --reviews "${reviewsPath}" --keywords "${keywordsPath}" --output "${resultsDir}"`;

    console.log('Python 스크립트 실행 중...');
    console.log('명령어:', command);

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: 300000, // 5분 타임아웃
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      });

      console.log('Python 스크립트 실행 완료');
      if (stdout) {
        console.log('stdout:', stdout.substring(0, 500));
      }
      
      // stderr에 에러가 있는지 확인
      if (stderr) {
        console.log('stderr:', stderr.substring(0, 1000));
        // Python 에러인 경우 (Traceback, Error 등)
        if (stderr.includes('Traceback') || stderr.includes('Error') || stderr.includes('ModuleNotFoundError') || stderr.includes('ImportError')) {
          throw new Error(`Python 스크립트 실행 실패: ${stderr.substring(0, 500)}`);
        }
        // INFO나 WARNING이 아닌 다른 메시지도 확인
        if (!stderr.includes('INFO') && !stderr.includes('WARNING') && stderr.trim().length > 0) {
          console.warn('Python script stderr (경고):', stderr);
        }
      }

      // 결과 파일 찾기 (가장 최근 생성된 파일)
      console.log('결과 파일 검색 중...', resultsDir);
      const allFiles = readdirSync(resultsDir);
      console.log('모든 파일:', allFiles);
      
      const resultFiles = allFiles
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

      console.log('찾은 결과 파일:', resultFiles.map((f: any) => f.name));

      if (resultFiles.length === 0) {
        console.error('결과 파일을 찾을 수 없습니다.');
        return NextResponse.json(
          { error: '분석 결과 파일을 찾을 수 없습니다. Python 스크립트가 정상적으로 실행되었는지 확인해주세요.' },
          { status: 500 }
        );
      }

      // 가장 최근 결과 파일 읽기
      const latestResult = resultFiles[0];
      console.log('최신 결과 파일 읽기:', latestResult.path);
      const resultData = JSON.parse(
        readFileSync(latestResult.path, 'utf-8')
      );

      console.log('결과 데이터:', Array.isArray(resultData) ? `${resultData.length}개 항목` : '객체');

      return NextResponse.json({
        success: true,
        data: resultData,
        message: '분석이 완료되었습니다.',
      });
    } catch (error: any) {
      console.error('Python script execution error:', error);
      const errorMessage = error.message || '알 수 없는 오류';
      const errorDetails = error.code === 'ETIMEDOUT' 
        ? '분석 시간이 너무 오래 걸려 타임아웃이 발생했습니다.'
        : errorMessage;
      
      return NextResponse.json(
        {
          error: '분석 실행 중 오류가 발생했습니다.',
          details: errorDetails,
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

