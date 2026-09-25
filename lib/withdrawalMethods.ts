export const WITHDRAWAL_METHODS = {
  zelle: {
    label: 'Zelle',
    feeRate: 0,
    feeDescription: 'No fee',
    detailLabel: 'Zelle email or phone number',
    detailPlaceholder: 'you@example.com or (555) 555-5555',
    detailPrefix: null as string | null,
    minAmountCents: 0,
  },
  cashapp: {
    label: 'Cash App',
    feeRate: 0.06,
    feeDescription: '6% fee',
    detailLabel: 'Cashtag',
    detailPlaceholder: '$yourcashtag',
    detailPrefix: '$',
    // Cash App cashouts below this can't be processed on our end.
    minAmountCents: 11000,
  },
  chime: {
    label: 'Chime',
    feeRate: 0.065,
    feeDescription: '6.5% fee',
    detailLabel: 'Chime tag',
    detailPlaceholder: '$yourchimetag',
    detailPrefix: '$',
    minAmountCents: 0,
  },
} as const;

export type WithdrawalMethodKey = keyof typeof WITHDRAWAL_METHODS;

export function isWithdrawalMethod(value: unknown): value is WithdrawalMethodKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(WITHDRAWAL_METHODS, value);
}

export function computeFeeCents(amountCents: number, method: WithdrawalMethodKey): number {
  return Math.round(amountCents * WITHDRAWAL_METHODS[method].feeRate);
}

/** Human-readable label for a withdrawal method, tolerant of unknown/legacy values from the DB. */
export function methodLabel(method: unknown): string {
  if (isWithdrawalMethod(method)) {
    return WITHDRAWAL_METHODS[method].label;
  }
  return typeof method === 'string' && method ? method : 'Unknown';
}
