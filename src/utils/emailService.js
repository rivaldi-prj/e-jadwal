import emailjs from "@emailjs/browser";

const EMAIL_CONFIG_KEY = "e_jadwal_email_config_v1";

/**
 * Membaca konfigurasi email (Brevo + EmailJS + Mode Provider).
 * Default provider: 'smart' (Otomatis: Coba Brevo dulu, jika kuota/error fallback ke EmailJS).
 */
export function getEmailConfig() {
  try {
    const saved = localStorage.getItem(EMAIL_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        enabled: parsed.enabled ?? true,
        provider: parsed.provider || "smart", // 'smart' | 'brevo' | 'emailjs'

        // Operator / Admin Notification Config (Menerima notifikasi setiap ada mahasiswa mengajukan jadwal)
        operatorEmail: parsed.operatorEmail || import.meta.env.VITE_OPERATOR_EMAIL || parsed.brevoSenderEmail || "s1kebidanan@fikes.unbrah.ac.id",
        operatorPhone: parsed.operatorPhone || import.meta.env.VITE_OPERATOR_PHONE || "",

        // Brevo (Sendinblue) config - Kuota gratis 300 email/hari (9.000/bln)
        brevoApiKey: parsed.brevoApiKey || import.meta.env.VITE_BREVO_API_KEY || "",
        brevoSenderEmail: parsed.brevoSenderEmail || import.meta.env.VITE_BREVO_SENDER_EMAIL || "",
        brevoSenderName: parsed.brevoSenderName || import.meta.env.VITE_BREVO_SENDER_NAME || "E-Jadwal S1 Kebidanan UNBRAH",

        // EmailJS config - Kuota gratis 200 email/bln
        serviceId: parsed.serviceId || import.meta.env.VITE_EMAILJS_SERVICE_ID || "",
        templateApprovedId: parsed.templateApprovedId || import.meta.env.VITE_EMAILJS_TEMPLATE_APPROVED || "",
        templateRejectedId: parsed.templateRejectedId || import.meta.env.VITE_EMAILJS_TEMPLATE_REJECTED || "",
        publicKey: parsed.publicKey || import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "",
      };
    }
  } catch (e) {
    console.warn("Error reading email config from localStorage:", e);
  }

  return {
    enabled: true,
    provider: "smart",
    operatorEmail: import.meta.env.VITE_OPERATOR_EMAIL || "s1kebidanan@fikes.unbrah.ac.id",
    operatorPhone: import.meta.env.VITE_OPERATOR_PHONE || "",
    brevoApiKey: import.meta.env.VITE_BREVO_API_KEY || "",
    brevoSenderEmail: import.meta.env.VITE_BREVO_SENDER_EMAIL || "",
    brevoSenderName: import.meta.env.VITE_BREVO_SENDER_NAME || "E-Jadwal S1 Kebidanan UNBRAH",
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || "",
    templateApprovedId: import.meta.env.VITE_EMAILJS_TEMPLATE_APPROVED || "",
    templateRejectedId: import.meta.env.VITE_EMAILJS_TEMPLATE_REJECTED || "",
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "",
  };
}

export function saveEmailConfig(cfg) {
  try {
    localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(cfg));
    return true;
  } catch (e) {
    console.error("Error saving email config:", e);
    return false;
  }
}

/**
 * Cek apakah salah satu atau kedua provider sudah dikonfigurasi.
 */
export function isEmailConfigured() {
  const cfg = getEmailConfig();
  if (!cfg.enabled) return false;

  const isBrevoReady = Boolean(cfg.brevoApiKey && cfg.brevoSenderEmail);
  const isEmailJsReady = Boolean(cfg.serviceId && cfg.publicKey);

  if (cfg.provider === "brevo") return isBrevoReady;
  if (cfg.provider === "emailjs") return isEmailJsReady;
  return isBrevoReady || isEmailJsReady;
}

/* ==========================================================================
   BREVO REST API IMPLEMENTATION (300 email/hari gratis)
   ========================================================================== */

/**
 * Mengirim email langsung via Brevo (Sendinblue) Transactional REST API v3.
 * Tidak membutuhkan template di dashboard Brevo karena isi HTML dihasilkan dinamis.
 */
async function sendViaBrevo({ to, subject, htmlContent, cfg }) {
  if (!cfg.brevoApiKey || !cfg.brevoSenderEmail) {
    throw new Error("API Key dan Email Pengirim Brevo belum diisi di Pengaturan.");
  }

  const endpoint = "https://api.brevo.com/v3/smtp/email";

  const payload = {
    sender: {
      name: cfg.brevoSenderName || "E-Jadwal S1 Kebidanan UNBRAH",
      email: cfg.brevoSenderEmail.trim(),
    },
    to: [
      {
        email: to.email.trim(),
        name: to.name?.trim() || to.email.trim(),
      },
    ],
    subject: subject,
    htmlContent: htmlContent,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": cfg.brevoApiKey.trim(),
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errDetail = "";
    try {
      const errJson = await response.json();
      errDetail = errJson.message || errJson.error || JSON.stringify(errJson);
    } catch {
      errDetail = await response.text().catch(() => response.statusText);
    }
    throw new Error(`Brevo API Error (${response.status}): ${errDetail}`);
  }

  const data = await response.json().catch(() => ({}));
  return { provider: "brevo", messageId: data.messageId || "sent", raw: data };
}

