import { describe, it, expect } from 'vitest';
import { getDatesOfWeek, formatDateShort, dayName } from './date-utils';

describe('getDatesOfWeek', () => {
  it('returnerer 5 datoer (mandag–fredag)', () => {
    const dates = getDatesOfWeek(1, 2024);
    expect(dates).toHaveLength(5);
  });

  it('uke 1 i 2024 starter mandag 1. januar', () => {
    const dates = getDatesOfWeek(1, 2024);
    expect(dates[0]).toBe('2024-01-01');
    expect(dates[4]).toBe('2024-01-05');
  });

  it('uke 10 i 2025 er 3.–7. mars', () => {
    const dates = getDatesOfWeek(10, 2025);
    expect(dates[0]).toBe('2025-03-03');
    expect(dates[4]).toBe('2025-03-07');
  });

  it('uke 52 i 2024 er 23.–27. desember', () => {
    const dates = getDatesOfWeek(52, 2024);
    expect(dates[0]).toBe('2024-12-23');
    expect(dates[4]).toBe('2024-12-27');
  });

  it('alle datoer er påfølgende (én dag mellom hver)', () => {
    const dates = getDatesOfWeek(15, 2024);
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T00:00:00Z');
      const curr = new Date(dates[i] + 'T00:00:00Z');
      expect(curr.getTime() - prev.getTime()).toBe(24 * 60 * 60 * 1000);
    }
  });

  it('returnerer ISO-format (YYYY-MM-DD)', () => {
    const dates = getDatesOfWeek(5, 2024);
    for (const date of dates) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('formatDateShort', () => {
  it('formatterer YYYY-MM-DD til DD.MM', () => {
    expect(formatDateShort('2024-03-15')).toBe('15.03');
    expect(formatDateShort('2024-12-01')).toBe('01.12');
    expect(formatDateShort('2024-01-09')).toBe('09.01');
  });
});

describe('dayName', () => {
  it('returnerer korrekte norske dagsnavn', () => {
    expect(dayName('2024-01-01')).toBe('Mandag');
    expect(dayName('2024-01-02')).toBe('Tirsdag');
    expect(dayName('2024-01-03')).toBe('Onsdag');
    expect(dayName('2024-01-04')).toBe('Torsdag');
    expect(dayName('2024-01-05')).toBe('Fredag');
    expect(dayName('2024-01-06')).toBe('Lørdag');
    expect(dayName('2024-01-07')).toBe('Søndag');
  });
});
