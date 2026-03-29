import { normalizeDateString } from "@/lib/date";
import { listReminders, removeReminder, saveReminder } from "@/lib/reminders-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
  return Response.json({ success: false, message }, { status });
}

export async function GET() {
  try {
    const reminders = await listReminders();
    return Response.json({ success: true, reminders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      itemName?: string;
      purchaseDate?: string;
    };

    if (!payload.itemName || !payload.purchaseDate) {
      return errorResponse(new Error("소모품 이름과 사용 시작일을 함께 보내 주세요."), 400);
    }

    const reminder = await saveReminder(
      payload.itemName,
      normalizeDateString(payload.purchaseDate),
    );

    return Response.json({
      success: true,
      reminder,
      message: `${reminder.itemName} 알림이 저장되었어요. 예상 교체일은 ${reminder.dueDate} 입니다.`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    let itemName = new URL(request.url).searchParams.get("itemName") ?? "";

    if (!itemName) {
      try {
        const payload = (await request.json()) as { itemName?: string };
        itemName = payload.itemName ?? "";
      } catch {
        itemName = "";
      }
    }

    if (!itemName) {
      return errorResponse(new Error("삭제할 소모품 이름이 필요해요."), 400);
    }

    const deleted = await removeReminder(itemName);

    return Response.json({
      success: true,
      deleted,
      message: deleted
        ? `${itemName} 알림을 삭제했어요.`
        : `${itemName} 알림이 이미 없어요.`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
