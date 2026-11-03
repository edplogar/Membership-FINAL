export type UserRoleType = 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN' | 'OPERATOR_FO' | 'OPERATOR_FB';

export type PermissionCode =
  | 'member.view'
  | 'member.create'
  | 'member.edit'
  | 'member.delete'
  | 'member.tier_change'
  | 'tier.view'
  | 'tier.create'
  | 'tier.edit'
  | 'tier.delete'
  | 'benefit.view'
  | 'benefit.edit'
  | 'rule.view'
  | 'rule.edit'
  | 'points.view'
  | 'points.adjust'
  | 'reward.view'
  | 'reward.edit'
  | 'voucher.view'
  | 'voucher.create'
  | 'voucher.edit'
  | 'voucher.delete'
  | 'voucher.redeem'
  | 'voucher.scan_only'
  | 'stay.view'
  | 'stay.create'
  | 'stay.edit'
  | 'transaction.view'
  | 'transaction.create'
  | 'promotion.view'
  | 'promotion.edit'
  | 'reports.view'
  | 'reports.export'
  | 'audit.view'
  | 'settings.view'
  | 'settings.edit'
  | 'admin.view'
  | 'admin.create'
  | 'admin.edit'
  | 'admin.delete'
  | 'security.manage';

export interface User {
  id: string;
  email: string;
  username?: string; // Support login via username or email
  name: string;
  role: UserRoleType;
  roleId: string;
  memberId?: string; // If role is MEMBER
  avatar?: string;
  phone?: string;
  department?: string; // For staff / admin
  jobTitle?: string; // For staff / admin
  password?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  permissions: PermissionCode[];
  isSystem: boolean;
}

export interface MembershipTier {
  id: string;
  name: string; // e.g. "Member", "Silver", "Gold", "Platinum"
  level: number; // 1, 2, 3, 4
  minSpending: number; // IDR spending threshold
  minStays: number; // Stay counts threshold
  minNights: number; // Night count threshold
  pointMultiplier: number; // e.g. 1.0, 1.25, 1.5, 2.0
  roomDiscountPercent: number; // Room discount %
  fnbDiscountPercent: number; // F&B discount %
  spaDiscountPercent: number; // Spa discount %
  benefits: string[]; // List of key benefit descriptions
  colorHex: string; // Theme color
  badgeBg: string; // Tailwind color class or hex
  icon: string; // Lucide icon identifier
  validityMonths: number; // Validity in months (e.g. 12 or 24)
  description: string;
  isActive: boolean;
}

export interface MembershipBenefit {
  id: string;
  name: string;
  description: string;
  category: 'room' | 'fnb' | 'spa' | 'service' | 'special';
  applicableTierIds: string[];
  icon: string;
  isActive: boolean;
}

export interface MembershipRule {
  id: string;
  name: string;
  conditionType: 'spending' | 'stays' | 'nights' | 'points' | 'combo';
  primaryThreshold: number;
  secondaryConditionType?: 'spending' | 'stays' | 'nights';
  secondaryThreshold?: number;
  action: 'upgrade' | 'downgrade' | 'bonus_points';
  targetTierId?: string;
  bonusPoints?: number;
  description: string;
  isActive: boolean;
}

export interface Member {
  id: string;
  membershipNumber: string; // e.g. "LGH-001089"
  fullName: string;
  nickname: string;
  username?: string; // Support login via username or email
  email: string;
  phone: string;
  password?: string;
  gender: 'L' | 'P' | 'OTHER';
  birthDate: string; // YYYY-MM-DD
  address: string;
  city: string;
  province: string;
  country: string;
  idCardNumber: string; // KTP / Passport
  registrationDate: string;
  membershipStartDate: string;
  membershipEndDate: string;
  tierId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED';
  totalVisits: number;
  totalTransactions: number;
  totalSpending: number;
  totalPointsEarned: number;
  availablePoints: number;
  redeemedPoints: number;
  lastVisitDate?: string;
  referralCode: string;
  referredBy?: string;
  internalNotes: string;
  avatar?: string;
}

export type StayStatus = 'reserved' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';

