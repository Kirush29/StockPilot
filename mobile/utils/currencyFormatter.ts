export const formatCurrency = (value: number | string | undefined | null): string => {
    return `Rs. ${Number(value || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};
