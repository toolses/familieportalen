import { describe, it, expect } from 'vitest';
import { getDatesOfWeek, formatDateShort, formatDateFull, getMondayOfWeek, getISOWeekYear, dayName } from './date-utils';

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

describe('formatDateFull', () => {
  it('formatterer YYYY-MM-DD til DD.MM.YYYY', () => {
    expect(formatDateFull('2024-03-15')).toBe('15.03.2024');
    expect(formatDateFull('2024-12-01')).toBe('01.12.2024');
    expect(formatDateFull('2026-01-09')).toBe('09.01.2026');
  });
});

describe('getMondayOfWeek', () => {
  it('returnerer mandagen for en dato som er mandag', () => {
    expect(getMondayOfWeek('2026-04-06')).toBe('2026-04-06');
  });

  it('returnerer riktig mandag for midtukedatoer', () => {
    expect(getMondayOfWeek('2026-04-08')).toBe('2026-04-06'); // onsdag
    expect(getMondayOfWeek('2026-04-10')).toBe('2026-04-06'); // fredag
  });

  it('returnerer riktig mandag for helg', () => {
    expect(getMondayOfWeek('2026-04-11')).toBe('2026-04-06'); // lørdag
    expect(getMondayOfWeek('2026-04-12')).toBe('2026-04-06'); // søndag
  });

  it('håndterer månedsskifte korrekt', () => {
    expect(getMondayOfWeek('2026-05-01')).toBe('2026-04-27'); // fredag → mandag i april
  });
});

describe('getISOWeekYear', () => {
  it('returnerer riktig ukenummer for en midtukedag', () => {
    expect(getISOWeekYear('2026-04-08')).toEqual({ uke: 15, aar: 2026 });
  });

  it('1. januar 2026 tilhører uke 1 i 2026', () => {
    expect(getISOWeekYear('2026-01-01')).toEqual({ uke: 1, aar: 2026 });
  });

  it('31. desember 2020 tilhører uke 53 i 2020', () => {
    expect(getISOWeekYear('2020-12-31')).toEqual({ uke: 53, aar: 2020 });
  });

  it('ISO-uke tilhører nytt år selv om kalenderdatoen er i desember', () => {
    // 28. des 2015 er mandag i uke 53 – men 4. jan 2016 er torsdag i uke 1,
    // dvs. 28.–31. des 2015 hører til uke 53 i 2015.
    expect(getISOWeekYear('2015-12-28')).toEqual({ uke: 53, aar: 2015 });
  });

  it('ISO-uke tilhører forrige år selv om kalenderdatoen er i januar', () => {
    // 1. januar 2016 er fredag – ISO uke 53 i 2015
    expect(getISOWeekYear('2016-01-01')).toEqual({ uke: 53, aar: 2015 });
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
