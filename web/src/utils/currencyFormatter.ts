export const formatCurrency = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) {
    return 'LKR 0.00';
  }

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numericValue)) {
    return 'LKR 0.00';
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    currencyDisplay: 'symbol' // "Rs." or "LKR" depending on the engine, Intl uses "LKR" or "Rs."
  }).format(numericValue).replace('LKR', 'Rs.');
};
