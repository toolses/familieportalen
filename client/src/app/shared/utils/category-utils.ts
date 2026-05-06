import { SchoolEvent } from '../../features/school-plan/models/school-plan.models';

export function dotClass(cat: SchoolEvent['category']): string {
  const map: Record<string, string> = {
    information: 'bg-emerald-500',
    school_class: 'bg-blue-500',
    homework: 'bg-orange-500',
    weekly_homework: 'bg-orange-400',
    reminder: 'bg-amber-500',
  };
  return map[cat] ?? 'bg-gray-400';
}

export function badgeClass(cat: SchoolEvent['category']): string {
  const map: Record<string, string> = {
    information: 'bg-emerald-100 text-emerald-800',
    school_class: 'bg-blue-100 text-blue-800',
    homework: 'bg-orange-100 text-orange-800',
    weekly_homework: 'bg-orange-50 text-orange-700',
    reminder: 'bg-amber-100 text-amber-800',
  };
  return map[cat] ?? 'bg-gray-100';
}

export function categoryLabel(cat: SchoolEvent['category']): string {
  const map: Record<string, string> = {
    information: 'Informasjon',
    school_class: 'Fag',
    homework: 'Lekse',
    weekly_homework: 'Ukelekse',
    reminder: 'Påminnelse',
  };
  return map[cat] ?? cat;
}
