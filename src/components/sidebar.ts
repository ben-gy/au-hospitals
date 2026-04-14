import type { Hospital, EDMetrics } from '../types.ts';
import { ALL_STATES, formatPct, pctClass, escapeHtml } from '../utils.ts';

type SortKey = 'name' | 'ed-rate' | 'state';

interface SidebarOptions {
  hospitals: Hospital[];
  edMetrics: Map<string, EDMetrics>;
  selectedState: string;
  selectedHospital: Hospital | null;
  searchQuery: string;
  onStateSelect: (state: string) => void;
  onHospitalSelect: (hospital: Hospital) => void;
  onSortChange: (sort: SortKey) => void;
  currentSort: SortKey;
}

export function renderSidebar(opts: SidebarOptions): HTMLElement {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.setAttribute('aria-label', 'Hospital list');
  updateSidebar(sidebar, opts);
  return sidebar;
}

export function updateSidebar(sidebar: HTMLElement, opts: SidebarOptions): void {
  const {
    hospitals,
    edMetrics,
    selectedState,
    selectedHospital,
    searchQuery,
    onStateSelect,
    onHospitalSelect,
    onSortChange,
    currentSort,
  } = opts;

  // Filter hospitals
  let filtered = hospitals;
  if (selectedState !== 'All') {
    filtered = filtered.filter((h) => h.state === selectedState);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((h) => h.name.toLowerCase().includes(q));
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (currentSort === 'name') return a.name.localeCompare(b.name);
    if (currentSort === 'state') return a.state.localeCompare(b.state) || a.name.localeCompare(b.name);
    if (currentSort === 'ed-rate') {
      const ra = edMetrics.get(a.code)?.fourHourRateAll ?? -1;
      const rb = edMetrics.get(b.code)?.fourHourRateAll ?? -1;
      return rb - ra;
    }
    return 0;
  });

  sidebar.innerHTML = `
    <div class="sidebar-states" role="group" aria-label="Filter by state">
      <button class="state-btn ${selectedState === 'All' ? 'active' : ''}" data-state="All">All</button>
      ${ALL_STATES.map((s) => `
        <button class="state-btn ${selectedState === s ? 'active' : ''}" data-state="${s}">${s}</button>
      `).join('')}
    </div>
    <div class="sidebar-sort">
      <label for="sidebar-sort-sel">Sort:</label>
      <select id="sidebar-sort-sel" aria-label="Sort hospitals by">
        <option value="ed-rate" ${currentSort === 'ed-rate' ? 'selected' : ''}>ED 4-hr rate</option>
        <option value="name"    ${currentSort === 'name' ? 'selected' : ''}>Name (A–Z)</option>
        <option value="state"   ${currentSort === 'state' ? 'selected' : ''}>State</option>
      </select>
    </div>
    <div class="sidebar-count">${filtered.length.toLocaleString()} hospitals</div>
    <div class="hospital-list" role="listbox" aria-label="Hospitals">
      ${filtered.map((h) => {
        const ed = edMetrics.get(h.code);
        const rate = ed?.fourHourRateAll ?? null;
        const cls = pctClass(rate);
        const isSelected = selectedHospital?.code === h.code;
        return `
          <div
            class="hospital-item${isSelected ? ' selected' : ''}"
            role="option"
            aria-selected="${isSelected}"
            data-code="${escapeHtml(h.code)}"
            tabindex="0"
          >
            <div class="hospital-item-info">
              <div class="hospital-item-name" title="${escapeHtml(h.name)}">${escapeHtml(h.name)}</div>
              <div class="hospital-item-meta">${h.state}${h.isPrivate ? ' · Private' : ''}</div>
            </div>
            <div class="hospital-item-score">
              <span class="score-badge ${cls}" title="4-hour ED departure rate">${formatPct(rate)}</span>
            </div>
          </div>
        `;
      }).join('')}
      ${filtered.length === 0 ? '<div class="empty-state" style="padding:1.5rem;font-size:.75rem">No hospitals found</div>' : ''}
    </div>
  `;

  // Bind state buttons
  sidebar.querySelectorAll<HTMLButtonElement>('.state-btn').forEach((btn) => {
    btn.addEventListener('click', () => onStateSelect(btn.dataset.state ?? 'All'));
  });

  // Bind sort select
  const sortSel = sidebar.querySelector<HTMLSelectElement>('#sidebar-sort-sel');
  sortSel?.addEventListener('change', () => onSortChange((sortSel.value as SortKey)));

  // Bind hospital items
  sidebar.querySelectorAll<HTMLElement>('.hospital-item').forEach((item) => {
    const code = item.dataset.code;
    const hospital = hospitals.find((h) => h.code === code);
    if (!hospital) return;
    item.addEventListener('click', () => onHospitalSelect(hospital));
    item.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
        onHospitalSelect(hospital);
      }
    });
  });
}
