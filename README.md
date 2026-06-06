# VaultShare Frontend

React + TypeScript + Tailwind CSS + shadcn/ui frontend for VaultShare.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **shadcn/ui** components (`Button`, `Input`, `Avatar`)
- **framer-motion** for animations
- **react-router-dom** for routing

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/signup` | `SignupPage` | Create a new account (name, email, password, avatar upload) |
| `/signin` | `SigninPage` | Sign in with email + password |
| `/` | `DashboardPage` | Protected home page (requires JWT) |

## Getting Started

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173`. Make sure the backend is running on port `5000`.

## Project Structure

```
src/
├── components/
│   └── ui/
│       ├── avatar.tsx
│       ├── button.tsx
│       ├── input.tsx
│       └── onboarding-form.tsx   # Reusable animated form card
├── lib/
│   └── utils.ts                  # cn() utility (clsx + tailwind-merge)
├── pages/
│   ├── SignupPage.tsx
│   ├── SigninPage.tsx
│   └── DashboardPage.tsx
├── App.tsx                       # Router setup
└── main.tsx
```
