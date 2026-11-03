import React, { useState, useRef } from 'react';
import {
  Sparkles,
  FileText,
  Award,
  CheckCircle2,
  AlertTriangle,
  Building2,
  RotateCcw,
  TrendingUp,
  Share2,
  ArrowRight,
  Flame,
  HelpCircle,
  BarChart3,
  Lightbulb,
  Copy,
  UploadCloud,
  FileUp,
  FileCheck,
  X,
  FileCode,
  File,
} from 'lucide-react';
import { JobPosting, ResumeAnalysisResult, CompanyMatchScore } from '../types';
import { sound } from '../utils/audio';

interface ResumeMatchTabProps {
  likedJobs: JobPosting[];
  allJobs: JobPosting[];
  onNavigateToDiscover: () => void;
}

const SAMPLE_RESUMES = [
  {
    name: '기계·제조 엔지니어 이력서 샘플',
    role: '기계/공정/설비/생산기술',
    text: `[학력 및 전공]
기계공학과 학사 졸업 (학점: 3.85 / 4.5)

[보유 기술 및 툴 역량]
- 프로그래밍 & 데이터: Python (Pandas, NumPy, Scikit-learn), MATLAB 공정 시뮬레이션
- CAD & 해석 툴: SolidWorks 3D 모델링, AutoCAD 2D 도면 작성 및 공차 분석, ANSYS 기초 구조해석
- 측정 및 품질: 스마트 비전 센서 신호 처리, 노이즈 필터링, 통계적 공정 관리 (SPC)

[자격증 및 어학]
- 일반기계기사 (한국산업인력공단)
- 토익스피킹 IM3 (130점), 토익 855점

[핵심 프로젝트 및 직무 경험]
1. 제조 스마트팩토리 비전 센서 노이즈 필터링 캡스톤 디자인
- 제조 라인의 비전 센서에서 발생하는 조명 노이즈를 Python 기반 밴드패스 필터로 85% 제거
- 불량 부품 실시간 감지 알고리즘을 구현하여 검사 정확도 94% 달성

2. 연속 공정 배관 설비 열유체 해석 및 트러블슈팅
- 정유/화학 라인의 펌프 진동 및 캐비테이션 현상 원인 규명
- AutoCAD 기반 배관 레이아웃 수정 및 설비 보전 작업 표준서 작성 기여`,
  },
  {
    name: 'IT·클라우드 인프라 개발자 이력서 샘플',
    role: '백엔드/클라우드/인프라',
    text: `[학력 및 전공]
컴퓨터소프트웨어공학 학사 (학점: 3.9 / 4.5)

[보유 기술]
- OS 및 언어: Linux (Ubuntu/CentOS), Python, Go, Java, Bash Shell Scripting
- 인프라 및 네트워크: Docker, Kubernetes, AWS, 네이버클라우드, TCP/IP, Nginx, Prometheus & Grafana
- 데이터베이스: MySQL, PostgreSQL, Redis 캐싱

[핵심 경험]
1. 분산 서버 클러스터 가용성 모니터링 자동화
- 대규모 트래픽 발생 시 서버 부하를 감지하는 Python 기반 자동 헬스체크 봇 구축
- 장애 발생 시 자동 재시작 스크립트를 통해 시스템 복구 시간(MTTR) 60% 단축

2. RESTful API 및 마이크로서비스 백엔드 개발
- 비동기 큐를 활용한 고성능 대용량 메시징 처리 레이어 설계`,
  },
];

