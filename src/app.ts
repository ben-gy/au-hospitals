import type { AppState, Hospital } from './types.ts';
import { fetchHospitals, fetchEDMetrics, fetchTriageMetrics, fetchElectiveMetrics } from './api.ts';
import { renderHeader } from './components/header.ts';
import { renderSidebar } from './components/sidebar.ts';
import { renderOverview } from './components/overview.ts';
import { renderHospitalDetail, updateHospitalDetail } from './components/hospital.ts';

type SortKey = 'name' | 'ed-rate' | 'state';

const PREFS_KEY = 'aihw_prefs_v1';

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

function renderLoadingScreen(steps: { label: string; done: boolean; active: boolean }[]): HTMLElement {
  const div = document.createElement('div');
  div.className = 'loading-overlay';
  div.innerHTML = `
    <div class="spinner"></div>
    <div style="text-align:center">
      <div style="font-size:.875rem;font-weight:600;margin-bottom:.5rem">Loading hospital data…</div>
      <div class="loading-steps">
        ${steps.map((s) => `
          <div class="loading-step ${s.done ? 'done' : s.active ? 'active' : ''}">
            ${s.done ? '✓' : s.active ? '⟳' : '○'} ${s.label}
          </div>
        `).join('')}
      </div>
    </div>
  `;
  return div;
}

function renderErrorScreen(message: string, onRetry: () => void): HTMLElement {
  const div = document.createElement('div');
  div.className = 'error-box';
  div.innerHTML = `
    <strong>Failed to load data</strong>
    <span>${message}</span>
  `;
  const btn = document.createElement('button');
  btn.textContent = 'Retry';
  btn.addEventListener('click', onRetry);
  div.appendChild(btn);
  return div;
}

export class App {
  private state: AppState;
  private abortController: AbortController | null = null;
  private electiveAbort: AbortController | null = null;
  private sortKey: SortKey;

  private appEl: HTMLElement;
  private headerEl: HTMLElement | null = null;
  private sidebarEl: HTMLElement | null = null;
  private mainPanelEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    const prefs = loadPrefs();
    this.sortKey = prefs.sort;

    this.state = {
      hospitals: [],
      edMetrics: new Map(),
      triageMetrics: new Map(),
      electiveMetrics: new Map(),
      stateMetrics: [],
      selectedHospital: null,
      selectedState: prefs.state,
      searchQuery: '',
      loading: true,
      loadingElective: false,
      error: null,
      dataVersion: '',
    };

