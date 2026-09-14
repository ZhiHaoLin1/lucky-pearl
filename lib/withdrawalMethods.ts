export const WITHDRAWAL_METHODS = {
  zelle: {
    label: 'Zelle',
    feeRate: 0,
    feeDescription: 'No fee',
    detailLabel: 'Zelle email or phone number',
    detailPlaceholder: 'you@example.com or (555) 555-5555',
  },
  cashapp: {
    label: 'Cash App',
    feeRate: 0.06,
    feeDescription: '6% fee',
    detailLabel: 'Cashtag',
    detailPlaceholder: '$yourcashtag',
  },
} as const;

export type WithdrawalMethodKey = keyof typeof WITHDRAWAL_METHODS;

export function isWithdrawalMethod(value: unknown): value is WithdrawalMethodKey {
  return value === 'zelle' || value === 'cashapp';
}

export function computeFeeCents(amountCents: number, method: WithdrawalMethodKey): number {
  return Math.round(amountCents * WITHDRAWAL_METHODS[method].feeRate);
}
