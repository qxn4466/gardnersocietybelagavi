export const getFinancialYear = (fromDate: string, toDate: string): string => {
  if (!fromDate || !toDate) return '';
  const startYear = fromDate.slice(0, 4);
  const endYear = toDate.slice(2, 4);
  return `${startYear}-${endYear}`;
};

export const getPreviousFinancialYear = (financialYear: string): string => {
  const startYear = Number(financialYear.slice(0, 4));
  if (!Number.isFinite(startYear)) return '';
  return `${startYear - 1}-${String(startYear).slice(-2)}`;
};

export const getFiscalStartDate = (asAtDate: string): string => {
  if (!asAtDate) return '';
  const year = Number(asAtDate.slice(0, 4));
  const month = Number(asAtDate.slice(5, 7));
  const startYear = month <= 3 ? year - 1 : year;
  return `${startYear}-04-01`;
};
