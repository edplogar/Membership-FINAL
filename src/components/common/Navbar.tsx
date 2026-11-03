import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { LombokGardenLogo } from './LombokGardenLogo';
import { UserProfileModal } from './UserProfileModal';
import {
  Bell,
  LogOut,
  User,
  Search,
  Check,
  LogIn,
  Settings,
  ShieldCheck,
  QrCode,
  Mail,
  Ticket,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenScanner: () => void;
  onOpenVoucherScanner?: () => void;
  onSearchClick: () => void;
  onOpenLogin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenScanner,
  onOpenVoucherScanner,
  onSearchClick,
  onOpenLogin,
}) => {
  const { currentUser, userRole, logout, isAuthenticated, hasPermission } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Filter notifications for current user or broad alerts
  const userNotifs = notifications.filter(
    (n) =>
      n.recipientUserId === currentUser?.id ||
      n.recipientUserId === currentUser?.memberId ||
      (userRole !== 'MEMBER' && (n.type === 'system' || n.recipientUserId === 'usr_admin'))
  );
  const unreadCount = userNotifs.filter((n) => !n.isRead).length;

  // Determine top navigation links dynamically based on RBAC permissions and user role
  const getNavLinks = () => {
    if (userRole === 'MEMBER') {
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'membership', label: 'Membership Digital' },
        { id: 'benefits', label: 'Benefit' },
        { id: 'points', label: 'Poin & Rewards' },
        { id: 'vouchers', label: 'Voucher Saya' },
        { id: 'history', label: 'Riwayat Menginap' },
      ];
    }

    const links: { id: string; label: string }[] = [];

    // 1. Dashboard summary
    if (userRole === 'SUPER_ADMIN') {
      links.push({ id: 'super_dashboard', label: 'Control Center' });
    } else {
      links.push({ id: 'admin_dashboard', label: 'Ringkasan' });
    }

    // 2. Member data
    if (hasPermission('member.view')) {
      links.push({ id: 'admin_members', label: 'Data Member' });
    }

    // 3. Stay & Stays
    if (hasPermission('stay.view') || hasPermission('stay.create') || hasPermission('stay.edit')) {
      links.push({ id: 'admin_stays', label: 'Stay & Kunjungan' });
    }

    // 4. Transactions
    if (hasPermission('transaction.view') || hasPermission('transaction.create')) {
      links.push({ id: 'admin_transactions', label: 'Transaksi' });
    }

    // 5. Vouchers, Rewards & Promos
    if (
      hasPermission('reward.view') ||
      hasPermission('reward.edit') ||
      hasPermission('voucher.view') ||
      hasPermission('voucher.redeem') ||
      hasPermission('voucher.scan_only') ||
      hasPermission('promotion.view')
    ) {
      links.push({ id: 'admin_rewards', label: 'Voucher & Promo' });
    }

    // 6. Points & Ledger
    if (hasPermission('points.view') || hasPermission('points.adjust')) {
      links.push({ id: 'admin_points', label: 'Poin & Loyalitas' });
    }

    // 7. Tiers & Rules
    if (
      hasPermission('tier.view') ||
      hasPermission('tier.edit') ||
      hasPermission('rule.view') ||
      hasPermission('rule.edit')
    ) {
      links.push({ id: 'admin_tiers', label: 'Tier & Rules' });
    }

    // 8. Reports
    if (hasPermission('reports.view') || hasPermission('reports.export')) {
      links.push({ id: 'admin_reports', label: 'Laporan' });
    }

    // 9. Email Hub (Super admin or settings.view)
    if (userRole === 'SUPER_ADMIN' || hasPermission('settings.view')) {
      links.push({ id: 'super_email', label: 'Email & Reset' });
    }

    // 10. WhatsApp CRM (Super admin or settings.view)
    if (userRole === 'SUPER_ADMIN' || hasPermission('settings.view')) {
      links.push({ id: 'super_whatsapp', label: 'WhatsApp CRM' });
    }

    // 11. Admin & Hak Akses (RBAC)
    if (
      userRole === 'SUPER_ADMIN' ||
      hasPermission('admin.view') ||
      hasPermission('admin.create') ||
      hasPermission('security.manage')
    ) {
      links.push({ id: 'super_admins', label: 'Hak Akses & Admin' });
    }

    // 12. Deploy VPS NevaCloud (Super Admin only or security.manage)
    if (userRole === 'SUPER_ADMIN' || hasPermission('security.manage') || hasPermission('settings.view')) {
      links.push({ id: 'super_nevacloud', label: 'Deploy VPS NevaCloud' });
    }

    // 13. Audit Logs
    if (hasPermission('audit.view')) {
      links.push({ id: 'admin_audit', label: 'Audit Log' });
    }

    return links;
  };

  const navLinks = getNavLinks();

  return (
    <>
      <header className="sticky top-8 z-30 bg-[#072417]/95 backdrop-blur-md border-b border-[#0e4029] text-stone-100 shadow-md">
      {/* ROW 1: Brand Logo & Top Operation Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Brand Logo & Portal Tag */}
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              onTabChange(
                userRole === 'MEMBER'
                  ? 'dashboard'
                  : userRole === 'SUPER_ADMIN'
                  ? 'super_dashboard'
                  : 'admin_dashboard'
              )
            }
            className="text-left group cursor-pointer focus:outline-hidden py-1"
            title="Lombok Garden Hotel"
          >
            <div className="bg-transparent p-0 border-none shadow-none hover:opacity-90 transition-all flex items-center">
              <LombokGardenLogo variant="horizontal" size="sm" />
            </div>
          </button>

          <div className="hidden md:flex flex-col border-l border-[#0e4029] pl-3">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider font-mono">
              {userRole === 'SUPER_ADMIN'
                ? 'Super Admin Hub'
                : userRole === 'ADMIN'
                ? 'Hotel Management Portal'
                : userRole === 'OPERATOR_FO'
                ? 'Front Office Operator Portal'
                : userRole === 'OPERATOR_FB'
                ? 'F&B Cashier Operator Portal'
                : 'Membership & Loyalty Portal'}
            </span>
            <span className="text-[10px] text-emerald-100/60">
              Lombok Garden Hotel Official
            </span>
          </div>
        </div>

        {/* Quick Action Buttons & User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Scanner shortcut button for staff/admins */}
          {userRole !== 'MEMBER' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenScanner}
                className="px-2.5 sm:px-3 py-1.5 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                title="Pindai Kartu Member / Barcode Tamu"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pindai Member</span>
              </button>

              {onOpenVoucherScanner && (
                <button
                  onClick={onOpenVoucherScanner}
                  className="px-2.5 sm:px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                  title="Pindai Barcode / QR Voucher Tamu"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Redeem Voucher</span>
                </button>
              )}
            </div>
          )}

          {/* Global Search button for staff */}
          {userRole !== 'MEMBER' && (
            <button
              onClick={onSearchClick}
              className="p-2 text-emerald-200 hover:text-white hover:bg-[#0c3522] rounded-xl transition-colors flex items-center gap-1.5 text-xs border border-[#13492e] cursor-pointer"
              title="Cari Member atau Transaksi"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline text-emerald-300/80 font-mono text-[11px]">
                Cari...
              </span>
            </button>
          )}

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="p-2 text-emerald-200 hover:text-white hover:bg-[#0c3522] rounded-xl relative transition-colors border border-[#13492e] cursor-pointer"
              title="Notifikasi"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00A651] rounded-full ring-2 ring-[#072417] animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#061d13] border border-[#12422a] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-100">
                  <div className="px-4 py-3 border-b border-[#12422a] flex items-center justify-between bg-[#04140d]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                        Notifikasi
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-[#00A651]/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded-full font-semibold border border-[#00A651]/40">
                          {unreadCount} baru
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[11px] text-[#00A651] hover:underline cursor-pointer font-medium"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-[#0e3321]">
                    {userNotifs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-400">
                        Tidak ada notifikasi baru saat ini.
                      </div>
                    ) : (
                      userNotifs.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-3.5 hover:bg-[#0a2e1d] cursor-pointer transition-colors ${
                            !n.isRead ? 'bg-[#0a2e1d]/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-stone-100 leading-tight">
                              {n.title}
                            </h4>
                            {!n.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00A651] shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="text-[9px] text-stone-400 font-mono mt-1.5">
                            {new Date(n.createdAt).toLocaleDateString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Profile / Menu or Login Button */}
          {isAuthenticated && currentUser ? (
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#0c3522] text-stone-100 transition-colors cursor-pointer border border-[#13492e]"
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-[#00A651]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#00A651] text-white flex items-center justify-center text-xs font-bold font-serif">
                    {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                  </div>
                )}
                <span className="hidden md:inline text-xs font-medium text-emerald-100 max-w-[120px] truncate">
                  {currentUser?.name?.split(' ')[0]}
                </span>
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 max-w-[90vw] bg-[#061d13] border border-[#12422a] rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in">
                    <div className="px-3.5 py-2.5 border-b border-[#0e3321]">
                      <div className="text-xs font-semibold text-white truncate">
                        {currentUser?.name}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono truncate">
                        {currentUser?.email}
                      </div>
                      <div className="text-[10px] font-mono text-[#00A651] mt-1 uppercase font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00A651]" />
                        <span>{userRole}</span>
                      </div>
                    </div>

                    {/* Universal Profile Action for All Roles (Member, Admin, Super Admin) */}
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-[#0c3522] text-xs text-emerald-100 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#00A651] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-white">
                          {userRole === 'SUPER_ADMIN'
                            ? 'Edit Profil Super Admin'
                            : userRole === 'ADMIN'
                            ? 'Edit Profil Administrator'
                            : 'Edit Profil & Akun'}
                        </div>
                        <div className="text-[10px] text-emerald-300/70">
                          Nama, foto, kontak & kata sandi
                        </div>
                      </div>
                    </button>

                    {userRole === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => {
                          onTabChange('super_email');
                          setShowUserMenu(false);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-[#0c3522] text-xs text-emerald-100 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#00A651] shrink-0" />
                        <span>Pengaturan Email & Reset</span>
                      </button>
                    )}

                    {userRole === 'MEMBER' && (
                      <button
                        onClick={() => {
                          onTabChange('profile');
                          setShowUserMenu(false);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-[#0c3522] text-xs text-stone-300 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Halaman Profil Member</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-rose-950/40 text-xs text-rose-400 flex items-center gap-2 transition-colors cursor-pointer border-t border-[#0e3321] mt-1 pt-2"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Keluar / Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            onOpenLogin && (
              <button
                onClick={onOpenLogin}
                className="px-3.5 py-1.5 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk / Daftar</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* ROW 2: Dedicated Navigation Menu Strip (Horizontal Row) */}
      <div className="bg-[#04170d] border-t border-[#0b2f1c] shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1.5 scroll-smooth">
            {navLinks.map((link) => {
              const isActive = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onTabChange(link.id)}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] whitespace-nowrap transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#00A651] text-white font-bold shadow-[0_2px_8px_rgba(0,166,81,0.3)] ring-1 ring-emerald-400/40'
                      : 'text-emerald-100/75 hover:text-white hover:bg-emerald-900/40'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>

    {/* Universal User Profile Edit Modal */}
    <UserProfileModal
      isOpen={isProfileModalOpen}
      onClose={() => setIsProfileModalOpen(false)}
    />
  </>
);
};
