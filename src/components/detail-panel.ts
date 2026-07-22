// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type {
  Hospital,
  EDMetrics,
  TriageMetrics,
  ElectiveSurgeryMetrics,
  UrgencyCategory,
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

const URGENCY_LABELS: UrgencyCategory[] = [
  'Urgent elective surgery',
  'Semi-urgent elective surgery',
  'Non-urgent elective surgery',
];

const URGENCY_SHORT: Record<string, string> = {
  'Urgent elective surgery': 'Urgent',
  'Semi-urgent elective surgery': 'Semi-urgent',
  'Non-urgent elective surgery': 'Non-urgent',
};

const URGENCY_BENCH: Record<string, string> = {
  'Urgent elective surgery': '≤30 days',
  'Semi-urgent elective surgery': '≤90 days',
  'Non-urgent elective surgery': '≤365 days',
};

export function renderDetailContent(
  hospital: Hospital,
  ed: EDMetrics | undefined,
  triage: TriageMetrics | undefined,
  elective: ElectiveSurgeryMetrics | 'loading' | undefined,
  onClose: () => void,
): void {
  const panel = document.getElementById('detail-panel')!;
  const inner = document.getElementById('detail-inner')!;

  panel.classList.add('open');

  const fourHourClass = pctClass(ed?.fourHourRateAll ?? null);
  const medianClass = timeClass(ed?.medianTimeAll ?? null);
  const p90Class = timeClass(ed?.p90TimeAll ?? null);

  inner.innerHTML = `
    <div class="detail-header">
      <div>
        <div class="detail-name">${escapeHtml(hospital.name)}</div>
        <div class="detail-meta">
          <span class="tag tag-state">${hospital.state}</span>
          <span class="tag ${hospital.isPrivate ? 'tag-private' : 'tag-public'}">${hospital.isPrivate ? 'Private' : 'Public'}</span>
          ${hospital.lhnName ? `<span class="tag tag-lhn">${escapeHtml(hospital.lhnName)}</span>` : ''}
        </div>
      </div>
      <button class="detail-close" id="detail-close" aria-label="Close">&times;</button>
    </div>

    <!-- ED Performance -->
    <div class="detail-section">
      <div class="detail-section-title">Emergency Department — 2024–25</div>
      ${!ed ? `
        <div class="empty-state">No ED data reported for this hospital.</div>
      ` : `
        <div class="metric-big-wrap">
          <div class="metric-big ${fourHourClass}">${formatPct(ed.fourHourRateAll)}</div>
          <div class="metric-big-label">of patients departed within 4 hours</div>
          ${ed.fourHourRateAll !== null ? `
            <div class="progress-bar-wrap" style="margin-top:8px;max-width:200px;margin-left:auto;margin-right:auto">
              <div class="progress-bar ${fourHourClass}" style="width:${ed.fourHourRateAll}%"></div>
            </div>
          ` : ''}
        </div>

        <div class="metric-row">
          <span class="metric-label">Median ED time</span>
          <span class="metric-value ${medianClass}">${formatMinutes(ed.medianTimeAll)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">90th percentile</span>
          <span class="metric-value ${p90Class}">${formatMinutes(ed.p90TimeAll)}</span>
        </div>
        ${ed.totalPresentations !== null ? `
          <div class="metric-row">
            <span class="metric-label">Total presentations</span>
            <span class="metric-value metric-na">${formatCount(ed.totalPresentations)}</span>
          </div>
        ` : ''}
        ${ed.fourHourRateAdmitted !== null ? `
          <div class="metric-row">
            <span class="metric-label">4-hr (admitted)</span>
            <span class="metric-value ${pctClass(ed.fourHourRateAdmitted)}">${formatPct(ed.fourHourRateAdmitted)}</span>
          </div>
        ` : ''}
        ${ed.fourHourRateNotAdmitted !== null ? `
          <div class="metric-row">
            <span class="metric-label">4-hr (not admitted)</span>
            <span class="metric-value ${pctClass(ed.fourHourRateNotAdmitted)}">${formatPct(ed.fourHourRateNotAdmitted)}</span>
          </div>
        ` : ''}
      `}
    </div>

    <!-- Triage -->
    ${ed && triage ? `
      <div class="detail-section">
        <div class="detail-section-title">Triage Response</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align:right">On time</th>
              <th style="text-align:right">4-hr %</th>
            </tr>
          </thead>
          <tbody>
            ${TRIAGE_CATEGORIES.map((cat) => {
              const onTime = triage.onTimePct[cat] ?? null;
              const fourHour = ed.fourHourByTriage[cat] ?? null;
              const rec = TRIAGE_RECOMMENDED_MINUTES[cat];
              const recLabel = rec === 0 ? 'Immed.' : `${rec}m`;
              return `
                <tr>
                  <td>
                    <span class="triage-code">${TRIAGE_SHORT[cat]}</span>
                    ${cat}
                    <span style="color:var(--text-muted);font-size:var(--font-size-xs)"> (${recLabel})</span>
                  </td>
                  <td class="num ${pctClass(onTime)}">${formatPct(onTime)}</td>
                  <td class="num ${pctClass(fourHour)}">${formatPct(fourHour)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- Elective Surgery -->
    <div class="detail-section">
      <div class="detail-section-title">Elective Surgery Waits</div>
      ${elective === 'loading' ? `
        <div class="elective-loading">
          <div class="spinner"></div>
          Loading surgery data…
        </div>
      ` : !elective ? `
        <div class="empty-state">No elective surgery data available.</div>
      ` : `
        <div class="urgency-stack">
          ${URGENCY_LABELS.map((urg) => {
            const days = elective.medianDays[urg] ?? null;
            const pct = elective.onTimePct[urg] ?? null;
            const count = elective.count[urg] ?? null;
            const dCls = daysClass(days, urg);
            return `
              <div class="urgency-card">
                <div>
                  <div class="urgency-label">${URGENCY_SHORT[urg]}</div>
                  <div style="font-size:var(--font-size-xs);color:var(--text-muted)">${URGENCY_BENCH[urg]} benchmark</div>
                </div>
                <div class="urgency-right">
                  <div class="urgency-days ${dCls}">${formatDays(days)}</div>
                  <div class="urgency-pct">${pct !== null ? `${formatPct(pct)} on time` : ''}${count !== null ? ` · ${formatCount(count)}` : ''}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <div style="font-size:var(--font-size-xs);color:var(--text-muted);padding-top:var(--space-md);border-top:1px solid var(--border-subtle)">
      Source: <a href="https://www.aihw.gov.au/reports-data/myhospitals" target="_blank" rel="noopener" style="color:var(--accent-primary)">AIHW MyHospitals</a> · 2024–25
    </div>
  `;

  inner.querySelector('#detail-close')!.addEventListener('click', onClose);
}

export function closeDetailPanel(): void {
  const panel = document.getElementById('detail-panel');
  panel?.classList.remove('open');
}
