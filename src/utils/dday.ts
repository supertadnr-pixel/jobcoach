/**
 * D-Day calculator matching and enhancing the Streamlit calculate_dday logic
 */
export interface DDayResult {
  text: string;
  diff: number | null;
  status: 'urgent' | 'warning' | 'normal' | 'closed' | 'open';
}

export function calculateDDay(endDateStr?: string): DDayResult {
  if (!endDateStr || endDateStr.includes('상시') || endDateStr === '-') {
    return {
      text: '상시채용',
      diff: null,
      status: 'open',
    };
  }

  try {
    // Parse YYYY-MM-DD
    const cleanDate = endDateStr.replace(/\./g, '-').replace(/\//g, '-').trim();
    const parts = cleanDate.split('-');
    if (parts.length < 3) {
      return { text: endDateStr, diff: null, status: 'open' };
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const targetDate = new Date(year, month, day);
    if (isNaN(targetDate.getTime())) {
      return { text: endDateStr, diff: null, status: 'open' };
    }

    const now = new Date();
    // Normalize to date boundaries (midnight)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { text: 'D-Day 오늘 마감!', diff: 0, status: 'urgent' };
    } else if (diffDays > 0) {
      const status = diffDays <= 3 ? 'urgent' : diffDays <= 7 ? 'warning' : 'normal';
      return { text: `D-${diffDays}`, diff: diffDays, status };
    } else {
      return { text: `D+${Math.abs(diffDays)} (마감)`, diff: diffDays, status: 'closed' };
    }
  } catch {
    return { text: '상시채용', diff: null, status: 'open' };
  }
}

export function getDDayBadgeClass(status: DDayResult['status']): string {
  switch (status) {
    case 'urgent':
      return 'bg-red-500 text-white font-semibold animate-pulse';
    case 'warning':
      return 'bg-amber-500 text-white font-semibold';
    case 'closed':
      return 'bg-slate-400 text-white';
    case 'open':
      return 'bg-emerald-600 text-white font-medium';
    case 'normal':
    default:
      return 'bg-indigo-600 text-white font-semibold';
  }
}
