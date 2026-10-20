export function fmtUSD(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return "n/a";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(digits)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(digits)}M`;
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return "n/a";
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtX(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return "n/a";
  return `${n.toFixed(digits)}×`;
}

export function fmtRatio(n: number | null | undefined, format: "pct" | "x"): string {
  return format === "pct" ? fmtPct(n) : fmtX(n);
}
