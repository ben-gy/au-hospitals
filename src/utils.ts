import type { TriageCategory, UrgencyCategory } from './types.ts';

export function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatPct(value: number | null, decimals = 0): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatDays(days: number | null): string {
  if (days === null || days === undefined) return '—';
  return `${Math.round(days)} days`;
}

export function formatCount(count: number | null): string {
  if (count === null || count === undefined) return '—';
  return count.toLocaleString('en-AU');
}

/** Returns CSS class for performance colouring based on %-seen-on-time */
export function pctClass(value: number | null): string {
  if (value === null) return 'metric-na';
  if (value >= 75) return 'metric-good';
  if (value >= 50) return 'metric-warn';
  return 'metric-bad';
}

/** Returns CSS class for ED time in minutes — lower is better */
export function timeClass(minutes: number | null): string {
  if (minutes === null) return 'metric-na';
  if (minutes <= 240) return 'metric-good';
  if (minutes <= 360) return 'metric-warn';
  return 'metric-bad';
}

/** Returns CSS class for elective surgery wait days — lower is better */
export function daysClass(days: number | null, urgency: UrgencyCategory): string {
  if (days === null) return 'metric-na';
  const benchmarks: Record<UrgencyCategory, [number, number]> = {
    'Urgent elective surgery': [30, 60],
    'Semi-urgent elective surgery': [90, 180],
    'Non-urgent elective surgery': [180, 365],
  };
  const [good, warn] = benchmarks[urgency];
  if (days <= good) return 'metric-good';
  if (days <= warn) return 'metric-warn';
  return 'metric-bad';
}

export const TRIAGE_CATEGORIES: TriageCategory[] = [
  'Resuscitation',
  'Emergency',
  'Urgent',
  'Semi-Urgent',
  'Non-Urgent',
];

export const TRIAGE_RECOMMENDED_MINUTES: Record<TriageCategory, number> = {
  Resuscitation: 0,    // immediate
  Emergency: 10,
  Urgent: 30,
  'Semi-Urgent': 60,
  'Non-Urgent': 120,
};

export const TRIAGE_SHORT: Record<TriageCategory, string> = {
  Resuscitation: 'T1',
  Emergency: 'T2',
  Urgent: 'T3',
  'Semi-Urgent': 'T4',
  'Non-Urgent': 'T5',
};

export const STATE_NAMES: Record<string, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  SA: 'South Australia',
  WA: 'Western Australia',
  TAS: 'Tasmania',
  ACT: 'ACT',
  NT: 'Northern Territory',
};

export const ALL_STATES = Object.keys(STATE_NAMES);

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/** Normalise a hospital name reported_measure_category for display */
export function normaliseTriageCategory(raw: string | null): TriageCategory | null {
  if (!raw) return null;
  const map: Record<string, TriageCategory> = {
    'Resuscitation': 'Resuscitation',
    'Emergency': 'Emergency',
    'Urgent': 'Urgent',
    'Semi-Urgent': 'Semi-Urgent',
    'Semi-urgent': 'Semi-Urgent',
    'Non-Urgent': 'Non-Urgent',
    'Non-urgent': 'Non-Urgent',
  };
  return map[raw] ?? null;
}

export function normaliseUrgencyCategory(raw: string | null): UrgencyCategory | null {
  if (!raw) return null;
  const map: Record<string, UrgencyCategory> = {
    'Urgent elective surgery': 'Urgent elective surgery',
    'Urgent': 'Urgent elective surgery',
    'Semi-urgent elective surgery': 'Semi-urgent elective surgery',
    'Semi-Urgent elective surgery': 'Semi-urgent elective surgery',
    'Non-urgent elective surgery': 'Non-urgent elective surgery',
    'Non-Urgent elective surgery': 'Non-urgent elective surgery',
  };
  return map[raw] ?? null;
}

/** Sort hospitals: those with data first, then alphabetically */
export function hospitalSortKey(fourHourRate: number | null): number {
  return fourHourRate !== null ? fourHourRate : -1;
}