export const ResumeMatchTab: React.FC<ResumeMatchTabProps> = ({
  likedJobs,
  allJobs,
  onNavigateToDiscover,
}) => {
  // Saved resume in localStorage
  const [resumeText, setResumeText] = useState<string>(() => {
    return localStorage.getItem('user_resume_text') || '';
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(() => {
    const saved = localStorage.getItem('last_resume_analysis');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [copiedNotification, setCopiedNotification] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target jobs to compare: prefer liked jobs, fallback to all jobs if none liked
  const targetJobs = likedJobs.length > 0 ? likedJobs : allJobs.slice(0, 3);
  const isUsingFallbackJobs = likedJobs.length === 0;

  const handleSelectSample = (sampleText: string) => {
    sound.playClick();
    setResumeText(sampleText);
    setUploadedFile(null);
    setExtractError(null);
    localStorage.setItem('user_resume_text', sampleText);
  };

  const processFile = async (file: File) => {
    setExtractError(null);
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf');
    const isDoc = lowerName.endsWith('.docx') || lowerName.endsWith('.doc');
    const isTxt = lowerName.endsWith('.txt');

    if (!isPdf && !isDoc && !isTxt) {
      setExtractError('지원되지 않는 파일 형식입니다. PDF(.pdf), 워드(.docx, .doc), 텍스트(.txt) 파일을 업로드해주세요.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setExtractError('파일 크기는 최대 20MB까지 업로드 가능합니다.');
      return;
    }

    setIsExtractingFile(true);
    sound.playClick();

    try {
      if (isTxt) {
        const text = await file.text();
        setResumeText(text);
        localStorage.setItem('user_resume_text', text);
        setUploadedFile({ name: fileName, size: file.size, type: 'TXT' });
        sound.playLike();
        setIsExtractingFile(false);
      } else {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1] || '';
            const mimeType =
              file.type ||
              (isPdf
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

            const res = await fetch('/api/extract-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_base64: base64,
                file_name: fileName,
                mime_type: mimeType,
              }),
            });

            if (!res.ok) {
              throw new Error('문서 추출 서버 응답 실패');
            }

            const data = await res.json();
            if (data.text) {
              setResumeText(data.text);
              localStorage.setItem('user_resume_text', data.text);
              setUploadedFile({
                name: fileName,
                size: file.size,
                type: isPdf ? 'PDF' : 'Word',
              });
              sound.playLike();
            } else {
              setExtractError('문서에서 텍스트를 추출하지 못했습니다. 내용을 직접 복사하여 붙여넣어주세요.');
            }
          } catch (err: any) {
            console.error('File extract error:', err);
            setExtractError('파일 내용 추출 중 오류가 발생했습니다. 직접 텍스트를 입력하시거나 다른 파일을 시도해주세요.');
          } finally {
            setIsExtractingFile(false);
          }
        };
        reader.onerror = () => {
          setExtractError('파일을 읽는 중 문제가 발생했습니다.');
          setIsExtractingFile(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error(err);
      setExtractError('파일을 처리하는 중 오류가 발생했습니다.');
      setIsExtractingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return;

    sound.playClick();
    setIsAnalyzing(true);

    try {
      localStorage.setItem('user_resume_text', resumeText.trim());

      const res = await fetch('/api/match-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: resumeText.trim(),
          jobs: targetJobs.map((j) => ({
            company: j.company,
            title: j.title,
            summary: j.summary,
            requirements: j.requirements,
            tags: j.tags,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Analysis failed');
      }

      const result: ResumeAnalysisResult = await res.json();
      setAnalysisResult(result);
      localStorage.setItem('last_resume_analysis', JSON.stringify(result));
      sound.playLike();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyReport = () => {
    if (!analysisResult) return;
    const text = `[이력서 AI 적합도 진단 결과]\n종합 점수: ${analysisResult.overall_score}점 / 100점\n총평: ${analysisResult.summary_verdict}\n\n[기업별 적합도]\n${analysisResult.company_scores.map(c => `- ${c.company} (${c.title}): ${c.score}점 [${c.fit_level}] - ${c.feedback}`).join('\n')}\n\n[주요 강점]\n${analysisResult.strengths.map(s => `• ${s}`).join('\n')}\n\n[보완점]\n${analysisResult.improvements.map(i => `• ${i}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    sound.playClick();
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 75) return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { label: '최상위 적합 (서류 합격 유력)', color: 'from-emerald-500 to-teal-600' };
    if (score >= 75) return { label: '우수 적합 (합격 안정권)', color: 'from-blue-600 to-indigo-600' };
    if (score >= 60) return { label: '보통 (일부 핵심 역량 보강 권장)', color: 'from-amber-500 to-orange-600' };
    return { label: '노력 필요 (요구 역량 불일치)', color: 'from-rose-500 to-red-600' };
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg space-y-3 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Gemini 3.8 Flash 100점 만점 평가
          </span>
          {isUsingFallbackJobs ? (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/30 text-amber-200 text-[11px] font-semibold">
              기본 공고 3개 대조 모드
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-[11px] font-semibold">
              관심 등록 {likedJobs.length}개 기업 대조 모드
            </span>
          )}
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>🎯 이력서 & 관심 기업 적합도 AI 진단</span>
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100/90 mt-1 max-w-2xl leading-relaxed">
            작성하신 이력서/자소서를 입력하면, 내가 관심 등록(❤️)한 기업들이 원하는 필수 자격 및 현장 실무 요건과 1:1 대조하여 <strong>100점부터 0점까지</strong> 정밀한 적합도 점수와 합격 보완점을 진단해 드립니다.
          </p>
        </div>

        {/* Target Companies Strip */}
        <div className="pt-2 flex items-center flex-wrap gap-2 text-xs">
          <span className="text-indigo-200 font-semibold flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            대조 대상 기업:
          </span>
          {targetJobs.map((j) => (
            <span
              key={j.id}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-medium transition"
            >
              {j.company} - {j.title}
            </span>
          ))}
          {isUsingFallbackJobs && (
            <button
              type="button"
              onClick={onNavigateToDiscover}
              className="text-amber-300 underline font-bold hover:text-white cursor-pointer ml-1"
            >
              + 스와이프에서 관심 기업 추가하기 &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        {/* Document Upload (PDF / Word / TXT) Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
              : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100/70 hover:border-indigo-300'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.docx,.doc,.txt"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {isExtractingFile ? (
            <div className="py-2 flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-indigo-700 animate-pulse">
                문서 내용을 AI가 추출하는 중입니다... (PDF / Word 지원)
              </p>
              <p className="text-[11px] text-slate-400">
                표, 양식, 줄글을 포함하여 누락 없이 텍스트로 변환 중입니다.
              </p>
            </div>
          ) : uploadedFile ? (
            <div className="py-1 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
                  {uploadedFile.type}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                      {uploadedFile.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      추출 완료
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {(uploadedFile.size / 1024).toFixed(1)} KB &middot; 하단 텍스트 영역에서 내용을 확인하거나 수정할 수 있습니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shrink-0"
              >
                다른 파일 선택
              </button>
            </div>
          ) : (
            <div className="py-2 flex flex-col items-center justify-center space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100/90 text-indigo-600 flex items-center justify-center shadow-2xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  <span className="text-indigo-600 underline">파일을 클릭하여 첨부</span>하거나 이 영역으로 끌어다 놓으세요 (Drag & Drop)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  지원 형식: <strong>PDF (.pdf)</strong>, <strong>워드 (.docx, .doc)</strong>, 텍스트 (.txt) &middot; 최대 20MB
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                  📄 PDF 파일
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                  📘 Word 문서
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-bold">
                  📝 TXT
                </span>
              </div>
            </div>
          )}
        </div>

        {extractError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{extractError}</span>
          </div>
        )}

        {/* Text Area & Sample Resumes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>추출된 이력서 텍스트 (직접 수정 및 보완 가능)</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {resumeText.length > 0 ? `${resumeText.length}자 입력됨` : '파일 업로드 또는 직접 입력'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold text-slate-500">빠른 테스트용 샘플:</span>
            {SAMPLE_RESUMES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sample.text)}
                className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
              >
                <span>{sample.name}</span>
              </button>
            ))}
          </div>

          <textarea
            rows={7}
            value={resumeText}
            onChange={(e) => {
              setResumeText(e.target.value);
              localStorage.setItem('user_resume_text', e.target.value);
            }}
            placeholder="학력, 전공, 보유 기술(프로그래밍/툴), 프로젝트 경험, 자격증, 어학 성적 등 자신의 이력서나 자기소개서 내용을 복사하여 붙여넣으세요..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition leading-relaxed font-sans"
          />
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {resumeText && (
            <button
              type="button"
              onClick={() => {
                setResumeText('');
                localStorage.removeItem('user_resume_text');
              }}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              내용 지우기
            </button>
          )}

          <button
            type="button"
            disabled={isAnalyzing || !resumeText.trim()}
            onClick={handleAnalyze}
            className="ml-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>관심 기업 요건과 1:1 대조 채점 중...</span>
              </>
            ) : (
              <>
                <Award className="w-4 h-4" />
                <span>AI 적합도 진단 시작 (0~100점)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Section */}
      {analysisResult && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Main Score Hero Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
              {/* Radial Big Score Badge */}
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl ring-8 ring-indigo-50">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tighter">
                    {analysisResult.overall_score}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-300">/ 100점</span>
                </div>

                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r ${
                        getScoreGrade(analysisResult.overall_score).color
                      } text-white shadow-xs`}
                    >
                      {getScoreGrade(analysisResult.overall_score).label}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    종합 적합도 분석 결과
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-lg">
                    {analysisResult.summary_verdict}
                  </p>
                </div>
              </div>

              {/* Copy Report Button */}
              <button
                type="button"
                onClick={handleCopyReport}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedNotification ? '진단서 복사 완료!' : '결과 리포트 복사'}</span>
              </button>
            </div>

            {/* Sub-score Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">기술/역량 일치도</span>
                  <span className="font-extrabold text-indigo-600 font-mono">
                    {analysisResult.skill_match_score}점
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${analysisResult.skill_match_score}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">자격요건 충족도</span>
                  <span className="font-extrabold text-purple-600 font-mono">
                    {analysisResult.requirements_match_score}점
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${analysisResult.requirements_match_score}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">실무경험 연관도</span>
                  <span className="font-extrabold text-teal-600 font-mono">
                    {analysisResult.experience_match_score}점
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${analysisResult.experience_match_score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Company by Company Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-1">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>관심 기업별 1:1 대조 점수 및 상세 피드백</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysisResult.company_scores.map((cs, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5 hover:border-indigo-200 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-sm text-slate-900">{cs.company}</h5>
                      <p className="text-xs text-slate-500">{cs.title}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {cs.fit_level}
                      </span>
                      <div
                        className={`px-3 py-1 rounded-xl text-sm font-black font-mono border ${getScoreBadgeColor(
                          cs.score
                        )}`}
                      >
                        {cs.score}점
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                    {cs.feedback}
                  </p>

                  <div className="space-y-2 text-[11px]">
                    {cs.matched_keywords && cs.matched_keywords.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-bold text-emerald-700">일치 역량:</span>
                        {cs.matched_keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-medium"
                          >
                            ✓ {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {cs.missing_keywords && cs.missing_keywords.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-bold text-amber-700">보강 추천:</span>
                        {cs.missing_keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-medium"
                          >
                            + {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths and Improvements Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>🌟 이력서의 돋보이는 강점</span>
              </div>
              <ul className="space-y-2 text-xs">
                {analysisResult.strengths.map((str, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-xl bg-emerald-50/70 text-emerald-950 border border-emerald-100/80 leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-emerald-600 font-black shrink-0 mt-0.5">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-100 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>💡 100점 도전을 위한 핵심 보완 가이드</span>
              </div>
              <ul className="space-y-2 text-xs">
                {analysisResult.improvements.map((imp, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-xl bg-amber-50/70 text-amber-950 border border-amber-100/80 leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-amber-600 font-black shrink-0 mt-0.5">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
