import { describe, it, expect } from 'vitest';
import {
  formatMinutes,
  formatPct,
  formatDays,
  formatCount,
  pctClass,
  timeClass,
  daysClass,
  normaliseTriageCategory,
  normaliseUrgencyCategory,
  escapeHtml,
  hospitalSortKey,
} from '../src/utils.ts';

describe('formatMinutes', () => {
  it('returns em dash for null', () => {
    expect(formatMinutes(null)).toBe('—');
  });
  it('formats minutes under an hour', () => {
    expect(formatMinutes(45)).toBe('45 min');
  });
  it('rounds to nearest minute', () => {
    expect(formatMinutes(44.6)).toBe('45 min');
  });
  it('formats exactly one hour', () => {
    expect(formatMinutes(60)).toBe('1h');
  });
  it('formats hours and minutes', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
  });
  it('formats large values', () => {
    expect(formatMinutes(544)).toBe('9h 4m');
  });
  it('formats zero minutes', () => {
    expect(formatMinutes(0)).toBe('0 min');
  });
});

describe('formatPct', () => {
  it('returns em dash for null', () => {
    expect(formatPct(null)).toBe('—');
  });
  it('formats integer percentage', () => {
    expect(formatPct(75)).toBe('75%');
  });
  it('formats with decimal places', () => {
    expect(formatPct(75.5, 1)).toBe('75.5%');
  });
  it('formats zero', () => {
    expect(formatPct(0)).toBe('0%');
  });
  it('formats 100', () => {
    expect(formatPct(100)).toBe('100%');
  });
});

describe('formatDays', () => {
  it('returns em dash for null', () => {
    expect(formatDays(null)).toBe('—');
  });
  it('formats days', () => {
    expect(formatDays(13)).toBe('13 days');
  });
  it('rounds decimals', () => {
    expect(formatDays(13.7)).toBe('14 days');
  });
});

describe('formatCount', () => {
  it('returns em dash for null', () => {
    expect(formatCount(null)).toBe('—');
  });
  it('formats with thousands separator', () => {
    expect(formatCount(93067)).toContain('93');
  });
  it('formats small numbers', () => {
    expect(formatCount(0)).toBe('0');
  });
});

describe('pctClass', () => {
  it('returns na for null', () => {
    expect(pctClass(null)).toBe('metric-na');
  });
  it('returns good for >= 75', () => {
    expect(pctClass(75)).toBe('metric-good');
    expect(pctClass(100)).toBe('metric-good');
  });
  it('returns warn for 50–74', () => {
    expect(pctClass(50)).toBe('metric-warn');
    expect(pctClass(74)).toBe('metric-warn');
  });
  it('returns bad for < 50', () => {
    expect(pctClass(49)).toBe('metric-bad');
    expect(pctClass(0)).toBe('metric-bad');
  });
});

describe('timeClass', () => {
  it('returns na for null', () => {
    expect(timeClass(null)).toBe('metric-na');
  });
  it('returns good for <= 240 minutes (4 hours)', () => {
    expect(timeClass(120)).toBe('metric-good');
    expect(timeClass(240)).toBe('metric-good');
  });
  it('returns warn for 241–360 minutes', () => {
    expect(timeClass(300)).toBe('metric-warn');
  });
  it('returns bad for > 360 minutes', () => {
    expect(timeClass(400)).toBe('metric-bad');
    expect(timeClass(604)).toBe('metric-bad');
  });
});

describe('daysClass', () => {
  it('returns na for null', () => {
    expect(daysClass(null, 'Urgent elective surgery')).toBe('metric-na');
  });
  it('urgent: good for <= 30 days', () => {
    expect(daysClass(13, 'Urgent elective surgery')).toBe('metric-good');
    expect(daysClass(30, 'Urgent elective surgery')).toBe('metric-good');
  });
  it('urgent: warn for 31–60 days', () => {
    expect(daysClass(45, 'Urgent elective surgery')).toBe('metric-warn');
  });
  it('urgent: bad for > 60 days', () => {
    expect(daysClass(90, 'Urgent elective surgery')).toBe('metric-bad');
  });
  it('non-urgent: good for <= 180 days', () => {
    expect(daysClass(165, 'Non-urgent elective surgery')).toBe('metric-good');
  });
  it('non-urgent: bad for > 365 days', () => {
    expect(daysClass(400, 'Non-urgent elective surgery')).toBe('metric-bad');
  });
});

describe('normaliseTriageCategory', () => {
  it('returns null for null input', () => {
    expect(normaliseTriageCategory(null)).toBeNull();
  });
  it('maps Resuscitation', () => {
    expect(normaliseTriageCategory('Resuscitation')).toBe('Resuscitation');
  });
  it('maps Emergency', () => {
    expect(normaliseTriageCategory('Emergency')).toBe('Emergency');
  });
  it('maps Urgent', () => {
    expect(normaliseTriageCategory('Urgent')).toBe('Urgent');
  });
  it('maps Semi-Urgent (capitalised)', () => {
    expect(normaliseTriageCategory('Semi-Urgent')).toBe('Semi-Urgent');
  });
  it('maps Semi-urgent (lowercase u)', () => {
    expect(normaliseTriageCategory('Semi-urgent')).toBe('Semi-Urgent');
  });
  it('maps Non-Urgent', () => {
    expect(normaliseTriageCategory('Non-Urgent')).toBe('Non-Urgent');
  });
  it('returns null for unknown value', () => {
    expect(normaliseTriageCategory('Unknown Category')).toBeNull();
  });
});

describe('normaliseUrgencyCategory', () => {
  it('returns null for null input', () => {
    expect(normaliseUrgencyCategory(null)).toBeNull();
  });
  it('maps urgent elective surgery', () => {
    expect(normaliseUrgencyCategory('Urgent elective surgery')).toBe('Urgent elective surgery');
  });
  it('maps semi-urgent (lowercase)', () => {
    expect(normaliseUrgencyCategory('Semi-urgent elective surgery')).toBe('Semi-urgent elective surgery');
  });
  it('maps non-urgent (lowercase)', () => {
    expect(normaliseUrgencyCategory('Non-urgent elective surgery')).toBe('Non-urgent elective surgery');
  });
  it('returns null for unknown', () => {
    expect(normaliseUrgencyCategory('Something else')).toBeNull();
  });
});

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });
  it('escapes less than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });
  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });
  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });
  it('leaves safe strings unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

describe('hospitalSortKey', () => {
  it('returns the rate value when not null', () => {
    expect(hospitalSortKey(75)).toBe(75);
    expect(hospitalSortKey(0)).toBe(0);
  });
  it('returns -1 for null (sorts to bottom)', () => {
    expect(hospitalSortKey(null)).toBe(-1);
  });
});