    this.appEl = root;
    this.init();
  }

  private async init(): Promise<void> {
    this.renderShell();
    await this.loadData();
  }

  private renderShell(): void {
    this.appEl.innerHTML = '';

    this.headerEl = renderHeader(
      (q) => this.onSearch(q),
      this.state.dataVersion,
    );

    const layout = document.createElement('div');
    layout.className = 'layout';

    this.sidebarEl = document.createElement('aside');
    this.sidebarEl.className = 'sidebar';
    this.sidebarEl.innerHTML = '<div class="loading-overlay" style="height:100%"><div class="spinner"></div></div>';

    this.mainPanelEl = document.createElement('main');
    this.mainPanelEl.className = 'main-panel';
    this.mainPanelEl.setAttribute('role', 'main');

    this.contentEl = document.createElement('div');
    this.contentEl.style.maxWidth = '1100px';

    this.mainPanelEl.appendChild(this.contentEl);
    layout.appendChild(this.sidebarEl);
    layout.appendChild(this.mainPanelEl);

    this.appEl.appendChild(this.headerEl);
    this.appEl.appendChild(layout);

    this.renderMainContent();
  }

  private async loadData(): Promise<void> {
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.state.loading = true;
    this.state.error = null;
    this.renderMainContent();

    const steps = [
      { label: 'Loading hospital list', done: false, active: true },
      { label: 'Loading ED performance data', done: false, active: false },
      { label: 'Loading triage response data', done: false, active: false },
    ];

    if (this.contentEl) {
      this.contentEl.innerHTML = '';
      this.contentEl.appendChild(renderLoadingScreen(steps));
    }

    try {
      // Step 1: hospitals
      const hospitals = await fetchHospitals(signal);
      this.state.hospitals = hospitals;
      steps[0].done = true;
      steps[1].active = true;
      if (this.contentEl) {
        this.contentEl.innerHTML = '';
        this.contentEl.appendChild(renderLoadingScreen(steps));
      }

      // Step 2+3: ED metrics and triage in parallel
      const [edMetrics, triageMetrics] = await Promise.all([
        fetchEDMetrics(signal),
        fetchTriageMetrics(signal),
      ]);
      this.state.edMetrics = edMetrics;
      this.state.triageMetrics = triageMetrics;
      steps[1].done = true;
      steps[2].done = true;

      this.state.loading = false;
      this.renderAll();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this.state.loading = false;
      this.state.error = (err as Error).message ?? 'Unknown error';
      this.renderMainContent();
    }
  }

  private renderAll(): void {
    this.renderSidebar();
    this.renderMainContent();
  }

  private renderSidebar(): void {
    if (!this.sidebarEl) return;
    const sidebar = renderSidebar({
      hospitals: this.state.hospitals,
      edMetrics: this.state.edMetrics,
      selectedState: this.state.selectedState,
      selectedHospital: this.state.selectedHospital,
      searchQuery: this.state.searchQuery,
      onStateSelect: (s) => this.onStateSelect(s),
      onHospitalSelect: (h) => this.onHospitalSelect(h),
      onSortChange: (s) => this.onSortChange(s),
      currentSort: this.sortKey,
    });
    this.sidebarEl.replaceWith(sidebar);
    this.sidebarEl = sidebar;
  }

  private renderMainContent(): void {
    if (!this.contentEl) return;

    if (this.state.loading) {
      // Loading screen already set above
      return;
    }

    if (this.state.error) {
      this.contentEl.innerHTML = '';
      this.contentEl.appendChild(renderErrorScreen(this.state.error, () => this.loadData()));
      return;
    }

    if (this.state.selectedHospital) {
      const h = this.state.selectedHospital;
      const ed = this.state.edMetrics.get(h.code);
      const triage = this.state.triageMetrics.get(h.code);
      const elective = this.state.loadingElective
        ? 'loading'
        : this.state.electiveMetrics.get(h.code);

      this.contentEl.innerHTML = '';
      this.contentEl.appendChild(
        renderHospitalDetail(h, ed, triage, elective, () => this.onBack()),
      );
    } else {
      this.contentEl.innerHTML = '';
      this.contentEl.appendChild(
        renderOverview(
          this.state.hospitals,
          this.state.edMetrics,
          (s) => this.onStateSelect(s),
          (h) => this.onHospitalSelect(h),
        ),
      );
    }
  }

  private onSearch(query: string): void {
    this.state.searchQuery = query;
    this.renderSidebar();
  }

  private onStateSelect(state: string): void {
    this.state.selectedState = state;
    this.state.selectedHospital = null;
    this.state.searchQuery = '';
    savePrefs(this.sortKey, state);
    this.renderAll();
  }

  private onHospitalSelect(hospital: Hospital): void {
    this.state.selectedHospital = hospital;
    this.renderSidebar();
    this.renderMainContent();
    this.loadElectiveData(hospital);
    this.mainPanelEl?.scrollTo(0, 0);
  }

  private onBack(): void {
    this.state.selectedHospital = null;
    this.renderSidebar();
    this.renderMainContent();
  }

  private onSortChange(sort: SortKey): void {
    this.sortKey = sort;
    savePrefs(sort, this.state.selectedState);
    this.renderSidebar();
  }

  private async loadElectiveData(hospital: Hospital): Promise<void> {
    if (this.electiveAbort) this.electiveAbort.abort();
    this.electiveAbort = new AbortController();
    const { signal } = this.electiveAbort;

    // Show loading in detail panel if already rendered
    if (this.state.selectedHospital?.code === hospital.code) {
      this.state.loadingElective = true;
      this.updateDetailElective('loading');
    }

    try {
      const metrics = await fetchElectiveMetrics(hospital.code, signal);
      if (this.state.selectedHospital?.code !== hospital.code) return;
      this.state.electiveMetrics.set(hospital.code, metrics);
      this.state.loadingElective = false;
      this.updateDetailElective(metrics);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this.state.loadingElective = false;
      this.updateDetailElective(undefined);
    }
  }

  private updateDetailElective(elective: Parameters<typeof updateHospitalDetail>[4]): void {
    const h = this.state.selectedHospital;
    if (!h || !this.contentEl) return;
    const detail = this.contentEl.querySelector('#hospital-detail');
    if (!detail) return;
    updateHospitalDetail(
      detail as HTMLElement,
      h,
      this.state.edMetrics.get(h.code),
      this.state.triageMetrics.get(h.code),
      elective,
      () => this.onBack(),
    );
  }
}
