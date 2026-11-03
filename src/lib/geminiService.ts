import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini client with proper header
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface AnalyzedJobResponse {
  company: string;
  title: string;
  location: string;
  salary: string;
  tags: string[];
  summary: string;
  requirements: string;
  end_date: string;
  status: '미작성' | '작성완료';
  key_points?: string[];
}

export function fallbackJobAnalysis(jdText: string): AnalyzedJobResponse {
  let company = '기업명 미상';
  const companyMatch = jdText.match(/\[(.*?)\]/);
  if (companyMatch && companyMatch[1]) {
    company = companyMatch[1].trim();
  } else {
    const firstLine = jdText.trim().split('\n')[0] || '';
    const word = firstLine.split(/[\s,:]+/)[0];
    if (word && word.length > 1) {
      company = word;
    }
  }

  let title = '엔지니어 / 전문직';
  const titleMatch = jdText.match(/(?:채용|부문|엔지니어|개발자|직무|담당자|신입|경력)[:\s]*([^\n.]+)/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  } else if (jdText.includes('생산기술')) {
    title = '생산기술 엔지니어';
  } else if (jdText.includes('제조지능화')) {
    title = '제조지능화 엔지니어';
  } else if (jdText.includes('설비')) {
    title = '설비 엔지니어';
  }

  let location = '전국 / 협의';
  const locMatch = jdText.match(/근무지[:\s]*([^\n.,]+)/i);
  if (locMatch && locMatch[1]) {
    location = locMatch[1].trim();
  } else if (jdText.includes('울산')) {
    location = '울산';
  } else if (jdText.includes('경기')) {
    location = '경기';
  } else if (jdText.includes('서울')) {
    location = '서울';
  }

  let salary = '회사내규';
  const salMatch = jdText.match(/(?:연봉|급여|처우)[:\s]*([^\n.,]+)/i);
  if (salMatch && salMatch[1]) {
    salary = salMatch[1].trim();
  }

  let endDate = '상시채용';
  const dateMatch = jdText.match(/(?:마감일|마감|기한)[:\s]*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/i);
  if (dateMatch && dateMatch[1]) {
    endDate = dateMatch[1].replace(/\//g, '-').replace(/\./g, '-');
  } else {
    const rawDate = jdText.match(/(\d{4}-\d{2}-\d{2})/);
    if (rawDate && rawDate[1]) {
      endDate = rawDate[1];
    }
  }

  const tags: string[] = [];
  if (jdText.includes('Python') || jdText.includes('파이썬')) tags.push('#Python');
  if (jdText.includes('기계') || jdText.includes('기계공학')) tags.push('#기계공학');
  if (jdText.includes('CAD') || jdText.includes('SolidWorks') || jdText.includes('AutoCAD')) tags.push('#CAD설계');
  if (jdText.includes('데이터') || jdText.includes('분석')) tags.push('#데이터분석');
  if (jdText.includes('센서') || jdText.includes('비전')) tags.push('#스마트센서');
  if (jdText.includes('공정') || jdText.includes('생산')) tags.push('#공정최적화');
  if (jdText.includes('설비') || jdText.includes('유지보수')) tags.push('#설비유지보수');
  if (tags.length === 0) tags.push('#신입채용', '#기술역량', '#직무적합');

  let summary = '주요 공정 관리 및 기술 데이터 분석을 수행합니다.';
  const summaryMatch = jdText.match(/(?:주요업무|담당업무|주요역할)[:\s]*([^\n.]+)/i);
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  }

  let requirements = '관련 학과 학사 이상 또는 유관 경험 보유자';
  const reqMatch = jdText.match(/(?:자격요건|지원자격|우대사항|우대)[:\s]*([^\n.]+)/i);
  if (reqMatch && reqMatch[1]) {
    requirements = reqMatch[1].trim();
  }

  return {
    company,
    title,
    location,
    salary,
    tags: tags.slice(0, 4),
    summary,
    requirements,
    end_date: endDate,
    status: '미작성',
    key_points: [
      '현장 실무 경험 및 기술 숙련도 중시',
      '유관 툴/도구 활용 능력 평가',
    ],
  };
}

