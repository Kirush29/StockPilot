export const formatCurrency = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '') {
    return 'Rs. 0.00';
  }

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numericValue)) {
    return 'Rs. 0.00';
  }

  return `Rs. ${numericValue.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
