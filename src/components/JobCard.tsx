import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import {
  MapPin,
  CircleDollarSign,
  Briefcase,
  Sparkles,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCw,
  X,
  Heart,
  Lightbulb,
  FileText,
  HelpCircle,
  Building2,
  Share2,
} from 'lucide-react';
import { JobPosting, CardViewMode, CoverLetterTips } from '../types';
import { calculateDDay, getDDayBadgeClass } from '../utils/dday';
import { sound } from '../utils/audio';

interface JobCardProps {
  job: JobPosting;
  cardView: CardViewMode;
  onToggleView: () => void;
  onSwipe: (direction: 'left' | 'right') => void;
  isFrontCard: boolean;
  totalRemaining: number;
}

// Generate consistent company gradient colors
function getCompanyGradient(name: string) {
  const gradients = [
    'from-blue-600 to-indigo-700',
    'from-emerald-600 to-teal-700',
    'from-violet-600 to-purple-800',
    'from-rose-500 to-red-700',
    'from-amber-500 to-orange-700',
    'from-cyan-600 to-blue-800',
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return gradients[sum % gradients.length];
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  cardView,
  onToggleView,
  onSwipe,
  isFrontCard,
  totalRemaining,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-18, 18]);
  const opacity = useTransform(x, [-260, -180, 0, 180, 260], [0.4, 0.9, 1, 0.9, 0.4]);

  // Dynamic stamp opacity
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const passOpacity = useTransform(x, [-20, -100], [0, 1]);

  const [showRawJd, setShowRawJd] = useState(false);
  const [loadingTips, setLoadingTips] = useState(false);
  const [tipsData, setTipsData] = useState<CoverLetterTips | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const ddayInfo = calculateDDay(job.end_date);
  const companyGrad = getCompanyGradient(job.company);

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 90;
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    // Strict direction check: ONLY positive offset (drag right) can trigger like
    if (offsetX > threshold || (offsetX > 40 && velocityX > 250)) {
      onSwipe('right');
    }
    // Strict direction check: ONLY negative offset (drag left) can trigger pass
    else if (offsetX < -threshold || (offsetX < -40 && velocityX < -250)) {
      onSwipe('left');
    }
  };

  const fetchCoverLetterTips = async () => {
    if (tipsData) return;
    setLoadingTips(true);
    try {
      const res = await fetch('/api/generate-cover-letter-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: job.company,
          title: job.title,
          summary: job.summary,
          requirements: job.requirements,
        }),
      });
      const data = await res.json();
      setTipsData(data);
      sound.playFlip();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTips(false);
    }
  };

  const handleShare = () => {
    const text = `[채용공고] ${job.company} - ${job.title}\n마감일: ${job.end_date} (${ddayInfo.text})\n근무지: ${job.location}\n요약: ${job.summary}`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    sound.playClick();
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <motion.div
      style={{
        x: isFrontCard ? x : 0,
        rotate: isFrontCard ? rotate : 0,
        opacity: isFrontCard ? opacity : 1,
      }}
      drag={isFrontCard ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      className={`relative w-full select-none cursor-grab active:cursor-grabbing ${
        isFrontCard ? 'z-20' : 'z-10'
      }`}
    >
      {/* Swipe Feedback Stamp Overlays */}
      {isFrontCard && (
        <>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute top-8 left-8 z-30 pointer-events-none transform -rotate-12 border-4 border-emerald-500 bg-emerald-500/10 text-emerald-600 px-5 py-2 rounded-2xl font-black text-2xl tracking-wider shadow-lg backdrop-blur-xs flex items-center gap-2"
          >
            <Heart className="w-7 h-7 fill-emerald-500 stroke-emerald-600" />
            관심 LIKE
          </motion.div>

          <motion.div
            style={{ opacity: passOpacity }}
            className="absolute top-8 right-8 z-30 pointer-events-none transform rotate-12 border-4 border-rose-500 bg-rose-500/10 text-rose-600 px-5 py-2 rounded-2xl font-black text-2xl tracking-wider shadow-lg backdrop-blur-xs flex items-center gap-2"
          >
            <X className="w-7 h-7 stroke-rose-600 stroke-[3]" />
            패스 PASS
          </motion.div>
        </>
      )}

      {/* Main Card Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden transition-all duration-300 flex flex-col min-h-[520px] max-h-[660px]">
        {/* Card Header Strip with Company & D-day */}
        <div className={`p-6 pb-5 bg-gradient-to-r ${companyGrad} text-white relative`}>
          <div className="flex items-center justify-between gap-3">
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm flex items-center gap-1.5 ${getDDayBadgeClass(
                ddayInfo.status
              )}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {ddayInfo.text}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShare}
                title="공고 요약 복사"
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
              >
                <Share2 className="w-3.5 h-3.5" />
                {copiedNotification ? '복사됨!' : ''}
              </button>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-black/20 text-white/90">
                남은 공고 {totalRemaining}개
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center shrink-0 border border-white/50 text-slate-800 font-black text-xl">
              {job.company.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-white/80 text-xs font-medium tracking-wide">
                <Building2 className="w-3.5 h-3.5" />
                <span>기업명</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-xs truncate">
                {job.company}
              </h2>
              <div className="flex items-center gap-1.5 text-white/95 mt-1">
                <Briefcase className="w-4 h-4 shrink-0 text-white/80" />
                <h3 className="font-semibold text-base line-clamp-1 text-white">
                  {job.title}
                </h3>
              </div>
            </div>
          </div>

          {/* Quick Meta Ribbon */}
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center flex-wrap gap-x-5 gap-y-1.5 text-xs text-white/90 font-medium">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-white/80" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CircleDollarSign className="w-3.5 h-3.5 text-white/80" />
              <span>{job.salary}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/80">
              <Calendar className="w-3.5 h-3.5" />
              <span>마감: {job.end_date}</span>
            </div>
          </div>
        </div>

        {/* Card Body - View Mode Front or Back */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-gradient-to-b from-slate-50/50 to-white">
          {cardView === 'front' ? (
            /* FRONT VIEW */
            <div className="space-y-5">
              {/* Keyword Tags */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>핵심 직무 키워드</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {job.tags && job.tags.length > 0 ? (
                    job.tags.map((rawTag, idx) => {
                      const tag = rawTag.replace(/['"]/g, '').trim();
                      if (!tag) return null;
                      return (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-semibold tracking-tight shadow-2xs hover:bg-indigo-100 transition-colors"
                        >
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400">태그 없음</span>
                  )}
                </div>
              </div>

              {/* Core Job Role Highlight */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs relative">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>현장 핵심 업무 한눈에 보기</span>
                </div>
                <p className="text-sm font-medium text-slate-800 leading-relaxed">
                  {job.summary}
                </p>
              </div>

              {/* Key Selling Points / Highlights */}
              {job.key_points && job.key_points.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>합격 어필 핵심 포인트</span>
                  </p>
                  <ul className="space-y-2">
                    {job.key_points.map((pt, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs"
                      >
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Flip prompt cue */}
              <div
                onClick={onToggleView}
                className="cursor-pointer group flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-100/80 text-indigo-700 hover:bg-indigo-100/70 transition-all text-xs font-medium"
              >
                <div className="flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 text-indigo-600 group-hover:rotate-180 transition-transform duration-300" />
                  <span>상세 자격요건 & AI 자소서 팁 확인하기</span>
                </div>
                <span className="font-bold underline text-[11px]">상세보기 &rarr;</span>
              </div>
            </div>
          ) : (
            /* BACK VIEW (Detailed Deep Dive) */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI 정밀 분석 & 직무 요건
                </span>
                <button
                  type="button"
                  onClick={onToggleView}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" /> 앞면으로 복귀
                </button>
              </div>

              {/* Section 1: Real Field Duties */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 mb-1.5">
                  <span className="text-base">🔍</span>
                  <span>현장에서 진짜 하는 일</span>
                </div>
                <p className="text-xs text-blue-950 font-medium leading-relaxed">
                  {job.summary}
                </p>
              </div>

              {/* Section 2: Requirements & Preferences */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1.5">
                  <span className="text-base">✅</span>
                  <span>필수 및 우대 요건</span>
                </div>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                  {job.requirements}
                </p>
              </div>

              {/* AI Resume & Interview Assistant Box */}
              <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <Lightbulb className="w-4 h-4 text-purple-600" />
                    <span>AI 맞춤 자소서 & 면접 가이드</span>
                  </div>
                  {!tipsData && (
                    <button
                      type="button"
                      disabled={loadingTips}
                      onClick={fetchCoverLetterTips}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-semibold hover:bg-purple-700 transition shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {loadingTips ? (
                        <>
                          <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>AI 생성중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>팁 생성하기</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {tipsData ? (
                  <div className="space-y-3 pt-1">
                    <div>
                      <p className="text-[11px] font-bold text-purple-950 mb-1">
                        📝 자소서 작성 핵심 포인트
                      </p>
                      <ul className="space-y-1.5">
                        {tipsData.tips.map((tip, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-purple-900 bg-white/80 p-2 rounded-lg border border-purple-100/80 leading-snug"
                          >
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-purple-950 mb-1">
                        🎯 실전 예상 면접 질문
                      </p>
                      <ul className="space-y-1.5">
                        {tipsData.interviewQuestions.map((q, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-purple-900 bg-white/80 p-2 rounded-lg border border-purple-100/80 leading-snug"
                          >
                            Q. {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-purple-800/80 leading-relaxed">
                    Gemini AI가 이 공고의 요건과 업무를 바탕으로 1:1 맞춤 자소서 키워드와 예상 질문을 분석해드립니다.
                  </p>
                )}
              </div>

              {/* Raw JD Text Collapsible */}
              {job.raw_jd && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowRawJd(!showRawJd)}
                    className="w-full px-3 py-2 bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-700 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      원본 공고 텍스트 확인
                    </span>
                    {showRawJd ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {showRawJd && (
                    <div className="p-3 bg-slate-50 text-[11px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {job.raw_jd}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Swipe Helper Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-2xs font-sans text-[10px]">
              &larr; 좌로 드래그
            </kbd>{' '}
            패스
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-2xs font-sans text-[10px]">
              Space
            </kbd>{' '}
            상세전환
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-2xs font-sans text-[10px]">
              우로 드래그 &rarr;
            </kbd>{' '}
            관심
          </span>
        </div>
      </div>
    </motion.div>
  );
};
