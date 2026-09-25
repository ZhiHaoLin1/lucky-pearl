export type VipTier = {
  name: string;
  icon: string;
  color: string;
  minDepositsCents: number;
  dailyLimitCents: number;
  features: string[];
  highlighted?: boolean;
};

export const VIP_TIERS: VipTier[] = [
  {
    name: 'Pearl',
    icon: '🪬',
    color: '#b5a285',
    minDepositsCents: 0,
    // Matches the $110 Cash App minimum so every tier can withdraw via Cash App.
    dailyLimitCents: 11_000,
    features: ['Entry tier for every member', 'Daily bonus on all games'],
  },
  {
    name: 'Jade',
    icon: '💚',
    color: '#34d399',
    minDepositsCents: 250_000,
    dailyLimitCents: 20_000,
    features: ['Referral bonus', 'Birthday gift', 'Priority text support'],
  },
  {
    name: 'Gold',
    icon: '⚜️',
    color: '#d4af37',
    minDepositsCents: 1_000_000,
    dailyLimitCents: 30_000,
    features: ['Card & Apple Pay deposits unlocked', 'Major holiday bonus', 'Extended cashout hours starting 9AM'],
    highlighted: true,
  },
  {
    name: 'Dragon',
    icon: '🐉',
    color: '#ff6b35',
    minDepositsCents: 2_500_000,
    dailyLimitCents: 50_000,
    features: ['Request new game platforms', 'No-fee deposit day once a month'],
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
