export const LINE_COLORS = {
    "S1": "#82a136", // Green
    "S2": "#cf222e", // Red
    "S3": "#f59e0b", // Orange/Yellow
    "S4": "#2563eb", // Blue
    "S5": "#38bdf8", // Light Blue
    "S6": "#7c3aed", // Purple
    "S60": "#c084fc" // Light Purple
};

export const getLineColor = (line) => LINE_COLORS[line] || "#64748b";
