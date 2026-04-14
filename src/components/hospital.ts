import type {
  Hospital,
  EDMetrics,
  TriageMetrics,
  ElectiveSurgeryMetrics,
} from '../types.ts';
import {
  formatPct,
  formatMinutes,
  formatDays,
  formatCount,
  pctClass,
  timeClass,
  daysClass,
  TRIAGE_CATEGORIES,
  TRIAGE_RECOMMENDED_MINUTES,
  TRIAGE_SHORT,
  escapeHtml,
} from '../utils.ts';

const URGENCY_LABELS = [
  'Urgent elective surgery',
  'Semi-urgent elective surgery',
  'Non-urgent elective surgery',
] as const;

const URGENCY_SHORT: Record<string, string> = {
  'Urgent elective surgery': 'Urgent',
  'Semi-urgent elective surgery': 'Semi-urgent',
  'Non-urgent elective surgery': 'Non-urgent',
};

const URGENCY_BENCHMARKS: Record<string, string> = {
  'Urgent elective surgery': '≤30 days recommended',
  'Semi-urgent elective surgery': '≤90 days recommended',
  'Non-urgent elective surgery': '≤365 days recommended',
};

export function renderHospitalDetail(
  hospital: Hospital,
  edMetrics: EDMetrics | undefined,
  triageMetrics: TriageMetrics | undefined,
  electiveMetrics: ElectiveSurgeryMetrics | 'loading' | undefined,
  onBack: () => void,
): HTMLElement {
  const panel = document.createElement('div');
  panel.id = 'hospital-detail';
  updateHospitalDetail(panel, hospital, edMetrics, triageMetrics, electiveMetrics, onBack);
  return panel;
}

