import { Member, MembershipTier, Voucher, PointTransaction } from '../types';
import { formatDateIndo } from './membershipEngine';

export interface ZodiacInfo {
  name: string;
  symbol: string;
  element: string;
}

export interface BirthdayMemberInfo {
  member: Member;
  birthDate: string; // YYYY-MM-DD
  birthDay: number;
  birthMonth: number;
  birthYear: number;
  formattedBirthday: string; // e.g. "5 November"
  currentAge: number;
  age: number; // alias for currentAge
  turningAge: number;
  nextBirthday: Date;
  daysUntil: number; // 0 = today, 1 = tomorrow, etc.
  isToday: boolean;
  isThisWeek: boolean;
  isThisMonth: boolean;
  isUpcoming: boolean; // within 30 days
  zodiac: ZodiacInfo;
  statusLabel: string;
  urgency: 'today' | 'this_week' | 'this_month' | 'upcoming';
}

export interface BirthdaySpecialOffer {
  voucherCode: string;
  voucherTitle: string;
  voucherDiscountPercent: number;
  pointsBonus: number;
  cakeComplimentary: boolean;
  diningDiscountPercent: number;
  roomDiscountPercent: number;
  spaDiscountPercent: number;
  validityDays: number;
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
}

/**
 * Determine Zodiac Sign from month and day
 */
export function getZodiacSign(month: number, day: number): ZodiacInfo {
  // Month is 1-indexed (1 = Jan, 12 = Dec)
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return { name: 'Aries', symbol: '♈', element: 'Api' };
  }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return { name: 'Taurus', symbol: '♉', element: 'Tanah' };
  }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return { name: 'Gemini', symbol: '♊', element: 'Udara' };
  }
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return { name: 'Cancer', symbol: '♋', element: 'Air' };
  }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return { name: 'Leo', symbol: '♌', element: 'Api' };
  }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return { name: 'Virgo', symbol: '♍', element: 'Tanah' };
  }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return { name: 'Libra', symbol: '♎', element: 'Udara' };
  }
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return { name: 'Scorpio', symbol: '♏', element: 'Air' };
  }
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return { name: 'Sagitarius', symbol: '♐', element: 'Api' };
  }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return { name: 'Kaprikornus', symbol: '♑', element: 'Tanah' };
  }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return { name: 'Akuarius', symbol: '♒', element: 'Udara' };
  }
  return { name: 'Pisces', symbol: '♓', element: 'Air' };
}

/**
 * Month names in Indonesian
 */
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Calculate detailed birthday info for a member relative to a reference date
 */
export function calculateMemberBirthdayInfo(
  member: Member,
  refDate: Date = new Date()
): BirthdayMemberInfo | null {
  if (!member.birthDate) return null;

  // Expected format: YYYY-MM-DD or parseable
  const parts = member.birthDate.split('-');
  let birthYear = 1990;
  let birthMonth = 1;
  let birthDay = 1;

  if (parts.length >= 3) {
    birthYear = parseInt(parts[0], 10);
    birthMonth = parseInt(parts[1], 10);
    birthDay = parseInt(parts[2], 10);
  } else {
    const parsed = new Date(member.birthDate);
    if (isNaN(parsed.getTime())) return null;
    birthYear = parsed.getFullYear();
    birthMonth = parsed.getMonth() + 1;
    birthDay = parsed.getDate();
  }

  if (isNaN(birthMonth) || isNaN(birthDay) || birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) {
    return null;
  }

  // Reference year, month, day (strip time for accurate day difference)
  const currentYear = refDate.getFullYear();
  const todayZero = new Date(currentYear, refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);

  // Target birthday this calendar year
  let nextBday = new Date(currentYear, birthMonth - 1, birthDay, 0, 0, 0, 0);

  // If this year's birthday has already passed, check next year's birthday
  if (nextBday.getTime() < todayZero.getTime()) {
    nextBday = new Date(currentYear + 1, birthMonth - 1, birthDay, 0, 0, 0, 0);
  }

  // Calculate days difference
  const msDiff = nextBday.getTime() - todayZero.getTime();
  const daysUntil = Math.round(msDiff / (1000 * 60 * 60 * 24));

  const isToday = daysUntil === 0;
  const isThisWeek = daysUntil >= 0 && daysUntil <= 7;
  const isThisMonth = daysUntil >= 0 && daysUntil <= 30;

  // Calculate current age and turning age
  const turningAge = nextBday.getFullYear() - birthYear;
  const currentAge = isToday ? turningAge : turningAge - 1;

  const zodiac = getZodiacSign(birthMonth, birthDay);
  const formattedBirthday = `${birthDay} ${INDO_MONTHS[birthMonth - 1]}`;

  let statusLabel = `Ulang tahun dalam ${daysUntil} hari`;
  let urgency: BirthdayMemberInfo['urgency'] = 'upcoming';

  if (isToday) {
    statusLabel = 'Ulang Tahun Hari Ini! 🎉🎂';
    urgency = 'today';
  } else if (daysUntil === 1) {
    statusLabel = 'Ulang Tahun Besok! 🎁';
    urgency = 'this_week';
  } else if (daysUntil <= 7) {
    statusLabel = `Ulang tahun dalam ${daysUntil} hari (Minggu ini) 🎈`;
    urgency = 'this_week';
  } else if (daysUntil <= 30) {
    statusLabel = `Ulang tahun dalam ${daysUntil} hari (Bulan ini)`;
    urgency = 'this_month';
  }

  return {
    member,
    birthDate: member.birthDate,
    birthDay,
    birthMonth,
    birthYear,
    formattedBirthday,
    currentAge,
    age: currentAge,
    turningAge,
    nextBirthday: nextBday,
    daysUntil,
    isToday,
    isThisWeek,
    isThisMonth,
    isUpcoming: isThisMonth,
    zodiac,
    statusLabel,
    urgency,
  };
}

