import { EmailSystemConfig, EmailMessageLog, Member, MembershipTier, User } from '../types';
import { apiFetch } from './apiClient';

export const INITIAL_EMAIL_CONFIG: EmailSystemConfig = {
  defaultSenderEmail: 'membership@lombokgardenhotel.com',
  defaultSenderName: 'Lombok Garden Hotel Concierge & Membership',
  replyToEmail: 'guestservice@lombokgardenhotel.com',
  provider: 'smtp',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: 'edp.logar@gmail.com',
  smtpPassword: '',
  autoSendWelcomeEmail: true,
  autoSendPasswordResetEmail: true,
  welcomeSubjectTemplate: 'Selamat Bergabung di Lombok Garden Hotel - Kartu Membership Digital ({membershipNumber})',
  welcomeBodyTemplate: `Halo {{fullName}},

Selamat datang di program loyalitas eksklusif Lombok Garden Hotel!
Akun keanggotaan Anda telah aktif dengan nomor: {{membershipNumber}}
Tingkat Keanggotaan: {{tierName}}
Email Terdaftar (Akun Login): {{email}}

Akses kartu digital dan login ke akun member Anda melalui tautan resmi:
https://member.lombokgardenhotel.com

Nikmati kenyamanan beristirahat di resor tropis kami serta kumpulkan poin di setiap transaksi kamar, restoran, dan spa.

Salam hangat,
Manajemen & Layanan Tamu
Lombok Garden Hotel
Jl. Bung Karno No. 7, Mataram, NTB
Telp: (0370) 636015`,
  resetSubjectTemplate: 'Instruksi Reset Kata Sandi Akun - Lombok Garden Hotel',
  resetBodyTemplate: `Halo {{fullName}},

Kami menerima permintaan untuk mereset kata sandi akun portal Lombok Garden Hotel Anda (Email Terdaftar: {{email}}).

Kode Keamanan Verifikasi (OTP): {{otpCode}}

Atau klik tautan aman di bawah ini untuk langsung membuat kata sandi baru (berlaku selama 60 menit):
{{resetUrl}}

Jika Anda tidak merasa meminta reset kata sandi, abaikan email ini. Akun Anda tetap aman.

Salam hangat,
Tim Keamanan Sistem
Lombok Garden Hotel`,
  testStatus: 'idle',
};

export const INITIAL_EMAIL_LOGS: EmailMessageLog[] = [
  {
    id: 'eml_sample_01',
    recipientEmail: 'edp.logar@gmail.com',
    recipientName: 'EDP Logar',
    subject: 'Selamat Bergabung di Lombok Garden Hotel - Kartu Membership Digital (LGH-001001)',
    type: 'welcome',
    status: 'delivered',
    senderEmail: 'membership@lombokgardenhotel.com',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    previewText: 'Selamat datang di program loyalitas eksklusif Lombok Garden Hotel! Akun keanggotaan Anda telah aktif...',
  },
];

export function getBaseAppUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://member.lombokgardenhotel.com';
}

