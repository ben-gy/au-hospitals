import type { Hospital, EDMetrics } from '../types.ts';
import {
  ALL_STATES,
  formatPct,
  formatDistance,
  pctClass,
  escapeHtml,
  haversineKm,
  debounce,
} from '../utils.ts';

export type SortKey = 'ed-rate' | 'name' | 'state' | 'nearest';

interface ListPanelOptions {
  hospitals: Hospital[];
  edMetrics: Map<string, EDMetrics>;
  selectedState: string;
  selectedHospital: Hospital | null;
  searchQuery: string;
  userLocation: { lat: number; lng: number } | null;
  currentSort: SortKey;
  onSearch: (q: string) => void;
  onStateSelect: (state: string) => void;
  onHospitalSelect: (hospital: Hospital) => void;
  onSortChange: (sort: SortKey) => void;
  onLocateMe: () => void;
}

export function buildListPanel(): HTMLElement {
  const panel = document.createElement('aside');
  panel.className = 'left-panel';
  panel.setAttribute('aria-label', 'Hospital list');
  return panel;
}

export function updateListPanel(panel: HTMLElement, opts: ListPanelOptions): void {
  const {
    hospitals,
    edMetrics,
    selectedState,
    selectedHospital,
    searchQuery,
    userLocation,
    currentSort,
    onSearch,
    onStateSelect,
    onHospitalSelect,
    onSortChange,
    onLocateMe,
  } = opts;

  // Filter
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
    if (currentSort === 'nearest' && userLocation) {
      const distA = (a.lat !== null && a.lng !== null) ? haversineKm(userLocation.lat, userLocation.lng, a.lat, a.lng) : Infinity;
      const distB = (b.lat !== null && b.lng !== null) ? haversineKm(userLocation.lat, userLocation.lng, b.lat, b.lng) : Infinity;
      return distA - distB;
    }
    // Default: ed-rate descending
    const ra = edMetrics.get(a.code)?.fourHourRateAll ?? -1;
    const rb = edMetrics.get(b.code)?.fourHourRateAll ?? -1;
    return rb - ra;
  });

  panel.innerHTML = `
    <div class="panel-controls">
      <input
        type="search"
        class="search-input"
        id="search-input"
        placeholder="Search hospitals…"
        aria-label="Search hospitals"
        value="${escapeHtml(searchQuery)}"
        autocomplete="off"
      />
      <div class="panel-filters" role="group" aria-label="Filter by state">
        <button class="state-btn ${selectedState === 'All' ? 'active' : ''}" data-state="All">All</button>
        ${ALL_STATES.map((s) => `
          <button class="state-btn ${selectedState === s ? 'active' : ''}" data-state="${s}">${s}</button>
        `).join('')}
      </div>
      <div class="panel-sort">
        <label for="sort-sel">Sort:</label>
        <select id="sort-sel" aria-label="Sort hospitals">
          <option value="ed-rate" ${currentSort === 'ed-rate' ? 'selected' : ''}>ED 4-hr rate</option>
          <option value="name" ${currentSort === 'name' ? 'selected' : ''}>Name A–Z</option>
          <option value="state" ${currentSort === 'state' ? 'selected' : ''}>State</option>
          ${userLocation ? `<option value="nearest" ${currentSort === 'nearest' ? 'selected' : ''}>Nearest</option>` : ''}
        </select>
        <button class="locate-btn ${userLocation ? 'active' : ''}" id="locate-btn" title="Find hospitals near me">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
          </svg>
          Near me
        </button>
      </div>
    </div>
    <div class="panel-count">${filtered.length.toLocaleString()} hospitals</div>
    <div class="hospital-list" role="listbox" aria-label="Hospitals">
      ${filtered.map((h) => {
        const ed = edMetrics.get(h.code);
        const rate = ed?.fourHourRateAll ?? null;
        const cls = pctClass(rate);
        const isSelected = selectedHospital?.code === h.code;
        const dist = (userLocation && h.lat !== null && h.lng !== null)
          ? formatDistance(haversineKm(userLocation.lat, userLocation.lng, h.lat, h.lng))
          : null;
        const badgeTip = rate !== null
          ? `4-hour ED departure rate: ${formatPct(rate)}`
          : '4-hour ED departure rate: no data reported';
        return `
          <div
            class="hospital-item${isSelected ? ' selected' : ''}"
            role="option"
            aria-selected="${isSelected}"
            data-code="${escapeHtml(h.code)}"
            tabindex="0"
          >
            <div class="hospital-item-info">
              <div class="hospital-item-name" data-tip="${escapeHtml(h.name)}">${escapeHtml(h.name)}</div>
              <div class="hospital-item-meta">${h.state}${dist ? ` · ${dist}` : ''}${h.isPrivate ? ' · Private' : ''}</div>
            </div>
            <div class="hospital-item-score">
              <span class="score-badge ${cls}" data-tip="${escapeHtml(badgeTip)}" aria-label="${escapeHtml(badgeTip)}">${formatPct(rate)}</span>
            </div>
          </div>
        `;
      }).join('')}
      ${filtered.length === 0 ? '<div class="empty-state">No hospitals found</div>' : ''}
    </div>
  `;

  // Bind events
  const searchInput = panel.querySelector<HTMLInputElement>('#search-input')!;
  const debouncedSearch = debounce((...args: unknown[]) => {
    const e = args[0] as Event;
    onSearch((e.target as HTMLInputElement).value.trim());
  }, 300);
  searchInput.addEventListener('input', debouncedSearch as EventListener);

  panel.querySelectorAll<HTMLButtonElement>('.state-btn').forEach((btn) => {
    btn.addEventListener('click', () => onStateSelect(btn.dataset.state ?? 'All'));
  });

  panel.querySelector<HTMLSelectElement>('#sort-sel')?.addEventListener('change', (e) => {
    onSortChange((e.target as HTMLSelectElement).value as SortKey);
  });

  panel.querySelector('#locate-btn')?.addEventListener('click', () => onLocateMe());

  panel.querySelectorAll<HTMLElement>('.hospital-item').forEach((item) => {
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
