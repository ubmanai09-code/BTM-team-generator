export const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const stdDeviation = (values: number[]): number => {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

export const normalizeToHundred = (
  value: number,
  worstCase: number
): number => {
  if (worstCase <= 0) return 100;
  const ratio = Math.max(0, Math.min(1, 1 - value / worstCase));
  return Number((ratio * 100).toFixed(2));
};