export async function analyzeJobText(jdText: string): Promise<AnalyzedJobResponse> {
  const ai = getGeminiClient();
  if (!ai) {
    return fallbackJobAnalysis(jdText);
  }

  try {
    const prompt = `당신은 채용 공고 분석 전문 AI입니다. 아래 채용 공고 본문을 면밀히 분석하여 핵심 정보를 추출하세요.
반드시 제공된 JSON 스키마 규격으로만 응답해야 합니다.

규칙:
1. company: 기업명 명확히 추출 (예: 현대자동차, S-OIL, 네이버클라우드 등).
2. title: 직무명 (예: 제조지능화 부문, 설비 엔지니어, 생산기술 엔지니어).
3. location: 근무지 (예: 울산, 경기, 서울 등).
4. salary: 언급 없거나 미공개 시 '회사내규'.
5. tags: 구직자가 한눈에 볼 수 있는 핵심 태그 3~5개 (#기계공학, #Python, #AutoCAD 등).
6. summary: 실제 현장에서 하는 핵심 업무를 1~2줄로 명확하고 알기 쉽게 요약.
7. requirements: 필수 지원 자격 및 우대 요건 핵심 요약.
8. end_date: 마감일자 YYYY-MM-DD 형식 (마감일 미기재 시 '상시채용').
9. key_points: 자소서 작성 시 어필해야 할 핵심 차별점 2~3개.

채용 공고:
${jdText.trim()}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an expert HR recruiter and tech job analyzer. Always respond with valid JSON matching the requested schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            company: { type: Type.STRING, description: '기업명' },
            title: { type: Type.STRING, description: '직무명' },
            location: { type: Type.STRING, description: '근무지' },
            salary: { type: Type.STRING, description: '연봉 또는 처우' },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '태그 목록 (#기계공학 등)',
            },
            summary: { type: Type.STRING, description: '현장 핵심 업무 1~2줄 요약' },
            requirements: { type: Type.STRING, description: '필수 및 우대 요건 요약' },
            end_date: { type: Type.STRING, description: 'YYYY-MM-DD 형식 또는 상시채용' },
            key_points: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '핵심 차별점 및 자소서 어필 포인트',
            },
          },
          required: ['company', 'title', 'location', 'salary', 'tags', 'summary', 'requirements', 'end_date'],
        },
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text) as AnalyzedJobResponse;
    parsed.status = '미작성';
    return parsed;
  } catch (error) {
    console.error('Gemini job analysis error:', error);
    return fallbackJobAnalysis(jdText);
  }
}

export async function generateCoverLetterTips(jobInfo: {
  company: string;
  title: string;
  summary: string;
  requirements: string;
}) {
  const { company, title, summary, requirements } = jobInfo;
  const ai = getGeminiClient();

  if (!ai) {
    return {
      tips: [
        `[${company} 맞춤 가치관] 회사의 최신 사업 방향과 현장 직무('${title}')의 연관성을 1문단에 제시하세요.`,
        `[실무 역량 어필] '${requirements}' 관련 본인의 구체적인 프로젝트나 데이터 해결 사례를 수치(성과 %)와 함께 기술하세요.`,
        `[트러블슈팅 경험] 문제 발생 시 원인 분석부터 해결까지의 체계적인 접근 방식을 강조하세요.`,
      ],
      interviewQuestions: [
        `현장에서 예상치 못한 설비/공정 지연 문제가 발생했을 때 어떻게 대처하시겠습니까?`,
        `동료나 유관 부서와의 협업 중 의견 충돌을 해결한 경험이 있습니까?`,
        `${company}의 해당 직무에 지원하기 위해 가장 집중적으로 준비한 역량은 무엇입니까?`,
      ],
    };
  }

  try {
    const prompt = `회사: ${company}
직무: ${title}
업무 요약: ${summary}
자격/우대 요건: ${requirements}

위 공고에 지원하는 취업 준비생을 위해:
1. 자기소개서(자소서) 작성 핵심 가이드 3가지
2. 면접 대비 예상 직무/인성 질문 3가지
를 간결하고 실질적인 조언으로 JSON 형태로 제공해주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite career coach specialized in Korean corporate recruiting.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '자소서 작성 팁 3가지',
            },
            interviewQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '예상 면접 질문 3가지',
            },
          },
          required: ['tips', 'interviewQuestions'],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Tips generation error:', error);
    return {
      tips: [
        `${company}의 현장 실무 및 ${title} 관련 프로젝트 경험을 구체적인 성과 위주로 기술하세요.`,
        `${requirements}에 명시된 필수 기술을 본인이 어떤 상황에서 활용했는지 STAR 기법으로 작성하세요.`,
        `입사 후 1년 내 기여할 수 있는 실질적인 목표와 성장 로드맵을 구체화하세요.`,
      ],
      interviewQuestions: [
        `해당 직무에서 가장 중요한 핵심 역량이 무엇이라고 생각하시나요?`,
        `어려운 기술적 문제를 해결했던 실제 경험을 말씀해주세요.`,
      ],
    };
  }
}

