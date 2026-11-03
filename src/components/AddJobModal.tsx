import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Plus,
  FileText,
  AlertCircle,
  Building2,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { SAMPLE_PRESETS } from '../data/defaultJobs';
import { JobPosting } from '../types';
import { sound } from '../utils/audio';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddJob: (rawJdText: string, analyzedJob: JobPosting) => void;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({
  isOpen,
  onClose,
  onAddJob,
}) => {
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (presetText: string) => {
    setJdText(presetText);
    setErrorMsg(null);
    sound.playClick();
  };

  const handleAnalyzeAndAdd = async () => {
    if (!jdText.trim()) {
      setErrorMsg('채용 공고 본문을 입력하거나 아래 샘플 공고를 선택해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText.trim() }),
      });

      if (!res.ok) {
        throw new Error('분석 서버 응답 실패');
      }

      const analyzed = await res.json();
      const newJob: JobPosting = {
        id: `job-${Date.now()}`,
        company: analyzed.company || '새 기업',
        title: analyzed.title || '신규 채용 포지션',
        location: analyzed.location || '전국',
        salary: analyzed.salary || '회사내규',
        tags: analyzed.tags && analyzed.tags.length > 0 ? analyzed.tags : ['#신규채용'],
        summary: analyzed.summary || '상세 공고 내용을 확인하세요.',
        requirements: analyzed.requirements || '상세 요건 확인 필요',
        end_date: analyzed.end_date || '상시채용',
        status: '미작성',
        raw_jd: jdText.trim(),
        key_points: analyzed.key_points || [],
      };

      sound.playLike();
      onAddJob(jdText.trim(), newJob);
      setJdText('');
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('공고 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                ➕ 새 공고 추가 (Gemini AI 분석)
              </h3>
              <p className="text-xs text-slate-500">
                공고 텍스트를 붙여넣으면 AI가 핵심 요건과 D-Day를 자동 추출합니다
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Quick Presets */}
          <div>
            <span className="font-semibold text-slate-600 block mb-1.5">
              🚀 빠른 테스트용 샘플 공고 선택
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset.text)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-medium transition cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="jd-input" className="font-semibold text-slate-700">
                공고 텍스트 붙여넣기
              </label>
              {jdText && (
                <button
                  type="button"
                  onClick={() => setJdText('')}
                  className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                >
                  지우기
                </button>
              )}
            </div>
            <textarea
              id="jd-input"
              rows={6}
              value={jdText}
              onChange={(e) => {
                setJdText(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="[기업명] 직무명 채용... 주요업무, 자격요건, 우대사항, 마감일 등 채용 공고 본문을 복사해 붙여넣으세요..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition leading-relaxed"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              자동 추출 항목
            </p>
            <p className="text-[11px] text-indigo-800 leading-normal">
              기업명, 직무명, 근무지, 연봉처우, 태그(#), 현장 실제 업무 요약, 필수/우대요건,
              D-Day 마감일이 즉시 구조화되어 스와이프 카드 큐에 등록됩니다.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isAnalyzing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleAnalyzeAndAdd}
            disabled={isAnalyzing || !jdText.trim()}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>AI가 공고 분석 중...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>공고 큐에 추가</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
