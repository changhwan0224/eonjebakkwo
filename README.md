# 언제바꿔

Google Apps Script로 작성된 생활 소모품 교체 주기 앱을 Next.js + TypeScript로 옮긴 프로젝트입니다.

## 포함된 기능

- 소모품 검색, 자동완성, 카테고리 필터
- 권장 교체주기/교체 신호/관리 팁/버리는 방법 안내
- Vercel Postgres 기반 알림 저장
- 등록된 알림의 교체 D-day 표시
- 날짜 기준 알림 테스트
- 교체 완료 버튼으로 오늘 날짜 기준 재등록
- Resend 이메일 요약 발송
- Vercel Cron 기반 일일 이메일 알림

## 로컬 실행

1. 의존성 설치

```bash
npm install
```

2. 환경변수 설정

`.env.example`을 참고해 `.env.local` 파일을 만드세요.

```bash
POSTGRES_URL=...
RESEND_API_KEY=...
EMAIL_FROM=...
NOTIFICATION_EMAIL=...
CRON_SECRET=...
```

3. 개발 서버 실행

```bash
npm run dev
```

## 배포 메모

- `vercel.json`은 매일 `00:00 UTC`에 `/api/cron/send-reminders`를 호출합니다.
- 실제 발송 기준 날짜는 서버에서 `Asia/Seoul` 기준으로 계산합니다.
- Cron 보안을 위해 Vercel 프로젝트에 `CRON_SECRET` 환경변수가 반드시 있어야 합니다.

## DB 스키마

- 참고용 SQL은 `db/schema.sql`에 있습니다.
- 애플리케이션도 시작 시 필요한 테이블을 자동 생성합니다.
