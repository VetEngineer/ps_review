import { NextRequest, NextResponse } from 'next/server';

// Python API 서버 URL (환경 변수에서 가져오거나 기본값 사용)
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  console.log('API 호출 시작', { pythonApiUrl: PYTHON_API_URL });
  
  try {
    const formData = await request.formData();
    const reviewsFile = formData.get('reviews_data') as File | null;

    console.log('파일 확인:', {
      reviewsFile: reviewsFile ? reviewsFile.name : '없음',
    });

    if (!reviewsFile) {
      console.error('전처리된 리뷰 데이터 파일이 없습니다.');
      return NextResponse.json(
        { error: '전처리된 리뷰 데이터 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // Python API 서버로 요청 전달
    console.log('Python API 서버로 요청 전송 중...', PYTHON_API_URL);
    
    // FormData 생성
    const pythonFormData = new FormData();
    pythonFormData.append('reviews_data', reviewsFile);

    try {
      const response = await fetch(`${PYTHON_API_URL}/analyze`, {
        method: 'POST',
        body: pythonFormData,
        // CORS 헤더는 Python 서버에서 처리
      });

      console.log('Python API 응답 상태:', response.status, response.statusText);

      // 응답 본문을 텍스트로 먼저 읽기 (한 번만 읽을 수 있음)
      const responseText = await response.text();
      console.log('Python API 응답 텍스트:', responseText.substring(0, 500));

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Python API 응답 데이터:', data);
      } catch (jsonError) {
        console.error('JSON 파싱 실패:', jsonError);
        return NextResponse.json(
          {
            error: 'Python API 서버 응답을 파싱할 수 없습니다.',
            details: responseText.substring(0, 500),
            status: response.status,
          },
          { status: 500 }
        );
      }

      if (!response.ok) {
        return NextResponse.json(
          {
            error: data.error || 'Python API 서버 오류',
            details: data.details || `HTTP ${response.status}`,
          },
          { status: response.status }
        );
      }

      // 성공 응답 그대로 전달
      return NextResponse.json({
        success: data.success || true,
        data: data.data,
        message: data.message || '분석이 완료되었습니다.',
      });

    } catch (fetchError: any) {
      console.error('Python API 호출 실패:', fetchError);
      
      // 네트워크 오류인 경우
      if (fetchError.code === 'ECONNREFUSED' || fetchError.message.includes('fetch failed')) {
        return NextResponse.json(
          {
            error: 'Python API 서버에 연결할 수 없습니다.',
            details: `서버 URL: ${PYTHON_API_URL}`,
            suggestion: 'Python API 서버가 실행 중인지 확인하고, 환경 변수 PYTHON_API_URL이 올바르게 설정되었는지 확인하세요.',
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: 'Python API 서버 호출 중 오류가 발생했습니다.',
          details: fetchError.message,
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
