// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, CircleMarker } from 'leaflet';
import type { Hospital, EDMetrics } from '../types.ts';
import { formatPct, formatCount, pctClass, markerRadius, escapeHtml } from '../utils.ts';

let mapInstance: LeafletMap | null = null;
const markers = new Map<string, CircleMarker>();
let highlightedCode: string | null = null;

function getMarkerColor(fourHourRate: number | null): string {
  if (fourHourRate === null) return '#94a3b8';
  if (fourHourRate >= 75) return '#16a34a';
  if (fourHourRate >= 50) return '#d97706';
  return '#dc2626';
}

export async function initMap(
  containerId: string,
  hospitals: Hospital[],
  edMetrics: Map<string, EDMetrics>,
  onSelect: (hospital: Hospital) => void,
): Promise<void> {
  const L = await import('leaflet');

  const container = document.getElementById(containerId)!;
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
  markers.clear();

  const map = L.map(container, {
    center: [-27.5, 134],
    zoom: 5,
    zoomControl: true,
  });

  // Try CartoDB Voyager first, fall back to OSM standard tiles
  const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 18,
  });

  const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  });

  cartoLayer.addTo(map);
  cartoLayer.on('tileerror', () => {
    map.removeLayer(cartoLayer);
    osmLayer.addTo(map);
  });

  for (const hospital of hospitals) {
    if (hospital.lat === null || hospital.lng === null) continue;

    const ed = edMetrics.get(hospital.code);
    const rate = ed?.fourHourRateAll ?? null;
    const presentations = ed?.totalPresentations ?? null;
    const color = getMarkerColor(rate);
    const radius = markerRadius(presentations);

    const marker = L.circleMarker([hospital.lat, hospital.lng], {
      radius,
      fillColor: color,
      fillOpacity: 0.7,
      color: color,
      weight: 1.5,
      opacity: 0.9,
    });

    const popupHtml = buildPopupHtml(hospital, ed);
    marker.bindPopup(popupHtml, { maxWidth: 240, autoPan: false });

    marker.bindTooltip(buildTooltipHtml(hospital, ed), {
      direction: 'top',
      offset: [0, -radius - 2],
      opacity: 1,
      className: 'hospital-marker-tip',
    });

    marker.on('click', () => onSelect(hospital));

    marker.addTo(map);
    markers.set(hospital.code, marker);
  }

  mapInstance = map;
}

export function flyToHospital(hospital: Hospital): void {
  if (!mapInstance || hospital.lat === null || hospital.lng === null) return;
  mapInstance.flyTo([hospital.lat, hospital.lng], 12, { duration: 0.8 });
}

export function flyToBounds(bounds: [[number, number], [number, number]]): void {
  if (!mapInstance) return;
  mapInstance.flyToBounds(bounds, { padding: [30, 30], duration: 0.8 });
}

export function highlightMarker(hospitalCode: string | null): void {
  // Reset previous
  if (highlightedCode && markers.has(highlightedCode)) {
    const prev = markers.get(highlightedCode)!;
    prev.setStyle({ weight: 1.5 });
    prev.setRadius(prev.getRadius());
  }

  if (hospitalCode && markers.has(hospitalCode)) {
    const m = markers.get(hospitalCode)!;
    m.setStyle({ weight: 3, color: '#1e293b' });
    m.bringToFront();
  }

  highlightedCode = hospitalCode;
}

export function flyToUserLocation(lat: number, lng: number): void {
  if (!mapInstance) return;
  mapInstance.flyTo([lat, lng], 10, { duration: 0.8 });
}

function buildTooltipHtml(hospital: Hospital, ed: EDMetrics | undefined): string {
  const rate = ed?.fourHourRateAll ?? null;
  const presentations = ed?.totalPresentations ?? null;
  return (
    `<span class="marker-tip-name">${escapeHtml(hospital.name)}</span>` +
    `<span class="marker-tip-row">4-hr departure: <strong>${formatPct(rate)}</strong></span>` +
    (presentations !== null
      ? `<span class="marker-tip-row">Presentations: <strong>${formatCount(presentations)}</strong></span>`
      : '')
  );
}

function buildPopupHtml(hospital: Hospital, ed: EDMetrics | undefined): string {
  const rate = ed?.fourHourRateAll ?? null;
  const cls = pctClass(rate);
  const presentations = ed?.totalPresentations ?? null;

  return `
    <div class="popup-name">${escapeHtml(hospital.name)}</div>
    <div class="popup-meta">${hospital.state}${hospital.isPrivate ? ' · Private' : ' · Public'}${hospital.lhnName ? ` · ${escapeHtml(hospital.lhnName)}` : ''}</div>
    <div class="popup-stats">
      <div>
        <div class="popup-stat-label">4-hr departure</div>
        <div class="popup-stat-val ${cls}">${formatPct(rate)}</div>
      </div>
      ${presentations !== null ? `
        <div>
          <div class="popup-stat-label">Presentations</div>
          <div class="popup-stat-val">${formatCount(presentations)}</div>
        </div>
      ` : ''}
    </div>
  `;
}
