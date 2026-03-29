const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const SEOUL_TIME_ZONE = "Asia/Seoul";

function parseDateStringParts(dateString: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) {
    throw new Error("날짜 형식은 YYYY-MM-DD 이어야 해요.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("유효한 날짜를 입력해 주세요.");
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error("유효한 날짜를 입력해 주세요.");
  }

  return { year, month, day };
}

function utcTimestampFromDateString(dateString: string) {
  const { year, month, day } = parseDateStringParts(dateString);
  return Date.UTC(year, month - 1, day);
}

function utcDateString(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeDateString(dateString: string) {
  return utcDateString(utcTimestampFromDateString(dateString));
}

export function addDays(dateString: string, days: number) {
  return utcDateString(utcTimestampFromDateString(dateString) + days * DAY_IN_MS);
}

export function diffDays(leftDateString: string, rightDateString: string) {
  return Math.floor(
    (utcTimestampFromDateString(leftDateString) -
      utcTimestampFromDateString(rightDateString)) /
      DAY_IN_MS,
  );
}

export function todayInSeoulDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("서울 기준 날짜를 만들 수 없어요.");
  }

  return `${year}-${month}-${day}`;
}
