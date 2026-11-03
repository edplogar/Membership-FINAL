import { Voucher } from '../types';

export interface VoucherValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

export interface VoucherRuleEvaluationParams {
  memberTierId?: string;
  transactionAmount?: number;
  outlet?: string;
  date?: string; // YYYY-MM-DD
  memberUsageCount?: number;
}

export interface VoucherRuleEvaluationResult {
  isApplicable: boolean;
  calculatedDiscount: number;
  message: string;
  checks: {
    statusCheck: { passed: boolean; message: string };
    dateCheck: { passed: boolean; message: string };
    tierCheck: { passed: boolean; message: string };
    minTransactionCheck: { passed: boolean; message: string };
    usageLimitCheck: { passed: boolean; message: string };
    perMemberLimitCheck: { passed: boolean; message: string };
  };
}

/**
 * Validates voucher creation and modification rules.
 * Enforces business logic: code formatting, uniqueness, date validity, positive numbers,
 * tier eligibility, discount caps, and per-member limits.
 */
export function validateVoucherCreation(
  voucher: Partial<Voucher>,
  existingVouchers: Voucher[] = [],
  editingId?: string
): VoucherValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // 1. Code Validation
  const rawCode = (voucher.code || '').trim().toUpperCase();
  if (!rawCode) {
    errors.code = 'Kode voucher wajib diisi.';
  } else if (rawCode.length < 3) {
    errors.code = 'Kode voucher minimal 3 karakter.';
  } else if (!/^[A-Z0-9_-]+$/.test(rawCode)) {
    errors.code = 'Kode voucher hanya boleh huruf kapital, angka, garis hubung (-), atau garis bawah (_).';
  } else {
    // Uniqueness check
    const duplicate = existingVouchers.find(
      (v) =>
        v.code.toUpperCase() === rawCode &&
        v.id !== (editingId || voucher.id)
    );
    if (duplicate) {
      errors.code = `Kode voucher "${rawCode}" sudah digunakan oleh voucher lain ("${duplicate.title}").`;
    }
  }

  // 2. Title Validation
  const title = (voucher.title || '').trim();
  if (!title) {
    errors.title = 'Nama voucher wajib diisi.';
  } else if (title.length < 3) {
    errors.title = 'Nama voucher minimal 3 karakter.';
  }

  // 3. Discount Type & Value Validation
  const type = voucher.type || 'percent';
  const discountValue = voucher.discountValue ?? 0;
  const maxDiscount = voucher.maxDiscount ?? 0;
  const minTransaction = voucher.minTransaction ?? 0;

  if (type === 'percent') {
    if (discountValue <= 0) {
      errors.discountValue = 'Diskon persentase harus lebih besar dari 0%.';
    } else if (discountValue > 100) {
      errors.discountValue = 'Diskon persentase tidak boleh melebihi 100%.';
    } else if (discountValue > 50) {
      warnings.push(`Diskon ${discountValue}% bernilai tinggi. Pastikan batas maksimal potongan terpasang.`);
    }

    if (maxDiscount > 0 && minTransaction > 0 && maxDiscount < (minTransaction * (discountValue / 100))) {
      warnings.push('Batas maksimal diskon lebih kecil daripada potensi diskon pada nilai minimum transaksi.');
    }
  } else if (type === 'fixed') {
    if (discountValue <= 0) {
      errors.discountValue = 'Nominal potongan diskon harus lebih besar dari Rp 0.';
    }
    if (minTransaction > 0 && discountValue > minTransaction) {
      errors.discountValue = 'Nilai diskon tetap tidak boleh lebih besar dari syarat minimum transaksi.';
    }
  }

  // 4. Minimum Transaction Validation
  if (minTransaction < 0) {
    errors.minTransaction = 'Minimal transaksi tidak boleh bernilai negatif.';
  }

  // 5. Date Validation
  const todayStr = new Date().toISOString().slice(0, 10);
  const startDate = voucher.startDate || todayStr;
  const expiryDate = voucher.expiryDate || todayStr;

  if (!voucher.startDate) {
    errors.startDate = 'Tanggal mulai wajib diisi.';
  }
  if (!voucher.expiryDate) {
    errors.expiryDate = 'Tanggal kadaluarsa wajib diisi.';
  }

  if (voucher.startDate && voucher.expiryDate) {
    if (startDate > expiryDate) {
      errors.expiryDate = 'Tanggal kadaluarsa tidak boleh mendahului tanggal mulai voucher.';
    }
    if (!editingId && expiryDate < todayStr) {
      errors.expiryDate = 'Tanggal kadaluarsa tidak boleh di masa lampau untuk voucher baru.';
    }
  }

  // 6. Quota Limits Validation
  const usageLimit = voucher.usageLimit ?? 100;
  const perMemberLimit = voucher.perMemberLimit ?? 1;

  if (usageLimit <= 0) {
    errors.usageLimit = 'Total kuota voucher harus minimal 1 kali penggunaan.';
  }
  if (perMemberLimit <= 0) {
    errors.perMemberLimit = 'Batas per member harus minimal 1 kali penggunaan.';
  }
  if (perMemberLimit > usageLimit) {
    errors.perMemberLimit = 'Batas per member tidak boleh lebih besar dari total kuota voucher.';
  }

  // 7. Applicable Tiers Validation
  if (!voucher.applicableTierIds || voucher.applicableTierIds.length === 0) {
    errors.applicableTierIds = 'Pilih minimal satu tier keanggotaan yang berhak menerima voucher.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

/**
 * Evaluates voucher applicability for a given member, transaction amount, and date.
 * Simulates check-in and POS redemption logic.
 */
export function validateVoucherRule(
  voucher: Voucher,
  params: VoucherRuleEvaluationParams
): VoucherRuleEvaluationResult {
  const currentDate = params.date || new Date().toISOString().slice(0, 10);
  const amount = params.transactionAmount ?? 0;
  const tierId = params.memberTierId || '';
  const memberUsageCount = params.memberUsageCount ?? 0;

  // 1. Status Check
  const isStatusActive = voucher.status === 'active';
  const statusCheck = {
    passed: isStatusActive,
    message: isStatusActive
      ? 'Status voucher aktif dan siap digunakan.'
      : `Voucher berstatus "${voucher.status}" (tidak aktif).`,
  };

  // 2. Date Validity Check
  const isDateValid = currentDate >= voucher.startDate && currentDate <= voucher.expiryDate;
  const dateCheck = {
    passed: isDateValid,
    message: isDateValid
      ? `Berlaku (${voucher.startDate} s/d ${voucher.expiryDate}).`
      : currentDate < voucher.startDate
      ? `Belum berlaku (mulai aktif ${voucher.startDate}).`
      : `Sudah kadaluarsa (berakhir ${voucher.expiryDate}).`,
  };

  // 3. Tier Eligibility Check
  const isTierEligible =
    !voucher.applicableTierIds ||
    voucher.applicableTierIds.length === 0 ||
    (Boolean(tierId) && voucher.applicableTierIds.includes(tierId));
  const tierCheck = {
    passed: isTierEligible,
    message: isTierEligible
      ? 'Tier member memenuhi syarat.'
      : 'Tier member tidak termasuk dalam target promosi voucher ini.',
  };

  // 4. Min Transaction Check
  const isMinTxSatisfied = amount >= (voucher.minTransaction || 0);
  const minTransactionCheck = {
    passed: isMinTxSatisfied,
    message: isMinTxSatisfied
      ? `Memenuhi syarat min. transaksi (Rp ${(voucher.minTransaction || 0).toLocaleString('id-ID')}).`
      : `Belum memenuhi min. transaksi Rp ${(voucher.minTransaction || 0).toLocaleString('id-ID')} (transaksi saat ini: Rp ${amount.toLocaleString('id-ID')}).`,
  };

  // 5. Total Usage Quota Check
  const isUsageQuotaAvailable = (voucher.usedCount || 0) < (voucher.usageLimit || 999999);
  const usageLimitCheck = {
    passed: isUsageQuotaAvailable,
    message: isUsageQuotaAvailable
      ? `Kuota tersisa ${(voucher.usageLimit || 0) - (voucher.usedCount || 0)} dari ${voucher.usageLimit}.`
      : 'Kuota penggunaan voucher ini telah habis.',
  };

  // 6. Per Member Usage Check
  const isPerMemberAvailable = memberUsageCount < (voucher.perMemberLimit || 1);
  const perMemberLimitCheck = {
    passed: isPerMemberAvailable,
    message: isPerMemberAvailable
      ? `Member telah menggunakan ${memberUsageCount}/${voucher.perMemberLimit || 1} kali.`
      : `Member telah mencapai batas maksimal penggunaan (${voucher.perMemberLimit || 1}x).`,
  };

  const isApplicable =
    statusCheck.passed &&
    dateCheck.passed &&
    tierCheck.passed &&
    minTransactionCheck.passed &&
    usageLimitCheck.passed &&
    perMemberLimitCheck.passed;

  // Calculate discount
  let calculatedDiscount = 0;
  if (isApplicable) {
    if (voucher.type === 'percent') {
      const rawDiscount = (amount * voucher.discountValue) / 100;
      calculatedDiscount = voucher.maxDiscount > 0 ? Math.min(rawDiscount, voucher.maxDiscount) : rawDiscount;
    } else if (voucher.type === 'fixed') {
      calculatedDiscount = Math.min(amount, voucher.discountValue);
    } else if (voucher.type === 'complimentary') {
      calculatedDiscount = amount; // 100% complimentary coverage
    }
  }

  let message = 'Kupon voucher valid dan dapat diterapkan.';
  if (!isApplicable) {
    const failedChecks: string[] = [];
    if (!statusCheck.passed) failedChecks.push(statusCheck.message);
    if (!dateCheck.passed) failedChecks.push(dateCheck.message);
    if (!tierCheck.passed) failedChecks.push(tierCheck.message);
    if (!minTransactionCheck.passed) failedChecks.push(minTransactionCheck.message);
    if (!usageLimitCheck.passed) failedChecks.push(usageLimitCheck.message);
    if (!perMemberLimitCheck.passed) failedChecks.push(perMemberLimitCheck.message);
    message = failedChecks.join(' · ');
  }

  return {
    isApplicable,
    calculatedDiscount,
    message,
    checks: {
      statusCheck,
      dateCheck,
      tierCheck,
      minTransactionCheck,
      usageLimitCheck,
      perMemberLimitCheck,
    },
  };
}