/**
 * Filter and sort members with upcoming birthdays within a given day window
 */
export function getUpcomingBirthdayMembers(
  members: Member[],
  daysWindow: number = 30,
  refDate: Date = new Date()
): BirthdayMemberInfo[] {
  const result: BirthdayMemberInfo[] = [];

  for (const m of members) {
    if (m.status !== 'ACTIVE' && m.status !== 'INACTIVE') continue;
    const info = calculateMemberBirthdayInfo(m, refDate);
    if (info && info.daysUntil <= daysWindow) {
      result.push(info);
    }
  }

  // Sort by daysUntil ascending (today first, then tomorrow, etc.)
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Generate Birthday Special Offer Presets (Voucher code, discounts, WhatsApp & Email messages)
 */
export function generateBirthdaySpecialOffer(
  member: Member,
  tier: MembershipTier,
  customBonusPoints: number = 300,
  appUrl: string = 'https://member.lombokgardenhotel.com'
): BirthdaySpecialOffer {
  const currentYear = new Date().getFullYear();
  const cleanInitials = member.fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3) || 'VIP';

  const voucherCode = `BDAY-${cleanInitials}-${currentYear}`;
  const turningAge = new Date().getFullYear() - (parseInt(member.birthDate.split('-')[0], 10) || 1990);

  // Generous perks according to tier
  let discountPercent = 25;
  if (tier.level >= 4) discountPercent = 35; // Platinum
  else if (tier.level >= 3) discountPercent = 30; // Gold

  const voucherTitle = `Voucher Ulang Tahun Spesial (${discountPercent}% Diskon F&B & Kamar)`;

  const whatsappMessage = `🎂 *SELAMAT ULANG TAHUN DARI LOMBOK GARDEN HOTEL* 🌿🏨

Yth. *${member.fullName}* (Member ${tier.name}),

Segenap manajemen dan staf *Lombok Garden Hotel* mengucapkan selamat ulang tahun yang ke-*${turningAge}*! Semoga senantiasa diberikan kesehatan, kebahagiaan, dan kesuksesan. 🎉

Sebagai tanda apresiasi istimewa kami, nikmati *Kado Ulang Tahun Eksklusif* untuk Anda:
🎁 *Bonus Poin Loyalitas*: +${customBonusPoints} Poin langsung ke akun Anda!
🍰 *Complimentary Birthday Cake* saat bersantap di Restoran Teratai
🏷️ *Voucher Diskon Spesial ${discountPercent}%*: Kode *${voucherCode}*
💆 *Diskon Spesial 25%* untuk seluruh perawatan di Garden Sanctuary Spa

Tunjukkan kartu keanggotaan digital Anda saat berkunjung:
${appUrl}/card/${member.membershipNumber}

Kami menantikan kedatangan Anda untuk merayakan hari istimewa ini bersama kami di Lombok Garden Hotel! 🌿🥂`;

  const emailSubject = `🎂 Selamat Ulang Tahun ${member.fullName}! Hadiah Spesial Dari Lombok Garden Hotel`;

  const emailBody = `Halo ${member.fullName},

Segenap jajaran manajemen dan staf Lombok Garden Hotel mengucapkan Selamat Ulang Tahun yang ke-${turningAge}!

Sebagai wujud rasa terima kasih atas loyalitas Anda sebagai Member ${tier.name}, kami mempersembahkan penawaran istimewa untuk merayakan hari bahagia Anda:

1. Bonus ${customBonusPoints} Poin Loyalitas langsung ke akun membership Anda.
2. Voucher Diskon ${discountPercent}% untuk reservasi kamar dan bersantap di Restoran Teratai (Kode Voucher: ${voucherCode}).
3. Complimentary Birthday Cake & Welcome Mocktail saat Anda bersantap di hotel.
4. Potongan 25% untuk relaksasi tubuh di Garden Sanctuary Spa.

Voucher ini berlaku hingga 30 hari ke depan. Kunjungi portal member Anda untuk melihat saldo poin dan menukarkan voucher:
${appUrl}

Salam hangat,
General Manager & Tim Concierge
Lombok Garden Hotel`;

  return {
    voucherCode,
    voucherTitle,
    voucherDiscountPercent: discountPercent,
    pointsBonus: customBonusPoints,
    cakeComplimentary: true,
    diningDiscountPercent: discountPercent,
    roomDiscountPercent: discountPercent,
    spaDiscountPercent: 25,
    validityDays: 30,
    whatsappMessage,
    emailSubject,
    emailBody,
  };
}
