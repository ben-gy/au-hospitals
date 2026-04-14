# AU Hospital Watch

**Compare ED waiting times and elective surgery waits at hospitals across Australia**

🔗 **Live:** [https://au-hospitals.benrichardson.dev](https://au-hospitals.benrichardson.dev)

## What is this?

AU Hospital Watch is a searchable, filterable interface for Australian public hospital performance data drawn from the AIHW MyHospitals platform. While the official MyHospitals website presents data hospital-by-hospital, this tool surfaces key metrics — emergency department 4-hour departure rates, triage response times, median ED stay duration, and elective surgery waiting times — across all 1,400+ hospitals in a single view.

The site loads live data from the AIHW MyHospitals API (no authentication required) and caches it locally for 24 hours. All data covers the 2024–25 financial year, the most recent period available.

The main value for patients and carers is being able to quickly compare nearby public hospitals before deciding where to seek care for non-life-threatening conditions. Policy analysts and researchers can use the sortable rankings and state-level overview to spot trends across states and hospital networks.

## Who is this for?

Australian patients and carers comparing public hospitals before an elective procedure or non-emergency presentation. Health policy researchers and journalists looking for quick comparisons between states, LHNs, and individual facilities. Healthcare professionals wanting a fast, mobile-friendly view of how their facility compares to peers.

## Data Sources

| Source | What it provides | Update frequency |
|--------|-------------------|-----------------|
| AIHW MyHospitals API (myhospitalsapi.aihw.gov.au) | Hospital list, ED 4-hour departure rates, triage category response rates, time in ED, elective surgery waiting times | Annual (2024–25 financial year) |

## Features

- **Hospital search** — type-ahead search across 1,400+ Australian hospitals
- **State filter** — quickly filter to hospitals in any state or territory
- **ED 4-hour rate** — % of all patients who departed ED within 4 hours, colour-coded (green ≥75%, amber 50–74%, red <50%)
- **Triage breakdown** — % seen within recommended time for all 5 triage categories (T1–T5)
- **Time in ED** — median and 90th percentile stay duration by admission status
- **Elective surgery waits** — median wait days and % on-time for urgent, semi-urgent, and non-urgent surgery
- **Surgical specialty detail** — expandable table showing median wait by surgical specialty (where reported)
- **State comparison overview** — national view with average metrics per state and top/bottom ranked hospitals
- **24-hour local cache** — data fetched once and stored in localStorage, no repeated API calls

## Tech Stack

- **Runtime:** Vanilla TypeScript
- **Build:** Vite 6
- **Testing:** Vitest (52 tests)
- **Hosting:** GitHub Pages (static, no backend)
- **Data:** AIHW MyHospitals API (public, no auth)

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build

# Preview production build
npm run preview
```

## How it works

On page load the app makes 5 parallel API requests to the AIHW MyHospitals API: one for the hospital list (~1,427 hospitals) and four for the key ED performance measures for all hospitals in 2024–25. Responses are paginated at 1,000 records per page and fetched until exhausted. All data is cached in `localStorage` for 24 hours to avoid redundant network calls.

When a user selects a hospital, elective surgery data is fetched lazily for that specific hospital (a fast single-hospital query) and displayed in real time. The entire application runs client-side with no backend infrastructure.

## License

MIT
