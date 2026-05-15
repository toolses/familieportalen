import { describe, it, expect } from 'vitest';
import { dotClass, badgeClass, categoryLabel } from './category-utils';
import type { SchoolEvent } from '../../features/school-plan/models/school-plan.models';

type Category = SchoolEvent['category'];

const CATEGORIES: Category[] = ['information', 'school_class', 'homework', 'weekly_homework', 'reminder'];

describe('dotClass', () => {
  it('returnerer riktig Tailwind-klasse for hver kategori', () => {
    expect(dotClass('information')).toBe('bg-emerald-500');
    expect(dotClass('school_class')).toBe('bg-blue-500');
    expect(dotClass('homework')).toBe('bg-orange-500');
    expect(dotClass('weekly_homework')).toBe('bg-orange-400');
    expect(dotClass('reminder')).toBe('bg-amber-500');
  });

  it('returnerer fallback-klasse for ukjent kategori', () => {
    expect(dotClass('ukjent' as Category)).toBe('bg-gray-400');
  });

  it('inneholder ingen undefined-verdier for gyldige kategorier', () => {
    for (const cat of CATEGORIES) {
      expect(dotClass(cat)).toBeTruthy();
    }
  });
});

describe('badgeClass', () => {
  it('returnerer riktig badge-klasse for hver kategori', () => {
    expect(badgeClass('information')).toBe('bg-emerald-100 text-emerald-800');
    expect(badgeClass('school_class')).toBe('bg-blue-100 text-blue-800');
    expect(badgeClass('homework')).toBe('bg-orange-100 text-orange-800');
    expect(badgeClass('weekly_homework')).toBe('bg-orange-50 text-orange-700');
    expect(badgeClass('reminder')).toBe('bg-amber-100 text-amber-800');
  });

  it('returnerer fallback-klasse for ukjent kategori', () => {
    expect(badgeClass('ukjent' as Category)).toBe('bg-gray-100');
  });
});

describe('categoryLabel', () => {
  it('returnerer norsk etikett for hver kategori', () => {
    expect(categoryLabel('information')).toBe('Informasjon');
    expect(categoryLabel('school_class')).toBe('Fag');
    expect(categoryLabel('homework')).toBe('Lekse');
    expect(categoryLabel('weekly_homework')).toBe('Ukelekse');
    expect(categoryLabel('reminder')).toBe('Påminnelse');
  });

  it('returnerer kategorinøkkelen direkte for ukjent kategori', () => {
    expect(categoryLabel('ukjent' as Category)).toBe('ukjent');
  });
});
