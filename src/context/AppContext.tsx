import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Member,
  MembershipTier,
  MembershipBenefit,
  MembershipRule,
  Stay,
  Transaction,
  PointTransaction,
  PointRuleConfig,
  Reward,
  RewardRedemption,
  Voucher,
  VoucherRedemption,
  PromotionCampaign,
  AppNotification,
  AuditLog,
  HotelSystemSettings,
  IntegrationStatus,
  User,
  Role,
  PermissionCode,
  PingCoIdWhatsAppConfig,
  WhatsAppMessageLog,
  EmailSystemConfig,
  EmailMessageLog,
} from '../types';
import {
  INITIAL_MEMBERS,
  INITIAL_TIERS,
  INITIAL_BENEFITS,
  INITIAL_RULES,
  INITIAL_POINT_RULES,
  INITIAL_STAYS,
  INITIAL_TRANSACTIONS,
  INITIAL_POINT_TXS,
  INITIAL_REWARDS,
  INITIAL_REDEMPTIONS,
  INITIAL_VOUCHERS,
  INITIAL_PROMOTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
  INITIAL_INTEGRATIONS,
  INITIAL_USERS,
  INITIAL_ROLES,
  INITIAL_VOUCHER_REDEMPTIONS,
  loadFromStorage,
  saveToStorage,
} from '../services/storage';
import {
  INITIAL_PING_CONFIG,
  INITIAL_WHATSAPP_LOGS,
  sendWhatsAppMessageViaPing,
  formatWelcomeWhatsApp,
  formatPointsWhatsApp,
  formatTierUpgradeWhatsApp,
} from '../services/pingWhatsAppService';
import {
  INITIAL_EMAIL_CONFIG,
  INITIAL_EMAIL_LOGS,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  testEmailConnection,
  resendDispatchedEmail,
  clearServerEmailLogs,
  sendTierUpgradeEmail,
  sendPointUpdateEmail,
  sendMemberCustomNotificationEmail,
} from '../services/emailService';
import { apiFetch } from '../services/apiClient';
import {
  calculatePointsEarned,
  evaluateMemberTierRules,
  createAuditRecord,
  createNotificationRecord,
  generateMembershipNumber,
  formatIDR,
  formatDateIndo,
} from '../services/membershipEngine';
import {
  db,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
  cleanFirestoreData,
} from '../services/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  MEMBER_CUSTOM_DOMAIN,
  isMemberSubdomain,
  setSimulateMemberSubdomain,
} from '../services/domainService';
import {
  seedFirestoreIfEmpty,
  pushAllToFirestore,
  clearFirestoreMembersAndTransactions,
} from '../services/dbSyncService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  validateVoucherCreation,
  validateVoucherRule,
  VoucherValidationResult,
  VoucherRuleEvaluationParams,
  VoucherRuleEvaluationResult,
} from '../services/voucherValidationService';

export type {
  VoucherValidationResult,
  VoucherRuleEvaluationParams,
  VoucherRuleEvaluationResult,
};

export interface VerifyVoucherResult {
  isValid: boolean;
  status: 'available' | 'used' | 'expired' | 'not_found';
  message: string;
  voucher?: Voucher;
  member?: Member;
  redemption?: VoucherRedemption;
  rewardRedemption?: RewardRedemption;
}

