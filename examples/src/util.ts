export function decimalize(num: bigint | number, decimals = 6): number {
  return Number(num) / 10 ** decimals;
}

export function decimalizeToString(
  num: bigint | number,
  decimals = 6,
  maximumFractionDigits = 2
): string {
  return decimalize(num, decimals).toLocaleString(undefined, {
    maximumFractionDigits,
  });
}