/* ==========================================================================
   EMAILJS IMPLEMENTATION (200 email/bulan gratis)
   ========================================================================== */

async function sendViaEmailJS(serviceId, templateId, params, publicKey, maxRetries = 3) {
  const delays = [0, 1500, 3000];
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (delays[attempt] > 0) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
    try {
      const result = await emailjs.send(serviceId, templateId, params, publicKey);
      if (attempt > 0) {
        console.log(`[EmailJS] Berhasil terkirim pada percobaan ke-${attempt + 1}`);
      }
      return { provider: "emailjs", result };
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.code || "unknown";
      console.warn(`[EmailJS] Percobaan ke-${attempt + 1} gagal (status: ${status}):`, err?.text || err?.message || err);

      if (status === 429 || String(err?.text || "").includes("rate limit")) {
        console.warn("[EmailJS] Rate limit terdeteksi, menunggu 5 detik...");
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  throw lastError;
}

/* ==========================================================================
   RESPONSIVE HTML TEMPLATE GENERATOR UNTUK BREVO
   ========================================================================== */

function generateEmailHtml({
  badgeText,
  badgeBg,
  badgeTextColor,
  heading,
  description,
  booking,
  zoomConfig,
  isApproved = false,
  isRejected = false,
  rejectReason = "",
}) {
  const yearNow = new Date().getFullYear();
  const dateStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isGmeet = (booking?.room || 'zoom') === 'gmeet';
  const resolvedZoomUrl = (zoomConfig?.joinUrl && zoomConfig.joinUrl.trim()) || "https://zoom.us/j/91053222846?pwd=IVBzhDahrYwKkOZtl80RS88eZH1JzE.1";
  const resolvedGmeetUrl = (zoomConfig?.gmeetUrl && zoomConfig.gmeetUrl.trim()) || "https://meet.google.com/kqe-reho-vbd";

  const zoomBox = isApproved
    ? isGmeet
      ? `
      <div style="margin-top: 24px; padding: 20px; background: #f0fdfa; border: 1.5px solid #5eead4; border-radius: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="display: inline-block; width: 10px; height: 10px; background: #0d9488; border-radius: 50%; margin-right: 8px;"></span>
          <strong style="color: #0f766e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Akses Ruang Virtual Google Meet:</strong>
        </div>
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #115e59; line-height: 1.5;">
          Perkuliahan ini menggunakan <strong>Google Meet</strong> karena ruang Zoom pada sesi ini telah digunakan oleh mata kuliah lain.
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 120px;">Platform:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">Google Meet</td>
          </tr>
          <tr>
            <td style="padding: 8px 0 4px 0; color: #64748b; vertical-align: top;">Tautan Meet:</td>
            <td style="padding: 8px 0 4px 0;">
              <a href="${resolvedGmeetUrl}" target="_blank" style="color: #0d9488; text-decoration: underline; word-break: break-all; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12.5px; font-weight: bold; line-height: 1.4; display: block;">
                ${resolvedGmeetUrl}
              </a>
            </td>
          </tr>
        </table>

        <div style="margin-top: 18px; text-align: center;">
          <a href="${resolvedGmeetUrl}" target="_blank" style="display: inline-block; background: #0d9488; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(13,148,136,0.35);">
            Buka Tautan Google Meet Sekarang &rarr;
          </a>
        </div>
      </div>
      `
      : `
      <div style="margin-top: 24px; padding: 20px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="display: inline-block; width: 10px; height: 10px; background: #16a34a; border-radius: 50%; margin-right: 8px;"></span>
          <strong style="color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Akses Ruang Virtual Zoom:</strong>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 120px;">Nama Akun:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${zoomConfig?.name || "ZOOM KEBIDANAN"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Meeting ID:</td>
            <td style="padding: 6px 0; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 15px; font-weight: bold; color: #0f172a; letter-spacing: 1px;">
              ${zoomConfig?.meetingId || "-"}
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Passcode:</td>
            <td style="padding: 6px 0; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 15px; font-weight: bold; color: #0f172a; letter-spacing: 1px;">
              ${zoomConfig?.passcode || "-"}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0 4px 0; color: #64748b; vertical-align: top;">Link Zoom:</td>
            <td style="padding: 8px 0 4px 0;">
              <a href="${resolvedZoomUrl}" target="_blank" style="color: #0284c7; text-decoration: underline; word-break: break-all; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; font-weight: 600; line-height: 1.4; display: block;">
                ${resolvedZoomUrl}
              </a>
            </td>
          </tr>
        </table>

        <div style="margin-top: 18px; text-align: center;">
          <a href="${resolvedZoomUrl}" target="_blank" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(2,132,199,0.35);">
            Buka Link Zoom Sekarang &rarr;
          </a>
        </div>
      </div>
    `
    : "";

  const rejectBox = isRejected
    ? `
      <div style="margin-top: 20px; padding: 16px; background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 12px;">
        <strong style="color: #9f1239; font-size: 13px; display: block; margin-bottom: 6px;">Alasan Penolakan Pengelola:</strong>
        <p style="margin: 0; color: #881337; font-size: 13px; font-style: italic; line-height: 1.5;">
          "${rejectReason || "Waktu perkuliahan bentrok atau tidak tersedia."}"
        </p>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 30px; text-align: left; border-bottom: 3px solid #0d9488;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 600;">
                UNIVERSITAS BAITURRAHMAH &bull; FIKES
              </p>
              <h1 style="margin: 6px 0 0 0; font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                E-Jadwal S1 Kebidanan &amp; Zoom
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 30px;">
              <!-- Status Badge -->
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background-color: ${badgeBg}; color: ${badgeTextColor};">
                  ${badgeText}
                </span>
              </div>

              <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 750; color: #0f172a;">
                ${heading}
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.6; color: #475569;">
                Halo <strong>${booking.requestedBy || "Mahasiswa / Pemohon"}</strong>,<br>
                ${description}
              </p>

              <!-- Booking Details Card -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
                <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">
                  Rincian Pengajuan Jadwal
                </h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 130px;">Mata Kuliah:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${booking.note || "Perkuliahan"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Hari &amp; Sesi:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${booking.day || "-"} (${booking.timeSlot || "-"} WIB)</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Angkatan:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${booking.batch || "-"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Dosen / PIC:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${booking.pic || "-"}</td>
                  </tr>
                </table>
              </div>

              ${zoomBox}
              ${rejectBox}

              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                *Jika terdapat pertanyaan atau perubahan jadwal perkuliahan, silakan hubungi tim Pengelola Program Studi S1 Kebidanan FIKES Universitas Baiturrahmah.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 16px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                Pemberitahuan otomatis &bull; Dikirim pada ${dateStr} WIB
              </p>
              <p style="margin: 4px 0 0 0; font-size: 10.5px; color: #94a3b8;">
                &copy; ${yearNow} Program Studi S1 Kebidanan - Fakultas Ilmu Kesehatan Universitas Baiturrahmah.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Template Email Notifikasi Khusus untuk Operator / Pengelola Prodi
 * Dikirim saat ada mahasiswa yang baru saja mengajukan jadwal
 */
function generateOperatorAlertHtml({ booking, appUrl, isAutoApproved = false }) {
  const yearNow = new Date().getFullYear();
  const dateStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isGmeet = (booking?.room || 'zoom') === 'gmeet';
  const roomName = isGmeet ? "Google Meet" : "Zoom";

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isAutoApproved ? "Jadwal Perkuliahan Baru (Auto-Approved)" : "Pengajuan Jadwal Kuliah Baru"}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 30px; text-align: left; border-bottom: 3px solid ${isAutoApproved ? '#0d9488' : '#f59e0b'};">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 600;">
                UNIVERSITAS BAITURRAHMAH &bull; FIKES
              </p>
              <h1 style="margin: 6px 0 0 0; font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                E-Jadwal S1 Kebidanan &amp; Zoom
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 30px;">
              <!-- Status Badge -->
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background-color: ${isAutoApproved ? '#dcfce7' : '#fef3c7'}; color: ${isAutoApproved ? '#15803d' : '#92400e'};">
                  ${isAutoApproved ? '⚡ JADWAL OTOMATIS DISETUJUI' : '🔔 PENGAJUAN JADWAL MASUK'}
                </span>
              </div>

              <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 750; color: #0f172a;">
                ${isAutoApproved ? 'Jadwal Kuliah Baru Berhasil Disetujui Otomatis' : 'Ada Pengajuan Jadwal Baru dari Mahasiswa'}
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.6; color: #475569;">
                Halo <strong>Operator / Pengelola Prodi</strong>,<br>
                ${isAutoApproved
                  ? `Terdapat jadwal perkuliahan daring baru yang telah <strong>OTOMATIS DISETUJUI</strong> oleh sistem karena ruang virtual (<strong>${roomName}</strong>) tersedia. Mahasiswa telah otomatis menerima kredensial akses dan jadwal langsung aktif di matriks:`
                  : `Terdapat pengajuan jadwal perkuliahan daring baru yang masuk ke dalam antrian sistem dan memerlukan tinjauan Anda:`}
              </p>

              <!-- Booking Details Card -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
                <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">
                  Rincian Pengajuan Jadwal
                </h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 130px;">Nama Pemohon:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${booking.requestedBy || "Mahasiswa / Pemohon"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Email Mahasiswa:</td>
                    <td style="padding: 6px 0; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12.5px; color: #0369a1;">${booking.requesterEmail || "-"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Mata Kuliah:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${booking.note || "Perkuliahan"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Hari &amp; Sesi:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${booking.day || "-"} (${booking.timeSlot || "-"} WIB)</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Ruang Platform:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: ${isGmeet ? '#0d9488' : '#0284c7'};">
                      ${roomName} ${isAutoApproved ? '(Telah Dialokasikan)' : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Angkatan:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${booking.batch || "-"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Dosen / PIC:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${booking.pic || "-"}</td>
                  </tr>
                </table>
              </div>

              <!-- Action Card for Mobile Operator -->
              ${isAutoApproved ? `
              <div style="margin-top: 24px; padding: 20px; background-color: #f0fdf4; border-radius: 12px; text-align: center; border: 1px solid #bbf7d0;">
                <p style="margin: 0 0 14px 0; font-size: 12.5px; color: #166534; line-height: 1.5;">
                  Jadwal ini sudah aktif di matriks. Anda dapat melihat kalender jadwal lengkap melalui aplikasi:
                </p>
                <a href="${appUrl}" target="_blank" style="display: inline-block; background: #15803d; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13.5px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 10px rgba(21,128,61,0.25);">
                  Buka E-Jadwal &amp; Lihat Matriks &rarr;
                </a>
              </div>
              ` : `
              <div style="margin-top: 24px; padding: 20px; background-color: #f1f5f9; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 14px 0; font-size: 12.5px; color: #334155; line-height: 1.5;">
                  Buka aplikasi langsung dari HP atau laptop Anda untuk <strong>Menyetujui</strong> atau <strong>Menolak</strong> jadwal ini:
                </p>
                <a href="${appUrl}" target="_blank" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13.5px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 10px rgba(15,23,42,0.25);">
                  Buka E-Jadwal &amp; Tinjau Pengajuan &rarr;
                </a>
              </div>
              `}

              <p style="margin: 20px 0 0 0; font-size: 11.5px; line-height: 1.5; color: #94a3b8; text-align: center;">
                *Notifikasi ini otomatis dikirimkan ke email Operator Prodi agar dapat segera dipantau langsung dari HP.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                Pemberitahuan otomatis E-Jadwal &bull; Dikirim pada ${dateStr} WIB
              </p>
              <p style="margin: 4px 0 0 0; font-size: 10.5px; color: #94a3b8;">
                &copy; ${yearNow} Program Studi S1 Kebidanan - Fakultas Ilmu Kesehatan Universitas Baiturrahmah.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/* ==========================================================================
   SMART DISPATCHER DUAL PROVIDER (BREVO + FAILOVER EMAILJS)
   ========================================================================== */

async function dispatchEmail({ toEmail, toName, subject, htmlContent, emailJsParams, cfg }) {
  const provider = cfg.provider || "smart";

  const isBrevoReady = Boolean(cfg.brevoApiKey && cfg.brevoSenderEmail);
  const isEmailJsReady = Boolean(cfg.serviceId && cfg.publicKey && (cfg.templateApprovedId || cfg.templateRejectedId));

  // 1. Explicit EmailJS Mode
  if (provider === "emailjs") {
    if (!isEmailJsReady) {
      throw new Error("Konfigurasi EmailJS belum lengkap (Service ID, Public Key, atau Template ID).");
    }
    const templateId = emailJsParams._templateId || cfg.templateApprovedId || cfg.templateRejectedId;
    return await sendViaEmailJS(cfg.serviceId, templateId, emailJsParams, cfg.publicKey);
  }

  // 2. Explicit Brevo Mode
  if (provider === "brevo") {
    if (!isBrevoReady) {
      throw new Error("Konfigurasi Brevo belum lengkap (API Key dan Email Pengirim wajib diisi).");
    }
    return await sendViaBrevo({
      to: { email: toEmail, name: toName },
      subject,
      htmlContent,
      cfg,
    });
  }

  // 3. Smart Mode (Default: Brevo Utama 300/hari -> Failover ke EmailJS)
  if (isBrevoReady) {
    try {
      console.log(`[SmartEmail] Mengirim via Brevo (Utama) ke ${toEmail}...`);
      const res = await sendViaBrevo({
        to: { email: toEmail, name: toName },
        subject,
        htmlContent,
        cfg,
      });
      console.log(`[SmartEmail] ✅ Sukses terkirim via Brevo ke ${toEmail}`);
      return { success: true, provider: "brevo", res };
    } catch (brevoErr) {
      console.warn(`[SmartEmail] ⚠️ Gagal via Brevo (${brevoErr.message}). Mencoba failover ke EmailJS...`);

      if (isEmailJsReady) {
        try {
          const templateId = emailJsParams._templateId || cfg.templateApprovedId || cfg.templateRejectedId;
          const emailJsRes = await sendViaEmailJS(cfg.serviceId, templateId, emailJsParams, cfg.publicKey);
          console.log(`[SmartEmail] ✅ Sukses terkirim via EmailJS (Failover) ke ${toEmail}`);
          return { success: true, provider: "emailjs", fallbackUsed: true, res: emailJsRes };
        } catch (emailJsErr) {
          throw new Error(
            `Semua provider gagal. Brevo: ${brevoErr.message} | EmailJS: ${emailJsErr?.text || emailJsErr?.message || emailJsErr}`
          );
        }
      } else {
        throw new Error(`Brevo gagal (${brevoErr.message}) dan EmailJS belum disetel sebagai cadangan.`);
      }
    }
  }

  // Jika Brevo belum disetel, coba EmailJS langsung
  if (isEmailJsReady) {
    console.log(`[SmartEmail] Brevo belum dikonfigurasi, mengirim via EmailJS ke ${toEmail}...`);
    const templateId = emailJsParams._templateId || cfg.templateApprovedId || cfg.templateRejectedId;
    const res = await sendViaEmailJS(cfg.serviceId, templateId, emailJsParams, cfg.publicKey);
    return { success: true, provider: "emailjs", res };
  }

  throw new Error("Belum ada konfigurasi email yang aktif. Silakan isi kredensial Brevo atau EmailJS di pengaturan.");
}

/* ==========================================================================
   PUBLIC NOTIFICATION FUNCTIONS
   ========================================================================== */

/**
 * Kirim email konfirmasi saat mahasiswa MENGAJUKAN jadwal (baru masuk antrian)
 */
export async function sendSubmissionEmail(booking) {
  if (!booking?.requesterEmail) {
    return { success: false, skipped: true, message: "Mahasiswa tidak mencantumkan email." };
  }

  const cfg = getEmailConfig();
  if (!cfg.enabled) {
    return { success: false, skipped: true, message: "Layanan email dinonaktifkan oleh Admin." };
  }

  const subject = `[DITERIMA] Pengajuan Jadwal Zoom: ${booking.note || "Perkuliahan"} (${booking.day || ""}) Sedang Ditinjau`;

  const htmlContent = generateEmailHtml({
    badgeText: "Sedang Ditinjau Pengelola",
    badgeBg: "#fef3c7",
    badgeTextColor: "#92400e",
    heading: "Pengajuan Jadwal Anda Berhasil Diterima",
    description: `Pengajuan jadwal Anda untuk mata kuliah <strong>${booking.note || "Perkuliahan"}</strong> pada hari <strong>${booking.day || "-"} (${booking.timeSlot || "-"} WIB)</strong> telah berhasil masuk antrian sistem dan sedang menunggu tinjauan Pengelola. Anda akan menerima notifikasi email berikutnya setelah pengajuan disetujui atau ditolak.`,
    booking,
  });

  const emailJsParams = {
    _templateId: cfg.templateApprovedId || cfg.templateRejectedId,
    to_email: booking.requesterEmail,
    email: booking.requesterEmail,
    user_email: booking.requesterEmail,
    to_name: booking.requestedBy || "Mahasiswa / Pemohon",
    name: booking.requestedBy || "Mahasiswa / Pemohon",
    subject,
    status_label: "MENUNGGU PERSETUJUAN PENGELOLA",
    status: "pending",
    course_name: booking.note || "Perkuliahan",
    day: booking.day || "-",
    time_slot: booking.timeSlot || "-",
    batch: booking.batch || "-",
    lecturer: booking.pic || "-",
    reject_reason: "-",
    zoom_visible: "none",
    zoom_name: "-",
    zoom_meeting_id: "-",
    zoom_passcode: "-",
    zoom_url: "https://zoom.us",
    message: `Pengajuan jadwal Anda untuk mata kuliah ${booking.note} pada hari ${booking.day} (${booking.timeSlot} WIB) telah berhasil diterima dan sedang menunggu tinjauan Pengelola.`,
  };

  try {
    const res = await dispatchEmail({
      toEmail: booking.requesterEmail,
      toName: booking.requestedBy,
      subject,
      htmlContent,
      emailJsParams,
      cfg,
    });
    return { success: true, ...res };
  } catch (err) {
    const errMsg = err?.message || String(err) || "Gagal mengirim email.";
    console.error(`[EmailService] ❌ Gagal mengirim email konfirmasi ke ${booking.requesterEmail}:`, err);
    return { success: false, error: err, message: errMsg };
  }
}

/**
 * Kirim email otomatis ketika Admin MENYETUJUI pengajuan jadwal
 */
export async function sendApprovalEmail(booking, zoomConfig) {
  if (!booking?.requesterEmail) {
    return { success: false, skipped: true, message: "Mahasiswa tidak mencantumkan email." };
  }

  const cfg = getEmailConfig();
  if (!cfg.enabled) {
    return { success: false, skipped: true, message: "Layanan email dinonaktifkan oleh Admin." };
  }

  const isGmeet = (booking?.room || 'zoom') === 'gmeet';
  const roomName = isGmeet ? "Google Meet" : "Zoom";

  const subject = `[DISETUJUI] Jadwal ${roomName} ${booking.note || "Perkuliahan"} - ${booking.day || ""} (${booking.timeSlot || ""})`;

  const heading = isGmeet
    ? "Selamat! Pengajuan Jadwal Kuliah Telah Disetujui (Google Meet)"
    : "Selamat! Pengajuan Jadwal Zoom Telah Disetujui";

  const description = isGmeet
    ? `Pengajuan jadwal Anda untuk mata kuliah <strong>${booking.note || "Perkuliahan"}</strong> pada hari <strong>${booking.day || "-"} (${booking.timeSlot || "-"} WIB)</strong> telah <strong>DISETUJUI</strong> via <strong>Google Meet</strong> (karena ruang Zoom pada sesi tersebut sudah terisi). Silakan gunakan tautan Google Meet berikut untuk perkuliahan:`
    : `Pengajuan jadwal Anda untuk mata kuliah <strong>${booking.note || "Perkuliahan"}</strong> pada hari <strong>${booking.day || "-"} (${booking.timeSlot || "-"} WIB)</strong> telah <strong>DISETUJUI</strong> oleh Pengelola. Silakan gunakan tautan dan kredensial Zoom berikut untuk memulai perkuliahan:`;

  const htmlContent = generateEmailHtml({
    badgeText: isGmeet ? "DISETUJUI & VIA GOOGLE MEET" : "DISETUJUI & SIAP DIGUNAKAN",
    badgeBg: isGmeet ? "#ccfbf1" : "#dcfce7",
    badgeTextColor: isGmeet ? "#0f766e" : "#15803d",
    heading,
    description,
    booking,
    zoomConfig,
    isApproved: true,
  });

  const emailJsParams = {
    _templateId: cfg.templateApprovedId || cfg.templateRejectedId,
    to_email: booking.requesterEmail,
    email: booking.requesterEmail,
    user_email: booking.requesterEmail,
    to_name: booking.requestedBy || "Mahasiswa / Pemohon",
    name: booking.requestedBy || "Mahasiswa / Pemohon",
    subject,
    status_label: "DISETUJUI",
    status: "approved",
    course_name: booking.note || "Perkuliahan",
    day: booking.day || "-",
    time_slot: booking.timeSlot || "-",
    batch: booking.batch || "-",
    lecturer: booking.pic || "-",
    reject_reason: "-",
    room_platform: roomName,
    meeting_link: isGmeet ? (zoomConfig?.gmeetUrl || "https://meet.google.com/kqe-reho-vbd") : (zoomConfig?.joinUrl || "https://zoom.us"),
    zoom_visible: isGmeet ? "none" : "block",
    zoom_name: isGmeet ? "Google Meet (Alternatif)" : (zoomConfig?.name || "ZOOM KEBIDANAN"),
    zoom_meeting_id: isGmeet ? "-" : (zoomConfig?.meetingId || "-"),
    zoom_passcode: isGmeet ? "-" : (zoomConfig?.passcode || "-"),
    zoom_url: isGmeet ? (zoomConfig?.gmeetUrl || "https://meet.google.com/kqe-reho-vbd") : (zoomConfig?.joinUrl || "https://zoom.us"),
    message: isGmeet
      ? `Selamat! Pengajuan jadwal Anda untuk mata kuliah ${booking.note} pada hari ${booking.day} (${booking.timeSlot} WIB) telah DISETUJUI via Google Meet.`
      : `Selamat! Pengajuan jadwal Anda untuk mata kuliah ${booking.note} pada hari ${booking.day} (${booking.timeSlot} WIB) telah DISETUJUI oleh Pengelola.`,
  };

  try {
    const res = await dispatchEmail({
      toEmail: booking.requesterEmail,
      toName: booking.requestedBy,
      subject,
      htmlContent,
      emailJsParams,
      cfg,
    });
    return { success: true, ...res };
  } catch (err) {
    const errMsg = err?.message || String(err) || "Gagal mengirim email.";
    console.error(`[EmailService] ❌ Gagal mengirim email persetujuan ke ${booking.requesterEmail}:`, err);
    return { success: false, error: err, message: errMsg };
  }
}

/**
 * Kirim email otomatis ketika Admin MENOLAK pengajuan jadwal
 */
export async function sendRejectionEmail(booking, rejectReason = "") {
  if (!booking?.requesterEmail) {
    return { success: false, skipped: true, message: "Mahasiswa tidak mencantumkan email." };
  }

  const cfg = getEmailConfig();
  if (!cfg.enabled) {
    return { success: false, skipped: true, message: "Layanan email dinonaktifkan oleh Admin." };
  }

  const alasan = rejectReason || "Waktu perkuliahan bentrok atau ruangan virtual sedang tidak tersedia pada jam tersebut.";
  const subject = `[DITOLAK] Pengajuan Jadwal Zoom: ${booking.note || "Perkuliahan"} - ${booking.day || ""}`;

  const htmlContent = generateEmailHtml({
    badgeText: "PENGAJUAN DITOLAK",
    badgeBg: "#ffe4e6",
    badgeTextColor: "#be123c",
    heading: "Pemberitahuan Status Pengajuan Jadwal",
    description: `Mohon maaf, pengajuan jadwal Anda untuk mata kuliah <strong>${booking.note || "Perkuliahan"}</strong> pada hari <strong>${booking.day || "-"} (${booking.timeSlot || "-"} WIB)</strong> belum dapat disetujui.`,
    booking,
    isRejected: true,
    rejectReason: alasan,
  });

  const emailJsParams = {
    _templateId: cfg.templateRejectedId || cfg.templateApprovedId,
    to_email: booking.requesterEmail,
    email: booking.requesterEmail,
    user_email: booking.requesterEmail,
    to_name: booking.requestedBy || "Mahasiswa / Pemohon",
    name: booking.requestedBy || "Mahasiswa / Pemohon",
    subject,
    status_label: "DITOLAK",
    status: "rejected",
    course_name: booking.note || "Perkuliahan",
    day: booking.day || "-",
    time_slot: booking.timeSlot || "-",
    batch: booking.batch || "-",
    lecturer: booking.pic || "-",
    reject_reason: alasan,
    zoom_visible: "none",
    zoom_name: "-",
    zoom_meeting_id: "-",
    zoom_passcode: "-",
    zoom_url: "https://zoom.us",
    message: `Mohon maaf, pengajuan jadwal Anda untuk mata kuliah ${booking.note} pada hari ${booking.day} (${booking.timeSlot} WIB) tidak dapat disetujui. Alasan: "${alasan}".`,
  };

  try {
    const res = await dispatchEmail({
      toEmail: booking.requesterEmail,
      toName: booking.requestedBy,
      subject,
      htmlContent,
      emailJsParams,
      cfg,
    });
    return { success: true, ...res };
  } catch (err) {
    const errMsg = err?.message || String(err) || "Gagal mengirim email.";
    console.error(`[EmailService] ❌ Gagal mengirim email penolakan ke ${booking.requesterEmail}:`, err);
    return { success: false, error: err, message: errMsg };
  }
}

/**
 * Kirim email uji coba (Test Email) dari panel admin
 */
export async function sendTestEmail(targetEmail) {
  const cfg = getEmailConfig();

  const dummyBooking = {
    note: "Uji Coba Integrasi Notifikasi E-Jadwal",
    day: "Jumat",
    timeSlot: "08.00 - 09.40",
    batch: "2024",
    pic: "Tim Administrator E-Jadwal",
    requestedBy: "Pengelola E-Jadwal",
    requesterEmail: targetEmail,
  };

  const dummyZoom = {
    name: "ZOOM KEBIDANAN (UJI COBA)",
    meetingId: "910 5322 2846",
    passcode: "433452",
    joinUrl: "https://zoom.us/j/91053222846?pwd=IVBzhDahrYwKkOZtl80RS88eZH1JzE.1",
  };

  const subject = "[TEST] Uji Coba Pengiriman Email Otomatis E-Jadwal Berhasil!";

  const htmlContent = generateEmailHtml({
    badgeText: "UJI COBA SISTEM BERHASIL",
    badgeBg: "#e0e7ff",
    badgeTextColor: "#3730a3",
    heading: "Notifikasi Otomatis Terhubung dengan Baik!",
    description: `Selamat! Integrasi sistem pengiriman email otomatis pada <strong>E-Jadwal Zoom S1 Kebidanan FIKES Universitas Baiturrahmah</strong> telah aktif dan berfungsi optimal. Mahasiswa akan menerima email rincian Zoom secara otomatis saat jadwal disetujui.`,
    booking: dummyBooking,
    zoomConfig: dummyZoom,
    isApproved: true,
  });

  const emailJsParams = {
    _templateId: cfg.templateApprovedId || cfg.templateRejectedId,
    to_email: targetEmail,
    email: targetEmail,
    user_email: targetEmail,
    to_name: "Admin E-Jadwal Zoom",
    name: "Admin E-Jadwal Zoom",
    subject,
    status_label: "UJI COBA SISTEM",
    status: "approved",
    course_name: dummyBooking.note,
    day: dummyBooking.day,
    time_slot: dummyBooking.timeSlot,
    batch: dummyBooking.batch,
    lecturer: dummyBooking.pic,
    reject_reason: "-",
    zoom_visible: "block",
    zoom_name: dummyZoom.name,
    zoom_meeting_id: dummyZoom.meetingId,
    zoom_passcode: dummyZoom.passcode,
    zoom_url: dummyZoom.joinUrl,
    message: "Selamat! Integrasi pengiriman email otomatis pada E-Jadwal Zoom telah berhasil terhubung dan siap digunakan.",
  };

  console.log(`[EmailService] Mengirim test email ke: ${targetEmail}`);
  return await dispatchEmail({
    toEmail: targetEmail,
    toName: "Pengelola E-Jadwal",
    subject,
    htmlContent,
    emailJsParams,
    cfg,
  });
}

/**
 * Kirim email notifikasi instan ke Operator / Pengelola Prodi
 * saat ada mahasiswa yang baru saja mengajukan jadwal
 */
export async function sendOperatorNotificationEmail(booking, isAutoApproved = false) {
  const cfg = getEmailConfig();
  if (!cfg.enabled) {
    return { success: false, skipped: true, message: "Layanan email dinonaktifkan." };
  }

  const operatorEmail = (cfg.operatorEmail || cfg.brevoSenderEmail || "").trim();
  if (!operatorEmail) {
    return { success: false, skipped: true, message: "Email operator belum dikonfigurasi di Pengaturan." };
  }

  const isGmeet = (booking?.room || 'zoom') === 'gmeet';
  const roomName = isGmeet ? "Google Meet" : "Zoom";

  const subject = isAutoApproved
    ? `[NOTIFIKASI PRODI] Jadwal Baru Auto-Approved (${roomName}): ${booking.note || "Perkuliahan"} - ${booking.day || ""} (${booking.timeSlot || ""})`
    : `[NOTIFIKASI PRODI] Ada Pengajuan Jadwal Baru: ${booking.note || "Perkuliahan"} (${booking.day || ""})`;

  // Buat URL aplikasi agar operator bisa langsung klik dari HP untuk membuka web
  const appUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "http://e-jadwal.test";

  const htmlContent = generateOperatorAlertHtml({
    booking,
    appUrl,
    isAutoApproved,
  });

  const emailJsParams = {
    _templateId: cfg.templateApprovedId || cfg.templateRejectedId,
    to_email: operatorEmail,
    email: operatorEmail,
    user_email: operatorEmail,
    to_name: "Operator E-Jadwal Prodi",
    name: "Operator E-Jadwal Prodi",
    subject,
    status_label: isAutoApproved ? "OTOMATIS DISETUJUI" : "PENGAJUAN BARU MASUK",
    status: isAutoApproved ? "approved" : "pending",
    course_name: booking.note || "Perkuliahan",
    day: booking.day || "-",
    time_slot: booking.timeSlot || "-",
    batch: booking.batch || "-",
    lecturer: booking.pic || "-",
    reject_reason: "-",
    room_platform: roomName,
    zoom_visible: "none",
    zoom_name: isGmeet ? "Google Meet (Alternatif)" : "Zoom",
    zoom_meeting_id: "-",
    zoom_passcode: "-",
    zoom_url: appUrl,
    message: isAutoApproved
      ? `Halo Operator Prodi, terdapat pengajuan jadwal baru untuk mata kuliah ${booking.note} pada hari ${booking.day} (${booking.timeSlot} WIB) yang telah OTOMATIS DISETUJUI oleh sistem (Ruang ${roomName} tersedia).`
      : `Halo Operator Prodi, terdapat pengajuan jadwal baru untuk mata kuliah ${booking.note} pada hari ${booking.day} (${booking.timeSlot} WIB) yang diajukan oleh ${booking.requestedBy || "Mahasiswa"}. Silakan buka aplikasi untuk menyetujui atau menolak.`,
  };

  try {
    console.log(`[EmailService] Mengirim notifikasi pengajuan baru (${isAutoApproved ? 'Auto-Approved' : 'Manual Review'}) ke Operator: ${operatorEmail}`);
    const res = await dispatchEmail({
      toEmail: operatorEmail,
      toName: "Operator E-Jadwal Prodi",
      subject,
      htmlContent,
      emailJsParams,
      cfg,
    });
    return { success: true, operatorEmail, ...res };
  } catch (err) {
    const errMsg = err?.message || String(err) || "Gagal mengirim notifikasi ke operator.";
    console.warn(`[EmailService] ⚠️ Gagal mengirim notifikasi ke operator (${operatorEmail}):`, err);
    return { success: false, error: err, message: errMsg };
  }
}