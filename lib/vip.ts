export type VipTier = {
  name: string;
  icon: string;
  color: string;
  minDepositsCents: number;
  dailyLimitCents: number;
  features: string[];
  // Fine print for the tier's bonus, shown behind a "See bonus terms" tap.
  terms?: string;
};

export const VIP_TIERS: VipTier[] = [
  {
    name: 'Pearl',
    icon: '🪬',
    color: '#b5a285',
    minDepositsCents: 0,
    // Matches the $110 Cash App minimum so every tier can withdraw via Cash App.
    dailyLimitCents: 11_000,
    features: ['Daily bonus on Golden Dragon, River & Magic City'],
  },
  {
    name: 'Jade',
    icon: '💚',
    color: '#34d399',
    minDepositsCents: 250_000,
    dailyLimitCents: 20_000,
    features: ['Referral bonus', 'Birthday bonus: up to $25', 'Priority text support'],
    terms: 'Birthday bonus: $5 bonus × up to 5 deposits (up to $25 total), $25 minimum deposit, valid 1 week.',
  },
  {
    name: 'Gold',
    icon: '⚜️',
    color: '#d4af37',
    minDepositsCents: 1_000_000,
    dailyLimitCents: 30_000,
    features: ['Card & Apple Pay deposits', 'Holiday bonus: up to $25', 'Cashout from 9AM'],
    terms: 'Holiday bonus: $5 bonus × up to 5 deposits (up to $25 total), $25 minimum deposit, valid 1 week.',
  },
  {
    name: 'Dragon',
    icon: '🐉',
    color: '#ff6b35',
    minDepositsCents: 2_500_000,
    dailyLimitCents: 50_000,
    features: ['Request new games', 'No-fee deposit day monthly'],
  },
];

export function getTierForDeposits(lifetimeDepositsCents: number): VipTier {
  let tier = VIP_TIERS[0];
  for (const candidate of VIP_TIERS) {
    if (lifetimeDepositsCents >= candidate.minDepositsCents) {
      tier = candidate;
    }
  }
  return tier;
}

export function getNextTier(currentTier: VipTier): VipTier | null {
  const index = VIP_TIERS.findIndex((tier) => tier.name === currentTier.name);
  return VIP_TIERS[index + 1] ?? null;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
