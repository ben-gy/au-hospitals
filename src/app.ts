import type { AppState, Hospital } from './types.ts';
import { fetchHospitals, fetchEDMetrics, fetchTriageMetrics, fetchElectiveMetrics } from './api.ts';
import { renderHeader } from './components/header.ts';
import { buildListPanel, updateListPanel } from './components/list-panel.ts';
import type { SortKey } from './components/list-panel.ts';
import { initMap, flyToHospital, flyToBounds, highlightMarker, flyToUserLocation } from './components/map.ts';
import { renderDetailContent, closeDetailPanel } from './components/detail-panel.ts';
import { showInfoModal, shouldShowOnFirstVisit } from './components/info-modal.ts';
import { STATE_BOUNDS } from './utils.ts';

const PREFS_KEY = 'aihw_prefs_v2';

function loadPrefs(): { sort: SortKey; state: string } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { sort: 'ed-rate', state: 'All' };
    return JSON.parse(raw) as { sort: SortKey; state: string };
  } catch {
    return { sort: 'ed-rate', state: 'All' };
  }
}

function savePrefs(sort: SortKey, state: string): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ sort, state }));
  } catch { /* ignore */ }
}

export class App {
  private state: AppState;
  private abortController: AbortController | null = null;
  private electiveAbort: AbortController | null = null;
  private sortKey: SortKey;

  private appEl: HTMLElement;
  private listPanelEl: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    const prefs = loadPrefs();
    this.sortKey = prefs.sort;

    this.state = {
      hospitals: [],
      edMetrics: new Map(),
      triageMetrics: new Map(),
      electiveMetrics: new Map(),
      selectedHospital: null,
      selectedState: prefs.state,
      searchQuery: '',
      loading: true,
      loadingElective: false,
      error: null,
      dataVersion: '',
      userLocation: null,
      detailPanelOpen: false,
    };

