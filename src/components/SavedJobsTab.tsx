import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  CircleDollarSign,
  FileEdit,
  Sparkles,
  ExternalLink,
  Share2,
  AlertCircle,
  FileText,
  Lightbulb,
  Heart,
  Award,
  ArrowRight,
} from 'lucide-react';
import { JobPosting, FilterStatus, JobStatus, CoverLetterTips } from '../types';
import { calculateDDay, getDDayBadgeClass } from '../utils/dday';
import { sound } from '../utils/audio';
import { CalendarView } from './CalendarView';

interface SavedJobsTabProps {
  likedJobs: JobPosting[];
  onToggleStatus: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
  onUpdateNotes: (jobId: string, notes: string) => void;
  onNavigateToDiscover: () => void;
  onNavigateToMatch?: () => void;
}

export const SavedJobsTab: React.FC<SavedJobsTabProps> = ({
  likedJobs,
  onToggleStatus,
  onDeleteJob,
  onUpdateNotes,
  onNavigateToDiscover,
  onNavigateToMatch,
}) => {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dday' | 'name' | 'recent'>('dday');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [editingNotesJobId, setEditingNotesJobId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [tipsCache, setTipsCache] = useState<Record<string, CoverLetterTips>>({});
  const [loadingTipsId, setLoadingTipsId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Metrics
  const stats = useMemo(() => {
    const total = likedJobs.length;
    const pending = likedJobs.filter((j) => j.status === '미작성').length;
    const completed = likedJobs.filter((j) => j.status === '작성완료').length;
    const urgent = likedJobs.filter((j) => {
      const dday = calculateDDay(j.end_date);
      return dday.diff !== null && dday.diff >= 0 && dday.diff <= 3;
    }).length;
    return { total, pending, completed, urgent };
  }, [likedJobs]);

  // Filter & Search & Sort
  const filteredJobs = useMemo(() => {
    return likedJobs
      .filter((job) => {
        if (selectedDate) {
          const cleanJobDate = (job.end_date || '').replace(/\./g, '-').replace(/\//g, '-').trim();
          const cleanSelected = selectedDate.replace(/\./g, '-').replace(/\//g, '-').trim();
          if (cleanJobDate !== cleanSelected) {
            return false;
          }
        }
        if (filterStatus !== '전체' && job.status !== filterStatus) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCompany = job.company.toLowerCase().includes(q);
          const matchTitle = job.title.toLowerCase().includes(q);
          const matchTags = job.tags.some((t) => t.toLowerCase().includes(q));
          const matchLocation = job.location.toLowerCase().includes(q);
          return matchCompany || matchTitle || matchTags || matchLocation;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.company.localeCompare(b.company);
        }
        if (sortBy === 'recent') {
          return (b.liked_at || '').localeCompare(a.liked_at || '');
        }
        // default: dday (closest deadline first)
        const ddayA = calculateDDay(a.end_date).diff ?? 999;
        const ddayB = calculateDDay(b.end_date).diff ?? 999;
        return ddayA - ddayB;
      });
  }, [likedJobs, filterStatus, searchQuery, sortBy]);

  const toggleExpand = (jobId: string) => {
    sound.playClick();
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const handleFetchTips = async (job: JobPosting) => {
    if (tipsCache[job.id]) return;
    setLoadingTipsId(job.id);
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
      setTipsCache((prev) => ({ ...prev, [job.id]: data }));
      sound.playFlip();
    } catch (e) {
      console.error(e);
      showToast('AI 분석 호출에 실패했습니다.');
    } finally {
      setLoadingTipsId(null);
    }
  };

  const handleCopy = (job: JobPosting) => {
    const dday = calculateDDay(job.end_date);
    const content = `[${job.company}] ${job.title}\n마감일: ${job.end_date} (${dday.text})\n근무지: ${job.location} | 급여: ${job.salary}\n업무: ${job.summary}\n자격/우대: ${job.requirements}`;
    navigator.clipboard.writeText(content);
    sound.playClick();
    showToast('공고 정보가 클립보드에 복사되었습니다.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">관심 등록 공고</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-400">개</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/60 shadow-2xs">
          <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            자소서 미작성
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600">{stats.pending}</span>
            <span className="text-xs text-amber-500">작성 필요</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/60 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            지원 준비 완료
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600">{stats.completed}</span>
            <span className="text-xs text-emerald-500">완료됨</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-200/60 shadow-2xs">
          <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            3일 내 마감 임박
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600">{stats.urgent}</span>
            <span className="text-xs text-red-500">서두르세요!</span>
          </div>
        </div>
      </div>

      {/* Quick link to Resume Match Diagnosis (0-100 points) */}
      {onNavigateToMatch && (
        <div
          onClick={onNavigateToMatch}
          className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-indigo-800 text-white flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white">
                  🎯 내 이력서 vs 관심 기업 적합도 진단
                </span>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 text-[10px] font-black shadow-2xs">
                  100점 만점 채점
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5 leading-snug">
                내 이력서를 넣으면 관심 등록한 기업들의 요건과 대조하여 100~0점 점수 및 합격 보완점을 진단합니다.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform shrink-0">
            <span>진단하기</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Visual Calendar with Real-time Live Clock */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <h3 className="text-sm font-bold text-slate-800">
              관심 기업 마감 달력 & 현재 실시간
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold">
              관심 {likedJobs.length}개
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsCalendarOpen(!isCalendarOpen);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            {isCalendarOpen ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> 달력 접기
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> 달력 펼치기
              </>
            )}
          </button>
        </div>

        {isCalendarOpen && (
          <CalendarView
            jobs={likedJobs}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
          />
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Control */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            {(['전체', '미작성', '작성완료'] as FilterStatus[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setFilterStatus(tab);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === tab
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === '전체' ? '전체 보기' : tab === '미작성' ? '🟡 미작성' : '🟢 작성완료'}
                {tab === '전체' && ` (${likedJobs.length})`}
                {tab === '미작성' && ` (${stats.pending})`}
                {tab === '작성완료' && ` (${stats.completed})`}
              </button>
            ))}
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-medium text-slate-500">정렬:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="dday">마감 임박순 (D-Day)</option>
              <option value="recent">최근 관심 등록순</option>
              <option value="name">기업명 (가나다순)</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="기업명, 직무명, 근무지, 태그(#Python 등) 검색..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              지우기
            </button>
          )}
        </div>
      </div>

      {/* Main List */}
      {likedJobs.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">아직 관심 등록한 공고가 없습니다</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            스와이프 탐색 탭에서 흥미로운 공고를 우측으로 스와이프하거나 ❤️ 관심 버튼을 눌러 저장해보세요!
          </p>
          <button
            type="button"
            onClick={onNavigateToDiscover}
            className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            🔥 공고 스와이프하러 가기
          </button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12 px-6 bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-700">검색 및 필터 결과가 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">
            '{filterStatus}' 상태 또는 검색어와 일치하는 공고가 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const dday = calculateDDay(job.end_date);
            const isCompleted = job.status === '작성완료';
            const tips = tipsCache[job.id];
            const isLoadingTips = loadingTipsId === job.id;

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200 hover:border-slate-300"
              >
                {/* Header Bar */}
                <div
                  onClick={() => toggleExpand(job.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Status Badge Indicator */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold shadow-2xs ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                      title={isCompleted ? '작성완료' : '미작성'}
                    >
                      {isCompleted ? '🟢' : '🟡'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${getDDayBadgeClass(
                            dday.status
                          )}`}
                        >
                          {dday.text}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {job.company}
                        </h4>
                        <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                        <span className="text-xs text-slate-600 font-medium truncate hidden sm:inline">
                          {job.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium sm:hidden mt-0.5 truncate">
                        {job.title}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CircleDollarSign className="w-3 h-3" />
                          {job.salary}
                        </span>
                        <span>•</span>
                        <span>마감: {job.end_date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold hidden md:inline-block ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {job.status}
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4">
                    {/* Tags */}
                    {job.tags && job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {job.tags.map((rawTag, idx) => {
                          const t = rawTag.replace(/['"]/g, '').trim();
                          if (!t) return null;
                          return (
                            <span
                              key={idx}
                              className="px-2.5 py-1 bg-white text-indigo-700 border border-indigo-100 rounded-lg text-xs font-semibold"
                            >
                              {t.startsWith('#') ? t : `#${t}`}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Summary & Requirements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                        <p className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="text-sm">🔍</span> 업무 요약
                        </p>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {job.summary}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                        <p className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="text-sm">✅</span> 필수 및 우대 요건
                        </p>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {job.requirements}
                        </p>
                      </div>
                    </div>

                    {/* My Notes Section */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <FileEdit className="w-3.5 h-3.5 text-indigo-600" />내 지원 메모
                        </span>
                        {editingNotesJobId === job.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateNotes(job.id, tempNotes);
                                setEditingNotesJobId(null);
                                sound.playClick();
                                showToast('메모가 저장되었습니다.');
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingNotesJobId(null)}
                              className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTempNotes(job.notes || '');
                              setEditingNotesJobId(job.id);
                            }}
                            className="text-[11px] font-medium text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {job.notes ? '메모 수정' : '+ 메모 추가'}
                          </button>
                        )}
                      </div>

                      {editingNotesJobId === job.id ? (
                        <textarea
                          rows={2}
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="자기소개서 작성 링크, 서류 제출 일정, 면접 예상 키워드 등을 메모하세요..."
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : job.notes ? (
                        <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {job.notes}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          작성된 메모가 없습니다. 진행 상황이나 마감 시간을 기록해보세요.
                        </p>
                      )}
                    </div>

                    {/* AI Resume & Interview Assistant in saved jobs */}
                    <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          AI 자소서 및 면접 팁
                        </span>
                        {!tips && (
                          <button
                            type="button"
                            disabled={isLoadingTips}
                            onClick={() => handleFetchTips(job)}
                            className="text-[11px] font-bold px-2.5 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            {isLoadingTips ? '분석 중...' : 'AI 팁 보기'}
                          </button>
                        )}
                      </div>

                      {tips && (
                        <div className="space-y-2 pt-1 text-xs">
                          <div>
                            <p className="text-[11px] font-bold text-purple-950 mb-1">
                              📝 자소서 작성 핵심 가이드
                            </p>
                            <ul className="space-y-1">
                              {tips.tips.map((t, idx) => (
                                <li
                                  key={idx}
                                  className="text-purple-900 bg-white/80 p-2 rounded-lg border border-purple-100/60"
                                >
                                  • {t}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p className="text-[11px] font-bold text-purple-950 mb-1">
                              🎯 예상 면접 질문
                            </p>
                            <ul className="space-y-1">
                              {tips.interviewQuestions.map((q, idx) => (
                                <li
                                  key={idx}
                                  className="text-purple-900 bg-white/80 p-2 rounded-lg border border-purple-100/60"
                                >
                                  Q. {q}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(job)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                        >
                          <Share2 className="w-3.5 h-3.5 text-slate-400" />
                          요약 복사
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle status button */}
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            onToggleStatus(job.id);
                            showToast(
                              `'${isCompleted ? '미작성' : '작성완료'}' 상태로 변경되었습니다.`
                            );
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5 ${
                            isCompleted
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          '{isCompleted ? '미작성' : '작성완료'}'(으)로 변경
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => {
                            sound.playPass();
                            onDeleteJob(job.id);
                            showToast('목록에서 삭제되었습니다.');
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
