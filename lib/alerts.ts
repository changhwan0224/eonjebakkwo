import { consumablesByName } from "@/lib/consumables";
import { addDays, diffDays, normalizeDateString } from "@/lib/date";
import type { AlertInfo, AlertItem, Consumable, Reminder } from "@/lib/types";

const alertByDiff = new Map<number, AlertInfo>([
  [30, { type: "교체일 한달 전", message: "교체일이 한달 남았어요. 미리 교체 계획을 세워보세요." }],
  [7, { type: "교체일 일주일 전", message: "교체일이 일주일 남았어요. 준비해두면 좋아요." }],
  [3, { type: "교체일 3일 전", message: "곧 교체 시기가 다가와요. 미리 준비해보세요." }],
  [1, { type: "교체일 하루 전", message: "내일이 권장 교체일이에요. 상태를 확인해보세요." }],
  [0, { type: "오늘 교체 예정", message: "오늘이 권장 교체일이에요. 교체 여부를 확인해보세요." }],
  [-1, { type: "교체일 지난 하루", message: "권장 교체일이 하루 지났어요. 교체를 고려해보세요." }],
  [-3, { type: "교체일 지난 3일", message: "권장 교체일이 3일 지났어요. 상태를 꼭 확인해보세요." }],
  [-7, { type: "교체일 지난 일주일", message: "권장 교체일이 일주일 지났어요. 교체가 필요할 수 있어요." }],
]);

export function getAlertInfoByDiff(diff: number) {
  return alertByDiff.get(diff) ?? null;
}

export function buildReminder(consumable: Consumable, purchaseDate: string): Reminder {
  const normalizedPurchaseDate = normalizeDateString(purchaseDate);

  return {
    itemName: consumable.name,
    category: consumable.category,
    cycle: consumable.cycle,
    days: consumable.days,
    purchaseDate: normalizedPurchaseDate,
    dueDate: addDays(normalizedPurchaseDate, consumable.days),
    status: "active",
  };
}

export function buildReminderByItemName(itemName: string, purchaseDate: string) {
  const consumable = consumablesByName.get(itemName);

  if (!consumable) {
    throw new Error("해당 소모품을 찾을 수 없습니다.");
  }

  return buildReminder(consumable, purchaseDate);
}

export function buildAlerts(reminders: Reminder[], checkDate: string): AlertItem[] {
  const normalizedCheckDate = normalizeDateString(checkDate);

  return reminders.flatMap((reminder) => {
    if (reminder.status !== "active") {
      return [];
    }

    const alertInfo = getAlertInfoByDiff(diffDays(reminder.dueDate, normalizedCheckDate));

    if (!alertInfo) {
      return [];
    }

    return [
      {
        itemName: reminder.itemName,
        purchaseDate: reminder.purchaseDate,
        dueDate: reminder.dueDate,
        alertType: alertInfo.type,
        message: alertInfo.message,
      },
    ];
  });
}
