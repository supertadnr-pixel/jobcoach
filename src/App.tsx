import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  X,
  RotateCw,
  RotateCcw,
  Sparkles,
  Plus,
  Volume2,
  VolumeX,
  Keyboard,
  ListCheck,
  Flame,
  Calendar,
  Layers,
  Settings2,
  Trash2,
  Info,
  Award,
} from 'lucide-react';
import { JobPosting, CardViewMode } from './types';
import { INITIAL_PARSED_JOBS, INITIAL_RAW_JOBS } from './data/defaultJobs';
import { JobCard } from './components/JobCard';
import { SavedJobsTab } from './components/SavedJobsTab';
import { ResumeMatchTab } from './components/ResumeMatchTab';
import { AddJobModal } from './components/AddJobModal';
import { sound } from './utils/audio';

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'swipe' | 'saved' | 'match'>('swipe');

  // Job Queue & State (20 jobs)
  const [jobQueue, setJobQueue] = useState<JobPosting[]>(() => {
    const saved = localStorage.getItem('swipe_job_queue');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 15) {
          return parsed;
        }
      } catch {
        return INITIAL_PARSED_JOBS;
      }
    }
    return INITIAL_PARSED_JOBS;
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const saved = localStorage.getItem('swipe_current_index');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const [likedJobs, setLikedJobs] = useState<JobPosting[]>(() => {
    const saved = localStorage.getItem('swipe_liked_jobs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [cardView, setCardView] = useState<CardViewMode>('front');
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Swipe history for undo
  const [history, setHistory] = useState<
    { job: JobPosting; action: 'like' | 'pass'; prevIndex: number }[]
  >([]);

  // Local storage synchronization
  useEffect(() => {
    localStorage.setItem('swipe_job_queue', JSON.stringify(jobQueue));
  }, [jobQueue]);

  useEffect(() => {
    localStorage.setItem('swipe_current_index', String(currentIndex));
  }, [currentIndex]);

  useEffect(() => {
    localStorage.setItem('swipe_liked_jobs', JSON.stringify(likedJobs));
  }, [likedJobs]);

  const toggleSound = () => {
    const next = !soundEnabled;
    sound.setEnabled(next);
    setSoundEnabled(next);
    if (next) sound.playClick();
  };

  // Swipe Action Handlers
  const handlePass = useCallback(() => {
    if (currentIndex >= jobQueue.length) return;
    const currentJob = jobQueue[currentIndex];
    sound.playPass();

    // Explicitly guarantee that this passed job is NEVER in likedJobs
    setLikedJobs((prev) =>
      prev.filter(
        (item) =>
          item.id !== currentJob.id &&
          !(item.company === currentJob.company && item.title === currentJob.title)
      )
    );

    setHistory((prev) => [
      ...prev,
      { job: currentJob, action: 'pass', prevIndex: currentIndex },
    ]);
    setCurrentIndex((prev) => prev + 1);
    setCardView('front');
  }, [currentIndex, jobQueue]);

  const handleLike = useCallback(() => {
    if (currentIndex >= jobQueue.length) return;
    const currentJob = jobQueue[currentIndex];
    sound.playLike();

    // Prevent duplicate entries
    setLikedJobs((prev) => {
      const isDuplicate = prev.some(
        (item) =>
          item.company === currentJob.company && item.title === currentJob.title
      );
      if (!isDuplicate) {
        return [...prev, { ...currentJob, liked_at: new Date().toISOString() }];
      }
      return prev;
    });

    setHistory((prev) => [
      ...prev,
      { job: currentJob, action: 'like', prevIndex: currentIndex },
    ]);
    setCurrentIndex((prev) => prev + 1);
    setCardView('front');
  }, [currentIndex, jobQueue]);

  const handleToggleView = useCallback(() => {
    sound.playFlip();
    setCardView((prev) => (prev === 'front' ? 'back' : 'front'));
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const lastItem = history[history.length - 1];
    sound.playClick();

    if (lastItem.action === 'like') {
      // Remove from liked if it was liked
      setLikedJobs((prev) =>
        prev.filter((j) => j.company !== lastItem.job.company || j.title !== lastItem.job.title)
      );
    }

    setCurrentIndex(lastItem.prevIndex);
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setCardView('front');
  }, [history]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        isAddModalOpen ||
        isShortcutsOpen ||
        isResetConfirmOpen ||
        activeTab !== 'swipe'
      ) {
        return;
      }
      // Ignore if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePass();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleLike();
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleToggleView();
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAddModalOpen,
    isShortcutsOpen,
    isResetConfirmOpen,
    activeTab,
    handlePass,
    handleLike,
    handleToggleView,
    handleUndo,
  ]);

  // Reset all data
  const handleResetAll = () => {
    sound.playClick();
    localStorage.removeItem('swipe_job_queue');
    localStorage.removeItem('swipe_current_index');
    localStorage.removeItem('swipe_liked_jobs');
    setJobQueue(INITIAL_PARSED_JOBS);
    setCurrentIndex(0);
    setLikedJobs([]);
    setCardView('front');
    setHistory([]);
    setIsResetConfirmOpen(false);
  };

  // Add new job parsed from JD
  const handleAddJob = (_rawJd: string, analyzedJob: JobPosting) => {
    setJobQueue((prev) => [...prev, analyzedJob]);
  };

  // Liked job status toggle
  const handleToggleJobStatus = (jobId: string) => {
    setLikedJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          const nextStatus = j.status === '미작성' ? '작성완료' : '미작성';
          return { ...j, status: nextStatus };
        }
        return j;
      })
    );
  };

  // Delete liked job
  const handleDeleteLikedJob = (jobId: string) => {
    setLikedJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  // Update notes
  const handleUpdateNotes = (jobId: string, notes: string) => {
    setLikedJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, notes } : j))
    );
  };

  const currentJob = jobQueue[currentIndex];
  const remainingCount = Math.max(0, jobQueue.length - currentIndex);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 transition">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-rose-500 text-white flex items-center justify-center shadow-sm font-black text-xl">
              📱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  스와이프 채용앱
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Gemini 3.8 Flash AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                AI 공고 분석 &middot; 틴더 스와이프 탐색 &middot; 자소서 지원 현황 관리
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>새 공고 추가</span>
            </button>

            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-indigo-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              title="단축키 안내"
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer hidden sm:block"
            >
              <Keyboard className="w-4 h-4 text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              title="전체 데이터 초기화"
              className="p-2 rounded-xl border border-slate-200 bg-white text-rose-500 hover:bg-rose-50 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Strip */}
        <div className="max-w-xl mx-auto mt-3">
          <div className="flex p-1 bg-slate-200/70 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('swipe');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'swipe'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame
                className={`w-4 h-4 ${
                  activeTab === 'swipe' ? 'text-rose-500 fill-rose-500' : 'text-slate-400'
                }`}
              />
              <span>🔥 스와이프 탐색</span>
              {remainingCount > 0 && (
                <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[10px] rounded-full">
                  {remainingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('saved');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar
                className={`w-4 h-4 ${
                  activeTab === 'saved' ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <span>📅 내 지원 현황</span>
              {likedJobs.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-bold">
                  {likedJobs.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('match');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'match'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award
                className={`w-4 h-4 ${
                  activeTab === 'match' ? 'text-purple-600' : 'text-slate-400'
                }`}
              />
              <span>🎯 이력서 매칭</span>
              <span className="px-1.5 py-0.2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[9px] rounded-full font-black">
                100점
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start">
        {activeTab === 'swipe' ? (
          /* TAB 1: SWIPE DISCOVER */
          <div className="w-full max-w-lg mx-auto flex flex-col items-center">
            {currentIndex < jobQueue.length ? (
              <div className="w-full flex flex-col items-center space-y-5">
                {/* Visual Stack Container */}
                <div className="relative w-full">
                  {/* Underneath Card (deck depth effect) */}
                  {currentIndex + 1 < jobQueue.length && (
                    <div className="absolute inset-0 top-3 scale-[0.96] rounded-3xl bg-slate-200/70 border border-slate-300 opacity-70 pointer-events-none transform translate-y-2 z-0" />
                  )}
                  {currentIndex + 2 < jobQueue.length && (
                    <div className="absolute inset-0 top-6 scale-[0.92] rounded-3xl bg-slate-300/50 border border-slate-400 opacity-40 pointer-events-none transform translate-y-4 -z-10" />
                  )}

                  {/* Active Top Card */}
                  <JobCard
                    job={currentJob}
                    cardView={cardView}
                    onToggleView={handleToggleView}
                    onSwipe={(dir) => (dir === 'right' ? handleLike() : handlePass())}
                    isFrontCard={true}
                    totalRemaining={remainingCount}
                  />
                </div>

                {/* Tactile Control Buttons Bar */}
                <div className="w-full flex items-center justify-center gap-4 pt-2">
                  {/* Undo Button */}
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    title="이전 공고로 되돌리기 (단축키: Z)"
                    className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-md text-amber-600 hover:bg-amber-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  {/* PASS Button */}
                  <button
                    type="button"
                    onClick={handlePass}
                    title="패스 (단축키: ←)"
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-700 hover:text-rose-600 shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer font-bold text-sm"
                  >
                    <X className="w-5 h-5 text-rose-500 stroke-[2.5]" />
                    <span>패스</span>
                  </button>

                  {/* FLIP/DETAILS Button */}
                  <button
                    type="button"
                    onClick={handleToggleView}
                    title="카드 뒤집기 / 상세 보기 (단축키: Space)"
                    className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold text-xs"
                  >
                    <RotateCw className="w-4 h-4 text-indigo-600" />
                    <span>{cardView === 'front' ? '🔍 상세 보기' : '🔄 앞면 보기'}</span>
                  </button>

                  {/* LIKE Button */}
                  <button
                    type="button"
                    onClick={handleLike}
                    title="관심 등록 (단축키: →)"
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer font-bold text-sm"
                  >
                    <Heart className="w-5 h-5 fill-white" />
                    <span>관심 ❤️</span>
                  </button>
                </div>
              </div>
            ) : (
              /* All jobs reviewed state matching Streamlit app */
              <div className="w-full py-16 px-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500 text-white mx-auto flex items-center justify-center text-3xl shadow-lg animate-bounce">
                  🎉
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    오늘 등록된 모든 공고를 확인하셨습니다!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    관심 등록한 공고는 <span className="font-bold text-indigo-600">내 지원 현황</span> 탭에서 체계적으로 관리하고, 언제든 새 공고 텍스트를 추가할 수 있습니다.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-around text-xs">
                  <div>
                    <p className="text-slate-500 font-medium">총 검토 공고</p>
                    <p className="text-lg font-black text-slate-800">{jobQueue.length}개</p>
                  </div>
                  <div className="h-8 w-px bg-indigo-200" />
                  <div>
                    <p className="text-slate-500 font-medium">관심 등록 공고</p>
                    <p className="text-lg font-black text-rose-600">{likedJobs.length}개</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setCurrentIndex(0);
                      setCardView('front');
                      setHistory([]);
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>처음부터 다시 보기</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span>새 공고 추가하기</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setActiveTab('saved');
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                    <span>저장 공고 확인 ({likedJobs.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'saved' ? (
          /* TAB 2: SAVED JOBS & APPLICATION STATUS TRACKER */
          <div className="w-full">
            <SavedJobsTab
              likedJobs={likedJobs}
              onToggleStatus={handleToggleJobStatus}
              onDeleteJob={handleDeleteLikedJob}
              onUpdateNotes={handleUpdateNotes}
              onNavigateToDiscover={() => {
                sound.playClick();
                setActiveTab('swipe');
              }}
              onNavigateToMatch={() => {
                sound.playClick();
                setActiveTab('match');
              }}
            />
          </div>
        ) : (
          /* TAB 3: RESUME MATCH & SCORE (0-100) */
          <div className="w-full">
            <ResumeMatchTab
              likedJobs={likedJobs}
              allJobs={jobQueue}
              onNavigateToDiscover={() => {
                sound.playClick();
                setActiveTab('swipe');
              }}
            />
          </div>
        )}
      </main>

      {/* Add Job Modal */}
      <AddJobModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddJob={handleAddJob}
      />

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-indigo-600" />
                키보드 단축키 안내
              </h3>
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <span>공고 패스 (다음 공고로 넘기기)</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-2xs font-mono font-bold">
                  &larr; 왼쪽 화살표
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <span>관심 등록 (내 지원 현황에 저장)</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-2xs font-mono font-bold">
                  &rarr; 오른쪽 화살표
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <span>카드 앞면 / 뒷면 상세 전환</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-2xs font-mono font-bold">
                  Space / &uarr; / &darr;
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <span>이전 스와이프 취소 및 되돌리기</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-2xs font-mono font-bold">
                  Z
                </kbd>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">전체 데이터를 초기화할까요?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                모든 관심 저장 목록, 지원 현황 메모, 추가된 공고 큐가 초기 상태로 되돌아갑니다.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                초기화 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
