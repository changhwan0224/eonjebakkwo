import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "언제바꿔",
  description:
    "생활 소모품의 권장 교체주기, 교체 신호, 관리 팁, 버리는 방법, 이메일 알림까지 한 번에 확인하는 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
