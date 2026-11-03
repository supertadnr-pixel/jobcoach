import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Heart,
} from 'lucide-react';
import { JobPosting } from '../types';
import { calculateDDay, getDDayBadgeClass } from '../utils/dday';
import { sound } from '../utils/audio';

interface CalendarViewProps {
  jobs: JobPosting[];
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  jobs,
  selectedDate,
  onSelectDate,
}) => {
  // Real-time clock (updates every 1s)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calendar navigation state (year & month)
  const [viewYear, setViewYear] = useState<number>(currentTime.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(currentTime.getMonth()); // 0-indexed

  // Format current live time in Korean
  const timeStrings = useMemo(() => {
    const y = currentTime.getFullYear();
    const m = currentTime.getMonth() + 1;
    const d = currentTime.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[currentTime.getDay()];

    const h = currentTime.getHours();
    const ampm = h >= 12 ? '오후' : '오전';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const min = String(currentTime.getMinutes()).padStart(2, '0');
    const sec = String(currentTime.getSeconds()).padStart(2, '0');

    return {
      dateFormatted: `${y}년 ${m}월 ${d}일 (${dayName})`,
      timeFormatted: `${ampm} ${displayHour}:${min}:${sec}`,
      isoToday: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    };
  }, [currentTime]);

  // Map ONLY jobs explicitly selected as '관심' (liked) by end_date (YYYY-MM-DD)
  const jobsByDate = useMemo(() => {
    const map = new Map<string, JobPosting[]>();
    jobs.forEach((job) => {
      if (!job.end_date) return;
      const cleanDate = job.end_date.replace(/\./g, '-').replace(/\//g, '-').trim();
      const match = cleanDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (match) {
        const normalized = `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
        const existing = map.get(normalized) || [];
        existing.push(job);
        map.set(normalized, existing);
      }
    });
    return map;
  }, [jobs]);

  // Navigate months
  const handlePrevMonth = () => {
    sound.playClick();
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    sound.playClick();
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleGoToToday = () => {
    sound.playClick();
    setViewYear(currentTime.getFullYear());
    setViewMonth(currentTime.getMonth());
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      monthType: 'prev' | 'current' | 'next';
      dateStr: string;
      isToday: boolean;
      jobs: JobPosting[];
    }> = [];

    // Preceding month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        day: dayNum,
        monthType: 'prev',
        dateStr,
        isToday: dateStr === timeStrings.isoToday,
        jobs: jobsByDate.get(dateStr) || [],
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const curM = viewMonth + 1;
      const dateStr = `${viewYear}-${String(curM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        day: dayNum,
        monthType: 'current',
        dateStr,
        isToday: dateStr === timeStrings.isoToday,
        jobs: jobsByDate.get(dateStr) || [],
      });
    }

    // Trailing next month days (to complete 5 or 6 rows of 7 = 35 or 42)
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remainingSlots = totalSlots - days.length;
    for (let dayNum = 1; dayNum <= remainingSlots; dayNum++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        day: dayNum,
        monthType: 'next',
        dateStr,
        isToday: dateStr === timeStrings.isoToday,
        jobs: jobsByDate.get(dateStr) || [],
      });
    }

    return days;
  }, [viewYear, viewMonth, jobsByDate, timeStrings.isoToday]);

  const weekDayHeaders = [
    { label: '일', color: 'text-red-500' },
    { label: '월', color: 'text-slate-700' },
    { label: '화', color: 'text-slate-700' },
    { label: '수', color: 'text-slate-700' },
    { label: '목', color: 'text-slate-700' },
    { label: '금', color: 'text-slate-700' },
    { label: '토', color: 'text-blue-500' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4">
      {/* 1. Live Current Time & Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Real-time Clock display */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                현재 실시간
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {timeStrings.dateFormatted}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/40 text-rose-200 text-[10px] font-bold">
                <Heart className="w-2.5 h-2.5 fill-rose-300 text-rose-300" />
                관심 기업 {jobs.length}곳 일정
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white mt-0.5">
              {timeStrings.timeFormatted}
            </div>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleGoToToday}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>오늘로</span>
          </button>

          <div className="flex items-center bg-white/10 rounded-xl border border-white/20 p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="이전 달"
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-black tracking-wide text-white min-w-[90px] text-center">
              {viewYear}년 {viewMonth + 1}월
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              title="다음 달"
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notice if no jobs are liked yet */}
      {jobs.length === 0 && (
        <div className="mx-4 sm:mx-5 p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
            <span className="font-medium text-[11px] leading-relaxed">
              아직 관심 등록(❤️)한 기업이 없습니다. <strong>'🔥 스와이프 탐색'</strong>에서 관심 등록한 기업의 마감일만 이곳 달력에 표시됩니다.
            </span>
          </div>
        </div>
      )}

      {/* Selected Date Filter Banner (if user clicked on a specific date) */}
      {selectedDate && (
        <div className="mx-4 sm:mx-5 p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-indigo-950">
              {selectedDate} 마감 공고 필터링 중
            </span>
            <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md font-bold text-[10px]">
              {(jobsByDate.get(selectedDate) || []).length}건
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onSelectDate(null);
            }}
            className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100/60 text-indigo-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            전체 날짜 보기
          </button>
        </div>
      )}

      {/* 2. Visual Calendar Grid */}
      <div className="p-4 sm:p-5 pt-0">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 text-center text-xs font-bold py-2 bg-slate-50/80 rounded-xl border border-slate-100">
          {weekDayHeaders.map((header, idx) => (
            <div key={idx} className={`${header.color} select-none`}>
              {header.label}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((item, idx) => {
            const isSelected = selectedDate === item.dateStr;
            const hasDeadlines = item.jobs.length > 0;
            const dayOfWeek = idx % 7; // 0 = Sun, 6 = Sat

            return (
              <div
                key={idx}
                onClick={() => {
                  if (hasDeadlines) {
                    sound.playClick();
                    onSelectDate(isSelected ? null : item.dateStr);
                  }
                }}
                className={`min-h-[70px] sm:min-h-[82px] p-1.5 sm:p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                  item.monthType !== 'current'
                    ? 'bg-slate-50/40 border-slate-100 text-slate-300'
                    : isSelected
                    ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-300 shadow-xs'
                    : item.isToday
                    ? 'bg-blue-50/60 border-blue-300 shadow-2xs'
                    : 'bg-white border-slate-200/70 hover:border-slate-300'
                } ${hasDeadlines ? 'cursor-pointer hover:shadow-xs' : ''}`}
              >
                {/* Date Number & Today marker */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                      item.isToday
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : item.monthType !== 'current'
                        ? 'text-slate-300'
                        : dayOfWeek === 0
                        ? 'text-red-500'
                        : dayOfWeek === 6
                        ? 'text-blue-500'
                        : 'text-slate-700'
                    }`}
                  >
                    {item.day}
                  </span>

                  {item.isToday && (
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-100/80 px-1 rounded-sm">
                      오늘
                    </span>
                  )}
                </div>

                {/* Deadlines List preview in cell */}
                <div className="mt-1 space-y-1 overflow-hidden">
                  {item.jobs.slice(0, 2).map((job) => {
                    const dday = calculateDDay(job.end_date);
                    const isCompleted = job.status === '작성완료';

                    return (
                      <div
                        key={job.id}
                        title={`[${job.company}] ${job.title} (${dday.text}) - ${job.status}`}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate flex items-center gap-1 shadow-2xs transition-transform hover:scale-[1.02] ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : dday.status === 'urgent'
                            ? 'bg-red-500 text-white animate-pulse'
                            : dday.status === 'warning'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        <span className="truncate">{job.company}</span>
                      </div>
                    );
                  })}

                  {item.jobs.length > 2 && (
                    <span className="text-[9px] font-bold text-slate-500 pl-1">
                      +{item.jobs.length - 2}개 더
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-y-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>오늘</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>마감 임박 (D-3 이내)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>마감 예정 (D-7 이내)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>작성 완료</span>
            </div>
          </div>
          <span className="text-slate-400">
            * 날짜를 클릭하면 해당 일자의 마감 공고만 모아볼 수 있습니다.
          </span>
        </div>
      </div>
    </div>
  );
};
