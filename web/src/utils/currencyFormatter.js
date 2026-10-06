export const formatCurrency = (value) => {
    return `Rs. ${Number(value || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};