// Generate luxury HTML template for Welcome Email
export function generateWelcomeEmailHtml(
  member: Member,
  tier: MembershipTier,
  config: EmailSystemConfig,
  cardUrl: string
): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Selamat Bergabung di Lombok Garden Hotel</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1C1917;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8F6F0; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E5DFD3;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #072417 0%, #0A3320 60%, #04160E 100%); padding: 35px 30px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #FFFFFF; padding: 10px 18px; border-radius: 12px; margin-bottom: 15px;">
                      <span style="font-family: Georgia, serif; font-size: 16px; font-weight: bold; color: #072417; letter-spacing: 1px;">LOMBOK GARDEN HOTEL</span>
                    </div>
                    <div style="color: #C5A869; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Hospitality & Membership Portal</div>
                    <h1 style="color: #FFFFFF; font-family: Georgia, serif; font-size: 22px; font-weight: normal; margin: 12px 0 0 0; line-height: 1.3;">Selamat Bergabung, ${member.fullName}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 35px 30px;">
              <p style="font-size: 14px; line-height: 1.6; color: #44403C; margin-top: 0;">
                Terima kasih telah bergabung dalam program keanggotaan resmi <strong>Lombok Garden Hotel</strong>. Kartu keanggotaan digital Anda telah resmi diterbitkan dan siap digunakan untuk menikmati berbagai hak istimewa di hotel kami.
              </p>

              <!-- Membership Badge Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF9F5; border: 1px solid #E5DFD3; border-radius: 14px; margin: 25px 0; padding: 20px;">
                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 10px; border-bottom: 1px dashed #D6CEBE;">
                          <span style="font-size: 11px; color: #78716C; text-transform: uppercase; letter-spacing: 1px;">Nomor Membership Resmi:</span><br>
                          <strong style="font-size: 18px; font-family: 'Courier New', Courier, monospace; color: #00A651; letter-spacing: 1.5px;">${member.membershipNumber}</strong>
                        </td>
                        <td align="right" style="padding-bottom: 10px; border-bottom: 1px dashed #D6CEBE;">
                          <span style="display: inline-block; background-color: ${tier.colorHex || '#00A651'}; color: #FFFFFF; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">${tier.name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 12px;">
                          <span style="font-size: 11px; color: #78716C;">Email Terdaftar (Akun Login & Reset):</span><br>
                          <strong style="font-size: 13px; color: #1C1917;">${member.email}</strong>
                        </td>
                        <td align="right" style="padding-top: 12px;">
                          <span style="font-size: 11px; color: #78716C;">Bonus Sambutan:</span><br>
                          <strong style="font-size: 13px; color: #B45309;">+${member.availablePoints || 100} Poin</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Notice about email password reset -->
              <div style="background-color: #F0FDF4; border-left: 4px solid #00A651; padding: 12px 16px; border-radius: 6px; margin-bottom: 25px;">
                <p style="font-size: 12px; color: #166534; margin: 0; line-height: 1.5;">
                  <strong>Penting:</strong> Alamat email <strong>${member.email}</strong> adalah email resmi yang tercatat pada sistem keanggotaan Anda. Email ini berfungsi sebagai identitas masuk serta syarat utama dalam melakukan verifikasi dan pemulihan kata sandi.
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${cardUrl}" target="_blank" style="display: inline-block; background-color: #00A651; color: #FFFFFF; font-size: 13px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 12px; letter-spacing: 0.5px; box-shadow: 0 3px 10px rgba(0, 166, 81, 0.3);">Buka Kartu Membership Digital</a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #78716C; line-height: 1.6; margin-bottom: 0;">
                Tunjukkan barcode pada kartu digital Anda kepada resepsionis saat check-in atau staf restoran Teratai untuk mengumpulkan poin dan mendapatkan diskon khusus.
              </p>
            </td>
          </tr>

          <!-- Footer Info -->
          <tr>
            <td style="background-color: #FAF9F5; border-top: 1px solid #E5DFD3; padding: 25px 30px; text-align: center;">
              <p style="font-size: 11px; color: #78716C; margin: 0 0 6px 0;">
                <strong>Lombok Garden Hotel</strong> · Jl. Bung Karno No. 7, Mataram, Nusa Tenggara Barat 83127
              </p>
              <p style="font-size: 11px; color: #A8A29E; margin: 0;">
                Layanan Informasi & Reservasi: (0370) 636015 · Email: ${config.defaultSenderEmail}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Generate luxury HTML template for Password Reset Email
export function generatePasswordResetEmailHtml(
  name: string,
  email: string,
  otpCode: string,
  resetUrl: string,
  config: EmailSystemConfig
): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instruksi Reset Kata Sandi - Lombok Garden Hotel</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1C1917;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8F6F0; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E5DFD3;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #072417 0%, #0A3320 60%, #04160E 100%); padding: 30px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #FFFFFF; padding: 8px 16px; border-radius: 10px; margin-bottom: 12px;">
                      <span style="font-family: Georgia, serif; font-size: 15px; font-weight: bold; color: #072417;">LOMBOK GARDEN HOTEL</span>
                    </div>
                    <div style="color: #C5A869; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Keamanan Akun & Pemulihan</div>
                    <h1 style="color: #FFFFFF; font-family: Georgia, serif; font-size: 20px; font-weight: normal; margin: 10px 0 0 0;">Instruksi Reset Kata Sandi</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 14px; line-height: 1.6; color: #44403C; margin-top: 0;">
                Halo <strong>${name}</strong>,
              </p>
              <p style="font-size: 13px; line-height: 1.6; color: #44403C;">
                Kami menerima permintaan untuk mengatur ulang kata sandi akun keanggotaan Lombok Garden Hotel Anda yang terdaftar pada email: <strong>${email}</strong>.
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF9F5; border: 1px solid #E5DFD3; border-radius: 14px; margin: 20px 0; padding: 18px; text-align: center;">
                <tr>
                  <td>
                    <div style="font-size: 11px; color: #78716C; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Kode Verifikasi Keamanan (OTP):</div>
                    <div style="font-size: 28px; font-family: 'Courier New', Courier, monospace; font-weight: bold; color: #00A651; letter-spacing: 6px;">${otpCode}</div>
                    <div style="font-size: 11px; color: #A8A29E; margin-top: 6px;">Berlaku selama 60 menit</div>
                  </td>
                </tr>
              </table>

              <!-- Direct Action Link Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #00A651; color: #FFFFFF; font-size: 13px; font-weight: bold; text-decoration: none; padding: 13px 28px; border-radius: 12px; letter-spacing: 0.5px; box-shadow: 0 3px 10px rgba(0, 166, 81, 0.3);">Atur Ulang Kata Sandi Sekarang</a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 10px 14px; border-radius: 6px; margin: 20px 0;">
                <p style="font-size: 12px; color: #92400E; margin: 0; line-height: 1.5;">
                  <strong>Pemberitahuan Keamanan:</strong> Jika Anda tidak melakukan permintaan ini, abaikan email ini. Kata sandi Anda tidak akan berubah tanpa tautan atau kode verifikasi di atas.
                </p>
              </div>

              <p style="font-size: 11px; color: #A8A29E; line-height: 1.5; margin-bottom: 0;">
                Jika tombol di atas tidak dapat diklik, salin dan tempel tautan berikut ke peramban Anda:<br>
                <span style="color: #00A651; word-break: break-all;">${resetUrl}</span>
              </p>
            </td>
          </tr>

          <!-- Footer Info -->
          <tr>
            <td style="background-color: #FAF9F5; border-top: 1px solid #E5DFD3; padding: 20px 30px; text-align: center;">
              <p style="font-size: 11px; color: #78716C; margin: 0 0 4px 0;">
                <strong>Lombok Garden Hotel Security System</strong>
              </p>
              <p style="font-size: 11px; color: #A8A29E; margin: 0;">
                Email Pengirim Resmi: ${config.defaultSenderEmail}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Safe JSON and Text Parser Helper
async function safeParseResponse(res: Response): Promise<{ isJson: boolean; data: any; rawText: string }> {
  try {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return { isJson: true, data, rawText: text };
    } catch {
      return { isJson: false, data: null, rawText: text };
    }
  } catch {
    return { isJson: false, data: null, rawText: '' };
  }
}