export interface JobTarget {
  company: string;
  title: string;
  summary: string;
  requirements: string;
  tags?: string[];
}

export function fallbackResumeMatch(
  resumeText: string,
  jobs: JobTarget[]
): any {
  const resumeLower = resumeText.toLowerCase();

  const companyScores = jobs.map((job) => {
    const jobKeywords = [
      ...job.tags?.map((t) => t.replace(/#/g, '')) || [],
      'python', 'cad', '기계', '데이터', '설비', '공정', '분석', 'linux', '개발', 'java', 'sql', '설계', '토익'
    ];

    const matched: string[] = [];
    const missing: string[] = [];

    jobKeywords.forEach((kw) => {
      if (kw.length >= 2) {
        if (resumeLower.includes(kw.toLowerCase())) {
          if (!matched.includes(kw)) matched.push(kw);
        } else if (job.requirements.toLowerCase().includes(kw.toLowerCase()) || job.summary.toLowerCase().includes(kw.toLowerCase())) {
          if (!missing.includes(kw)) missing.push(kw);
        }
      }
    });

    let score = Math.min(95, Math.max(45, 60 + matched.length * 8 - missing.length * 3));
    if (matched.length === 0) score = Math.max(35, score - 20);

    const fit_level =
      score >= 88 ? '최상' : score >= 75 ? '우수' : score >= 60 ? '보통' : '노력필요';

    return {
      company: job.company,
      title: job.title,
      score,
      fit_level,
      feedback: `${job.company}의 요구역량 중 ${matched.slice(0, 3).join(', ') || '기초 역량'}이(가) 확인되었습니다.`,
      matched_keywords: matched.slice(0, 4),
      missing_keywords: missing.slice(0, 3),
    };
  });

  const avgScore = companyScores.length > 0
    ? Math.round(companyScores.reduce((acc, c) => acc + c.score, 0) / companyScores.length)
    : 70;

  return {
    overall_score: avgScore,
    summary_verdict: `관심 등록하신 ${jobs.length}개 기업의 채용 요건과 대조한 결과, 평균 ${avgScore}점의 적합도를 나타내고 있습니다.`,
    skill_match_score: Math.min(100, avgScore + 4),
    requirements_match_score: Math.max(0, avgScore - 3),
    experience_match_score: Math.min(100, avgScore + 1),
    strengths: [
      '지원 직무에 필요한 핵심 도구 및 전공 기초 지식이 기술되어 있습니다.',
      '실무 현장과 관련된 프로젝트 수행 경험이 설득력 있게 제시되었습니다.',
      '관심 기업의 주요 업무 분야와 직접적으로 연계될 수 있는 역량이 확인됩니다.',
    ],
    improvements: [
      '관심 기업의 필수 자격요건에 명시된 자격증이나 어학 성적을 구체적인 점수/등급으로 기재하세요.',
      '프로젝트 진행 시 달성한 정량적 성과(예: 불량률 N% 감소, 공정 효율 N% 개선)를 수치화하여 보완하세요.',
      '문제 해결 과정에서 본인이 주도한 역할과 트러블슈팅 접근 방식을 보강하면 점수가 더욱 향상됩니다.',
    ],
    company_scores: companyScores,
    analyzed_at: new Date().toISOString(),
  };
}

export async function matchResumeWithJobs(
  resumeText: string,
  jobs: JobTarget[]
): Promise<any> {
  const ai = getGeminiClient();
  if (!ai || jobs.length === 0) {
    return fallbackResumeMatch(resumeText, jobs);
  }

  try {
    const jobsListStr = jobs
      .map(
        (j, i) =>
          `[기업 ${i + 1}] 기업명: ${j.company} / 직무: ${j.title}\n- 현장 업무: ${j.summary}\n- 필수/우대요건: ${j.requirements}\n- 키워드태그: ${(j.tags || []).join(', ')}`
      )
      .join('\n\n');

    const prompt = `당신은 대기업 및 유수 테크 기업의 시니어 채용 심사관 및 커리어 코치입니다.
구직자가 제출한 [이력서 및 자기소개서 내용]을 지원자가 '관심 등록'한 [관심 기업 채용 공고들]과 정밀 대조하여 0점부터 100점까지의 객관적이고 건설적인 적합도 진단 결과를 도출해주세요.

[구직자 이력서 본문]:
${resumeText.trim()}

[대조할 관심 기업 채용 공고 목록]:
${jobsListStr}

반드시 지정된 JSON 스키마로만 정밀하게 응답하세요.
점수 산정 기준:
- 90~100점: 필수 요건 완벽 충족, 실무 프로젝트 직접 연관, 직무 키워드 및 성과 탁월
- 75~89점: 주요 자격 요건 충족, 유관 경험 보유, 일부 보완 시 합격권
- 60~74점: 기초 역량 보유하나 실무 성과나 필수 기술 스택 언급 부족
- 0~59점: 직무 연관성 미흡 또는 필수 지원 자격 불일치`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite Korean corporate HR recruiter evaluating resumes against real job postings. Always return precise, strictly formatted JSON matching the provided schema with scores between 0 and 100.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overall_score: { type: Type.INTEGER, description: '전체 종합 적합도 점수 (0-100)' },
            summary_verdict: { type: Type.STRING, description: '종합 심사평 1-2줄' },
            skill_match_score: { type: Type.INTEGER, description: '기술/역량 일치도 (0-100)' },
            requirements_match_score: { type: Type.INTEGER, description: '자격요건 충족도 (0-100)' },
            experience_match_score: { type: Type.INTEGER, description: '실무 경험 연관도 (0-100)' },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '이력서의 돋보이는 강점 3가지',
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '점수를 올리기 위한 구체적인 보완점 3가지',
            },
            company_scores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING, description: '기업명' },
                  title: { type: Type.STRING, description: '직무명' },
                  score: { type: Type.INTEGER, description: '해당 기업 적합도 점수 (0-100)' },
                  fit_level: { type: Type.STRING, description: '최상, 우수, 보통, 노력필요 중 하나' },
                  feedback: { type: Type.STRING, description: '해당 기업 맞춤 피드백 1줄' },
                  matched_keywords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '일치하는 주요 키워드',
                  },
                  missing_keywords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '추가하면 좋은 누락 키워드',
                  },
                },
                required: ['company', 'title', 'score', 'fit_level', 'feedback', 'matched_keywords', 'missing_keywords'],
              },
              description: '기업별 개별 점수 및 피드백 목록',
            },
          },
          required: [
            'overall_score',
            'summary_verdict',
            'skill_match_score',
            'requirements_match_score',
            'experience_match_score',
            'strengths',
            'improvements',
            'company_scores',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    parsed.analyzed_at = new Date().toISOString();
    return parsed;
  } catch (error) {
    console.error('Gemini resume match error:', error);
    return fallbackResumeMatch(resumeText, jobs);
  }
}

