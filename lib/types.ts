export interface Consumable {
  name: string;
  category: string;
  cycle: string;
  days: number;
  reason: string;
  replaceSigns: string[];
  tips: string[];
  disposalType: string;
  disposalGuide: string;
}

export interface Reminder {
  itemName: string;
  category: string;
  cycle: string;
  days: number;
  purchaseDate: string;
  dueDate: string;
  status: "active";
}

export interface ReminderRecord extends Reminder {
  id: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlertInfo {
  type: string;
  message: string;
}

export interface AlertItem {
  itemName: string;
  purchaseDate: string;
  dueDate: string;
  alertType: string;
  message: string;
}
