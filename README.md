# i-sarang 앱

어린이집·보육 정보 플랫폼 — 웹(React + Vite)과 모바일(Expo React Native) 듀얼 플랫폼

---

## 프로젝트 구조

```
i-sarang-app/
├── src/                  # 웹 앱 (React + Vite)
├── app/                  # 모바일 앱 (Expo React Native)
├── migrations/           # Supabase SQL 마이그레이션
├── scripts/
│   ├── crawl/            # 어린이집·채용공고·질병 크롤러
│   ├── debug/            # 개발 디버그 스크립트
│   └── seed/             # 초기 데이터 시드
└── tests/                # 테스트 스크립트
```

---

## 환경 변수 설정

### 웹 (`/.env`)
`.env.example` 파일을 복사해서 작성하세요.

```bash
cp .env.example .env
```

| 변수 | 설명 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon 키 |
| `VITE_CHILDCARE_API_KEY` | 어린이집 정보 공공 API 키 |

### 모바일 (`/app/.env`)
```bash
cp app/.env.example app/.env
```

| 변수 | 설명 |
|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 |
| `EXPO_PUBLIC_TOURISM_API_KEY` | 한국관광공사 API 키 |
| `EXPO_PUBLIC_WEATHER_API_KEY` | 기상청 API 키 |

> ⚠️ **API 키를 절대 코드에 직접 입력하지 마세요.** `.env` 파일은 `.gitignore`에 포함되어 있습니다.

---

## 실행

### 웹
```bash
npm install
npm run dev
```

### 모바일
```bash
cd app
npm install
npx expo start
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 웹 프레임워크 | React 19 + Vite |
| 모바일 | Expo SDK 54 + React Native 0.81 |
| 백엔드 | Supabase (PostgreSQL + Auth + Storage + RLS) |
| 스타일 (웹) | Tailwind CSS 4 |
| 지도 (웹) | Kakao Maps SDK |
| 지도 (모바일) | React Native Maps |
| 상태관리 | Context API + TanStack Query (모바일) |
| 에디터 | Lexical (웹) |