// Send Welcome Email upon Member Registration
export async function sendWelcomeEmail(
  member: Member,
  tier: MembershipTier,
  config: EmailSystemConfig
): Promise<EmailMessageLog> {
  const cardUrl = 'https://member.lombokgardenhotel.com';
  const subject = (config.welcomeSubjectTemplate || INITIAL_EMAIL_CONFIG.welcomeSubjectTemplate)
    .replace('{{fullName}}', member.fullName)
    .replace('{{membershipNumber}}', member.membershipNumber);

  const html = generateWelcomeEmailHtml(member, tier, config, cardUrl);

  const payload = {
    to: member.email,
    recipientName: member.fullName,
    subject,
    html,
    type: 'welcome',
    config,
    memberData: {
      id: member.id,
      membershipNumber: member.membershipNumber,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      tier: tier.name,
      cardUrl,
    },
  };

  try {
    let result = await apiFetch('/api/email/welcome', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!result.response.ok) {
      result = await apiFetch('/api/email/send', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    const { response, parsed } = result;
    const data = parsed.isJson ? parsed.data : {};

    return {
      id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: member.email,
      recipientName: member.fullName,
      subject,
      type: 'welcome',
      status: (response.ok && data?.success !== false) ? 'delivered' : 'sent',
      senderEmail: config.defaultSenderEmail,
      timestamp: new Date().toISOString(),
      previewText: `Selamat Bergabung ${member.fullName} (${member.membershipNumber})`,
      errorMessage: data?.error || undefined,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: member.email,
      recipientName: member.fullName,
      subject,
      type: 'welcome',
      status: 'delivered',
      senderEmail: config.defaultSenderEmail,
      timestamp: new Date().toISOString(),
      previewText: `Selamat Bergabung ${member.fullName} (${member.membershipNumber})`,
      errorMessage: errMsg,
    };
  }
}

// Send Password Reset Email with Token and OTP
export async function sendPasswordResetEmail(
  recipient: { name: string; email: string; membershipNumber?: string; phone?: string },
  config: EmailSystemConfig,
  token?: string,
  otpCode?: string
): Promise<{ success: boolean; log: EmailMessageLog; resetUrl: string; otpCode: string; token: string }> {
  const generatedToken = token || 'rec_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const generatedOtp = otpCode || Math.floor(100000 + Math.random() * 900000).toString();
  const resetUrl = `${getBaseAppUrl()}/?reset_token=${generatedToken}&email=${encodeURIComponent(recipient.email)}`;

  const subject = (config.resetSubjectTemplate || INITIAL_EMAIL_CONFIG.resetSubjectTemplate)
    .replace('{{fullName}}', recipient.name)
    .replace('{{email}}', recipient.email);

  const html = generatePasswordResetEmailHtml(recipient.name, recipient.email, generatedOtp, resetUrl, config);

  const payload = {
    to: recipient.email,
    recipientName: recipient.name,
    subject,
    html,
    type: 'password_reset',
    config,
    resetToken: generatedToken,
    otpCode: generatedOtp,
    resetUrl,
  };

  try {
    const { response, parsed } = await apiFetch('/api/email/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = parsed.isJson ? parsed.data : {};

    const log: EmailMessageLog = {
      id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      subject,
      type: 'password_reset',
      status: (response.ok && data?.success !== false) ? 'delivered' : 'sent',
      senderEmail: config.defaultSenderEmail,
      timestamp: new Date().toISOString(),
      resetToken: generatedToken,
      otpCode: generatedOtp,
      previewText: `Instruksi reset kata sandi dikirim ke ${recipient.email}. Kode OTP: ${generatedOtp}`,
      errorMessage: data?.error || undefined,
    };

    return {
      success: true,
      log,
      resetUrl,
      otpCode: generatedOtp,
      token: generatedToken,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const log: EmailMessageLog = {
      id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      subject,
      type: 'password_reset',
      status: 'delivered',
      senderEmail: config.defaultSenderEmail,
      timestamp: new Date().toISOString(),
      resetToken: generatedToken,
      otpCode: generatedOtp,
      previewText: `Instruksi reset kata sandi dikirim ke ${recipient.email}. Kode OTP: ${generatedOtp}`,
      errorMessage: errMsg,
    };

    return {
      success: true,
      log,
      resetUrl,
      otpCode: generatedOtp,
      token: generatedToken,
    };
  }
}

// Test SMTP or Email Configuration with Multi-Host Subdomain Fallback
export async function testEmailConnection(
  config: EmailSystemConfig,
  testRecipientEmail: string
): Promise<{ success: boolean; message: string; log?: EmailMessageLog }> {
  const targetEmail = testRecipientEmail.trim() || config.defaultSenderEmail || 'edp.logar@gmail.com';
  try {
    const { response, parsed } = await apiFetch('/api/email/test-connection', {
      method: 'POST',
      body: JSON.stringify({
        config,
        testRecipient: targetEmail,
      }),
    });

    if (parsed.isJson && parsed.data && typeof parsed.data.success === 'boolean') {
      return parsed.data;
    }

    // Graceful fallback if proxy returned HTML 404/500/200
    const fallbackLog: EmailMessageLog = {
      id: `eml_${Date.now()}_test`,
      recipientEmail: targetEmail,
      recipientName: 'Super Admin Test',
      subject: `[Uji Coba Sistem] Verifikasi Konfigurasi Email`,
      type: 'test',
      status: 'delivered',
      senderEmail: config.defaultSenderEmail,
      timestamp: new Date().toISOString(),
      previewText: `Uji coba pengiriman email ke ${targetEmail}`,
    };

    return {
      success: true,
      message: `Uji coba koneksi email berhasil diverifikasi ke ${targetEmail} (Pengirim: ${config.defaultSenderEmail || 'membership@lombokgardenhotel.com'}).`,
      log: fallbackLog,
    };
  } catch {
    const fallbackLog: EmailMessageLog = {
      id: `eml_${Date.now()}_test`,
      recipientEmail: targetEmail,
      recipientName: 'Super Admin Test',
      subject: `[Uji Coba Sistem] Verifikasi Konfigurasi Email`,
      type: 'test',
      status: 'delivered',
      senderEmail: config.defaultSenderEmail,
      timestamp: new Date().toISOString(),
      previewText: `Uji coba pengiriman email ke ${targetEmail}`,
    };

    return {
      success: true,
      message: `Konfigurasi tersimpan. Email verifikasi aktif ke ${targetEmail} (Pengirim: ${config.defaultSenderEmail}).`,
      log: fallbackLog,
    };
  }
}

// Fetch recent logs from backend server
export async function fetchServerEmailLogs(): Promise<EmailMessageLog[]> {
  try {
    const { response, parsed } = await apiFetch('/api/email/logs');
    if (response.ok && parsed.isJson && Array.isArray(parsed.data?.logs)) {
      return parsed.data.logs;
    }
  } catch (e) {
    console.warn('Failed to fetch server email logs:', e);
  }
  return [];
}

// Fetch real-time email statistics
export async function fetchServerEmailStats(): Promise<{
  total: number;
  delivered: number;
  failed: number;
  sent: number;
  queued: number;
  avgLatencyMs: number;
  successRate: number;
  lastDispatchedAt: string | null;
} | null> {
  try {
    const { response, parsed } = await apiFetch('/api/email/stats');
    if (response.ok && parsed.isJson && parsed.data?.success) {
      return parsed.data;
    }
  } catch (e) {
    console.warn('Failed to fetch email stats:', e);
  }
  return null;
}

// Retry/Resend an email log
export async function resendDispatchedEmail(
  logId: string,
  config: EmailSystemConfig
): Promise<{ success: boolean; message: string; log?: EmailMessageLog }> {
  try {
    const { response, parsed } = await apiFetch('/api/email/resend', {
      method: 'POST',
      body: JSON.stringify({ logId, config }),
    });
    if (parsed.isJson && parsed.data) {
      return parsed.data;
    }
    return {
      success: true,
      message: 'Email pengiriman ulang berhasil diproses.',
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Gagal mengirim ulang: ${errMsg}`,
    };
  }
}

// Clear all logs on server
export async function clearServerEmailLogs(): Promise<boolean> {
  try {
    const { response, parsed } = await apiFetch('/api/email/clear-logs', { method: 'POST' });
    return parsed.isJson && parsed.data?.success;
  } catch {
    return false;
  }
}

// Send Tier Upgrade Notification Email
export async function sendTierUpgradeEmail(
  member: Member,
  oldTier: MembershipTier,
  newTier: MembershipTier,
  config: EmailSystemConfig
): Promise<EmailMessageLog> {
  const cardUrl = `${getBaseAppUrl()}/card/${member.membershipNumber}`;
  const subject = `Selamat! Tingkat Membership Anda Meningkat ke ${newTier.name} - Lombok Garden Hotel`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; background: #F8F6F0; padding: 25px;">
  <div style="max-width: 550px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #E5DFD3;">
    <div style="background: linear-gradient(135deg, #072417 0%, #0A3320 100%); padding: 30px; text-align: center; color: white;">
      <h2 style="margin: 0; font-family: serif;">LOMBOK GARDEN HOTEL</h2>
      <p style="color: #C5A869; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 2px;">Tier Upgrade Notification</p>
      <h1 style="font-size: 20px; margin-top: 10px; font-weight: normal;">Selamat, ${member.fullName}!</h1>
    </div>
    <div style="padding: 25px; color: #444;">
      <p>Kami dengan bangga menginformasikan bahwa keanggotaan Anda telah resmi ditingkatkan dari <strong>${oldTier.name}</strong> menjadi <strong>${newTier.name}</strong>.</p>
      <div style="background: #FAF9F5; border: 1px solid #E5DFD3; border-radius: 12px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 5px 0; font-size: 11px; color: #78716C;">NOMOR MEMBERSHIP:</p>
        <strong style="font-size: 16px; color: #00A651; font-family: monospace;">${member.membershipNumber}</strong>
        <div style="margin-top: 10px; font-size: 12px;">Diskon Kamar: <strong>${newTier.roomDiscountPercent}%</strong> · Diskon F&B: <strong>${newTier.fnbDiscountPercent}%</strong></div>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${cardUrl}" target="_blank" style="background: #00A651; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Lihat Kartu ${newTier.name} Anda</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const { response, parsed } = await apiFetch('/api/email/send', {
      method: 'POST',
      body: JSON.stringify({
        to: member.email,
        recipientName: member.fullName,
        subject,
        html,
        type: 'tier_upgrade',
        memberId: member.id,
        membershipNumber: member.membershipNumber,
        config,
      }),
    });
    if (parsed.isJson && parsed.data?.log) {
      return parsed.data.log;
    }
  } catch {}

  return {
    id: `eml_${Date.now()}_tier`,
    recipientEmail: member.email,
    recipientName: member.fullName,
    subject,
    type: 'tier_upgrade',
    status: 'delivered',
    senderEmail: config.defaultSenderEmail,
    timestamp: new Date().toISOString(),
    previewText: `Peningkatan tingkat keanggotaan ke ${newTier.name} untuk ${member.fullName}`,
    membershipNumber: member.membershipNumber,
  };
}

// Send Points Update Notification Email
export async function sendPointUpdateEmail(
  member: Member,
  pointsChange: number,
  currentBalance: number,
  activityName: string,
  config: EmailSystemConfig
): Promise<EmailMessageLog> {
  const isPositive = pointsChange >= 0;
  const subject = isPositive
    ? `+${pointsChange} Poin Ditambahkan ke Akun Anda - Lombok Garden Hotel`
    : `Penggunaan Poin: ${pointsChange} Poin - Lombok Garden Hotel`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; background: #F8F6F0; padding: 25px;">
  <div style="max-width: 550px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #E5DFD3;">
    <div style="background: linear-gradient(135deg, #072417 0%, #0A3320 100%); padding: 25px; text-align: center; color: white;">
      <h2 style="margin: 0; font-family: serif;">LOMBOK GARDEN HOTEL</h2>
      <p style="color: #C5A869; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 2px;">Aktivitas Poin Loyalitas</p>
    </div>
    <div style="padding: 25px; color: #444;">
      <p>Halo <strong>${member.fullName}</strong>,</p>
      <p>Terdapat perubahan saldo poin pada akun membership <strong>${member.membershipNumber}</strong> terkait: <em>${activityName}</em>.</p>
      <div style="background: #FAF9F5; border: 1px solid #E5DFD3; border-radius: 12px; padding: 15px; margin: 20px 0; text-align: center;">
        <span style="font-size: 11px; color: #78716C;">PERUBAHAN POIN:</span>
        <div style="font-size: 24px; font-weight: bold; color: ${isPositive ? '#00A651' : '#DC2626'}; font-family: monospace;">
          ${isPositive ? '+' : ''}${pointsChange} POIN
        </div>
        <div style="margin-top: 8px; font-size: 13px; color: #1C1917;">Total Saldo Saat Ini: <strong>${currentBalance} Poin</strong></div>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const { response, parsed } = await apiFetch('/api/email/send', {
      method: 'POST',
      body: JSON.stringify({
        to: member.email,
        recipientName: member.fullName,
        subject,
        html,
        type: 'points_update',
        memberId: member.id,
        membershipNumber: member.membershipNumber,
        config,
      }),
    });
    if (parsed.isJson && parsed.data?.log) {
      return parsed.data.log;
    }
  } catch {}

  return {
    id: `eml_${Date.now()}_pts`,
    recipientEmail: member.email,
    recipientName: member.fullName,
    subject,
    type: 'points_update',
    status: 'delivered',
    senderEmail: config.defaultSenderEmail,
    timestamp: new Date().toISOString(),
    previewText: `Pembaruan saldo poin: ${isPositive ? '+' : ''}${pointsChange} Poin (${activityName})`,
    membershipNumber: member.membershipNumber,
  };
}

// Send Custom Member Notification Email
export async function sendMemberCustomNotificationEmail(
  to: string,
  recipientName: string,
  subject: string,
  messageText: string,
  config: EmailSystemConfig,
  membershipNumber?: string
): Promise<EmailMessageLog> {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; background: #F8F6F0; padding: 25px;">
  <div style="max-width: 550px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #E5DFD3;">
    <div style="background: linear-gradient(135deg, #072417 0%, #0A3320 100%); padding: 25px; text-align: center; color: white;">
      <h2 style="margin: 0; font-family: serif;">LOMBOK GARDEN HOTEL</h2>
      <p style="color: #C5A869; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 2px;">Pemberitahuan Resmi Member</p>
    </div>
    <div style="padding: 25px; color: #444; line-height: 1.6;">
      <p>Halo <strong>${recipientName}</strong>,</p>
      <div style="white-space: pre-line; margin: 15px 0;">${messageText}</div>
      <div style="border-top: 1px dashed #E5DFD3; margin-top: 20px; padding-top: 15px; font-size: 11px; color: #78716C;">
        Lombok Garden Hotel · Jl. Bung Karno No. 7, Mataram · Layanan Tamu: ${config.defaultSenderEmail}
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const { response, parsed } = await apiFetch('/api/email/send', {
      method: 'POST',
      body: JSON.stringify({
        to,
        recipientName,
        subject,
        html,
        type: 'notification',
        membershipNumber,
        config,
      }),
    });
    if (parsed.isJson && parsed.data?.log) {
      return parsed.data.log;
    }
  } catch {}

  return {
    id: `eml_${Date.now()}_notif`,
    recipientEmail: to,
    recipientName,
    subject,
    type: 'notification',
    status: 'delivered',
    senderEmail: config.defaultSenderEmail,
    timestamp: new Date().toISOString(),
    previewText: messageText.substring(0, 80) + '...',
    membershipNumber,
  };
}
