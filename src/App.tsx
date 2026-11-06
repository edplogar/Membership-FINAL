import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { DemoRoleBar } from './components/common/DemoRoleBar';
import { Member } from './types';

// Member views
import { MemberDashboard } from './components/member/MemberDashboard';
import { DigitalMembershipCard } from './components/member/DigitalMembershipCard';
import { MemberBenefits } from './components/member/MemberBenefits';
import { MemberPointsHistory } from './components/member/MemberPointsHistory';
import { MemberRewardsCatalog } from './components/member/MemberRewardsCatalog';
import { MemberVouchers } from './components/member/MemberVouchers';
import { MemberStayHistory } from './components/member/MemberStayHistory';
import { MemberProfile } from './components/member/MemberProfile';

// Admin views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MemberList } from './components/admin/MemberList';
import { MemberDetailModal } from './components/admin/MemberDetailModal';
import { StayManagement } from './components/admin/StayManagement';
import { TransactionManagement } from './components/admin/TransactionManagement';
import { FrontDeskScannerModal } from './components/admin/FrontDeskScannerModal';
import { TierManagement } from './components/admin/TierManagement';
import { RuleEngineConfig } from './components/admin/RuleEngineConfig';
import { PointsManagement } from './components/admin/PointsManagement';
import { RewardsAndVouchersManagement } from './components/admin/RewardsAndVouchersManagement';
import { ReportsView } from './components/admin/ReportsView';
import { AuditLogsView } from './components/admin/AuditLogsView';
import { VoucherScannerModal } from './components/admin/VoucherScannerModal';

// Super Admin views
import { SuperAdminControlCenter } from './components/superadmin/SuperAdminControlCenter';
import { AdminUsersManagement } from './components/superadmin/AdminUsersManagement';
import { RolePermissionsMatrix } from './components/superadmin/RolePermissionsMatrix';
import { SystemSettingsView } from './components/superadmin/SystemSettingsView';
import { WhatsAppCRMHub } from './components/superadmin/WhatsAppCRMHub';
import { EmailSystemHub } from './components/superadmin/EmailSystemHub';

// Modals & Auth
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { SubdomainSyncModal } from './components/common/SubdomainSyncModal';
import { AuthModal } from './components/auth/AuthModal';
import { LoginPage } from './components/auth/LoginPage';
import { LombokGardenLogo } from './components/common/LombokGardenLogo';