export interface Stay {
  id: string;
  memberId: string;
  bookingNumber: string;
  roomNumber: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestCount: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'partially_paid';
  bookingSource: 'Direct Website' | 'Front Desk' | 'OTA - Agoda' | 'OTA - Booking.com' | 'Corporate' | 'Travel Agent';
  staffName: string;
  status: StayStatus;
  notes?: string;
}

export type TransactionCategory =
  | 'room'
  | 'restaurant'
  | 'bar'
  | 'spa'
  | 'laundry'
  | 'meeting'
  | 'banquet'
  | 'other';

export interface Transaction {
  id: string;
  transactionNumber: string;
  memberId: string;
  date: string;
  category: TransactionCategory;
  amount: number;
  paymentMethod: 'Cash' | 'Credit Card' | 'Debit Card' | 'QRIS' | 'Bank Transfer' | 'Room Charge';
  pointsEarned: number;
  staffName: string;
  referenceNumber: string;
  notes?: string;
}

export type PointTxType =
  | 'earned'
  | 'redeemed'
  | 'adjusted_add'
  | 'adjusted_sub'
  | 'expired'
  | 'referral'
  | 'birthday'
  | 'promotion_bonus';

export interface PointTransaction {
  id: string;
  memberId: string;
  type: PointTxType;
  amount: number;
  balanceAfter: number;
  referenceId?: string;
  description: string;
  staffName: string;
  createdAt: string;
}

export interface PointRuleConfig {
  rupiahPerPoint: number; // e.g. Rp 10.000 = 1 point
  pointExpiryMonths: number; // e.g. 12 months
  minTransactionAmount: number; // e.g. Rp 50.000
  birthdayBonusPoints: number; // e.g. 200 points
  referralBonusReferrer: number; // e.g. 500 points
  referralBonusNewMember: number; // e.g. 250 points
  redemptionRatePerRupiah: number; // e.g. 1 point = Rp 100
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  category: 'fnb' | 'room' | 'spa' | 'voucher' | 'service';
  pointsRequired: number;
  stock: number;
  validityDays: number;
  terms: string;
  status: 'active' | 'out_of_stock' | 'inactive';
  icon: string;
}

export interface RewardRedemption {
  id: string;
  memberId: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  redemptionCode: string;
  status: 'issued' | 'used' | 'expired';
  redeemedAt: string;
  expiresAt: string;
  usedAt?: string;
  notes?: string;
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  type: 'percent' | 'fixed' | 'complimentary';
  discountValue: number; // % or IDR
  minTransaction: number;
  maxDiscount: number;
  startDate: string;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  perMemberLimit: number;
  applicableTierIds: string[];
  status: 'active' | 'inactive' | 'expired';
}

export interface VoucherRedemption {
  id: string;
  memberId: string;
  voucherId: string;
  voucherCode: string;
  discountApplied: number;
  claimedAt: string;
  status: 'available' | 'used' | 'expired';
  usedAt?: string;
  transactionNumber?: string;
  redeemedByStaffName?: string;
  redeemedByStaffRole?: string;
  outlet?: string;
  notes?: string;
}

export interface PromotionCampaign {
  id: string;
  title: string;
  description: string;
  gradientBg: string;
  startDate: string;
  endDate: string;
  applicableTierIds: string[];
  pointsMultiplier?: number;
  discountText?: string;
  terms: string;
  status: 'active' | 'upcoming' | 'ended';
}

export interface Referral {
  id: string;
  referrerMemberId: string;
  referredMemberId: string;
  codeUsed: string;
  pointsAwardedReferrer: number;
  pointsAwardedReferred: number;
  date: string;
}

export interface AppNotification {
  id: string;
  recipientUserId: string; // or memberId
  title: string;
  message: string;
  type: 'tier_upgrade' | 'points' | 'stay' | 'voucher' | 'system' | 'birthday' | 'promotion';
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  userRole: UserRoleType;
  action: string;
  module: string;
  recordId: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
  userAgent: string;
}

