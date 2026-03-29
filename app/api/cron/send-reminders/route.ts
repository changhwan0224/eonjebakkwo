import { sendReminderSummaryEmail } from "@/lib/email";
import { normalizeDateString, todayInSeoulDateString } from "@/lib/date";
import {
  claimAlertsForDate,
  markClaimedAlertsSent,
  releaseClaimedAlerts,
} from "@/lib/reminders-repo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const dateParam = requestUrl.searchParams.get("date");
  const checkDate = dateParam ? normalizeDateString(dateParam) : todayInSeoulDateString();

  const claimedAlerts = await claimAlertsForDate(checkDate);

  if (!claimedAlerts.length) {
    return Response.json({
      success: true,
      checkDate,
      sent: 0,
      message: "보낼 이메일 알림이 없어요.",
    });
  }

  const alerts = claimedAlerts.map((entry) => entry.alert);
  const logIds = claimedAlerts.map((entry) => entry.logId);

  try {
    await sendReminderSummaryEmail(checkDate, alerts);
    await markClaimedAlertsSent(logIds);

    return Response.json({
      success: true,
      checkDate,
      sent: alerts.length,
      message: `${alerts.length}건의 알림을 이메일로 보냈어요.`,
    });
  } catch (error) {
    await releaseClaimedAlerts(logIds);

    const message =
      error instanceof Error ? error.message : "이메일 발송 중 오류가 발생했어요.";

    return Response.json({ success: false, checkDate, message }, { status: 500 });
  }
}
