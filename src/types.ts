export interface Hospital {
  code: string;
  name: string;
  state: string;
  isPrivate: boolean;
  lat: number | null;
  lng: number | null;
  lhnName: string;
  lhnCode: string;
}

export type TriageCategory = 'Resuscitation' | 'Emergency' | 'Urgent' | 'Semi-Urgent' | 'Non-Urgent';
export type AdmitStatus = 'All patients' | 'Subsequently admitted patients' | 'Not subsequently admitted patients';
export type UrgencyCategory = 'Urgent elective surgery' | 'Semi-urgent elective surgery' | 'Non-urgent elective surgery';

export interface EDMetrics {
  hospitalCode: string;
  // % departed within 4 hours
  fourHourRateAll: number | null;
  fourHourRateAdmitted: number | null;
  fourHourRateNotAdmitted: number | null;
  fourHourByTriage: Partial<Record<TriageCategory, number>>;
  // Time in ED (minutes)
  medianTimeAll: number | null;
  medianTimeAdmitted: number | null;
  medianTimeNotAdmitted: number | null;
  p90TimeAll: number | null;
  p90TimeAdmitted: number | null;
  // Total presentations
  totalPresentations: number | null;
}

export interface TriageMetrics {
  hospitalCode: string;
  onTimePct: Partial<Record<TriageCategory, number>>;
  count: Partial<Record<TriageCategory, number>>;
}

export interface ElectiveSurgeryMetrics {
  hospitalCode: string;
  medianDays: Partial<Record<UrgencyCategory, number>>;
  onTimePct: Partial<Record<UrgencyCategory, number>>;
  count: Partial<Record<UrgencyCategory, number>>;
}

export interface AppState {
  hospitals: Hospital[];
  edMetrics: Map<string, EDMetrics>;
  triageMetrics: Map<string, TriageMetrics>;
  electiveMetrics: Map<string, ElectiveSurgeryMetrics>;
  selectedHospital: Hospital | null;
  selectedState: string;
  searchQuery: string;
  loading: boolean;
  loadingElective: boolean;
  error: string | null;
  dataVersion: string;
  userLocation: { lat: number; lng: number } | null;
  detailPanelOpen: boolean;
}

// Raw API types
export interface RawReportingUnit {
  reporting_unit_code: string;
  reporting_unit_name: string;
  private: boolean;
  latitude: number | null;
  longitude: number | null;
  mapped_reporting_units: Array<{
    mapped_reporting_unit: {
      reporting_unit_code: string;
      reporting_unit_name: string;
      reporting_unit_type: { reporting_unit_type_code: string };
    };
    map_type: { mapped_reporting_unit_code: string };
  }>;
}

export interface RawDataItem {
  reporting_unit_code: string;
  reporting_unit_name: string;
  measure_code: string;
  measure_name: string;
  reported_measure_name: string;
  reported_measure_category_name: string | null;
  reported_measure_category_type_name: string | null;
  value: number | null;
  units_name: string;
  reporting_start_date: string;
  reporting_end_date: string;
  mapped_state: string | null;
}

export interface RawPaginatedResponse {
  result: {
    data: RawDataItem[];
    pagination: {
      results_returned: number;
      starting_result_index: number;
      total_results_available: number;
    };
  };
  version_information?: {
    data_version: number;
    date_uploaded: string;
  };
}
