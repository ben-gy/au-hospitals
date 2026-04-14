import type { Hospital, EDMetrics, StateMetrics } from '../types.ts';
import { ALL_STATES, STATE_NAMES, formatPct, formatMinutes, pctClass, timeClass } from '../utils.ts';

function computeStateMetrics(
  hospitals: Hospital[],
  edMetrics: Map<string, EDMetrics>,
): StateMetrics[] {
  return ALL_STATES.map((state) => {
    const stateHospitals = hospitals.filter((h) => h.state === state);
    const withED = stateHospitals.filter((h) => edMetrics.get(h.code)?.fourHourRateAll !== null);

    const fourHourRates = withED
      .map((h) => edMetrics.get(h.code)?.fourHourRateAll)
      .filter((v): v is number => v !== null && v !== undefined);

    const medianTimes = withED
      .map((h) => edMetrics.get(h.code)?.medianTimeAll)
      .filter((v): v is number => v !== null && v !== undefined);

    const p90Times = withED
      .map((h) => edMetrics.get(h.code)?.p90TimeAll)
      .filter((v): v is number => v !== null && v !== undefined);

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return {
      state,
      fourHourRateAll: avg(fourHourRates),
      medianTimeAll: avg(medianTimes),
      p90TimeAll: avg(p90Times),
      hospitalCount: withED.length,
    };
  }).filter((s) => s.hospitalCount > 0);
}

function renderStateGrid(
  metrics: StateMetrics[],
): string {
  return `
    <div class="state-grid">
      ${metrics.map((sm) => {
        const cls = pctClass(sm.fourHourRateAll);
        return `
          <div class="state-card" data-state="${sm.state}" tabindex="0" role="button" aria-label="View ${STATE_NAMES[sm.state] ?? sm.state} hospitals">
            <div class="state-card-name">${STATE_NAMES[sm.state] ?? sm.state}</div>
            <div class="state-card-abbr state-abbr-${sm.state}">${sm.state}</div>
            <div class="state-card-metric">
              <span>4-hr departure</span>
              <span class="state-card-metric-val ${cls}">${formatPct(sm.fourHourRateAll, 1)}</span>
            </div>
            <div class="state-card-metric">
              <span>Median ED time</span>
              <span class="state-card-metric-val ${timeClass(sm.medianTimeAll)}">${formatMinutes(sm.medianTimeAll)}</span>
            </div>
            <div class="state-card-metric">
              <span>90th pct ED time</span>
              <span class="state-card-metric-val ${timeClass(sm.p90TimeAll)}">${formatMinutes(sm.p90TimeAll)}</span>
            </div>
            <div class="state-card-count">${sm.hospitalCount} hospital${sm.hospitalCount !== 1 ? 's' : ''} reporting</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderRankings(
  hospitals: Hospital[],
  edMetrics: Map<string, EDMetrics>,
  onSelect: (h: Hospital) => void,
): string {
  const withRate = hospitals.filter(
    (h) => (edMetrics.get(h.code)?.fourHourRateAll ?? null) !== null,
  );

  const sorted = [...withRate].sort(
    (a, b) =>
      (edMetrics.get(b.code)!.fourHourRateAll ?? 0) -
      (edMetrics.get(a.code)!.fourHourRateAll ?? 0),
  );

  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.slice(-10).reverse();

  const renderRow = (h: Hospital, rank: number) => {
    const rate = edMetrics.get(h.code)?.fourHourRateAll ?? null;
    const cls = pctClass(rate);
    return `
      <div class="ranking-row" data-code="${h.code}" tabindex="0" role="button" aria-label="${h.name}">
        <span class="ranking-num">${rank}</span>
        <span class="ranking-name" title="${h.name}">${h.name}</span>
        <span class="ranking-state-tag">${h.state}</span>
        <span class="ranking-val ${cls}">${formatPct(rate, 1)}</span>
      </div>
    `;
  };

  const bindRows = (container: HTMLElement) => {
    container.querySelectorAll<HTMLElement>('.ranking-row').forEach((row) => {
      const code = row.dataset.code;
      const hospital = hospitals.find((h) => h.code === code);
      if (!hospital) return;
      row.addEventListener('click', () => onSelect(hospital));
      row.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') onSelect(hospital);
      });
    });
  };

  // Return placeholder HTML; bind events in the updateOverview function via callback
  void bindRows; // avoid unused warning — binding done in updateOverview

  return `
    <div class="rankings-grid">
      <div class="ranking-card">
        <div class="ranking-card-title">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color:var(--status-good)">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/>
          </svg>
          Best performing — 4-hr departure rate
        </div>
        ${top10.map((h, i) => renderRow(h, i + 1)).join('')}
      </div>
      <div class="ranking-card">
        <div class="ranking-card-title">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color:var(--status-bad)">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
          Needs improvement — 4-hr departure rate
        </div>
        ${bottom10.map((h, i) => renderRow(h, sorted.length - 9 + i)).join('')}
      </div>
    </div>
  `;
}

