export type DocumentCategory = 'skole' | 'forsikring' | 'helse' | 'økonomi' | 'annet';

export const DOCUMENT_CATEGORIES: { key: DocumentCategory; label: string; color: string }[] = [
  { key: 'skole', label: 'Skole', color: 'bg-blue-100 text-blue-800' },
  { key: 'forsikring', label: 'Forsikring', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'helse', label: 'Helse', color: 'bg-red-100 text-red-800' },
  { key: 'økonomi', label: 'Økonomi', color: 'bg-amber-100 text-amber-800' },
  { key: 'annet', label: 'Annet', color: 'bg-gray-100 text-gray-600' },
];

import { AssignedTo } from '../../school-plan/models/school-plan.models';

export interface ArchiveDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  assignedTo: AssignedTo[];
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  fileUrl: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
}