interface AppContextValue {
  members: Member[];
  tiers: MembershipTier[];
  benefits: MembershipBenefit[];
  rules: MembershipRule[];
  stays: Stay[];
  transactions: Transaction[];
  pointTransactions: PointTransaction[];
  pointRules: PointRuleConfig;
  rewards: Reward[];
  redemptions: RewardRedemption[];
  vouchers: Voucher[];
  voucherRedemptions: VoucherRedemption[];
  promotions: PromotionCampaign[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  systemSettings: HotelSystemSettings;
  integrations: IntegrationStatus;
  users: User[];
  roles: Role[];
  whatsappConfig: PingCoIdWhatsAppConfig;
  whatsappLogs: WhatsAppMessageLog[];
  emailConfig: EmailSystemConfig;
  emailLogs: EmailMessageLog[];

  // Subdomain & Database Cloud Sync Controls
  isSyncModalOpen: boolean;
  openSyncModal: () => void;
  closeSyncModal: () => void;
  isMemberDomain: boolean;
  customDomain: string;
  forceSyncToCloud: () => Promise<boolean>;

  // Actions
  addMember: (
    data: Omit<Member, 'id' | 'membershipNumber' | 'totalVisits' | 'totalTransactions' | 'totalSpending' | 'redeemedPoints' | 'totalPointsEarned' | 'availablePoints'> & {
      availablePoints?: number;
      totalPointsEarned?: number;
    }
  ) => Member;
  updateMember: (id: string, updates: Partial<Member>) => void;
  deleteMember: (id: string) => boolean;
  changeMemberTier: (memberId: string, newTierId: string, reason: string) => void;
  
  recordStay: (data: Omit<Stay, 'id'>) => Stay;
  updateStayStatus: (stayId: string, status: Stay['status']) => void;

  recordTransaction: (data: Omit<Transaction, 'id' | 'pointsEarned'>) => { transaction: Transaction; pointsEarned: number; upgradeNotice?: string };
  adjustPoints: (memberId: string, amount: number, isAddition: boolean, reason: string) => void;

  redeemReward: (memberId: string, rewardId: string) => { success: boolean; message: string; code?: string };
  claimVoucher: (memberId: string, voucherId: string) => { success: boolean; message: string };
  useVoucher: (redemptionId: string) => void;
  verifyVoucherByBarcode: (barcodeOrCode: string) => {
    isValid: boolean;
    status: 'available' | 'used' | 'expired' | 'not_found';
    voucher?: Voucher;
    member?: Member;
    redemption?: VoucherRedemption;
    rewardRedemption?: RewardRedemption;
    message: string;
  };
  redeemVoucherByBarcode: (
    barcodeOrCode: string,
    staffInfo: { name: string; role?: string; outlet?: string; transactionNumber?: string; notes?: string }
  ) => {
    success: boolean;
    message: string;
    voucher?: Voucher;
    member?: Member;
    redemption?: VoucherRedemption;
    rewardRedemption?: RewardRedemption;
    errorReason?: string;
  };

  saveTier: (tier: MembershipTier) => void;
  deleteTier: (id: string) => void;

  saveBenefit: (benefit: MembershipBenefit) => void;
  deleteBenefit: (id: string) => void;

  saveRule: (rule: MembershipRule) => void;
  deleteRule: (id: string) => void;

  saveReward: (reward: Reward) => void;
  deleteReward: (id: string) => void;

  saveVoucher: (voucher: Voucher) => void;
  deleteVoucher: (id: string) => void;
  validateVoucherCreationData: (voucher: Partial<Voucher>, editingId?: string) => VoucherValidationResult;
  validateVoucherRuleEvaluation: (voucher: Voucher, params: VoucherRuleEvaluationParams) => VoucherRuleEvaluationResult;

  savePromotion: (promo: PromotionCampaign) => void;
  deletePromotion: (id: string) => void;

  savePointRules: (rules: PointRuleConfig) => void;
  updateSystemSettings: (settings: Partial<HotelSystemSettings>) => void;
  
  updateWhatsAppConfig: (config: Partial<PingCoIdWhatsAppConfig>) => void;
  addWhatsAppLog: (log: WhatsAppMessageLog) => void;
  updateEmailConfig: (config: Partial<EmailSystemConfig>) => void;
  addEmailLog: (log: EmailMessageLog) => void;
  sendTestEmailToRecipient: (recipientEmail: string) => Promise<{ success: boolean; message: string }>;
  resendEmailNotification: (logId: string) => Promise<{ success: boolean; message: string }>;
  clearEmailLogs: () => Promise<boolean>;
  sendMemberNotificationEmail: (recipientEmail: string, recipientName: string, subject: string, messageText: string, membershipNumber?: string) => Promise<EmailMessageLog>;
  sendMemberTierUpgradeEmail: (member: Member, oldTier: MembershipTier, newTier: MembershipTier) => Promise<EmailMessageLog>;
  sendMemberPointsEmail: (member: Member, pointsChange: number, currentBalance: number, activityName: string) => Promise<EmailMessageLog>;

  updateRolePermissions: (roleId: string, permissions: PermissionCode[]) => void;
  saveUser: (user: User) => void;
  deleteUser: (userId: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  resetMembersData: () => void;
  resetTransactionsData: () => void;
  resetUserAccounts: () => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const {
    currentUser,
    refreshMemberData,
    updateAdministrator,
    updateRolePermissions: authUpdateRolePermissions,
    roles: authRoles,
  } = useAuth();
  const { showToast } = useToast();

  const [members, setMembers] = useState<Member[]>(() => loadFromStorage('members', INITIAL_MEMBERS));
  const [tiers, setTiers] = useState<MembershipTier[]>(() => loadFromStorage('tiers', INITIAL_TIERS));
  const [benefits, setBenefits] = useState<MembershipBenefit[]>(() => loadFromStorage('benefits', INITIAL_BENEFITS));
  const [rules, setRules] = useState<MembershipRule[]>(() => loadFromStorage('rules', INITIAL_RULES));
  const [stays, setStays] = useState<Stay[]>(() => loadFromStorage('stays', INITIAL_STAYS));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromStorage('transactions', INITIAL_TRANSACTIONS));
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>(() => loadFromStorage('pointTransactions', INITIAL_POINT_TXS));
  const [pointRules, setPointRules] = useState<PointRuleConfig>(() => loadFromStorage('pointRules', INITIAL_POINT_RULES));
  const [rewards, setRewards] = useState<Reward[]>(() => loadFromStorage('rewards', INITIAL_REWARDS));
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>(() => loadFromStorage('redemptions', INITIAL_REDEMPTIONS));
  const [vouchers, setVouchers] = useState<Voucher[]>(() => loadFromStorage('vouchers', INITIAL_VOUCHERS));
  const [voucherRedemptions, setVoucherRedemptions] = useState<VoucherRedemption[]>(() => loadFromStorage('voucherRedemptions', INITIAL_VOUCHER_REDEMPTIONS));
  const [promotions, setPromotions] = useState<PromotionCampaign[]>(() => loadFromStorage('promotions', INITIAL_PROMOTIONS));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadFromStorage('notifications', INITIAL_NOTIFICATIONS));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadFromStorage('auditLogs', INITIAL_AUDIT_LOGS));
  const [systemSettings, setSystemSettings] = useState<HotelSystemSettings>(() => loadFromStorage('systemSettings', INITIAL_SETTINGS));
  const [integrations] = useState<IntegrationStatus>(() => loadFromStorage('integrations', INITIAL_INTEGRATIONS));
  const [users, setUsers] = useState<User[]>(() => loadFromStorage('users', INITIAL_USERS));
  const [roles, setRoles] = useState<Role[]>(() => loadFromStorage('roles', INITIAL_ROLES));
  const [whatsappConfig, setWhatsappConfig] = useState<PingCoIdWhatsAppConfig>(() => loadFromStorage('whatsappConfig', INITIAL_PING_CONFIG));
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppMessageLog[]>(() => loadFromStorage('whatsappLogs', INITIAL_WHATSAPP_LOGS));
  const [emailConfig, setEmailConfig] = useState<EmailSystemConfig>(() => loadFromStorage('emailConfig', INITIAL_EMAIL_CONFIG));
  const [emailLogs, setEmailLogs] = useState<EmailMessageLog[]>(() => loadFromStorage('emailLogs', INITIAL_EMAIL_LOGS));

  // Subdomain & Cloud Sync State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isMemberDomain, setIsMemberDomain] = useState<boolean>(() => isMemberSubdomain());

  useEffect(() => {
    const handleDomainChange = () => {
      setIsMemberDomain(isMemberSubdomain());
    };
    window.addEventListener('domain_mode_changed', handleDomainChange);
    return () => window.removeEventListener('domain_mode_changed', handleDomainChange);
  }, []);

  // Test Firestore Connection and Seed Database if Empty on Boot
  useEffect(() => {
    testFirestoreConnection();
    seedFirestoreIfEmpty().then((res) => {
      if (res.seeded) {
        console.log('[FIRESTORE INIT] Initial hotel collections seeded to cloud.');
      }
    }).catch(() => {});

    // Ensure remote Firestore member & transaction records are purged once
    const purgeFlagKey = 'lgh_purge_members_and_txs_v4';
    if (!localStorage.getItem(purgeFlagKey)) {
      clearFirestoreMembersAndTransactions()
        .then(() => {
          localStorage.setItem(purgeFlagKey, 'true');
        })
        .catch(() => {});
    }
  }, []);

  // Sync to localStorage
  useEffect(() => saveToStorage('members', members), [members]);
  useEffect(() => saveToStorage('tiers', tiers), [tiers]);
  useEffect(() => saveToStorage('benefits', benefits), [benefits]);
  useEffect(() => saveToStorage('rules', rules), [rules]);
  useEffect(() => saveToStorage('stays', stays), [stays]);
  useEffect(() => saveToStorage('transactions', transactions), [transactions]);
  useEffect(() => saveToStorage('pointTransactions', pointTransactions), [pointTransactions]);
  useEffect(() => saveToStorage('pointRules', pointRules), [pointRules]);
  useEffect(() => saveToStorage('rewards', rewards), [rewards]);
  useEffect(() => saveToStorage('redemptions', redemptions), [redemptions]);
  useEffect(() => saveToStorage('vouchers', vouchers), [vouchers]);
  useEffect(() => saveToStorage('voucherRedemptions', voucherRedemptions), [voucherRedemptions]);
  useEffect(() => saveToStorage('promotions', promotions), [promotions]);
  useEffect(() => saveToStorage('notifications', notifications), [notifications]);
  useEffect(() => saveToStorage('auditLogs', auditLogs), [auditLogs]);
  useEffect(() => saveToStorage('systemSettings', systemSettings), [systemSettings]);
  useEffect(() => saveToStorage('users', users), [users]);
  useEffect(() => saveToStorage('roles', roles), [roles]);
  useEffect(() => saveToStorage('whatsappConfig', whatsappConfig), [whatsappConfig]);
  useEffect(() => saveToStorage('whatsappLogs', whatsappLogs), [whatsappLogs]);
  useEffect(() => saveToStorage('emailConfig', emailConfig), [emailConfig]);
  useEffect(() => saveToStorage('emailLogs', emailLogs), [emailLogs]);

  // Keep roles strictly synchronized with AuthContext state
  useEffect(() => {
    if (authRoles && authRoles.length > 0) {
      setRoles(authRoles);
    }
  }, [authRoles]);

  // Firestore Real-time Listeners (multi-device & subdomain cloud synchronization)
  useEffect(() => {
    try {
      const unsubMembers = onSnapshot(
        collection(db, 'members'),
        (snapshot) => {
          const list: Member[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as Member));
          setMembers(list);
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'members')
      );

      const unsubStays = onSnapshot(
        collection(db, 'stays'),
        (snapshot) => {
          const list: Stay[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as Stay));
          setStays(list);
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'stays')
      );

      const unsubTxs = onSnapshot(
        collection(db, 'transactions'),
        (snapshot) => {
          const list: Transaction[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as Transaction));
          setTransactions(list);
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'transactions')
      );

      const unsubPointTxs = onSnapshot(
        collection(db, 'point_transactions'),
        (snapshot) => {
          const list: PointTransaction[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as PointTransaction));
          setPointTransactions(list);
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'point_transactions')
      );

      const unsubTiers = onSnapshot(
        collection(db, 'membership_tiers'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: MembershipTier[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as MembershipTier));
            setTiers(list);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'membership_tiers')
      );

      const unsubBenefits = onSnapshot(
        collection(db, 'membership_benefits'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: MembershipBenefit[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as MembershipBenefit));
            setBenefits(list);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'membership_benefits')
      );

      const unsubRules = onSnapshot(
        collection(db, 'membership_rules'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: MembershipRule[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as MembershipRule));
            setRules(list);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'membership_rules')
      );

      const unsubRewards = onSnapshot(
        collection(db, 'rewards'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Reward[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as Reward));
            setRewards(list);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'rewards')
      );

      const unsubVouchers = onSnapshot(
        collection(db, 'vouchers'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Voucher[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as Voucher));
            setVouchers(list);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'vouchers')
      );

      const unsubPromos = onSnapshot(
        collection(db, 'promotions'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: PromotionCampaign[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as PromotionCampaign));
            setPromotions(list);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'promotions')
      );

      const unsubWALogs = onSnapshot(
        collection(db, 'whatsapp_logs'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: WhatsAppMessageLog[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as WhatsAppMessageLog));
            setWhatsappLogs(list);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'whatsapp_logs')
      );

      const unsubWAPingConfig = onSnapshot(
        doc(db, 'system_settings', 'whatsapp_ping'),
        (docSnap) => {
          if (docSnap.exists()) {
            setWhatsappConfig(docSnap.data() as PingCoIdWhatsAppConfig);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'system_settings/whatsapp_ping')
      );

      const unsubEmailConfig = onSnapshot(
        doc(db, 'system_settings', 'email_config'),
        (docSnap) => {
          if (docSnap.exists()) {
            setEmailConfig(docSnap.data() as EmailSystemConfig);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'system_settings/email_config')
      );

      const unsubEmailLogs = onSnapshot(
        collection(db, 'email_logs'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: EmailMessageLog[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as EmailMessageLog));
            setEmailLogs(list);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'email_logs')
      );

      const unsubSettings = onSnapshot(
        doc(db, 'system_settings', 'hotel_settings'),
        (docSnap) => {
          if (docSnap.exists()) {
            setSystemSettings(docSnap.data() as HotelSystemSettings);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'system_settings/hotel_settings')
      );

      const unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: User[] = [];
            snapshot.forEach((docSnap) => list.push(docSnap.data() as User));
            setUsers(list);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'users')
      );

      return () => {
        unsubMembers();
        unsubStays();
        unsubTxs();
        unsubPointTxs();
        unsubTiers();
        unsubBenefits();
        unsubRules();
        unsubRewards();
        unsubVouchers();
        unsubPromos();
        unsubWALogs();
        unsubWAPingConfig();
        unsubEmailConfig();
        unsubEmailLogs();
        unsubSettings();
        unsubUsers();
      };
    } catch {
      // Offline fallback
    }
  }, []);

  // Log audit helper
  const logAudit = (action: string, module: string, recordId: string, oldVal?: string, newVal?: string) => {
    if (!currentUser) return;
    const log = createAuditRecord(currentUser, action, module, recordId, oldVal, newVal);
    setAuditLogs((prev) => [log, ...prev]);
  };

  // Add Member
  const addMember = (
    data: Omit<Member, 'id' | 'membershipNumber' | 'totalVisits' | 'totalTransactions' | 'totalSpending' | 'redeemedPoints' | 'totalPointsEarned' | 'availablePoints'> & {
      availablePoints?: number;
      totalPointsEarned?: number;
    }
  ): Member => {
    const newId = `mem_${Date.now()}`;
    const membershipNumber = generateMembershipNumber(members.length);
    const initialPts = data.availablePoints || 0;
    const newMember: Member = {
      totalVisits: 0,
      totalTransactions: 0,
      totalSpending: 0,
      redeemedPoints: 0,
      ...data,
      status: data.status || 'ACTIVE',
      id: newId,
      membershipNumber,
      availablePoints: initialPts,
      totalPointsEarned: data.totalPointsEarned || initialPts,
    };

    setMembers((prev) => [newMember, ...prev]);

    // Save to Firestore for real-time cloud sync
    try {
      setDoc(doc(db, 'members', newId), newMember).catch(() => {});
    } catch {}

    logAudit('CREATE_MEMBER', 'MEMBERS', newId, 'None', `Nama: ${newMember.fullName}, No: ${membershipNumber}`);

    // Create welcoming notification
    const welcomeNotif = createNotificationRecord(
      newId,
      'Selamat Bergabung di Lombok Garden Hotel!',
      `Kartu Digital Membership Anda telah aktif (${membershipNumber}). Nikmati diskon kamar dan poin loyalitas istimewa.`,
      'system'
    );
    setNotifications((prev) => [welcomeNotif, ...prev]);

    // Trigger Welcome Email to member's registered email address
    if (emailConfig.autoSendWelcomeEmail !== false && newMember.email) {
      const currentTier = tiers.find((t) => t.id === newMember.tierId) || tiers[0];
      sendWelcomeEmail(newMember, currentTier, emailConfig)
        .then((log) => {
          addEmailLog(log);
          showToast(`Email sambutan & kartu digital dikirim ke ${newMember.email}`, 'info');
        })
        .catch(() => {});
    }

    // Trigger WhatsApp welcome message via ping.co.id if enabled
    if (whatsappConfig.autoSendWelcomeCard && newMember.phone) {
      const currentTier = tiers.find((t) => t.id === newMember.tierId) || tiers[0];
      const msg = formatWelcomeWhatsApp(newMember, currentTier, whatsappConfig);
      const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://membership.lombokgardenhotel.com';
      sendWhatsAppMessageViaPing(newMember.phone, newMember.fullName, msg, 'welcome', whatsappConfig, {
        event: 'member.created',
        membershipNumber: newMember.membershipNumber,
        fullName: newMember.fullName,
        phone: newMember.phone,
        tier: currentTier.name,
        cardUrl: 'https://member.lombokgardenhotel.com',
        registeredAt: new Date().toISOString(),
      })
        .then((log) => addWhatsAppLog(log))
        .catch(() => {});
    }

    showToast(`Member ${newMember.fullName} (${membershipNumber}) berhasil didaftarkan!`, 'success');
    return newMember;
  };

  // Update Member
  const updateMember = (id: string, updates: Partial<Member>) => {
    const existing = members.find((m) => m.id === id);
    if (!existing) return;

    const updated = members.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setMembers(updated);

    const after = updated.find((m) => m.id === id);
    if (after) {
      refreshMemberData(after);
      try {
        setDoc(doc(db, 'members', id), after).catch(() => {});
      } catch {}
    }

    logAudit('UPDATE_MEMBER', 'MEMBERS', id, JSON.stringify(existing), JSON.stringify(updates));
    showToast('Data member berhasil diperbarui.', 'success');
  };

  // Delete Member (Strictly for SUPER_ADMIN role)
  const deleteMember = (id: string): boolean => {
    if (currentUser?.role !== 'SUPER_ADMIN') {
      showToast('Akses Ditolak: Hanya Super Admin yang memiliki wewenang untuk menghapus data member.', 'error');
      return false;
    }

    const existing = members.find((m) => m.id === id);
    if (!existing) return false;

    // Remove from local and firestore members collection
    setMembers((prev) => prev.filter((m) => m.id !== id));
    try {
      deleteDoc(doc(db, 'members', id)).catch(() => {});
    } catch {}

    // Clean up linked user login credentials if any exist
    const linkedUsers = users.filter((u) => u.memberId === id || u.email.toLowerCase() === existing.email.toLowerCase());
    if (linkedUsers.length > 0) {
      setUsers((prev) => prev.filter((u) => u.memberId !== id && u.email.toLowerCase() !== existing.email.toLowerCase()));
      try {
        linkedUsers.forEach((lu) => {
          deleteDoc(doc(db, 'users', lu.id)).catch(() => {});
        });
      } catch {}
    }

    logAudit(
      'DELETE_MEMBER_PERMANENT',
      'MEMBERS',
      id,
      `Member: ${existing.fullName} (${existing.membershipNumber}), Email: ${existing.email}, HP: ${existing.phone}`,
      'DELETED_BY_SUPER_ADMIN'
    );

    showToast(`Data member ${existing.fullName} (${existing.membershipNumber}) berhasil dihapus permanen.`, 'success');
    return true;
  };

  // Change Tier manually
  const changeMemberTier = (memberId: string, newTierId: string, reason: string) => {
    const member = members.find((m) => m.id === memberId);
    const targetTier = tiers.find((t) => t.id === newTierId);
    if (!member || !targetTier) return;

    const prevTier = tiers.find((t) => t.id === member.tierId);
    const updated = members.map((m) =>
      m.id === memberId ? { ...m, tierId: newTierId } : m
    );
    setMembers(updated);

    const changedMember = updated.find((m) => m.id === memberId);
    if (changedMember) {
      refreshMemberData(changedMember);
      try {
        setDoc(doc(db, 'members', memberId), changedMember).catch(() => {});
      } catch {}
    }

    // Notification
    const notif = createNotificationRecord(
      memberId,
      'Perubahan Tingkat Keanggotaan',
      `Tingkat membership Anda telah diubah menjadi ${targetTier.name}. Alasan: ${reason}`,
      'tier_upgrade'
    );
    setNotifications((prev) => [notif, ...prev]);

    // Trigger WhatsApp tier upgrade notification via ping.co.id
    if (whatsappConfig.autoSendTierUpgrade && member.phone) {
      const msg = formatTierUpgradeWhatsApp(member, targetTier, whatsappConfig);
      sendWhatsAppMessageViaPing(member.phone, member.fullName, msg, 'tier_upgrade', whatsappConfig)
        .then((log) => addWhatsAppLog(log))
        .catch(() => {});
    }

    logAudit(
      'CHANGE_TIER_MANUAL',
      'MEMBERS',
      memberId,
      `Tier Sebelumnya: ${prevTier?.name || '-'}`,
      `Tier Baru: ${targetTier.name}. Alasan: ${reason}`
    );

    showToast(`Tier ${member.fullName} berhasil diubah ke ${targetTier.name}`, 'success');
  };

  // Record Stay
  const recordStay = (data: Omit<Stay, 'id'>): Stay => {
    const newId = `sty_${Date.now()}`;
    const newStay: Stay = {
      ...data,
      id: newId,
    };

    setStays((prev) => [newStay, ...prev]);
    try {
      setDoc(doc(db, 'stays', newId), newStay).catch(() => {});
    } catch {}

    // Update member visit stats
    const member = members.find((m) => m.id === data.memberId);
    if (member) {
      const updatedVisits = member.totalVisits + 1;
      const updatedMembers = members.map((m) =>
        m.id === data.memberId
          ? {
              ...m,
              totalVisits: updatedVisits,
              lastVisitDate: data.checkInDate,
            }
          : m
      );
      setMembers(updatedMembers);
      try {
        const memAfter = updatedMembers.find((m) => m.id === data.memberId);
        if (memAfter) setDoc(doc(db, 'members', data.memberId), memAfter).catch(() => {});
      } catch {}
    }

    logAudit(
      'RECORD_STAY',
      'STAYS',
      newId,
      'None',
      `Booking #${data.bookingNumber}, Kamar ${data.roomNumber} (${data.roomType})`
    );

    showToast(`Reservasi #${data.bookingNumber} kamar ${data.roomNumber} berhasil dicatat.`, 'success');
    return newStay;
  };

  // Update Stay Status
  const updateStayStatus = (stayId: string, status: Stay['status']) => {
    const existing = stays.find((s) => s.id === stayId);
    if (!existing) return;

    const updated = stays.map((s) => (s.id === stayId ? { ...s, status } : s));
    setStays(updated);
    try {
      const updatedStay = updated.find((s) => s.id === stayId);
      if (updatedStay) setDoc(doc(db, 'stays', stayId), updatedStay).catch(() => {});
    } catch {}

    logAudit('UPDATE_STAY_STATUS', 'STAYS', stayId, existing.status, status);
    showToast(`Status reservasi #${existing.bookingNumber} diubah ke ${status}.`, 'info');
  };

  // Record Transaction
  const recordTransaction = (
    data: Omit<Transaction, 'id' | 'pointsEarned'>
  ): { transaction: Transaction; pointsEarned: number; upgradeNotice?: string } => {
    const newTxId = `tx_${Date.now()}`;
    const member = members.find((m) => m.id === data.memberId);
    const tier = tiers.find((t) => t.id === member?.tierId) || tiers[0];

    // Calculate Points
    const calcResult = calculatePointsEarned(
      data.amount,
      tier,
      pointRules,
      promotions
    );

    const newTx: Transaction = {
      ...data,
      id: newTxId,
      pointsEarned: calcResult.totalPoints,
    };

    setTransactions((prev) => [newTx, ...prev]);
    try {
      setDoc(doc(db, 'transactions', newTxId), newTx).catch(() => {});
    } catch {}

    let upgradeNotice: string | undefined;

    if (member) {
      const newTotalSpending = member.totalSpending + data.amount;
      const newTotalTx = member.totalTransactions + 1;
      const newTotalPointsEarned = member.totalPointsEarned + calcResult.totalPoints;
      const newAvailablePoints = member.availablePoints + calcResult.totalPoints;

      // Record point ledger
      const pointTxId = `ptx_${Date.now()}`;
      const pointTx: PointTransaction = {
        id: pointTxId,
        memberId: member.id,
        type: 'earned',
        amount: calcResult.totalPoints,
        balanceAfter: newAvailablePoints,
        description: `Perolehan poin dari transaksi ${data.category.toUpperCase()} #${data.transactionNumber}`,
        staffName: data.staffName || currentUser?.name || 'Front Desk',
        createdAt: new Date().toISOString(),
      };
      setPointTransactions((prev) => [pointTx, ...prev]);
      try {
        setDoc(doc(db, 'point_transactions', pointTxId), pointTx).catch(() => {});
      } catch {}

      // Check Dynamic Rules for Tier Upgrade
      const tempMember: Member = {
        ...member,
        totalSpending: newTotalSpending,
        totalTransactions: newTotalTx,
        totalPointsEarned: newTotalPointsEarned,
        availablePoints: newAvailablePoints,
      };

      const ruleEval = evaluateMemberTierRules(tempMember, tiers, rules, systemSettings.autoUpgradeEnabled);
      let finalTierId = member.tierId;

      if (ruleEval.upgraded && ruleEval.newTier) {
        finalTierId = ruleEval.newTier.id;
        const newTier = ruleEval.newTier;
        upgradeNotice = `Selamat! Member ${member.fullName} memenuhi syarat naik ke tingkat ${newTier.name}.`;

        const tierNotif = createNotificationRecord(
          member.id,
          'Selamat! Tingkat Membership Anda Naik 🎉',
          `Akumulasi belanja Anda telah mencapai tingkat ${newTier.name}. Nikmati diskon ekstra dan pengganda poin lebih tinggi!`,
          'tier_upgrade'
        );
        setNotifications((prev) => [tierNotif, ...prev]);

        // Trigger WhatsApp tier upgrade notification
        if (whatsappConfig.autoSendTierUpgrade && member.phone) {
          const waMsg = formatTierUpgradeWhatsApp(member, newTier, whatsappConfig);
          sendWhatsAppMessageViaPing(member.phone, member.fullName, waMsg, 'tier_upgrade', whatsappConfig)
            .then((log) => addWhatsAppLog(log))
            .catch(() => {});
        }
      }

      const updatedMembers = members.map((m) =>
        m.id === member.id
          ? {
              ...m,
              totalSpending: newTotalSpending,
              totalTransactions: newTotalTx,
              totalPointsEarned: newTotalPointsEarned,
              availablePoints: newAvailablePoints,
              tierId: finalTierId,
            }
          : m
      );

      setMembers(updatedMembers);
      const updatedActiveMember = updatedMembers.find((m) => m.id === member.id);
      if (updatedActiveMember) {
        refreshMemberData(updatedActiveMember);
        try {
          setDoc(doc(db, 'members', member.id), updatedActiveMember).catch(() => {});
        } catch {}
      }

      // Trigger WhatsApp points notification via ping.co.id
      if (whatsappConfig.autoSendPointUpdate && member.phone) {
        const pointsMsg = formatPointsWhatsApp(
          updatedActiveMember || tempMember,
          formatIDR(data.amount),
          calcResult.totalPoints,
          whatsappConfig
        );
        sendWhatsAppMessageViaPing(
          member.phone,
          member.fullName,
          pointsMsg,
          'point_update',
          whatsappConfig,
          {
            event: 'points.earned',
            transactionId: newTxId,
            membershipNumber: member.membershipNumber,
            fullName: member.fullName,
            phone: member.phone,
            billAmount: data.amount,
            billAmountFormatted: formatIDR(data.amount),
            pointsEarned: calcResult.totalPoints,
            totalPoints: newAvailablePoints,
            outlet: `${data.category.toUpperCase()} #${data.transactionNumber}`,
          }
        )
          .then((log) => addWhatsAppLog(log))
          .catch(() => {});
      }
    }

    logAudit(
      'RECORD_TRANSACTION',
      'BILLING',
      newTxId,
      'None',
      `Nominal: Rp ${data.amount.toLocaleString('id-ID')}, Kategori: ${data.category}, Poin: +${calcResult.totalPoints}`
    );

    showToast(
      `Transaksi Rp ${data.amount.toLocaleString('id-ID')} dicatat. Poin: +${calcResult.totalPoints}`,
      'success'
    );

    return { transaction: newTx, pointsEarned: calcResult.totalPoints, upgradeNotice };
  };

  // Adjust Points
  const adjustPoints = (memberId: string, amount: number, isAddition: boolean, reason: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const diff = isAddition ? amount : -amount;
    const newBalance = Math.max(0, member.availablePoints + diff);
    const newTotalEarned = isAddition ? member.totalPointsEarned + amount : member.totalPointsEarned;
    const newRedeemed = !isAddition ? member.redeemedPoints + amount : member.redeemedPoints;

    const pointTxId = `ptx_${Date.now()}`;
    const pointTx: PointTransaction = {
      id: pointTxId,
      memberId: member.id,
      type: isAddition ? 'adjusted_add' : 'adjusted_sub',
      amount: diff,
      balanceAfter: newBalance,
      description: `Penyesuaian manual (${isAddition ? 'Penambahan' : 'Pengurangan'}): ${reason}`,
      staffName: currentUser?.name || 'Administrator',
      createdAt: new Date().toISOString(),
    };
    setPointTransactions((prev) => [pointTx, ...prev]);
    try {
      setDoc(doc(db, 'point_transactions', pointTxId), pointTx).catch(() => {});
    } catch {}

    const updatedMembers = members.map((m) =>
      m.id === memberId
        ? {
            ...m,
            availablePoints: newBalance,
            totalPointsEarned: newTotalEarned,
            redeemedPoints: newRedeemed,
          }
        : m
    );
    setMembers(updatedMembers);

    const changedMember = updatedMembers.find((m) => m.id === memberId);
    if (changedMember) {
      refreshMemberData(changedMember);
      try {
        setDoc(doc(db, 'members', memberId), changedMember).catch(() => {});
      } catch {}
    }

    logAudit(
      'ADJUST_POINTS',
      'POINTS',
      memberId,
      `Saldo sebelumnya: ${member.availablePoints} pts`,
      `${isAddition ? '+' : '-'}${amount} pts. Saldo baru: ${newBalance} pts. Alasan: ${reason}`
    );

    showToast(`Poin ${member.fullName} berhasil disesuaikan (${isAddition ? '+' : '-'}${amount} Poin).`, 'success');
  };

  // Redeem Reward
  const redeemReward = (memberId: string, rewardId: string) => {
    const member = members.find((m) => m.id === memberId);
    const reward = rewards.find((r) => r.id === rewardId);

    if (!member || !reward) return { success: false, message: 'Data tidak ditemukan' };
    if (member.availablePoints < reward.pointsRequired) {
      return { success: false, message: 'Poin Anda tidak mencukupi untuk reward ini' };
    }
    if (reward.stock !== undefined && reward.stock <= 0) {
      return { success: false, message: 'Stok reward ini sedang habis' };
    }

    const redemptionCode = `RDM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newBalance = member.availablePoints - reward.pointsRequired;

    // Deduct points ledger
    const pointTx: PointTransaction = {
      id: `ptx_${Date.now()}`,
      memberId: member.id,
      type: 'redeemed',
      amount: -reward.pointsRequired,
      balanceAfter: newBalance,
      description: `Penukaran reward: ${reward.title} (Kode: ${redemptionCode})`,
      staffName: currentUser?.name || 'Member Portal',
      createdAt: new Date().toISOString(),
    };
    setPointTransactions((prev) => [pointTx, ...prev]);

    // Record Redemption
    const newRedemption: RewardRedemption = {
      id: `rdm_${Date.now()}`,
      memberId: member.id,
      rewardId: reward.id,
      rewardTitle: reward.title,
      pointsSpent: reward.pointsRequired,
      redeemedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'issued',
      redemptionCode,
    };
    setRedemptions((prev) => [newRedemption, ...prev]);

    // Update reward stock
    if (reward.stock !== undefined) {
      setRewards((prev) =>
        prev.map((r) => (r.id === rewardId ? { ...r, stock: r.stock - 1 } : r))
      );
    }

    // Update Member
    const updatedMembers = members.map((m) =>
      m.id === memberId
        ? {
            ...m,
            availablePoints: newBalance,
            redeemedPoints: m.redeemedPoints + reward.pointsRequired,
          }
        : m
    );
    setMembers(updatedMembers);
    const changed = updatedMembers.find((m) => m.id === memberId);
    if (changed) {
      refreshMemberData(changed);
      try {
        setDoc(doc(db, 'members', memberId), changed).catch(() => {});
      } catch {}
    }

    logAudit('REDEEM_REWARD', 'REWARDS', rewardId, `${reward.pointsRequired} pts`, `Kode: ${redemptionCode}`);
    showToast(`Berhasil menukarkan reward "${reward.title}"! Kode: ${redemptionCode}`, 'success');

    return { success: true, message: 'Reward berhasil ditukarkan', code: redemptionCode };
  };

  // Claim Voucher
  const claimVoucher = (memberId: string, voucherId: string) => {
    const member = members.find((m) => m.id === memberId);
    const voucher = vouchers.find((v) => v.id === voucherId);

    if (!member || !voucher) return { success: false, message: 'Data tidak ditemukan' };

    const newVoucherRedemption: VoucherRedemption = {
      id: `vrdm_${Date.now()}`,
      memberId: member.id,
      voucherId: voucher.id,
      voucherCode: voucher.code,
      discountApplied: voucher.discountValue,
      claimedAt: new Date().toISOString(),
      status: 'available',
    };

    setVoucherRedemptions((prev) => [newVoucherRedemption, ...prev]);
    try {
      setDoc(doc(db, 'voucher_redemptions', newVoucherRedemption.id), newVoucherRedemption).catch(() => {});
    } catch {}
    showToast(`Voucher "${voucher.title}" berhasil diklaim! Kode: ${voucher.code}`, 'success');
    return { success: true, message: 'Voucher berhasil diklaim' };
  };

  // Use Voucher (Classic)
  const useVoucher = (redemptionId: string) => {
    const updated = voucherRedemptions.map((r) =>
      r.id === redemptionId ? { ...r, status: 'used' as const, usedAt: new Date().toISOString() } : r
    );
    setVoucherRedemptions(updated);
    try {
      const item = updated.find((r) => r.id === redemptionId);
      if (item) setDoc(doc(db, 'voucher_redemptions', redemptionId), item).catch(() => {});
    } catch {}
    showToast('Voucher berhasil digunakan pada transaksi.', 'success');
  };

  // Verify Voucher By Barcode/Code
  const verifyVoucherByBarcode = (barcodeOrCode: string): VerifyVoucherResult => {
    const raw = (barcodeOrCode || '').trim();
    if (!raw) {
      return { isValid: false, status: 'not_found' as const, message: 'Kode barcode kosong.' };
    }

    let searchCode = raw;
    let extractedMemberId: string | undefined = undefined;
    let extractedVoucherId: string | undefined = undefined;

    try {
      if (raw.startsWith('{') && raw.endsWith('}')) {
        const parsed = JSON.parse(raw);
        searchCode = parsed.code || parsed.voucherCode || parsed.id || raw;
        extractedMemberId = parsed.memberId || parsed.member_id;
        extractedVoucherId = parsed.voucherId || parsed.voucher_id || parsed.id;
      } else if (raw.includes(':')) {
        const parts = raw.split(':');
        if (parts.length >= 3 && (parts[0] === 'VCH' || parts[0] === 'VOUCHER')) {
          searchCode = parts[1];
          extractedMemberId = parts[2];
        } else if (parts.length === 2) {
          searchCode = parts[0];
          extractedMemberId = parts[1];
        }
      }
    } catch {}

    const codeUpper = searchCode.toUpperCase();
    const explicitMember = extractedMemberId
      ? members.find((m) => m.id === extractedMemberId || m.membershipNumber === extractedMemberId)
      : undefined;

    // 1. Check in voucherRedemptions (by claim ID or voucherCode)
    const existingClaim = voucherRedemptions.find((vr) => {
      if (extractedMemberId && vr.memberId === extractedMemberId) {
        if (vr.id.toUpperCase() === codeUpper || vr.voucherCode.toUpperCase() === codeUpper) return true;
        if (extractedVoucherId && vr.voucherId === extractedVoucherId) return true;
      }
      return vr.id.toUpperCase() === codeUpper || vr.voucherCode.toUpperCase() === codeUpper;
    });

    if (existingClaim) {
      const voucher = vouchers.find((v) => v.id === existingClaim.voucherId) || {
        id: existingClaim.voucherId,
        code: existingClaim.voucherCode,
        title: `Voucher Promosi (${existingClaim.voucherCode})`,
        description: 'Voucher Promosi Eksklusif Lombok Garden Hotel',
        type: 'fixed' as const,
        discountValue: existingClaim.discountApplied,
        minTransaction: 0,
        maxDiscount: existingClaim.discountApplied,
        startDate: existingClaim.claimedAt,
        expiryDate: '2026-12-31',
        usageLimit: 1,
        usedCount: 1,
        perMemberLimit: 1,
        applicableTierIds: [],
        status: 'active' as const,
      };

      const member = explicitMember || members.find((m) => m.id === existingClaim.memberId);

      if (existingClaim.status === 'used') {
        const usedDateStr = existingClaim.usedAt ? formatDateIndo(existingClaim.usedAt.slice(0, 10)) : 'sebelumnya';
        return {
          isValid: false,
          status: 'used' as const,
          voucher,
          member,
          redemption: existingClaim,
          message: `Voucher "${voucher.title}" SUDAH PERNAH DIGUNAKAN pada ${usedDateStr}${existingClaim.outlet ? ` di ${existingClaim.outlet}` : ''}${existingClaim.redeemedByStaffName ? ` oleh ${existingClaim.redeemedByStaffName}` : ''}.`,
        };
      }

      return {
        isValid: true,
        status: 'available' as const,
        voucher,
        member,
        redemption: existingClaim,
        message: `Voucher valid terdeteksi: "${voucher.title}" milik tamu ${member?.fullName || 'Tamu'}.`,
      };
    }

    // 2. Check in redemptions (Poin Reward)
    const existingReward = redemptions.find((r) => {
      if (extractedMemberId && r.memberId === extractedMemberId) {
        if (r.id.toUpperCase() === codeUpper || r.redemptionCode.toUpperCase() === codeUpper) return true;
      }
      return r.id.toUpperCase() === codeUpper || r.redemptionCode.toUpperCase() === codeUpper;
    });

    if (existingReward) {
      const member = explicitMember || members.find((m) => m.id === existingReward.memberId);
      const pseudoVoucher: Voucher = {
        id: existingReward.rewardId,
        code: existingReward.redemptionCode,
        title: existingReward.rewardTitle,
        description: `Reward Poin Loyalitas (${existingReward.pointsSpent} Poin)`,
        type: 'complimentary',
        discountValue: 0,
        minTransaction: 0,
        maxDiscount: 0,
        startDate: existingReward.redeemedAt,
        expiryDate: existingReward.expiresAt,
        usageLimit: 1,
        usedCount: existingReward.status === 'used' ? 1 : 0,
        perMemberLimit: 1,
        applicableTierIds: [],
        status: 'active',
      };

      if (existingReward.status === 'used') {
        const usedDateStr = existingReward.usedAt ? formatDateIndo(existingReward.usedAt.slice(0, 10)) : 'sebelumnya';
        return {
          isValid: false,
          status: 'used' as const,
          voucher: pseudoVoucher,
          member,
          rewardRedemption: existingReward,
          message: `Reward Voucher "${existingReward.rewardTitle}" SUDAH DIGUNAKAN pada ${usedDateStr}.`,
        };
      }

      return {
        isValid: true,
        status: 'available' as const,
        voucher: pseudoVoucher,
        member,
        rewardRedemption: existingReward,
        message: `Reward Voucher valid: "${existingReward.rewardTitle}" (${existingReward.redemptionCode}) milik ${member?.fullName || 'Tamu'}.`,
      };
    }

    // 3. Check in master vouchers by promo code or ID
    const masterVoucher = vouchers.find(
      (v) => v.code.toUpperCase() === codeUpper || v.id.toUpperCase() === codeUpper || (extractedVoucherId && v.id === extractedVoucherId)
    );

    if (masterVoucher) {
      const member = explicitMember;

      // Check if this member has already used this master voucher
      if (member) {
        const alreadyUsed = voucherRedemptions.find(
          (vr) =>
            vr.memberId === member.id &&
            (vr.voucherId === masterVoucher.id || vr.voucherCode.toUpperCase() === masterVoucher.code.toUpperCase()) &&
            vr.status === 'used'
        );

        if (alreadyUsed) {
          const usedDateStr = alreadyUsed.usedAt ? formatDateIndo(alreadyUsed.usedAt.slice(0, 10)) : 'sebelumnya';
          return {
            isValid: false,
            status: 'used' as const,
            voucher: masterVoucher,
            member,
            redemption: alreadyUsed,
            message: `Voucher "${masterVoucher.title}" SUDAH PERNAH DIGUNAKAN oleh ${member.fullName} pada ${usedDateStr}.`,
          };
        }
      }

      if (masterVoucher.status !== 'active') {
        return {
          isValid: false,
          status: 'expired' as const,
          voucher: masterVoucher,
          member,
          message: `Voucher "${masterVoucher.title}" saat ini berstatus ${masterVoucher.status}.`,
        };
      }

      return {
        isValid: true,
        status: 'available' as const,
        voucher: masterVoucher,
        member,
        message: `Kupon Promosi "${masterVoucher.title}" (${masterVoucher.code}) siap diredeem${member ? ` untuk ${member.fullName}` : ''}.`,
      };
    }

    return {
      isValid: false,
      status: 'not_found' as const,
      message: `Kode voucher atau barcode "${raw}" tidak ditemukan pada daftar voucher hotel.`,
    };
  };

  // Redeem Voucher By Barcode/Code
  const redeemVoucherByBarcode = (
    barcodeOrCode: string,
    staffInfo: { name: string; role?: string; outlet?: string; transactionNumber?: string; notes?: string }
  ) => {
    const verified = verifyVoucherByBarcode(barcodeOrCode);
    if (!verified.isValid) {
      showToast(verified.message, 'error');
      return {
        success: false,
        message: verified.message,
        voucher: verified.voucher,
        member: verified.member,
        redemption: verified.redemption,
        errorReason: verified.status === 'used' ? 'ALREADY_USED' : 'INVALID_CODE',
      };
    }

    const now = new Date().toISOString();
    const outlet = staffInfo.outlet || 'Front Desk';
    const staffName = staffInfo.name || 'Staff Front Desk';
    const staffRole = staffInfo.role || 'Staff FO/FB';

    // A. Existing Claim in voucherRedemptions
    if (verified.redemption) {
      const redId = verified.redemption.id;
      const updatedItem: VoucherRedemption = {
        ...verified.redemption,
        status: 'used',
        usedAt: now,
        transactionNumber: staffInfo.transactionNumber || verified.redemption.transactionNumber,
        redeemedByStaffName: staffName,
        redeemedByStaffRole: staffRole,
        outlet,
        notes: staffInfo.notes || verified.redemption.notes || `Redeem via Barcode Scan di ${outlet}`,
      };

      setVoucherRedemptions((prev) =>
        prev.map((r) => (r.id === redId ? updatedItem : r))
      );

      // Increment voucher usedCount
      if (verified.voucher) {
        setVouchers((prev) =>
          prev.map((v) => (v.id === verified.voucher?.id ? { ...v, usedCount: (v.usedCount || 0) + 1 } : v))
        );
      }

      // Sync to Firestore
      try {
        setDoc(doc(db, 'voucher_redemptions', redId), updatedItem).catch(() => {});
        if (verified.voucher) {
          setDoc(doc(db, 'vouchers', verified.voucher.id), {
            ...verified.voucher,
            usedCount: (verified.voucher.usedCount || 0) + 1,
          }).catch(() => {});
        }
      } catch {}

      // Log Audit
      logAudit(
        'REDEEM_VOUCHER_BARCODE',
        'VOUCHER_ENGINE',
        redId,
        `Staff: ${staffName} (${outlet})`,
        `Voucher: ${verified.voucher?.code || redId} - ${verified.voucher?.title}`
      );

      if (verified.member) {
        const notif = createNotificationRecord(
          verified.member.id,
          'Voucher Berhasil Digunakan',
          `Voucher "${verified.voucher?.title}" berhasil digunakan di ${outlet} pada ${formatDateIndo(now.slice(0, 10))}.`,
          'voucher'
        );
        setNotifications((prev) => [notif, ...prev]);
      }

      showToast(`Voucher "${verified.voucher?.title}" BERHASIL DIREDEEM di ${outlet}!`, 'success');
      return {
        success: true,
        message: `Voucher berhasil diredeem untuk ${verified.member?.fullName || 'Tamu'}.`,
        voucher: verified.voucher,
        member: verified.member,
        redemption: updatedItem,
      };
    }

    // B. Reward Redemption from points
    if (verified.rewardRedemption) {
      const rewId = verified.rewardRedemption.id;
      const updatedReward: RewardRedemption = {
        ...verified.rewardRedemption,
        status: 'used',
        usedAt: now,
        notes: staffInfo.notes || `Redeem via Barcode di ${outlet} oleh ${staffName}`,
      };

      setRedemptions((prev) =>
        prev.map((r) => (r.id === rewId ? updatedReward : r))
      );

      try {
        setDoc(doc(db, 'reward_redemptions', rewId), updatedReward).catch(() => {});
      } catch {}

      logAudit(
        'REDEEM_REWARD_BARCODE',
        'REWARDS',
        rewId,
        `Staff: ${staffName} (${outlet})`,
        `Reward: ${verified.rewardRedemption.rewardTitle}`
      );

      showToast(`Reward Voucher "${verified.rewardRedemption.rewardTitle}" BERHASIL DIREDEEM!`, 'success');
      return {
        success: true,
        message: 'Reward voucher berhasil diverifikasi dan digunakan.',
        voucher: verified.voucher,
        member: verified.member,
        rewardRedemption: updatedReward,
      };
    }

    // C. Master Voucher direct claim & redeem
    if (verified.voucher) {
      const v = verified.voucher;
      const targetMemberId = verified.member?.id || 'mem_john_doe';
      const newRedemption: VoucherRedemption = {
        id: `vrdm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        memberId: targetMemberId,
        voucherId: v.id,
        voucherCode: v.code,
        discountApplied: v.discountValue,
        claimedAt: now,
        status: 'used',
        usedAt: now,
        transactionNumber: staffInfo.transactionNumber,
        redeemedByStaffName: staffName,
        redeemedByStaffRole: staffRole,
        outlet,
        notes: staffInfo.notes || `Redeem langsung via Barcode di ${outlet}`,
      };

      // Also update any existing available claim for this member & voucher
      setVoucherRedemptions((prev) => {
        const hasExisting = prev.some(
          (r) => r.memberId === targetMemberId && (r.voucherId === v.id || r.voucherCode === v.code)
        );
        if (hasExisting) {
          return prev.map((r) =>
            r.memberId === targetMemberId && (r.voucherId === v.id || r.voucherCode === v.code)
              ? { ...r, status: 'used', usedAt: now, redeemedByStaffName: staffName, outlet, notes: newRedemption.notes }
              : r
          );
        }
        return [newRedemption, ...prev];
      });

      setVouchers((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, usedCount: (item.usedCount || 0) + 1 } : item))
      );

      try {
        setDoc(doc(db, 'voucher_redemptions', newRedemption.id), newRedemption).catch(() => {});
        setDoc(doc(db, 'vouchers', v.id), { ...v, usedCount: (v.usedCount || 0) + 1 }).catch(() => {});
      } catch {}

      logAudit(
        'REDEEM_VOUCHER_BARCODE',
        'VOUCHER_ENGINE',
        newRedemption.id,
        `Staff: ${staffName} (${outlet})`,
        `Voucher: ${v.code} - ${v.title} untuk Member: ${targetMemberId}`
      );

      const targetMemberObj = members.find((m) => m.id === targetMemberId) || verified.member;
      if (targetMemberObj) {
        const notif = createNotificationRecord(
          targetMemberObj.id,
          'Voucher Berhasil Digunakan',
          `Voucher "${v.title}" (${v.code}) berhasil digunakan di ${outlet} pada ${formatDateIndo(now.slice(0, 10))}.`,
          'voucher'
        );
        setNotifications((prev) => [notif, ...prev]);
      }

      showToast(`Voucher "${v.title}" BERHASIL DIREDEEM di ${outlet}!`, 'success');
      return {
        success: true,
        message: `Voucher berhasil diredeem.`,
        voucher: v,
        member: targetMemberObj,
        redemption: newRedemption,
      };
    }

    return {
      success: false,
      message: 'Gagal memproses voucher.',
    };
  };

  // Tier Management
  const saveTier = (tier: MembershipTier) => {
    setTiers((prev) => {
      const exists = prev.some((t) => t.id === tier.id);
      return exists ? prev.map((t) => (t.id === tier.id ? tier : t)) : [...prev, tier];
    });
    try {
      setDoc(doc(db, 'membership_tiers', tier.id), tier).catch(() => {});
    } catch {}
    logAudit('SAVE_TIER', 'TIERS', tier.id, 'None', JSON.stringify(tier));
    showToast(`Tier ${tier.name} berhasil disimpan ke database.`, 'success');
  };

  const deleteTier = (id: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
    try {
      deleteDoc(doc(db, 'membership_tiers', id)).catch(() => {});
    } catch {}
    logAudit('DELETE_TIER', 'TIERS', id, 'None', 'DELETED');
    showToast('Tier berhasil dihapus.', 'info');
  };

  // Benefit Management
  const saveBenefit = (benefit: MembershipBenefit) => {
    setBenefits((prev) => {
      const exists = prev.some((b) => b.id === benefit.id);
      return exists ? prev.map((b) => (b.id === benefit.id ? benefit : b)) : [...prev, benefit];
    });
    try {
      setDoc(doc(db, 'membership_benefits', benefit.id), benefit).catch(() => {});
    } catch {}
    showToast(`Benefit "${benefit.name}" berhasil disimpan ke database.`, 'success');
  };

  const deleteBenefit = (id: string) => {
    setBenefits((prev) => prev.filter((b) => b.id !== id));
    try {
      deleteDoc(doc(db, 'membership_benefits', id)).catch(() => {});
    } catch {}
    showToast('Benefit berhasil dihapus.', 'info');
  };

  // Rule Management
  const saveRule = (rule: MembershipRule) => {
    setRules((prev) => {
      const exists = prev.some((r) => r.id === rule.id);
      return exists ? prev.map((r) => (r.id === rule.id ? rule : r)) : [...prev, rule];
    });
    try {
      setDoc(doc(db, 'membership_rules', rule.id), rule).catch(() => {});
    } catch {}
    logAudit('SAVE_RULE', 'RULE_ENGINE', rule.id, 'None', JSON.stringify(rule));
    showToast(`Aturan evaluasi "${rule.name}" berhasil disimpan.`, 'success');
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    try {
      deleteDoc(doc(db, 'membership_rules', id)).catch(() => {});
    } catch {}
    logAudit('DELETE_RULE', 'RULE_ENGINE', id, 'None', 'DELETED');
    showToast('Aturan berhasil dihapus.', 'info');
  };

  // Reward Management
  const saveReward = (reward: Reward) => {
    setRewards((prev) => {
      const exists = prev.some((r) => r.id === reward.id);
      return exists ? prev.map((r) => (r.id === reward.id ? reward : r)) : [...prev, reward];
    });
    try {
      setDoc(doc(db, 'rewards', reward.id), reward).catch(() => {});
    } catch {}
    showToast(`Reward "${reward.title}" berhasil disimpan ke database.`, 'success');
  };

  const deleteReward = (id: string) => {
    setRewards((prev) => prev.filter((r) => r.id !== id));
    try {
      deleteDoc(doc(db, 'rewards', id)).catch(() => {});
    } catch {}
    showToast('Reward berhasil dihapus.', 'info');
  };

  // Voucher Management
  const validateVoucherCreationData = (voucher: Partial<Voucher>, editingId?: string): VoucherValidationResult => {
    return validateVoucherCreation(voucher, vouchers, editingId);
  };

  const validateVoucherRuleEvaluation = (
    voucher: Voucher,
    params: VoucherRuleEvaluationParams
  ): VoucherRuleEvaluationResult => {
    return validateVoucherRule(voucher, params);
  };

  const saveVoucher = (voucher: Voucher) => {
    // Validate voucher before saving
    const validation = validateVoucherCreation(voucher, vouchers, voucher.id);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0] || 'Voucher tidak valid.';
      showToast(`Gagal menyimpan: ${firstError}`, 'error');
      return;
    }

    setVouchers((prev) => {
      const exists = prev.some((v) => v.id === voucher.id);
      return exists ? prev.map((v) => (v.id === voucher.id ? voucher : v)) : [...prev, voucher];
    });
    try {
      setDoc(doc(db, 'vouchers', voucher.id), voucher).catch(() => {});
    } catch {}
    showToast(`Voucher "${voucher.title}" (${voucher.code}) berhasil disimpan.`, 'success');
  };

  const deleteVoucher = (id: string) => {
    setVouchers((prev) => prev.filter((v) => v.id !== id));
    try {
      deleteDoc(doc(db, 'vouchers', id)).catch(() => {});
    } catch {}
    showToast('Voucher berhasil dihapus.', 'info');
  };

  // Promotion Management
  const savePromotion = (promo: PromotionCampaign) => {
    setPromotions((prev) => {
      const exists = prev.some((p) => p.id === promo.id);
      return exists ? prev.map((p) => (p.id === promo.id ? promo : p)) : [...prev, promo];
    });
    try {
      setDoc(doc(db, 'promotions', promo.id), promo).catch(() => {});
    } catch {}
    showToast(`Kampanye promosi "${promo.title}" disimpan ke database.`, 'success');
  };

  const deletePromotion = (id: string) => {
    setPromotions((prev) => prev.filter((p) => p.id !== id));
    try {
      deleteDoc(doc(db, 'promotions', id)).catch(() => {});
    } catch {}
    showToast('Kampanye promosi berhasil dihapus.', 'info');
  };

  // Point Rules & Settings
  const savePointRules = (newRules: PointRuleConfig) => {
    setPointRules(newRules);
    try {
      setDoc(doc(db, 'system_settings', 'point_rules'), newRules).catch(() => {});
    } catch {}
    logAudit('UPDATE_POINT_RULES', 'POINTS', 'config', JSON.stringify(pointRules), JSON.stringify(newRules));
    showToast('Konfigurasi perolehan poin global berhasil disimpan ke database.', 'success');
  };

  const updateSystemSettings = (settings: Partial<HotelSystemSettings>) => {
    setSystemSettings((prev) => {
      const updated = { ...prev, ...settings };
      try {
        setDoc(doc(db, 'system_settings', 'hotel_settings'), updated).catch(() => {});
      } catch {}
      return updated;
    });
    logAudit('UPDATE_SETTINGS', 'SYSTEM', 'global_settings', JSON.stringify(systemSettings), JSON.stringify(settings));
    showToast('Pengaturan global properti berhasil diperbarui di database.', 'success');
  };

  const updateWhatsAppConfig = (config: Partial<PingCoIdWhatsAppConfig>) => {
    setWhatsappConfig((prev) => {
      const updated = { ...prev, ...config, lastCheckedAt: new Date().toISOString() };
      try {
        setDoc(doc(db, 'system_settings', 'whatsapp_ping'), updated).catch(() => {});
      } catch {}
      return updated;
    });
    logAudit('UPDATE_WHATSAPP_CONFIG', 'GATEWAY', 'ping.co.id', 'Updated', JSON.stringify(config));
  };

  const addWhatsAppLog = (log: WhatsAppMessageLog) => {
    setWhatsappLogs((prev) => [log, ...prev]);
    try {
      setDoc(doc(db, 'whatsapp_logs', log.id), log).catch(() => {});
    } catch {}
  };

  // Email System Configuration (Super Admin Settings)
  const updateEmailConfig = (config: Partial<EmailSystemConfig>) => {
    setEmailConfig((prev) => {
      const updated = { ...prev, ...config };
      try {
        setDoc(doc(db, 'system_settings', 'email_config'), updated).catch(() => {});
      } catch {}
      // Also update backend server config
      apiFetch('/api/email/config', {
        method: 'POST',
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
    logAudit('UPDATE_EMAIL_CONFIG', 'GATEWAY', config.defaultSenderEmail || 'Email System', 'Updated', JSON.stringify(config));
    showToast('Pengaturan email pengirim & SMTP berhasil disimpan.', 'success');
  };

  const addEmailLog = (log: EmailMessageLog) => {
    setEmailLogs((prev) => [log, ...prev]);
    try {
      setDoc(doc(db, 'email_logs', log.id), log).catch(() => {});
    } catch {}
  };

  const sendTestEmailToRecipient = async (recipientEmail: string): Promise<{ success: boolean; message: string }> => {
    const result = await testEmailConnection(emailConfig, recipientEmail);
    if (result.log) {
      addEmailLog(result.log);
    }
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
    return result;
  };

  const resendEmailNotification = async (logId: string): Promise<{ success: boolean; message: string }> => {
    const result = await resendDispatchedEmail(logId, emailConfig);
    if (result.log) {
      setEmailLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, ...result.log } : l))
      );
      try {
        setDoc(doc(db, 'email_logs', logId), result.log).catch(() => {});
      } catch {}
    }
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
    return result;
  };

  const clearEmailLogs = async (): Promise<boolean> => {
    const ok = await clearServerEmailLogs();
    setEmailLogs([]);
    showToast('Seluruh riwayat log pengiriman email berhasil dibersihkan.', 'info');
    return ok;
  };

  const sendMemberNotificationEmail = async (
    recipientEmail: string,
    recipientName: string,
    subject: string,
    messageText: string,
    membershipNumber?: string
  ): Promise<EmailMessageLog> => {
    const log = await sendMemberCustomNotificationEmail(
      recipientEmail,
      recipientName,
      subject,
      messageText,
      emailConfig,
      membershipNumber
    );
    addEmailLog(log);
    showToast(`Notifikasi email berhasil dikirim ke ${recipientEmail}`, 'success');
    return log;
  };

  const sendMemberTierUpgradeEmail = async (
    member: Member,
    oldTier: MembershipTier,
    newTier: MembershipTier
  ): Promise<EmailMessageLog> => {
    const log = await sendTierUpgradeEmail(member, oldTier, newTier, emailConfig);
    addEmailLog(log);
    showToast(`Email notifikasi kenaikan tier (${newTier.name}) dikirim ke ${member.email}`, 'success');
    return log;
  };

  const sendMemberPointsEmail = async (
    member: Member,
    pointsChange: number,
    currentBalance: number,
    activityName: string
  ): Promise<EmailMessageLog> => {
    const log = await sendPointUpdateEmail(member, pointsChange, currentBalance, activityName, emailConfig);
    addEmailLog(log);
    showToast(`Email update poin dikirim ke ${member.email}`, 'info');
    return log;
  };

  // Role Permissions
  const updateRolePermissions = (roleId: string, permissions: PermissionCode[]) => {
    let updatedTargetRole: Role | null = null;
    const updatedRoles = roles.map((r) => {
      if (r.id === roleId || r.code === roleId) {
        updatedTargetRole = { ...r, permissions };
        return updatedTargetRole;
      }
      return r;
    });

    setRoles(updatedRoles);
    saveToStorage('roles', updatedRoles);

    // Call AuthContext update so session and hasPermission immediately update
    authUpdateRolePermissions(roleId, permissions);

    if (updatedTargetRole) {
      try {
        setDoc(doc(db, 'roles', (updatedTargetRole as Role).id), cleanFirestoreData(updatedTargetRole), { merge: true }).catch((err) => {
          console.warn('[FIRESTORE ROLES SYNC ERROR]', err);
        });
      } catch {}
    }

    logAudit('UPDATE_ROLE_PERMISSIONS', 'SECURITY', roleId, 'Previous permissions', `${permissions.length} permissions updated`);
    showToast(`Matriks izin peran "${updatedTargetRole ? (updatedTargetRole as Role).name : roleId}" berhasil diperbarui dan diterapkan ke seluruh pengguna.`, 'success');
  };

  // User Management
  const saveUser = async (user: User) => {
    const cleaned = cleanFirestoreData(user);
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      const updated = exists ? prev.map((u) => (u.id === user.id ? user : u)) : [...prev, user];
      saveToStorage('users', updated);
      return updated;
    });

    // Update AuthContext session & user list
    updateAdministrator(user.id, user);

    try {
      await setDoc(doc(db, 'users', user.id), cleaned, { merge: true });
    } catch (err) {
      console.warn('[FIRESTORE USER SYNC ERROR]', err);
    }
    logAudit('SAVE_USER', 'USERS', user.id, 'None', `User: ${user.name} (${user.email}) [Peran: ${user.role}]`);
    showToast(`Akun "${user.name}" (${user.role}) berhasil disimpan. Hak akses langsung aktif.`, 'success');
  };

  const deleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.warn('[FIRESTORE USER DELETE ERROR]', err);
    }
    logAudit('DELETE_USER', 'USERS', userId, 'None', 'DELETED');
    showToast('Akun staf berhasil dihapus dari database cloud.', 'info');
  };

  // Force Full Sync to Cloud
  const forceSyncToCloud = async (): Promise<boolean> => {
    const res = await pushAllToFirestore({
      members,
      tiers,
      benefits,
      rules,
      stays,
      transactions,
      pointTransactions,
      rewards,
      vouchers,
      promotions,
      systemSettings,
      users,
      roles,
    });
    return res.success;
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast('Semua notifikasi ditandai telah dibaca.', 'info');
  };

  // Reset Data Granular & Total
  const resetMembersData = () => {
    setMembers([]);
    setPointTransactions([]);
    setRedemptions([]);
    setVoucherRedemptions([]);
    saveToStorage('members', []);
    saveToStorage('pointTransactions', []);
    saveToStorage('redemptions', []);
    saveToStorage('voucherRedemptions', []);
    clearFirestoreMembersAndTransactions().catch(() => {});
    showToast('Database data member dan poin berhasil direset.', 'info');
  };

  const resetTransactionsData = () => {
    setTransactions([]);
    setStays([]);
    setPointTransactions([]);
    setRedemptions([]);
    setVoucherRedemptions([]);
    saveToStorage('transactions', []);
    saveToStorage('stays', []);
    saveToStorage('pointTransactions', []);
    saveToStorage('redemptions', []);
    saveToStorage('voucherRedemptions', []);
    // Also reset spending/points counters on existing members if any
    setMembers((prev) =>
      prev.map((m) => ({
        ...m,
        totalSpending: 0,
        totalVisits: 0,
        totalTransactions: 0,
        availablePoints: 0,
        totalPointsEarned: 0,
        redeemedPoints: 0,
      }))
    );
    clearFirestoreMembersAndTransactions().catch(() => {});
    showToast('Seluruh riwayat transaksi, stay, dan poin belanja berhasil dibersihkan.', 'info');
  };

  const resetUserAccounts = () => {
    setUsers(INITIAL_USERS);
    setRoles(INITIAL_ROLES);
    showToast('Akun staf & izin administrator berhasil direset ke pengaturan bawaan.', 'info');
  };

  const resetAllData = () => {
    setMembers(INITIAL_MEMBERS);
    setTiers(INITIAL_TIERS);
    setBenefits(INITIAL_BENEFITS);
    setRules(INITIAL_RULES);
    setStays(INITIAL_STAYS);
    setTransactions(INITIAL_TRANSACTIONS);
    setPointTransactions(INITIAL_POINT_TXS);
    setPointRules(INITIAL_POINT_RULES);
    setRewards(INITIAL_REWARDS);
    setRedemptions(INITIAL_REDEMPTIONS);
    setVouchers(INITIAL_VOUCHERS);
    setVoucherRedemptions([]);
    setPromotions(INITIAL_PROMOTIONS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSystemSettings(INITIAL_SETTINGS);
    setUsers(INITIAL_USERS);
    setRoles(INITIAL_ROLES);
    setWhatsappConfig(INITIAL_PING_CONFIG);
    setWhatsappLogs(INITIAL_WHATSAPP_LOGS);

    localStorage.clear();
    showToast('Data sistem berhasil direset ke standar pabrik.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        members,
        tiers,
        benefits,
        rules,
        stays,
        transactions,
        pointTransactions,
        pointRules,
        rewards,
        redemptions,
        vouchers,
        voucherRedemptions,
        promotions,
        notifications,
        auditLogs,
        systemSettings,
        integrations,
        users,
        roles,
        whatsappConfig,
        whatsappLogs,
        emailConfig,
        emailLogs,
        isSyncModalOpen,
        openSyncModal: () => setIsSyncModalOpen(true),
        closeSyncModal: () => setIsSyncModalOpen(false),
        isMemberDomain,
        customDomain: MEMBER_CUSTOM_DOMAIN,
        forceSyncToCloud,
        addMember,
        updateMember,
        deleteMember,
        changeMemberTier,
        recordStay,
        updateStayStatus,
        recordTransaction,
        adjustPoints,
        redeemReward,
        claimVoucher,
        useVoucher,
        verifyVoucherByBarcode,
        redeemVoucherByBarcode,
        saveTier,
        deleteTier,
        saveBenefit,
        deleteBenefit,
        saveRule,
        deleteRule,
        saveReward,
        deleteReward,
        saveVoucher,
        deleteVoucher,
        validateVoucherCreationData,
        validateVoucherRuleEvaluation,
        savePromotion,
        deletePromotion,
        savePointRules,
        updateSystemSettings,
        updateWhatsAppConfig,
        addWhatsAppLog,
        updateEmailConfig,
        addEmailLog,
        sendTestEmailToRecipient,
        resendEmailNotification,
        clearEmailLogs,
        sendMemberNotificationEmail,
        sendMemberTierUpgradeEmail,
        sendMemberPointsEmail,
        updateRolePermissions,
        saveUser,
        deleteUser,
        markNotificationRead,
        markAllNotificationsRead,
        resetMembersData,
        resetTransactionsData,
        resetUserAccounts,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
