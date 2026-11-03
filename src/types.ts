export type JobStatus = '미작성' | '작성완료';

export interface JobPosting {
  id: string;
  company: string;
  title: string;
  location: string;
  salary: string;
  tags: string[];
  summary: string;
  requirements: string;
  end_date: string;
  status: JobStatus;
  raw_jd?: string;
  key_points?: string[];
  notes?: string;
  liked_at?: string;
  rating?: number; // 1-5 star personal interest
}

export type FilterStatus = '전체' | '미작성' | '작성완료';
export type CardViewMode = 'front' | 'back';

export interface CoverLetterTips {
  tips: string[];
  interviewQuestions: string[];
}

export interface CompanyMatchScore {
  company: string;
  title: string;
  score: number; // 0 - 100
  fit_level: '최상' | '우수' | '보통' | '노력필요';
  feedback: string;
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface ResumeAnalysisResult {
  overall_score: number; // 0 - 100
  summary_verdict: string;
  skill_match_score: number; // 0 - 100
  requirements_match_score: number; // 0 - 100
  experience_match_score: number; // 0 - 100
  strengths: string[];
  improvements: string[];
  company_scores: CompanyMatchScore[];
  analyzed_at: string;
}
