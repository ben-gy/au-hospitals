// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
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

/** Haversine distance in km between two lat/lng points */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Map marker radius scaled by presentation volume (log scale) */
export function markerRadius(presentations: number | null): number {
  if (!presentations || presentations <= 0) return 4;
  return Math.max(4, Math.min(16, 3 + Math.log10(presentations) * 2.5));
}

/** Format distance in km for display */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** State bounds for map fly-to */
export const STATE_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  NSW: [[-37.5, 140.9], [-28.1, 154.0]],
  VIC: [[-39.2, 140.9], [-33.9, 150.0]],
  QLD: [[-29.2, 137.9], [-10.0, 154.0]],
  SA:  [[-38.1, 129.0], [-26.0, 141.0]],
  WA:  [[-35.1, 112.9], [-13.7, 129.0]],
  TAS: [[-43.6, 143.8], [-40.5, 148.5]],
  ACT: [[-35.9, 148.7], [-35.1, 149.4]],
  NT:  [[-26.0, 129.0], [-10.9, 138.0]],
};
