import { debounce } from '../utils.ts';

export function renderHeader(
  onSearch: (q: string) => void,
  dataVersion: string,
): HTMLElement {
  const header = document.createElement('header');
  header.className = 'header';

  header.innerHTML = `
    <a class="header-logo" href="/">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="rgba(255,255,255,0.25)"/>
        <rect x="13" y="6" width="6" height="20" rx="1" fill="white"/>
        <rect x="6" y="13" width="20" height="6" rx="1" fill="white"/>
      </svg>
      <span>
        <span class="header-title">AU Hospital Watch</span>
        <span class="header-subtitle">Emergency Department &amp; Elective Surgery Performance</span>
      </span>
    </a>
    <div class="header-search">
      <div class="header-search-wrap">
        <svg class="header-search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="search"
          placeholder="Search hospitals…"
          aria-label="Search hospitals"
          id="hospital-search"
          autocomplete="off"
        />
      </div>
    </div>
    <div class="header-meta">
      Data: AIHW MyHospitals 2024–25${dataVersion ? ` · v${dataVersion}` : ''}
    </div>
  `;

  const input = header.querySelector<HTMLInputElement>('#hospital-search')!;
  const handleSearch = debounce((...args: unknown[]) => {
    const e = args[0] as Event;
    onSearch((e.target as HTMLInputElement).value.trim());
  }, 300);
  input.addEventListener('input', handleSearch as EventListener);

  return header;
}

export function updateSearchValue(header: HTMLElement, value: string): void {
  const input = header.querySelector<HTMLInputElement>('#hospital-search');
  if (input && input.value !== value) input.value = value;
}
