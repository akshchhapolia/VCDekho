export const PAGE_SIZE = 15;

export type FilterOpt = { id: string; label: string };

export type ChequeRange = FilterOpt & { min?: number | null; max?: number | null };

export function chequeOverlaps(
  inv: { chequeMin?: number | null; chequeMax?: number | null },
  range: ChequeRange
) {
  if (inv.chequeMin == null && inv.chequeMax == null) return false;
  const min = inv.chequeMin != null ? inv.chequeMin : (inv.chequeMax as number);
  const max = inv.chequeMax != null ? inv.chequeMax : (inv.chequeMin as number);
  const rMin = range.min == null ? 0 : range.min;
  const rMax = range.max == null ? Number.POSITIVE_INFINITY : range.max;
  return max >= rMin && min <= rMax;
}

export function formatCount(n: number) {
  return n.toLocaleString('en-IN');
}

export const STAGE_GUIDE_IDS: Record<string, boolean> = {
  'pre-seed': true,
  seed: true,
  'pre-series-a': true,
  'series-a': true,
  'series-b': true,
  'series-c': true
};

export function joinList(items: string[] | undefined, limit: number) {
  const slice = (items || []).slice(0, limit);
  if (!slice.length) return '';
  const more = (items || []).length > slice.length;
  return slice.join(', ') + (more ? '…' : '');
}
