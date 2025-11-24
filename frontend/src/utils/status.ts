import type { ChecklistItem } from '../types';

export type ChecklistStatus = ChecklistItem['status'];

export const normalizeStatus = (
  status?: ChecklistStatus | string | null
): ChecklistStatus => {
  if (typeof status !== 'string') {
    return 'pending';
  }

  const normalized = status.trim().toLowerCase();

  if (normalized === 'passed' || normalized === 'failed' || normalized === 'pending') {
    return normalized;
  }

  return 'pending';
};
