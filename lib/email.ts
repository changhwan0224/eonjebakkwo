import { Resend } from "resend";

import type { AlertItem } from "@/lib/types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수가 필요해요.`);
  }

  return value;
}

function buildReminderSummaryHtml(checkDate: string, alerts: AlertItem[]) {
  const items = alerts
    .map(
      (alert) => `
        <div style="border:1px solid #e5e7eb;border-radius:16px;padding:16px;margin-bottom:12px;background:#ffffff;">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:800;margin-bottom:10px;">
            ${escapeHtml(alert.alertType)}
          </div>
          <div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:6px;">
            ${escapeHtml(alert.itemName)}
          </div>
          <div style="font-size:14px;color:#475569;line-height:1.7;">
            사용 시작일: ${escapeHtml(alert.purchaseDate)}<br />
            예상 교체일: ${escapeHtml(alert.dueDate)}<br />
            안내: ${escapeHtml(alert.message)}
          </div>
        </div>
      `,
    )
    .join("");

  return `
    <div style="padding:24px;background:#f8fafc;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;padding:28px;border:1px solid #e5e7eb;">
        <h1 style="margin:0 0 10px;font-size:28px;line-height:1.2;color:#111827;">언제바꿔 이메일 알림</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#475569;">
          ${escapeHtml(checkDate)} 기준으로 확인된 교체 알림입니다.
        </p>
        ${items}
        <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
          버리는 방법과 교체 주기는 일반적인 기준이에요. 실제 배출 규정은 지역 기준을 함께 확인해 주세요.
        </p>
      </div>
    </div>
  `;
}

function buildReminderSummaryText(checkDate: string, alerts: AlertItem[]) {
  const body = alerts
    .map(
      (alert) =>
        [
          `[${alert.alertType}] ${alert.itemName}`,
          `사용 시작일: ${alert.purchaseDate}`,
          `예상 교체일: ${alert.dueDate}`,
          `안내: ${alert.message}`,
        ].join("\n"),
    )
    .join("\n\n");

  return `언제바꿔 이메일 알림\n\n${checkDate} 기준으로 확인된 교체 알림입니다.\n\n${body}`;
}

export async function sendReminderSummaryEmail(checkDate: string, alerts: AlertItem[]) {
  if (!alerts.length) {
    return { sent: false };
  }

  const resend = new Resend(requiredEnv("RESEND_API_KEY"));
  const from = requiredEnv("EMAIL_FROM");
  const notificationEmail = requiredEnv("NOTIFICATION_EMAIL");
  const subject = `언제바꿔 알림 요약 - ${checkDate}`;

  const result = await resend.emails.send({
    from,
    to: [notificationEmail],
    subject,
    html: buildReminderSummaryHtml(checkDate, alerts),
    text: buildReminderSummaryText(checkDate, alerts),
  });

  if (result.error) {
    throw new Error(result.error.message || "이메일 발송에 실패했어요.");
  }

  return { sent: true, id: result.data?.id ?? null };
}
