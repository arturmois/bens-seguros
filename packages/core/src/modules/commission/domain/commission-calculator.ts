const BASIS_POINTS_DIVISOR = 10000;

/**
 * Calculates commission value using integer math (no floating point).
 *
 * Formula: round(premiumInCents * percentageInBasisPoints * splitInBasisPoints / (10000 * 10000))
 *
 * @param premiumValueInCents - Premium value in cents (e.g. 100000 = R$1000)
 * @param percentageInBasisPoints - Commission percentage in basis points (e.g. 1500 = 15%)
 * @param splitPercentageInBasisPoints - Split percentage in basis points (e.g. 10000 = 100%, default)
 * @returns Commission value in cents
 */
export function calculateCommissionValue(
  premiumValueInCents: number,
  percentageInBasisPoints: number,
  splitPercentageInBasisPoints: number = BASIS_POINTS_DIVISOR,
): number {
  return Math.round(
    (premiumValueInCents * percentageInBasisPoints * splitPercentageInBasisPoints) /
      (BASIS_POINTS_DIVISOR * BASIS_POINTS_DIVISOR),
  );
}