export function renderOverview(
  hospitals: Hospital[],
  edMetrics: Map<string, EDMetrics>,
  onStateSelect: (state: string) => void,
  onHospitalSelect: (h: Hospital) => void,
): HTMLElement {
  const panel = document.createElement('div');
  panel.id = 'overview-panel';
  updateOverview(panel, hospitals, edMetrics, onStateSelect, onHospitalSelect);
  return panel;
}

export function updateOverview(
  panel: HTMLElement,
  hospitals: Hospital[],
  edMetrics: Map<string, EDMetrics>,
  onStateSelect: (state: string) => void,
  onHospitalSelect: (h: Hospital) => void,
): void {
  const stateMetrics = computeStateMetrics(hospitals, edMetrics);
  const withData = hospitals.filter((h) => edMetrics.has(h.code));

  panel.innerHTML = `
    <h1 class="section-title">Australian Hospital Performance</h1>
    <p class="section-subtitle">
      Emergency department and elective surgery data from <strong>AIHW MyHospitals</strong>, financial year 2024–25.
      Select a hospital from the left to see full details.
    </p>
    <div class="legend">
      <div class="legend-item"><div class="legend-dot good"></div>Good ≥75%</div>
      <div class="legend-item"><div class="legend-dot warn"></div>Moderate 50–74%</div>
      <div class="legend-item"><div class="legend-dot bad"></div>Poor &lt;50%</div>
      <div class="legend-item" style="margin-left:auto;color:var(--text-muted);font-size:.6875rem">
        ${withData.length.toLocaleString()} hospitals with ED data
      </div>
    </div>
    ${renderStateGrid(stateMetrics)}
    ${renderRankings(hospitals, edMetrics, onHospitalSelect)}
    <p style="font-size:.6875rem;color:var(--text-muted);margin-top:.5rem">
      Source: <a href="https://www.aihw.gov.au/reports-data/myhospitals" target="_blank" rel="noopener" style="color:var(--accent-primary)">AIHW MyHospitals API</a>
      · 4-hr rate = % of presentations that departed ED within 4 hours
      · Rankings show public and private hospitals with 2024–25 data
    </p>
  `;

  // Bind state cards
  panel.querySelectorAll<HTMLElement>('.state-card').forEach((card) => {
    const state = card.dataset.state;
    if (state) {
      card.addEventListener('click', () => onStateSelect(state));
      card.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') onStateSelect(state);
      });
    }
  });

  // Bind ranking rows
  panel.querySelectorAll<HTMLElement>('.ranking-row').forEach((row) => {
    const code = row.dataset.code;
    const hospital = hospitals.find((h) => h.code === code);
    if (!hospital) return;
    row.addEventListener('click', () => onHospitalSelect(hospital));
    row.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') onHospitalSelect(hospital);
    });
  });
}