export interface HotelSystemSettings {
  hotelName: string;
  logoText: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  defaultTierId: string;
  membershipValidityMonths: number;
  autoUpgradeEnabled: boolean;
  autoDowngradeEnabled: boolean;
  allowPublicRegistration: boolean;
  sessionTimeoutMinutes: number;
  loginAttemptLimit: number;
  twoFactorRequired: boolean;
  ipRestrictionEnabled: boolean;
}

export interface WhatsAppWebhookRule {
  id: string;
  keyword: string;
  matchType: 'exact' | 'contains' | 'starts_with' | 'regex';
  responseType: 'reply_text' | 'send_points_balance' | 'send_digital_card' | 'register_member' | 'forward_to_staff';
  replyTemplate: string;
  isActive: boolean;
  description: string;
}

export interface WhatsAppWebhookEventLog {
  id: string;
  event: 'message.received' | 'message.delivered' | 'message.read' | 'device.status';
  senderPhone: string;
  messageText?: string;
  matchedRuleId?: string;
  botReplyText?: string;
  timestamp: string;
  rawPayload?: Record<string, unknown>;
}

export interface PingCoIdWhatsAppConfig {
  apiKey: string;
  apiUrl: string;
  senderPhone: string;
  deviceId?: string;
  accountEmail?: string;
  deviceName: string;
  deviceStatus: 'connected' | 'disconnected' | 'qr_ready';
  webhookUrl: string;
  webhookSecret?: string;
  pingWebhookInboundUrl?: string;
  autoSendWelcomeCard: boolean;
  autoSendPointUpdate: boolean;
  autoSendTierUpgrade: boolean;
  autoSendVouchers: boolean;
  messageTemplateWelcome: string;
  messageTemplatePoints: string;
  messageTemplateTierUpgrade: string;
  webhookRules: WhatsAppWebhookRule[];
  messageQuota?: number;
  lastCheckedAt?: string;
}

export interface WhatsAppMessageLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  message: string;
  type: 'welcome' | 'point_update' | 'tier_upgrade' | 'voucher' | 'broadcast' | 'chat';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  gateway?: string;
  isLiveGateway?: boolean;
  diagnostics?: Record<string, unknown>;
  triggerPayload?: Record<string, unknown>;
}

export interface EmailSystemConfig {
  defaultSenderEmail: string; // e.g. "membership@lombokgardenhotel.com" or "edp.logar@gmail.com"
  defaultSenderName: string; // e.g. "Lombok Garden Hotel Concierge"
  replyToEmail: string; // e.g. "edp@lombokgardenhotel.com"
  provider: 'smtp' | 'gmail' | 'sendgrid' | 'resend' | 'custom';
  smtpHost: string; // e.g. "smtp.gmail.com" or "mail.lombokgardenhotel.com"
  smtpPort: number; // 465, 587, 25
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword?: string;
  apiKey?: string;
  autoSendWelcomeEmail: boolean;
  autoSendPasswordResetEmail: boolean;
  welcomeSubjectTemplate: string;
  welcomeBodyTemplate: string;
  resetSubjectTemplate: string;
  resetBodyTemplate: string;
  lastTestedAt?: string;
  testStatus?: 'success' | 'failed' | 'idle';
}

export interface EmailMessageLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  type: 'welcome' | 'password_reset' | 'test' | 'notification' | 'tier_upgrade' | 'points_update' | 'broadcast';
  status: 'sent' | 'delivered' | 'failed' | 'queued' | 'retrying';
  senderEmail: string;
  timestamp: string;
  resetToken?: string;
  otpCode?: string;
  previewText?: string;
  errorMessage?: string;
  rawError?: string;
  errorCode?: string;
  latencyMs?: number;
  smtpHost?: string;
  retryCount?: number;
  lastRetriedAt?: string;
  memberId?: string;
  membershipNumber?: string;
  deliveryDetails?: {
    messageId?: string;
    smtpResponse?: string;
    acceptedRecipients?: string[];
    rejectedRecipients?: string[];
  };
}

export interface IntegrationStatus {
  whatsappPing: { name: string; status: 'connected' | 'mock' | 'disconnected'; provider: string };
  emailService: { name: string; status: 'connected' | 'mock' | 'disconnected'; provider: string };
}

