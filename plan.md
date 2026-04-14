# Site Plan: AU Hospital Watch

## Overview
- **Name:** AU Hospital Watch
- **Repo name:** au-hospitals
- **Tagline:** Compare ED waiting times and elective surgery waits at hospitals across Australia

## Target Audience
Australian patients, carers, and policy analysts who want to understand hospital performance before choosing where to seek care, or researchers comparing state and hospital-level outcomes. Particularly useful for people in non-urgent or semi-urgent situations choosing between nearby public hospitals.

## Value Proposition
The AIHW MyHospitals platform exists but buries comparisons behind individual hospital pages. AU Hospital Watch surfaces the most important performance metrics — ED 4-hour departure rates, triage response times, and elective surgery waits — in a single searchable, sortable, filterable interface. Users can immediately see which hospitals perform best in their state, compare triage category performance, and explore surgical wait times by specialty.

## Data Sources
| Source | URL | What it provides | Update frequency | Auth required? |
|--------|-----|------------------|-----------------|----------------|
| AIHW MyHospitals API | myhospitalsapi.aihw.gov.au | Hospital list, ED waiting times, elective surgery waits, time in ED | Annual (2024–25 data current) | No |

## Key Features
1. **National hospital search** — type-ahead search across all 1,400+ Australian hospitals
2. **State filter** — filter hospital list by state/territory
3. **ED 4-hour rate** — % of patients who departed within 4 hours, ranked by hospital
4. **Triage performance** — % commenced treatment on time by triage category (1=Resuscitation through 5=Non-Urgent)
5. **Time in ED** — median and 90th percentile ED stay duration in minutes
6. **Elective surgery waits** — median wait days by urgency (urgent/semi-urgent/non-urgent)
7. **State comparison cards** — national overview with state-level aggregates
8. **Hospital detail panel** — full metric breakdown for any selected hospital

## Target Audience (detailed)
Mixed audience: patients choosing hospitals are on mobile or desktop in stressful moments wanting clear colour-coded answers fast. Policy researchers are on desktop wanting sortable tables and multi-hospital comparison. The interface must serve both: clean clear metrics with colour coding, plus sortable tables and filters for power users. Light theme, no jargon.

## Style Direction
**Tone:** civic/professional — authoritative but approachable, like a government health portal  
**Colour palette:** clean white backgrounds, #0369a1 professional health blue as primary accent. Status colours: green for good performance (≥75%), amber for moderate (50–74%), red for poor (<50%). The blue/white palette reads as trustworthy and health-adjacent without being clinical or cold.  
**UI density:** balanced — clean card-based layout for the overview, compact sortable tables for hospital lists  
**Dark/light theme:** light — general public audience  
**Reference sites:** myhospitals.gov.au, health.act.gov.au  

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite
- **Data strategy:** runtime-fetch from AIHW MyHospitals API with localStorage caching (24hr expiry)
- **Key libraries:** none (vanilla CSS + TypeScript only)

## Layout
- Fixed header (56px): logo, search bar, data version date
- Content: left sidebar (320px fixed) with state tabs + sorted hospital list; main panel with either national overview or hospital detail
- Mobile (<768px): sidebar becomes full-width above main content, hospital list scrolls horizontally or collapses

## Pages/Views
1. **National overview** (default): state comparison scorecards + top/bottom performers ranked by 4-hour rate
2. **Hospital detail**: selected hospital metrics — ED panel (4hr%, median/P90 time, triage table) + elective surgery panel (urgent/semi-urgent/non-urgent median days, % on time)
