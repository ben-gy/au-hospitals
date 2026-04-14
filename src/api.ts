import type {
  Hospital,
  EDMetrics,
  TriageMetrics,
  ElectiveSurgeryMetrics,
  RawReportingUnit,
  RawDataItem,
  RawPaginatedResponse,
  TriageCategory,
  UrgencyCategory,
} from './types.ts';
import { normaliseTriageCategory, normaliseUrgencyCategory } from './utils.ts';

const BASE = 'https://myhospitalsapi.aihw.gov.au/api/v1';
const CACHE_VERSION = 'v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Cache helpers ────────────────────────────────────────────────────────────

function cacheKey(id: string): string {
  return `aihw_${CACHE_VERSION}_${id}`;
}

function cacheGet<T>(id: string): T | null {
  try {
    const exp = localStorage.getItem(cacheKey(id) + '_exp');
    if (!exp || Date.now() > parseInt(exp, 10)) return null;
    const raw = localStorage.getItem(cacheKey(id));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function cacheSet<T>(id: string, data: T): void {
  try {
    localStorage.setItem(cacheKey(id), JSON.stringify(data));
    localStorage.setItem(cacheKey(id) + '_exp', String(Date.now() + CACHE_TTL_MS));
  } catch {
    // storage quota exceeded — ignore
  }
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

/** Fetch all pages of a flat-data-extract endpoint */
async function fetchAllPages(
  category: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<RawDataItem[]> {
  const PAGE_SIZE = 1000;
  const all: RawDataItem[] = [];
  let skip = 0;

  while (true) {
    const qs = new URLSearchParams({ ...params, skip: String(skip), top: String(PAGE_SIZE) });
    const data = await fetchJson<RawPaginatedResponse>(`${BASE}/flat-data-extract/${category}?${qs}`, signal);
    all.push(...data.result.data);
    const total = data.result.pagination.total_results_available;
    skip += PAGE_SIZE;
    if (skip >= total) break;
  }

  return all;
}

// ── Hospitals ────────────────────────────────────────────────────────────────

export async function fetchHospitals(signal?: AbortSignal): Promise<Hospital[]> {
  const cached = cacheGet<Hospital[]>('hospitals');
  if (cached) return cached;

  const data = await fetchJson<{ result: RawReportingUnit[] }>(`${BASE}/reporting-units?reporting_unit_type_code=H`, signal);

  const hospitals: Hospital[] = data.result.map((u) => {
    const stateMapping = u.mapped_reporting_units.find(
      (m) => m.map_type.mapped_reporting_unit_code === 'STATE_MAPPING',
    );
    const lhnMapping = u.mapped_reporting_units.find(
      (m) => m.map_type.mapped_reporting_unit_code === 'H_LHN',
    );
    return {
      code: u.reporting_unit_code,
      name: u.reporting_unit_name,
      state: stateMapping?.mapped_reporting_unit.reporting_unit_code ?? 'Unknown',
      isPrivate: u.private ?? false,
      lat: u.latitude,
      lng: u.longitude,
      lhnName: lhnMapping?.mapped_reporting_unit.reporting_unit_name ?? '',
      lhnCode: lhnMapping?.mapped_reporting_unit.reporting_unit_code ?? '',
    };
  });

  cacheSet('hospitals', hospitals);
  return hospitals;
}

// ── ED Metrics ───────────────────────────────────────────────────────────────

export async function fetchEDMetrics(signal?: AbortSignal): Promise<Map<string, EDMetrics>> {
  const cached = cacheGet<[string, EDMetrics][]>('ed_metrics');
  if (cached) return new Map(cached);

  // Fetch MYH0005 (4hr rate), MYH0013 (P90 time), MYH0036 (median time), MYH0012 (presentations)
  const commonParams = { start_date: '2024-07-01', reporting_unit_type_code: 'H' };

  const [items4hr, itemsP90, itemsMedian, itemsPres] = await Promise.all([
    fetchAllPages('MYH-ED-TIME', { ...commonParams, measure_code: 'MYH0005' }, signal),
    fetchAllPages('MYH-ED-TIME', { ...commonParams, measure_code: 'MYH0013' }, signal),
    fetchAllPages('MYH-ED-TIME', { ...commonParams, measure_code: 'MYH0036' }, signal),
    fetchAllPages('MYH-ED-TIME', { ...commonParams, measure_code: 'MYH0012' }, signal),
  ]);

  const map = new Map<string, EDMetrics>();

  function getOrCreate(code: string): EDMetrics {
    if (!map.has(code)) {
      map.set(code, {
        hospitalCode: code,
        fourHourRateAll: null,
        fourHourRateAdmitted: null,
        fourHourRateNotAdmitted: null,
        fourHourByTriage: {},
        medianTimeAll: null,
        medianTimeAdmitted: null,
        medianTimeNotAdmitted: null,
        p90TimeAll: null,
        p90TimeAdmitted: null,
        totalPresentations: null,
      });
    }
    return map.get(code)!;
  }

  // 4-hour departure rate
  for (const item of items4hr) {
    if (item.value === null) continue;
    const m = getOrCreate(item.reporting_unit_code);
    const cat = item.reported_measure_name;
    if (cat === 'All patients') m.fourHourRateAll = item.value;
    else if (cat === 'Subsequently admitted patients') m.fourHourRateAdmitted = item.value;
    else if (cat === 'Not subsequently admitted patients') m.fourHourRateNotAdmitted = item.value;
    else {
      const triage = normaliseTriageCategory(cat);
      if (triage) m.fourHourByTriage[triage] = item.value;
    }
  }

  // 90th percentile time
  for (const item of itemsP90) {
    if (item.value === null) continue;
    const m = getOrCreate(item.reporting_unit_code);
    const cat = item.reported_measure_name;
    if (cat === 'All patients') m.p90TimeAll = item.value;
    else if (cat === 'Subsequently admitted patients') m.p90TimeAdmitted = item.value;
  }

  // Median time
  for (const item of itemsMedian) {
    if (item.value === null) continue;
    const m = getOrCreate(item.reporting_unit_code);
    const cat = item.reported_measure_name;
    if (cat === 'All patients') m.medianTimeAll = item.value;
    else if (cat === 'Subsequently admitted patients') m.medianTimeAdmitted = item.value;
    else if (cat === 'Not subsequently admitted patients') m.medianTimeNotAdmitted = item.value;
  }

  // Total presentations (All patients)
  for (const item of itemsPres) {
    if (item.value === null) continue;
    const m = getOrCreate(item.reporting_unit_code);
    if (item.reported_measure_name === 'All patients') m.totalPresentations = item.value;
  }

  cacheSet('ed_metrics', [...map.entries()]);
  return map;
}

// ── Triage Metrics ───────────────────────────────────────────────────────────

export async function fetchTriageMetrics(signal?: AbortSignal): Promise<Map<string, TriageMetrics>> {
  const cached = cacheGet<[string, TriageMetrics][]>('triage_metrics');
  if (cached) return new Map(cached);

  const items = await fetchAllPages(
    'MYH-ED-WAITS',
    { start_date: '2024-07-01', reporting_unit_type_code: 'H' },
    signal,
  );

  const map = new Map<string, TriageMetrics>();

  function getOrCreate(code: string): TriageMetrics {
    if (!map.has(code)) {
      map.set(code, { hospitalCode: code, onTimePct: {}, count: {} });
    }
    return map.get(code)!;
  }

  for (const item of items) {
    if (item.value === null) continue;
    const triage = normaliseTriageCategory(item.reported_measure_category_name);
    if (!triage) continue;
    const m = getOrCreate(item.reporting_unit_code);
    if (item.measure_code === 'MYH0010') {
      m.onTimePct[triage as TriageCategory] = item.value;
    } else if (item.measure_code === 'MYH0011') {
      m.count[triage as TriageCategory] = item.value;
    }
  }

  cacheSet('triage_metrics', [...map.entries()]);
  return map;
}

// ── Elective Surgery (lazy, per-hospital) ────────────────────────────────────

export async function fetchElectiveMetrics(
  hospitalCode: string,
  signal?: AbortSignal,
): Promise<ElectiveSurgeryMetrics> {
  const cid = `elective_${hospitalCode}`;
  const cached = cacheGet<ElectiveSurgeryMetrics>(cid);
  if (cached) return cached;

  const items = await fetchAllPages(
    'MYH-ES',
    {
      start_date: '2024-07-01',
      reporting_unit_code: hospitalCode,
    },
    signal,
  );

  const result: ElectiveSurgeryMetrics = {
    hospitalCode,
    medianDays: {},
    onTimePct: {},
    count: {},
  };

  for (const item of items) {
    if (item.value === null) continue;
    const urgency = normaliseUrgencyCategory(item.reported_measure_category_name);
    if (!urgency) continue;
    if (item.measure_code === 'MYH0009') {
      result.medianDays[urgency as UrgencyCategory] = item.value;
    } else if (item.measure_code === 'MYH0008') {
      result.onTimePct[urgency as UrgencyCategory] = item.value;
    } else if (item.measure_code === 'MYH0006') {
      result.count[urgency as UrgencyCategory] = item.value;
    }
  }

  cacheSet(cid, result);
  return result;
}

export function clearCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(`aihw_${CACHE_VERSION}_`)) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}