    this.appEl = root;
    this.init();
  }

  private async init(): Promise<void> {
    this.buildShell();
    await this.loadData();
  }

  private buildShell(): void {
    this.appEl.innerHTML = '';

    const header = renderHeader(this.state.dataVersion, () => this.showInfo());
    this.appEl.appendChild(header);

    const main = document.createElement('div');
    main.className = 'main-content';
    main.setAttribute('role', 'main');

    // Left panel
    this.listPanelEl = buildListPanel();
    this.listPanelEl.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    main.appendChild(this.listPanelEl);

    // Map wrap
    const mapWrap = document.createElement('div');
    mapWrap.className = 'map-wrap';
    mapWrap.setAttribute('aria-label', 'Map');
    mapWrap.innerHTML = `
      <div id="map"></div>
      <div class="map-legend" aria-hidden="true">
        <div class="legend-title">ED 4-hour departure rate</div>
        <div class="legend-item"><div class="legend-dot" style="background:#16a34a"></div>Good (≥75%)</div>
        <div class="legend-item"><div class="legend-dot" style="background:#d97706"></div>Moderate (50–74%)</div>
        <div class="legend-item"><div class="legend-dot" style="background:#dc2626"></div>Poor (&lt;50%)</div>
        <div class="legend-item"><div class="legend-dot" style="background:#94a3b8"></div>No data</div>
        <div class="legend-size-row">
          <div class="legend-size-dot" style="width:6px;height:6px"></div>
          <span>Few patients</span>
          <div class="legend-size-dot" style="width:14px;height:14px"></div>
          <span>Many patients</span>
        </div>
      </div>
      <div class="site-footer">
        <span>Data: <a href="https://myhospitalsapi.aihw.gov.au" target="_blank" rel="noopener">AIHW MyHospitals API</a> 2024–25</span>
        <span>No tracking · No cookies</span>
        <span>Built by <a href="https://benrichardson.dev/" target="_blank" rel="noopener">benrichardson.dev</a> · <a href="https://hub.benrichardson.dev" target="_blank" rel="noopener">more tools &amp; sites</a></span>
      </div>
    `;
    main.appendChild(mapWrap);

    // Detail panel
    const detailPanel = document.createElement('aside');
    detailPanel.className = 'detail-panel';
    detailPanel.id = 'detail-panel';
    detailPanel.setAttribute('aria-label', 'Hospital detail');
    detailPanel.innerHTML = '<div class="detail-inner" id="detail-inner"></div>';
    main.appendChild(detailPanel);

    this.appEl.appendChild(main);

    // Show info modal on first visit
    if (shouldShowOnFirstVisit()) {
      setTimeout(() => this.showInfo(), 500);
    }
  }

  private async loadData(): Promise<void> {
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.state.loading = true;
    this.state.error = null;

    try {
      const hospitals = await fetchHospitals(signal);
      this.state.hospitals = hospitals;

      const [edMetrics, triageMetrics] = await Promise.all([
        fetchEDMetrics(signal),
        fetchTriageMetrics(signal),
      ]);
      this.state.edMetrics = edMetrics;
      this.state.triageMetrics = triageMetrics;
      this.state.loading = false;

      // Init map
      await initMap('map', this.state.hospitals, this.state.edMetrics, (h) => this.onHospitalSelect(h));

      // Render list
      this.renderListPanel();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this.state.loading = false;
      this.state.error = (err as Error).message ?? 'Unknown error';
      this.renderError();
    }
  }

  private renderListPanel(): void {
    if (!this.listPanelEl) return;
    updateListPanel(this.listPanelEl, {
      hospitals: this.state.hospitals,
      edMetrics: this.state.edMetrics,
      selectedState: this.state.selectedState,
      selectedHospital: this.state.selectedHospital,
      searchQuery: this.state.searchQuery,
      userLocation: this.state.userLocation,
      currentSort: this.sortKey,
      onSearch: (q) => this.onSearch(q),
      onStateSelect: (s) => this.onStateSelect(s),
      onHospitalSelect: (h) => this.onHospitalSelect(h),
      onSortChange: (s) => this.onSortChange(s),
      onLocateMe: () => this.onLocateMe(),
    });
  }

  private renderError(): void {
    if (!this.listPanelEl) return;
    this.listPanelEl.innerHTML = `
      <div class="error-box">
        <strong>Failed to load data</strong>
        <span>${this.state.error}</span>
        <button id="retry-btn">Retry</button>
      </div>
    `;
    this.listPanelEl.querySelector('#retry-btn')?.addEventListener('click', () => this.loadData());
  }

  private onSearch(query: string): void {
    this.state.searchQuery = query;
    this.renderListPanel();
  }

  private onStateSelect(state: string): void {
    this.state.selectedState = state;
    this.state.selectedHospital = null;
    this.state.searchQuery = '';
    savePrefs(this.sortKey, state);
    closeDetailPanel();
    highlightMarker(null);

    if (state !== 'All' && STATE_BOUNDS[state]) {
      flyToBounds(STATE_BOUNDS[state]);
    }

    this.renderListPanel();
  }

  private onHospitalSelect(hospital: Hospital): void {
    this.state.selectedHospital = hospital;
    this.state.detailPanelOpen = true;

    // Update list to show selected
    this.renderListPanel();

    // Fly map
    flyToHospital(hospital);
    highlightMarker(hospital.code);

    // Show detail panel with current data (elective loading)
    this.renderDetailPanel('loading');
    this.loadElectiveData(hospital);
  }

  private onSortChange(sort: SortKey): void {
    this.sortKey = sort;
    savePrefs(sort, this.state.selectedState);
    this.renderListPanel();
  }

  private onLocateMe(): void {
    if (this.state.userLocation) {
      // Already located — toggle off
      this.state.userLocation = null;
      if (this.sortKey === 'nearest') {
        this.sortKey = 'ed-rate';
        savePrefs(this.sortKey, this.state.selectedState);
      }
      this.renderListPanel();
      return;
    }

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.sortKey = 'nearest';
        savePrefs(this.sortKey, this.state.selectedState);
        flyToUserLocation(pos.coords.latitude, pos.coords.longitude);
        this.renderListPanel();
      },
      () => {
        // Geolocation denied or failed — do nothing
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  private onCloseDetail(): void {
    this.state.selectedHospital = null;
    this.state.detailPanelOpen = false;
    closeDetailPanel();
    highlightMarker(null);
    this.renderListPanel();
  }

  private renderDetailPanel(elective: 'loading' | undefined): void {
    const h = this.state.selectedHospital;
    if (!h) return;

    const electiveData = elective === 'loading'
      ? 'loading' as const
      : this.state.electiveMetrics.get(h.code);

    renderDetailContent(
      h,
      this.state.edMetrics.get(h.code),
      this.state.triageMetrics.get(h.code),
      electiveData,
      () => this.onCloseDetail(),
    );
  }

  private async loadElectiveData(hospital: Hospital): Promise<void> {
    if (this.electiveAbort) this.electiveAbort.abort();
    this.electiveAbort = new AbortController();
    const { signal } = this.electiveAbort;

    try {
      const metrics = await fetchElectiveMetrics(hospital.code, signal);
      if (this.state.selectedHospital?.code !== hospital.code) return;
      this.state.electiveMetrics.set(hospital.code, metrics);
      this.renderDetailPanel(undefined);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      if (this.state.selectedHospital?.code === hospital.code) {
        this.renderDetailPanel(undefined);
      }
    }
  }

  private showInfo(): void {
    showInfoModal(() => { /* modal closed */ });
  }
}
