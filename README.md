# Lombok Garden Hotel — Hotel Membership Management System

A production-grade, modular Hotel Membership Management System built for **Lombok Garden Hotel** (Mataram, Lombok, NTB, Indonesia).

---

## 1. Overview & Architecture

The application is structured into three main user portals powered by Role-Based Access Control (RBAC):
1. **Member / Guest Portal**: Digital VIP card with pure SVG QR code, tier status & next-tier progress, live points ledger, rewards redemption catalog, discount vouchers, stay history, and referral engine.
2. **Hotel Admin Portal**: Front desk QR scanner simulator, member database management, stay check-in / check-out, multi-category transaction entry with real-time loyalty point calculations, tier configuration, point adjustments, and analytical reports.
3. **Super Admin Portal**: Control center with system health & integrations, granular RBAC permission matrix editor, administrator user management, dynamic membership rule engine, and full security audit logging.

### Modular Architecture
```
src/
├── types/                # Strict TypeScript contracts (User, Member, Tier, Rule, Stay, Tx, Voucher)
├── services/
│   ├── storage.ts        # Database schema models & localStorage persistence with rich seed data
│   ├── membershipEngine.ts # Dynamic rule engine, tier evaluation, points calculation, formatting
│   ├── exportService.ts  # UTF-8 BOM CSV dataset generator
│   └── mockIntegrations.ts # PMS, Midtrans, WABA WhatsApp API, and SendGrid gateways
├── context/
│   ├── AuthContext.tsx   # Authentication, RBAC permission checker, fast persona switching
│   ├── AppContext.tsx    # State store for members, transactions, stays, rules, tiers, vouchers
│   └── ToastContext.tsx  # Global floating alert notification toasts
├── components/
│   ├── common/           # Top bar (3-zone contract), pure SVG QR code, accessible modal, confirm dialog
│   ├── member/           # Digital membership card, perks matrix, points history, voucher wallet
│   ├── admin/            # Front desk scanner, member table, stay logging, transactions, reports
│   └── superadmin/       # Control center, admin users, RBAC matrix, system & hotel settings
├── App.tsx               # Main viewport & view routing
└── main.tsx              # React 19 entry point
```

---

## 2. Seed Accounts for Testing

| Role | Email | Password | Persona & Privileges |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@lombokgardenhotel.com` | `demo123` | **Hendra Wijaya, CHA** (Full system access & control center) |
| **Hotel Admin** | `admin@lombokgardenhotel.com` | `demo123` | **Siti Rahmawati** (Front Office & guest operations) |
| **Member (Gold)** | `member@example.com` | `demo123` | **Johnathan Doe** (3,250 pts, Gold tier card, 9 stays) |
| **Member (Platinum)**| `sarah.jenkins@globalreach.com` | `demo123` | **Sarah Jenkins** (7,400 pts, Platinum tier card, 18 stays) |
| **Member (Silver)** | `budi.santoso@surabayabusiness.co.id` | `demo123` | **Budi Santoso** (1,187 pts, Silver tier card, 4 stays) |

*Note: You can also use the floating **"Demo Role Switcher"** bar at the top of the interface to switch personas or open the Front Desk QR Scanner with 1 click.*

---

## 3. Key Business Rules & Engines

1. **Dynamic Tier Engine**:
   - Tiers (Member, Silver, Gold, Platinum) are **not hardcoded**. Admins can configure spending thresholds, stay counts, multipliers (1.0x - 2.5x), discounts, and perk lists.
2. **Dynamic Rule Engine**:
   - Condition-action logic: `IF [Total Spending >= X] OR [Stay Count >= Y] THEN [Upgrade to Tier]`.
   - Any transaction recorded automatically re-evaluates rules and upgrades qualifying members.
3. **Point Calculation**:
   - `Poin = (Amount / Earning Rate) × Tier Multiplier × Campaign Multiplier`.
   - Default formula: Rp 10.000 = 1 Poin.
4. **Audit Trail**:
   - Every sensitive change (point adjustments, tier upgrades, role permissions, settings) logs `Who`, `What`, `When`, `Before`, `After`, `IP Address`, and `User Agent`.
