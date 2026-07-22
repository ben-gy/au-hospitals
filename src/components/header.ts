// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
export function renderHeader(
  dataVersion: string,
  onInfoClick: () => void,
): HTMLElement {
  const header = document.createElement('header');
  header.className = 'header';

  header.innerHTML = `
    <a class="header-logo" href="/">
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="rgba(255,255,255,0.25)"/>
        <rect x="13" y="6" width="6" height="20" rx="1" fill="white"/>
        <rect x="6" y="13" width="20" height="6" rx="1" fill="white"/>
      </svg>
      <span>
        <span class="header-title">AU Hospital Watch</span>
        <span class="header-subtitle">ED &amp; Surgery Performance Explorer</span>
      </span>
    </a>
    <div class="header-right">
      <span class="header-meta">AIHW MyHospitals 2024–25${dataVersion ? ` · v${dataVersion}` : ''}</span>
      <button class="header-btn" id="info-btn" aria-label="About this tool" title="About this tool">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
        </svg>
      </button>
    </div>
  `;

  header.querySelector('#info-btn')!.addEventListener('click', onInfoClick);

  return header;
}
