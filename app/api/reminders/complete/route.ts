import { saveReminder } from "@/lib/reminders-repo";
import { todayInSeoulDateString } from "@/lib/date";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { itemName?: string };

    if (!payload.itemName) {
      return Response.json(
        { success: false, message: "교체 완료할 소모품 이름이 필요해요." },
        { status: 400 },
      );
    }

    const reminder = await saveReminder(payload.itemName, todayInSeoulDateString());

    return Response.json({
      success: true,
      reminder,
      message: `${reminder.itemName} 교체 완료 처리했어요. 오늘(${reminder.purchaseDate})부터 다시 알림을 계산합니다.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "교체 완료 처리 중 오류가 발생했어요.";

    return Response.json({ success: false, message }, { status: 500 });
  }
}
