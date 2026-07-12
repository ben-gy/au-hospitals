const SHOWN_KEY = 'aihw_info_shown_v1';

export function shouldShowOnFirstVisit(): boolean {
  return !localStorage.getItem(SHOWN_KEY);
}

export function markShown(): void {
  try {
    localStorage.setItem(SHOWN_KEY, '1');
  } catch { /* ignore */ }
}

export function showInfoModal(onClose: () => void): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'About AU Hospital Watch');

  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" aria-label="Close">&times;</button>

      <h2>AU Hospital Watch</h2>
      <p>
        Explore emergency department and elective surgery performance across Australia's
        public and private hospitals. Data from the
        <a href="https://www.aihw.gov.au/reports-data/myhospitals" target="_blank" rel="noopener">Australian Institute of Health and Welfare (AIHW)</a>
        MyHospitals platform, covering financial year <strong>2024–25</strong>.
      </p>

      <h3>How to use</h3>
      <ul>
        <li><strong>Explore the map</strong> — hospitals are shown as coloured circles. Green = good performance, amber = moderate, red = poor. Larger circles = more patients (higher ED volume).</li>
        <li><strong>Click a hospital</strong> on the map or in the left panel to see detailed ED and elective surgery metrics.</li>
        <li><strong>Filter by state</strong> using the buttons in the left panel. The map flies to that state.</li>
        <li><strong>Search</strong> for a hospital by name.</li>
        <li><strong>Near me</strong> — click the location button to find hospitals closest to you and sort by distance.</li>
      </ul>

      <h3>Key metrics</h3>
      <ul>
        <li><strong>4-hour departure rate</strong> — the percentage of ED patients who left within 4 hours of arrival. This is the national benchmark (NEAT target). Higher is better.</li>
        <li><strong>Median ED time</strong> — half of patients waited less than this, half waited more.</li>
        <li><strong>90th percentile ED time</strong> — 9 in 10 patients departed by this time. Shows worst-case waits.</li>
        <li><strong>Triage categories</strong> — T1 (Resuscitation, immediate) through T5 (Non-urgent, 120 min target). "% on time" shows what fraction of patients were seen within the clinically recommended time.</li>
        <li><strong>Elective surgery wait</strong> — median days from referral to admission, broken down by urgency: Urgent (recommended within 30 days), Semi-urgent (90 days), Non-urgent (365 days).</li>
      </ul>

      <h3>Understanding the data</h3>
      <div class="caveat-box">
        <strong>Raw rankings can be misleading.</strong> Small rural hospitals with few presentations
        naturally score higher on the 4-hour rate because they rarely face surge demand or complex
        cases. Large urban teaching hospitals handle higher volumes, more severe conditions, and longer
        admissions — making their raw percentages look worse even when care quality is excellent.
        <br/><br/>
        On the map, <strong>marker size reflects patient volume</strong> (larger = more presentations),
        so you can visually distinguish a tiny green dot (small, quiet hospital) from a large amber
        dot (busy major hospital). Compare hospitals of similar size and type for meaningful insights.
      </div>
      <p style="margin-top:.75rem">
        Private hospitals may not report all metrics. Data reflects a full financial year, not
        real-time wait times. Some hospitals are specialist facilities without EDs.
      </p>

      <h3>Data source</h3>
      <p>
        All data from the
        <a href="https://myhospitalsapi.aihw.gov.au" target="_blank" rel="noopener">AIHW MyHospitals API</a>
        (public, free, no authentication required). Financial year 2024–25. No cookies, no tracking — only anonymous, cookie-less page-view counts via Cloudflare Web Analytics.
      </p>
    </div>
  `;

  const close = () => {
    markShown();
    overlay.remove();
    onClose();
  };

  overlay.querySelector('.modal-close')!.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.body.appendChild(overlay);
  return overlay;
}