function MainApp() {
  const { currentUser, currentMember, userRole, hasPermission } = useAuth();
  const { tiers, members, roles, isSyncModalOpen, closeSyncModal } = useApp();

  const isTabPermitted = (tab: string): boolean => {
    if (!currentUser) return false;
    if (userRole === 'MEMBER') {
      return ['dashboard', 'membership', 'benefits', 'points', 'vouchers', 'history', 'profile'].includes(tab);
    }
    if (userRole === 'SUPER_ADMIN') return true;

    // Staff / Admin permission-based check
    if (tab === 'admin_dashboard') return true;
    if (tab === 'super_dashboard') return hasPermission('security.manage');
    if (tab === 'admin_members') return hasPermission('member.view');
    if (tab === 'admin_stays') return hasPermission('stay.view') || hasPermission('stay.create') || hasPermission('stay.edit');
    if (tab === 'admin_transactions') return hasPermission('transaction.view') || hasPermission('transaction.create');
    if (tab === 'admin_rewards') return hasPermission('reward.view') || hasPermission('voucher.view') || hasPermission('voucher.redeem') || hasPermission('voucher.scan_only') || hasPermission('promotion.view');
    if (tab === 'admin_points') return hasPermission('points.view') || hasPermission('points.adjust');
    if (tab === 'admin_tiers') return hasPermission('tier.view') || hasPermission('rule.view');
    if (tab === 'admin_reports') return hasPermission('reports.view') || hasPermission('reports.export');
    if (tab === 'admin_audit') return hasPermission('audit.view');
    if (tab === 'super_admins') return hasPermission('admin.view') || hasPermission('admin.create') || hasPermission('security.manage');
    if (tab === 'super_roles') return hasPermission('security.manage');
    if (tab === 'super_whatsapp') return hasPermission('settings.view');
    if (tab === 'super_email') return hasPermission('settings.view');
    if (tab === 'super_settings') return hasPermission('settings.view') || hasPermission('settings.edit');
    return false;
  };

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>(() =>
    userRole === 'MEMBER'
      ? 'dashboard'
      : userRole === 'SUPER_ADMIN'
      ? 'super_dashboard'
      : 'admin_dashboard'
  );

  // Auto-redirect when userRole or permissions change
  React.useEffect(() => {
    if (!currentUser) return;
    if (!isTabPermitted(activeTab)) {
      if (userRole === 'MEMBER') {
        setActiveTab('dashboard');
      } else if (userRole === 'SUPER_ADMIN') {
        setActiveTab('super_dashboard');
      } else {
        setActiveTab('admin_dashboard');
      }
    }
  }, [userRole, currentUser?.roleId, activeTab, roles]);

  // Global modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVoucherScannerOpen, setIsVoucherScannerOpen] = useState(false);
  const [prefilledVoucherMember, setPrefilledVoucherMember] = useState<Member | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<Member | null>(null);

  const handleOpenVoucherScanner = (member?: Member) => {
    setPrefilledVoucherMember(member || null);
    setIsVoucherScannerOpen(true);
  };

  // Pre-fill action triggers from Front Desk scanner or Member Table
  const [prefilledMember, setPrefilledMember] = useState<Member | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isNewStayOpen, setIsNewStayOpen] = useState(false);
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isAdjustPointsOpen, setIsAdjustPointsOpen] = useState(false);

  // Actions from Scanner / Member table
  const handleCheckInMember = (member: Member) => {
    setPrefilledMember(member);
    setActiveTab('admin_stays');
    setIsNewStayOpen(true);
  };

  const handleAddTxMember = (member: Member) => {
    setPrefilledMember(member);
    setActiveTab('admin_transactions');
    setIsNewTxOpen(true);
  };

  const handleAdjustPointsMember = (member: Member) => {
    setSelectedMemberForDetail(null);
    setPrefilledMember(member);
    setActiveTab('admin_points');
    setIsAdjustPointsOpen(true);
  };

  const handleChangeTierMember = (member: Member) => {
    setSelectedMemberForDetail(member);
  };

  const handleViewProfileMember = (member: Member) => {
    setSelectedMemberForDetail(member);
  };

  // If user is not authenticated, show Multi-User LoginPage (after all hooks)
  if (!currentUser) {
    return <LoginPage />;
  }

  const memberToDisplay = currentMember || members[0];
  const currentTier = tiers.find((t) => t.id === memberToDisplay?.tierId) || tiers[0];
  const sortedTiers = [...tiers].sort((a, b) => a.level - b.level);
  const nextTier = sortedTiers.find((t) => t.level === currentTier.level + 1);

  return (
    <div className="min-h-screen bg-[#f8f7f2] flex flex-col font-sans text-stone-900 selection:bg-[#00A651] selection:text-white">
      {/* 1. Fast Role Switcher & System Reset Toolbar */}
      <DemoRoleBar onOpenScanner={() => setIsScannerOpen(true)} />

      {/* 2. Top Navigation Bar (3-Zone Contract) */}
      <Navbar
        currentTab={activeTab}
        onTabChange={setActiveTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenVoucherScanner={() => handleOpenVoucherScanner()}
        onSearchClick={() => setIsSearchOpen(true)}
      />

      {/* 3. Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {/* ================= MEMBER PORTAL VIEWS ================= */}
        {userRole === 'MEMBER' && (
          <>
            {activeTab === 'dashboard' && (
              <MemberDashboard onNavigate={setActiveTab} />
            )}
            {activeTab === 'membership' && (
              <div className="max-w-xl mx-auto space-y-6 pt-4">
                <div className="text-center">
                  <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
                    Kartu Digital Tamu Hotel
                  </h1>
                  <p className="text-xs text-stone-500 mt-1">
                    Gunakan kartu digital Anda untuk check-in, bersantap di restoran,
                    dan menikmati potongan harga kamar.
                  </p>
                </div>
                <DigitalMembershipCard
                  member={memberToDisplay}
                  tier={currentTier}
                  nextTier={nextTier}
                  onViewBenefits={() => setActiveTab('benefits')}
                />
              </div>
            )}
            {activeTab === 'benefits' && <MemberBenefits />}
            {activeTab === 'points' && (
              <div className="space-y-10">
                <MemberRewardsCatalog />
                <MemberPointsHistory />
              </div>
            )}
            {activeTab === 'vouchers' && <MemberVouchers />}
            {activeTab === 'history' && <MemberStayHistory />}
            {activeTab === 'profile' && <MemberProfile />}
          </>
        )}

        {/* ================= STAFF & ADMINISTRATOR PORTAL VIEWS ================= */}
        {userRole !== 'MEMBER' && (
          <>
            {activeTab === 'super_dashboard' && (userRole === 'SUPER_ADMIN' || hasPermission('security.manage')) && (
              <SuperAdminControlCenter onNavigate={setActiveTab} />
            )}
            {activeTab === 'admin_dashboard' && (
              <AdminDashboard
                onNavigate={setActiveTab}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenVoucherScanner={() => handleOpenVoucherScanner()}
                onOpenAddMember={() => {
                  setActiveTab('admin_members');
                  setIsAddMemberOpen(true);
                }}
              />
            )}
            {activeTab === 'admin_members' && (
              <MemberList
                onSelectMember={handleViewProfileMember}
                onOpenCheckIn={handleCheckInMember}
                onOpenAddTransaction={handleAddTxMember}
                onOpenAdjustPoints={handleAdjustPointsMember}
                onOpenChangeTier={handleChangeTierMember}
                isAddModalOpen={isAddMemberOpen}
                onCloseAddModal={() => setIsAddMemberOpen(false)}
              />
            )}
            {activeTab === 'admin_stays' && (
              <StayManagement
                preselectedMember={prefilledMember}
                isOpenNewStayModal={isNewStayOpen}
                onCloseNewStayModal={() => {
                  setIsNewStayOpen(false);
                  setPrefilledMember(null);
                }}
              />
            )}
            {activeTab === 'admin_transactions' && (
              <TransactionManagement
                preselectedMember={prefilledMember}
                isOpenNewTxModal={isNewTxOpen}
                onCloseNewTxModal={() => {
                  setIsNewTxOpen(false);
                  setPrefilledMember(null);
                }}
              />
            )}
            {activeTab === 'admin_tiers' && (
              <div className="space-y-12">
                <TierManagement />
                <RuleEngineConfig />
              </div>
            )}
            {activeTab === 'admin_points' && (
              <PointsManagement
                preselectedMember={prefilledMember}
                isOpenAdjustModal={isAdjustPointsOpen}
                onCloseAdjustModal={() => {
                  setIsAdjustPointsOpen(false);
                  setPrefilledMember(null);
                }}
              />
            )}
            {activeTab === 'admin_rewards' && <RewardsAndVouchersManagement />}
            {activeTab === 'super_admins' && <AdminUsersManagement />}
            {activeTab === 'super_roles' && <RolePermissionsMatrix />}
            {activeTab === 'super_whatsapp' && <WhatsAppCRMHub />}
            {activeTab === 'super_email' && <EmailSystemHub onNavigate={setActiveTab} />}
            {activeTab === 'super_settings' && <SystemSettingsView onNavigate={setActiveTab} />}
            {activeTab === 'admin_reports' && <ReportsView />}
            {activeTab === 'admin_audit' && <AuditLogsView />}
          </>
        )}
      </main>

      {/* 4. Front Desk QR & Barcode Scanner Modal */}
      <FrontDeskScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onActionCheckIn={handleCheckInMember}
        onActionAddTransaction={handleAddTxMember}
        onActionAdjustPoints={handleAdjustPointsMember}
        onActionViewProfile={handleViewProfileMember}
        onOpenVoucherScanner={handleOpenVoucherScanner}
        onOpenAddMember={() => {
          setActiveTab('admin_members');
          setIsAddMemberOpen(true);
        }}
      />

      {/* 4b. Hotel Voucher Barcode Scanner Modal */}
      <VoucherScannerModal
        isOpen={isVoucherScannerOpen}
        onClose={() => {
          setIsVoucherScannerOpen(false);
          setPrefilledVoucherMember(null);
        }}
      />

      {/* 5. Comprehensive Member Customer Profile Modal */}
      <MemberDetailModal
        member={selectedMemberForDetail}
        isOpen={Boolean(selectedMemberForDetail)}
        onClose={() => setSelectedMemberForDetail(null)}
        onActionCheckIn={handleCheckInMember}
        onActionAddTransaction={handleAddTxMember}
        onActionAdjustPoints={handleAdjustPointsMember}
        onActionChangeTier={handleChangeTierMember}
      />

      {/* 6. Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMember={handleViewProfileMember}
      />

      {/* 6b. Subdomain & Cloud Database Sync Modal */}
      <SubdomainSyncModal
        isOpen={isSyncModalOpen}
        onClose={closeSyncModal}
      />

      {/* 7. Public Auth Modal (Login / Register / Forgot) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 8. Quiet Editorial Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1 px-2.5 rounded-xl bg-white shadow-xs border border-stone-200">
              <LombokGardenLogo variant="horizontal" size="sm" />
            </div>
            <span>·</span>
            <span>Hotel Membership Management System</span>
          </div>
          <div className="font-mono text-[11px] text-stone-400">
            Jl. Bung Karno No. 7, Mataram, NTB · All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppProvider>
          <MainApp />
        </AppProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