export function updateHospitalDetail(
  panel: HTMLElement,
  hospital: Hospital,
  edMetrics: EDMetrics | undefined,
  triageMetrics: TriageMetrics | undefined,
  electiveMetrics: ElectiveSurgeryMetrics | 'loading' | undefined,
  onBack: () => void,
): void {
  const ed = edMetrics;
  const triage = triageMetrics;

  const fourHourClass = pctClass(ed?.fourHourRateAll ?? null);
  const medianClass = timeClass(ed?.medianTimeAll ?? null);
  const p90Class = timeClass(ed?.p90TimeAll ?? null);

  panel.innerHTML = `
    <div class="hospital-header">
      <div class="hospital-header-top">
        <div>
          <div class="hospital-name">${escapeHtml(hospital.name)}</div>
          <div class="hospital-tags">
            <span class="tag tag-state">${hospital.state}</span>
            <span class="tag ${hospital.isPrivate ? 'tag-private' : 'tag-public'}">${hospital.isPrivate ? 'Private' : 'Public'}</span>
            ${hospital.lhnName ? `<span class="tag tag-lhn">${escapeHtml(hospital.lhnName)}</span>` : ''}
          </div>
        </div>
        <button class="back-btn" id="back-btn" aria-label="Back to overview">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Overview
        </button>
      </div>
    </div>

    <!-- ED Summary Metrics -->
    <div class="section-card">
      <div class="section-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color:var(--accent-primary)">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
        Emergency Department Performance — 2024–25
      </div>

      ${!ed ? `
        <div class="empty-state">
          <p>No ED data reported for this hospital in 2024–25.</p>
          <p>This may be a specialist, private, or non-ED facility.</p>
        </div>
      ` : `
        <div class="detail-grid">
          <div class="metric-card">
            <div class="metric-card-title">4-hour departure rate</div>
            <div class="metric-big ${fourHourClass}">${formatPct(ed.fourHourRateAll)}</div>
            <div class="metric-sub">% of patients who departed within 4 hours</div>
            ${ed.fourHourRateAll !== null ? `
              <div class="progress-bar-wrap" style="margin-top:8px">
                <div class="progress-bar ${fourHourClass}" style="width:${ed.fourHourRateAll}%"></div>
              </div>
            ` : ''}
          </div>
          <div class="metric-card">
            <div class="metric-card-title">Median time in ED</div>
            <div class="metric-big ${medianClass}">${formatMinutes(ed.medianTimeAll)}</div>
            <div class="metric-sub">50th percentile departure time (all patients)</div>
          </div>
          <div class="metric-card">
            <div class="metric-card-title">90th percentile ED time</div>
            <div class="metric-big ${p90Class}">${formatMinutes(ed.p90TimeAll)}</div>
            <div class="metric-sub">Most patients (90%) departed by this time</div>
          </div>
          ${ed.totalPresentations !== null ? `
            <div class="metric-card">
              <div class="metric-card-title">Total presentations</div>
              <div class="metric-big metric-na" style="font-size:1.75rem">${formatCount(ed.totalPresentations)}</div>
              <div class="metric-sub">Patients presenting in 2024–25</div>
            </div>
          ` : ''}
        </div>

        <!-- Admitted vs Not admitted -->
        ${(ed.fourHourRateAdmitted !== null || ed.fourHourRateNotAdmitted !== null) ? `
          <div style="margin-bottom:var(--space-lg)">
            <div style="font-size:var(--font-size-sm);font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-sm)">
              4-hour rate by admission status
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Patient group</th>
                  <th style="text-align:right">4-hr departure %</th>
                  <th style="text-align:right">Median time</th>
                  <th style="text-align:right">90th pct time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>All patients</td>
                  <td class="num ${pctClass(ed.fourHourRateAll)}">${formatPct(ed.fourHourRateAll)}</td>
                  <td class="num ${timeClass(ed.medianTimeAll)}">${formatMinutes(ed.medianTimeAll)}</td>
                  <td class="num ${timeClass(ed.p90TimeAll)}">${formatMinutes(ed.p90TimeAll)}</td>
                </tr>
                ${ed.fourHourRateAdmitted !== null ? `
                  <tr>
                    <td>Subsequently admitted</td>
                    <td class="num ${pctClass(ed.fourHourRateAdmitted)}">${formatPct(ed.fourHourRateAdmitted)}</td>
                    <td class="num ${timeClass(ed.medianTimeAdmitted)}">${formatMinutes(ed.medianTimeAdmitted)}</td>
                    <td class="num ${timeClass(ed.p90TimeAdmitted)}">${formatMinutes(ed.p90TimeAdmitted)}</td>
                  </tr>
                ` : ''}
                ${ed.fourHourRateNotAdmitted !== null ? `
                  <tr>
                    <td>Not subsequently admitted</td>
                    <td class="num ${pctClass(ed.fourHourRateNotAdmitted)}">${formatPct(ed.fourHourRateNotAdmitted)}</td>
                    <td class="num ${timeClass(ed.medianTimeNotAdmitted)}">${formatMinutes(ed.medianTimeNotAdmitted)}</td>
                    <td class="num">—</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        ` : ''}
      `}
    </div>

    <!-- Triage category breakdown -->
    ${ed && triage ? `
      <div class="section-card">
        <div class="section-card-title">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color:var(--accent-primary)">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"/>
          </svg>
          Triage Response — % Seen Within Recommended Time
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Recommended</th>
              <th style="text-align:right">% On time</th>
              <th style="text-align:right">Presentations</th>
              <th style="text-align:right">4-hr departure %</th>
            </tr>
          </thead>
          <tbody>
            ${TRIAGE_CATEGORIES.map((cat) => {
              const onTimePct = triage.onTimePct[cat] ?? null;
              const count = triage.count[cat] ?? null;
              const fourHour = ed.fourHourByTriage[cat] ?? null;
              const rec = TRIAGE_RECOMMENDED_MINUTES[cat];
              const recLabel = rec === 0 ? 'Immediate' : `Within ${rec} min`;
              return `
                <tr>
                  <td>
                    <span style="font-family:var(--font-mono);font-size:.6875rem;background:var(--bg-elevated);border-radius:3px;padding:1px 5px;margin-right:4px">${TRIAGE_SHORT[cat]}</span>
                    ${cat}
                  </td>
                  <td style="color:var(--text-muted);font-size:var(--font-size-xs)">${recLabel}</td>
                  <td class="num ${pctClass(onTimePct)}">
                    ${formatPct(onTimePct)}
                    ${onTimePct !== null ? `
                      <div class="progress-bar-wrap" style="margin-top:2px">
                        <div class="progress-bar ${pctClass(onTimePct)}" style="width:${onTimePct}%"></div>
                      </div>
                    ` : ''}
                  </td>
                  <td class="num metric-na">${formatCount(count)}</td>
                  <td class="num ${pctClass(fourHour)}">${formatPct(fourHour)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <p style="font-size:.6875rem;color:var(--text-muted);margin-top:.75rem">
          T1 Resuscitation = immediate life threat · T2 Emergency = 10 min · T3 Urgent = 30 min · T4 Semi-urgent = 60 min · T5 Non-urgent = 120 min
        </p>
      </div>
    ` : ''}

    <!-- Elective Surgery -->
    <div class="section-card">
      <div class="section-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color:var(--accent-primary)">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
        </svg>
        Elective Surgery Waiting Times — 2024–25
      </div>
      ${electiveMetrics === 'loading' ? `
        <div class="elective-loading">
          <div class="spinner"></div>
          Loading elective surgery data…
        </div>
      ` : !electiveMetrics ? `
        <div class="empty-state">
          <p>No elective surgery data available for this hospital in 2024–25.</p>
        </div>
      ` : `
        <div class="urgency-grid">
          ${URGENCY_LABELS.map((urg) => {
            const days = electiveMetrics.medianDays[urg] ?? null;
            const pct = electiveMetrics.onTimePct[urg] ?? null;
            const count = electiveMetrics.count[urg] ?? null;
            const dCls = daysClass(days, urg);
            return `
              <div class="urgency-card">
                <div class="urgency-label">${URGENCY_SHORT[urg]}</div>
                <div class="urgency-days ${dCls}">${formatDays(days)}</div>
                <div class="urgency-pct">median wait${count !== null ? ` · ${formatCount(count)} surgeries` : ''}</div>
                ${pct !== null ? `
                  <div style="margin-top:6px">
                    <div style="font-size:.6875rem;color:var(--text-muted)">${formatPct(pct)} on time</div>
                    <div class="progress-bar-wrap" style="margin-top:3px">
                      <div class="progress-bar ${pctClass(pct)}" style="width:${pct}%"></div>
                    </div>
                  </div>
                ` : ''}
                <div style="font-size:.6875rem;color:var(--text-muted);margin-top:4px">${URGENCY_BENCHMARKS[urg]}</div>
              </div>
            `;
          }).join('')}
        </div>
        ${renderElectiveSpecialtiesTable(electiveMetrics)}
      `}
    </div>
    <p style="font-size:.6875rem;color:var(--text-muted);margin-top:.5rem">
      Source: <a href="https://www.aihw.gov.au/reports-data/myhospitals" target="_blank" rel="noopener" style="color:var(--accent-primary)">AIHW MyHospitals API</a>
      · Data: financial year 2024–25
    </p>
  `;

  panel.querySelector('#back-btn')?.addEventListener('click', onBack);
}

function renderElectiveSpecialtiesTable(em: ElectiveSurgeryMetrics): string {
  // Show specialty-level data if available (median days, filtering to known specialties)
  const KNOWN_URGENCIES = new Set([
    'Urgent elective surgery',
    'Semi-urgent elective surgery',
    'Non-urgent elective surgery',
  ]);

  // Find specialty entries (not the top-level urgency categories)
  const specialtyEntries = Object.entries(em.medianDays)
    .filter(([key]) => !KNOWN_URGENCIES.has(key))
    .filter(([, val]) => val !== null && val !== undefined)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 15);

  if (specialtyEntries.length === 0) return '';

  return `
    <details style="margin-top:var(--space-lg)">
      <summary style="cursor:pointer;font-size:var(--font-size-sm);font-weight:600;color:var(--text-secondary);padding:4px 0">
        Median wait by surgical specialty (top ${specialtyEntries.length} shown, longest first)
      </summary>
      <table class="data-table" style="margin-top:var(--space-sm)">
        <thead>
          <tr>
            <th>Specialty</th>
            <th style="text-align:right">Median wait</th>
          </tr>
        </thead>
        <tbody>
          ${specialtyEntries.map(([specialty, days]) => `
            <tr>
              <td>${escapeHtml(specialty)}</td>
              <td class="num" style="color:var(--text-primary)">${formatDays(days)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </details>
  `;
}
