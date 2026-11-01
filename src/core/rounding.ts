// Rounding helpers. Always "half up" on positives; the epsilon absorbs floating-point noise.
const EPS = 1e-9;

export const round5 = (x: number): number => Math.floor(x / 5 + 0.5 + EPS) * 5;
export const floor5 = (x: number): number => Math.floor(x / 5 + EPS) * 5;
export const ceil5 = (x: number): number => Math.ceil(x / 5 - EPS) * 5 + 0; // "+ 0" turns -0 into 0
export const round10 = (x: number): number => Math.floor(x / 10 + 0.5 + EPS) * 10;
export const round50 = (x: number): number => Math.floor(x / 50 + 0.5 + EPS) * 50;

export const floor50 = (x: number): number => Math.floor(x / 50 + EPS) * 50;

/** Round to the nearest integer, half up. */
export const roundInt = (x: number): number => Math.floor(x + 0.5 + EPS);

/** Round to one decimal, half up (used for gram totals shown with a decimal). */
export const round1 = (x: number): number => Math.floor(x * 10 + 0.5 + EPS) / 10;
