import { Resend } from "resend";

// Lazy client — avoid throwing at module load time when env var is absent
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY ?? "");
  return _resend;
}
const FROM = process.env.RESEND_FROM ?? "noreply@example.com";

// ---------------------------------------------------------------------------
// Auth emails
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(to: string, url: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Verify your email address",
    html: authEmailHtml(
      "Verify your email",
      "Click the button below to verify your email address and activate your account.",
      url,
      "Verify email"
    ),
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Reset your password",
    html: authEmailHtml(
      "Reset your password",
      "Click the button below to reset your password. This link expires in 1 hour.",
      url,
      "Reset password"
    ),
  });
}

function authEmailHtml(title: string, body: string, url: string, cta: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:12px;padding:40px">
        <tr><td>
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#666">Analytics</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#fff">${title}</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#aaa">${body}</p>
          <a href="${url}" style="display:inline-block;padding:12px 24px;background:#fff;color:#000;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">${cta}</a>
          <p style="margin:28px 0 0;font-size:13px;color:#555">Or copy this link: <a href="${url}" style="color:#888;word-break:break-all">${url}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Weekly digest
// ---------------------------------------------------------------------------

export interface DigestSite {
  name: string;
  domain: string;
  visitors_7d: number;
  top_pages: { label: string; visitors: number }[];
  top_countries: { label: string; visitors: number }[];
  total_revenue: number;
}

export async function sendWeeklyDigest(to: string, sites: DigestSite[]) {
  if (sites.length === 0) return;
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Your weekly analytics digest`,
    html: digestEmailHtml(sites),
  });
}

function digestEmailHtml(sites: DigestSite[]): string {
  const siteSections = sites
    .map((site) => {
      const topPages = site.top_pages
        .slice(0, 5)
        .map(
          (p) =>
            `<tr><td style="padding:4px 0;font-size:13px;color:#ccc">${p.label}</td><td style="padding:4px 0;font-size:13px;color:#888;text-align:right">${p.visitors.toLocaleString()}</td></tr>`
        )
        .join("");

      const topCountries = site.top_countries
        .slice(0, 5)
        .map(
          (c) =>
            `<tr><td style="padding:4px 0;font-size:13px;color:#ccc">${c.label || "Unknown"}</td><td style="padding:4px 0;font-size:13px;color:#888;text-align:right">${c.visitors.toLocaleString()}</td></tr>`
        )
        .join("");

      const revenueRow =
        site.total_revenue > 0
          ? `<p style="margin:12px 0 0;font-size:13px;color:#aaa">Revenue this week: <strong style="color:#fff">$${site.total_revenue.toFixed(2)}</strong></p>`
          : "";

      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#161616;border:1px solid #222;border-radius:10px;padding:20px">
          <tr><td>
            <h2 style="margin:0 0 4px;font-size:16px;font-weight:600;color:#fff">${site.name}</h2>
            <p style="margin:0 0 16px;font-size:12px;color:#555">${site.domain}</p>
            <p style="margin:0 0 16px;font-size:28px;font-weight:700;color:#fff">${site.visitors_7d.toLocaleString()} <span style="font-size:14px;font-weight:400;color:#666">visitors this week</span></p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
              <tr><td colspan="2" style="padding-bottom:6px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#555">Top pages</td></tr>
              ${topPages || '<tr><td style="font-size:13px;color:#555" colspan="2">No data</td></tr>'}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td colspan="2" style="padding-bottom:6px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#555">Top countries</td></tr>
              ${topCountries || '<tr><td style="font-size:13px;color:#555" colspan="2">No data</td></tr>'}
            </table>
            ${revenueRow}
          </td></tr>
        </table>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0">
        <tr><td style="padding-bottom:24px">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#666">Analytics</p>
          <h1 style="margin:0;font-size:24px;font-weight:600;color:#fff">Your weekly digest</h1>
        </td></tr>
        <tr><td>${siteSections}</td></tr>
        <tr><td style="padding-top:16px;font-size:12px;color:#444;text-align:center">
          You're receiving this because you have sites on Analytics. Manage your settings in the dashboard.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