export async function extractDocumentText(
  fileBase64: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  const lowerName = fileName.toLowerCase();
  const isDocx = lowerName.endsWith('.docx') || mimeType.includes('wordprocessingml') || lowerName.endsWith('.doc');
  const isPdf = lowerName.endsWith('.pdf') || mimeType.includes('pdf');

  // Word (.docx) extraction using mammoth
  if (isDocx) {
    try {
      const mammoth = await import('mammoth');
      const buffer = Buffer.from(fileBase64, 'base64');
      const result = await mammoth.extractRawText({ buffer });
      if (result.value && result.value.trim()) {
        return result.value.trim();
      }
    } catch (err) {
      console.error('Mammoth docx extraction error:', err);
    }
  }

  // PDF extraction using Gemini 3.8 Flash multimodal inlineData
  const ai = getGeminiClient();
  if (ai && isPdf) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: fileBase64,
            },
          },
          '이 이력서 PDF 파일에 담긴 모든 텍스트 내용(인적사항, 학력, 전공, 보유 기술, 자격증, 프로젝트 경험, 자기소개서 내용 등)을 누락 없이 정확하게 텍스트로 추출하여 반환해주세요. 서두나 맺음말 없이 이력서 내용 본문만 그대로 출력하세요.',
        ],
      });
      const text = response.text?.trim();
      if (text) return text;
    } catch (err) {
      console.error('Gemini PDF extraction error:', err);
    }
  }

  // Plain text fallback or basic text parsing
  try {
    const rawBuffer = Buffer.from(fileBase64, 'base64');
    const str = rawBuffer.toString('utf-8');
    const cleanStr = str.replace(/[^\x20-\x7E\uAC00-\uD7A3\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanStr.length > 0) {
      return cleanStr;
    }
  } catch (err) {
    console.error('Fallback text extraction error:', err);
  }

  return '문서 텍스트를 추출할 수 없습니다. 텍스트를 직접 복사하여 붙여넣어 주세요.';
}


