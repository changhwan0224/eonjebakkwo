import { HomeApp } from "@/components/home-app";
import { todayInSeoulDateString } from "@/lib/date";

export const dynamic = "force-dynamic";

export default function Page() {
  return <HomeApp initialToday={todayInSeoulDateString()} />;
}
