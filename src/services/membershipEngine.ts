import {
  Member,
  MembershipTier,
  MembershipRule,
  PointRuleConfig,
  PromotionCampaign,
  AuditLog,
  AppNotification,
  User,
} from '../types';

export interface PointsCalculationResult {
  basePoints: number;
  multiplier: number;
  campaignMultiplier: number;
  totalPoints: number;
}

export interface TierUpgradeCheckResult {
  upgraded: boolean;
  previousTier?: MembershipTier;
  newTier?: MembershipTier;
  ruleTriggered?: MembershipRule;
  reason?: string;
}

/**
 * Calculate loyalty points earned for an expense
 */
export function calculatePointsEarned(
  amount: number,
  tier: MembershipTier,
  pointConfig: PointRuleConfig,
  activePromotions: PromotionCampaign[] = []
): PointsCalculationResult {
  if (amount < pointConfig.minTransactionAmount) {
    return {
      basePoints: 0,
      multiplier: 1,
      campaignMultiplier: 1,
      totalPoints: 0,
    };
  }

  // Base point: e.g. Rp 10.000 = 1 point
  const basePoints = Math.floor(amount / pointConfig.rupiahPerPoint);

  // Tier multiplier: e.g. Gold is 1.5x
  const tierMultiplier = tier.pointMultiplier || 1.0;

  // Active promotional campaigns bonus multiplier
  let campaignMultiplier = 1.0;
  const applicablePromo = activePromotions.find(
    (p) =>
      p.status === 'active' &&
      p.pointsMultiplier &&
      p.pointsMultiplier > 1 &&
      p.applicableTierIds.includes(tier.id)
  );

  if (applicablePromo && applicablePromo.pointsMultiplier) {
    campaignMultiplier = applicablePromo.pointsMultiplier;
  }

  const effectiveMultiplier = tierMultiplier * (campaignMultiplier > 1 ? campaignMultiplier : 1);
  const totalPoints = Math.floor(basePoints * effectiveMultiplier);

  return {
    basePoints,
    multiplier: tierMultiplier,
    campaignMultiplier,
    totalPoints,
  };
}

/**
 * Dynamic Rule Engine: Evaluates if a member qualifies for an upgrade based on configured rules
 */
export function evaluateMemberTierRules(
  member: Member,
  allTiers: MembershipTier[],
  allRules: MembershipRule[],
  autoUpgradeEnabled: boolean = true
): TierUpgradeCheckResult {
  if (!autoUpgradeEnabled) {
    return { upgraded: false };
  }

  const currentTier = allTiers.find((t) => t.id === member.tierId) || allTiers[0];
  const sortedTiers = [...allTiers].sort((a, b) => b.level - a.level); // highest level first

  // Look through active upgrade rules
  const activeRules = allRules.filter((r) => r.isActive && r.action === 'upgrade' && r.targetTierId);

  for (const targetTier of sortedTiers) {
    // Only check tiers higher than current
    if (targetTier.level <= currentTier.level) continue;

    // Find rules targeting this tier
    const rulesForTier = activeRules.filter((r) => r.targetTierId === targetTier.id);

    for (const rule of rulesForTier) {
      let meetsCondition = false;
      let reasonText = '';

      switch (rule.conditionType) {
        case 'spending':
          if (member.totalSpending >= rule.primaryThreshold) {
            meetsCondition = true;
            reasonText = `Total spending Rp ${member.totalSpending.toLocaleString('id-ID')} memenuhi syarat (>= Rp ${rule.primaryThreshold.toLocaleString('id-ID')})`;
          }
          break;
        case 'stays':
          if (member.totalVisits >= rule.primaryThreshold) {
            meetsCondition = true;
            reasonText = `Total menginap ${member.totalVisits}x memenuhi syarat (>= ${rule.primaryThreshold}x)`;
          }
          break;
        case 'points':
          if (member.totalPointsEarned >= rule.primaryThreshold) {
            meetsCondition = true;
            reasonText = `Akumulasi poin ${member.totalPointsEarned} memenuhi syarat (>= ${rule.primaryThreshold} pts)`;
          }
          break;
        case 'combo':
          const spendingMet = member.totalSpending >= rule.primaryThreshold;
          const secondaryThreshold = rule.secondaryThreshold || 0;
          let secondaryMet = false;

          if (rule.secondaryConditionType === 'stays') {
            secondaryMet = member.totalVisits >= secondaryThreshold;
          } else {
            secondaryMet = member.totalSpending >= secondaryThreshold;
          }

          if (spendingMet && secondaryMet) {
            meetsCondition = true;
            reasonText = `Kombinasi spending Rp ${member.totalSpending.toLocaleString('id-ID')} dan kunjungan ${member.totalVisits}x terpenuhi`;
          }
          break;
      }

      if (meetsCondition) {
        return {
          upgraded: true,
          previousTier: currentTier,
          newTier: targetTier,
          ruleTriggered: rule,
          reason: reasonText,
        };
      }
    }
  }

  return { upgraded: false };
}

/**
 * Format Indonesian Rupiah currency
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format readable dates
 */
export function formatDateIndo(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Generate sequential/random membership number
 */
export function generateMembershipNumber(count: number): string {
  const num = (count + 1001).toString().padStart(6, '0');
  return `LGH-${num}`;
}

/**
 * Helper to build an Audit Log record
 */
export function createAuditRecord(
  actor: User,
  action: string,
  module: string,
  recordId: string,
  oldVal?: string,
  newVal?: string
): AuditLog {
  return {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    userName: actor.name,
    userEmail: actor.email,
    userRole: actor.role,
    action,
    module,
    recordId,
    oldValue: oldVal || '-',
    newValue: newVal || '-',
    ipAddress: '127.0.0.1 (Web Console)',
    userAgent: navigator.userAgent.substring(0, 100),
  };
}

/**
 * Helper to create in-app notification
 */
export function createNotificationRecord(
  recipientUserId: string,
  title: string,
  message: string,
  type: AppNotification['type']
): AppNotification {
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipientUserId,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
}
