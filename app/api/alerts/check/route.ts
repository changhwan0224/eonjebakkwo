import { normalizeDateString } from "@/lib/date";
import { checkAlertsByDate } from "@/lib/reminders-repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { checkDate?: string };

    if (!payload.checkDate) {
      return Response.json(
        { success: false, message: "확인할 날짜를 보내 주세요." },
        { status: 400 },
      );
    }

    const result = await checkAlertsByDate(normalizeDateString(payload.checkDate));
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알림을 확인하는 중 오류가 발생했어요.";
    return Response.json({ success: false, message }, { status: 500 });
  }
}
