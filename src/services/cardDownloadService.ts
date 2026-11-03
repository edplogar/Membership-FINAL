import { Member, MembershipTier } from '../types';
import QRCode from 'qrcode';
import { formatDateIndo } from './membershipEngine';
import { MEMBER_CUSTOM_DOMAIN } from './domainService';

/**
 * Renders a high-resolution, luxury digital membership card on an HTML5 Canvas
 * and triggers an instant PNG image download.
 * Compatible with all modern browsers across desktop and mobile.
 */
export async function downloadMemberCardImage(
  member: Member,
  tier: MembershipTier
): Promise<boolean> {
  try {
    const canvas = document.createElement('canvas');
    // Standard CR80 card ratio 1.586 : 1 (1012 x 638 px for crisp 300dpi retina clarity)
    canvas.width = 1012;
    canvas.height = 638;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const width = canvas.width;
    const height = canvas.height;
    const radius = 32;

    // Draw rounded card clipping path
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.clip();

    // 1. Background Gradient by Tier
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (tier.level === 4) {
      // Platinum: Deep Luxury Obsidian & Slate
      bgGrad.addColorStop(0, '#09090b');
      bgGrad.addColorStop(0.45, '#18181b');
      bgGrad.addColorStop(1, '#020617');
    } else if (tier.level === 3) {
      // Gold: Warm Espresso & Rich Amber Gold
      bgGrad.addColorStop(0, '#381c04');
      bgGrad.addColorStop(0.5, '#1c1917');
      bgGrad.addColorStop(1, '#271103');
    } else if (tier.level === 2) {
      // Silver: Titanium & Deep Slate
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#0b1120');
    } else {
      // Member: Emerald Forest & Deep Jade
      bgGrad.addColorStop(0, '#022c22');
      bgGrad.addColorStop(0.5, '#064e3b');
      bgGrad.addColorStop(1, '#021812');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle Luxury Geometric Pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let x = 30; x < width; x += 40) {
      for (let y = 30; y < height; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Luxurious Border Accents
    const borderColor =
      tier.level === 4
        ? '#fbbf24' // Platinum Gold
        : tier.level === 3
        ? '#f59e0b' // Gold
        : tier.level === 2
        ? '#cbd5e1' // Silver
        : '#10b981'; // Emerald

    // Outer Glow / Rim
    ctx.lineWidth = 4;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // Inner Hairline Frame
    ctx.beginPath();
    ctx.roundRect(16, 16, width - 32, height - 32, radius - 8);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    // 4. Header: Hotel Brand
    // Official Logo Container
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(45, 38, 58, 58, 16);
    ctx.fill();

    // Try loading and drawing official vector logo from /lombok-garden-logo.svg
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/lombok-garden-logo.svg';
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
      });
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.drawImage(logoImg, 49, 42, 50, 50);
      } else {
        // Fallback: Exact Brand Flower Blossom Drawing
        ctx.fillStyle = '#00A651';
        ctx.beginPath();
        ctx.arc(74, 67, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(74, 67, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } catch {
      // Graceful fallback
      ctx.fillStyle = '#00A651';
      ctx.beginPath();
      ctx.arc(74, 67, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hotel Name Typography
    ctx.font = '900 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = '1px';
    ctx.fillText('LOMBOK GARDEN HOTEL', 120, 66);

    ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#34D399';
    ctx.letterSpacing = '3px';
    ctx.fillText('HOSPITALITY & LOYALTY CLUB', 121, 86);

    // 5. Tier Badge on Top Right
    const tierNameUpper = `${tier.name.toUpperCase()} TIER`;
    ctx.font = 'bold 18px Georgia, serif';
    const tierTextWidth = ctx.measureText(tierNameUpper).width;
    const badgeW = tierTextWidth + 36;
    const badgeH = 38;
    const badgeX = width - 45 - badgeW;
    const badgeY = 46;

    ctx.fillStyle = tier.colorHex || '#00A651';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(tierNameUpper, badgeX + 18, badgeY + 25);

    // Level label underneath tier
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`LEVEL ${tier.level} MEMBER`, badgeX + 18, badgeY + 54);

    // 6. Metallic EMV Smart Chip
    const chipX = 50;
    const chipY = 150;
    const chipW = 76;
    const chipH = 58;

    const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH);
    if (tier.level === 2) {
      chipGrad.addColorStop(0, '#e2e8f0');
      chipGrad.addColorStop(0.5, '#94a3b8');
      chipGrad.addColorStop(1, '#cbd5e1');
    } else {
      chipGrad.addColorStop(0, '#fde68a');
      chipGrad.addColorStop(0.5, '#d97706');
      chipGrad.addColorStop(1, '#fbbf24');
    }

    ctx.fillStyle = chipGrad;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Chip contact circuit patterns
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chipX + 22, chipY);
    ctx.lineTo(chipX + 22, chipY + chipH);
    ctx.moveTo(chipX + 54, chipY);
    ctx.lineTo(chipX + 54, chipY + chipH);
    ctx.moveTo(chipX, chipY + 29);
    ctx.lineTo(chipX + chipW, chipY + 29);
    ctx.stroke();

    // Contactless RFID waves icon
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.5;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.arc(chipX + chipW + 28, chipY + 29, r * 9, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
    }

    // 7. QR Code generation & placement (Scannable by hotel scanner gun)
    const qrSize = 160;
    const qrX = width - 50 - qrSize;
    const qrY = 180;

    // White rounded badge for QR
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 32, 16);
    ctx.fill();
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Generate real QR code image
    const qrDataUrl = await QRCode.toDataURL(member.membershipNumber, {
      margin: 0,
      width: qrSize * 2,
      color: {
        dark: '#052e16',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    const qrImg = new Image();
    await new Promise<void>((resolve, reject) => {
      qrImg.onload = () => resolve();
      qrImg.onerror = () => reject();
      qrImg.src = qrDataUrl;
    });

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Caption underneath QR
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#78716c';
    ctx.textAlign = 'center';
    ctx.fillText('PINDAI VALIDASI', qrX + qrSize / 2, qrY + qrSize + 14);
    ctx.textAlign = 'left';

    // 8. Main Monospace Membership Number
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.letterSpacing = '2px';
    ctx.fillText('NOMOR MEMBERSHIP RESMI', 50, 275);

    ctx.font = 'bold 36px "Courier New", Courier, monospace';
    ctx.fillStyle = borderColor;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(member.membershipNumber, 50, 318);
    ctx.shadowBlur = 0; // reset shadow

    // 9. Cardholder Name
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.letterSpacing = '2px';
    ctx.fillText('NAMA LENGKAP ANGGOTA', 50, 390);

    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(member.fullName.toUpperCase(), 50, 424);

    // 10. Dates (Member Since & Valid Thru)
    const joinYear = member.registrationDate
      ? formatDateIndo(member.registrationDate.slice(0, 10))
      : 'Aktif';
    const endYear = member.membershipEndDate
      ? formatDateIndo(member.membershipEndDate.slice(0, 10))
      : '24 Bulan';

    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('MEMBER SEJAK', 50, 480);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(joinYear, 50, 502);

    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('BERLAKU HINGGA', 260, 480);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(endYear, 260, 502);

    // 11. Bottom Security Strip & Portal Login Link
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, height - 70, width, 70);

    ctx.beginPath();
    ctx.moveTo(0, height - 70);
    ctx.lineTo(width, height - 70);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Portal Resmi Tamu & Login:', 50, height - 32);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = borderColor;
    ctx.fillText(`https://${MEMBER_CUSTOM_DOMAIN}`, 230, height - 31);

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'right';
    ctx.fillText('OFFICIAL DIGITAL VIP CARD', width - 50, height - 32);
    ctx.textAlign = 'left';

    ctx.restore();

    // Trigger instant PNG Download
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = dataUrl;
    downloadAnchor.download = `Kartu-Member-LombokGarden-${member.membershipNumber}.png`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);

    return true;
  } catch (err) {
    console.error('Failed to generate member card download:', err);
    return false;
  }
}
