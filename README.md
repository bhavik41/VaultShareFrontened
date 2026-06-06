# VaultShare Frontend

React + TypeScript + Tailwind CSS frontend for VaultShare — handles authentication flows including signup, signin, password reset, and two-factor authentication.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **shadcn/ui** components (`Button`, `Input`, `Card`, `Label`, `Checkbox`, `Select`)
- **Redux Toolkit** — global auth state management
- **axios** — HTTP client with automatic token refresh interceptor
- **react-router-dom** — client-side routing
- **lucide-react** — icons

## Getting Started

```bash
npm install

# Copy and fill in env vars
cp .env.example .env

npm run dev       # Development server at http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
```

Make sure the backend is running before starting the frontend.

## Environment Variables

Copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:5001/api
```

## Pages & Routes

| Route | Page | Auth | Description |
|-------|------|------|-------------|
| `/signup` | `SignupPage` | Public | Create a new account |
| `/signin` | `SigninPage` | Public | Sign in with email + password |
| `/forgot-password` | `ForgotPasswordPage` | Public | Request a password reset OTP |
| `/reset-password` | `ResetPasswordPage` | Public | Reset password using OTP |
| `/2fa-validate` | `TwoFactorPrompt` | Public | Enter TOTP code during login |
| `/2fa-setup` | `TwoFactorSetupPage` | Protected | Enable or disable 2FA |
| `/` | `DashboardPage` | Protected | Home — security settings, logout |

## Features

- **JWT auth** with silent access token refresh via axios interceptor
- **Two-factor authentication** — enable (QR code + TOTP verify), disable (TOTP confirm)
- **Password reset** via email OTP
- **Persistent sessions** — tokens stored in localStorage, auto-restored on reload
- **Protected routes** — unauthenticated users are redirected to `/signin`

## Project Structure

```
src/
├── components/
│   ├── TwoFactorPrompt.tsx       # TOTP entry screen during login
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── login-signup.tsx      # SignupForm + SigninForm components
│       ├── onboarding-form.tsx
│       └── select.tsx
├── lib/
│   └── utils.ts                  # cn() utility (clsx + tailwind-merge)
├── pages/
│   ├── DashboardPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── SigninPage.tsx
│   ├── SignupPage.tsx
│   └── TwoFactorSetupPage.tsx
├── store/
│   ├── api.ts                    # Axios instance with token refresh interceptor
│   ├── authSlice.ts              # Redux slice — auth state + async thunks
│   ├── hooks.ts                  # Typed useAppDispatch / useAppSelector
│   └── index.ts                  # Redux store setup
├── App.tsx                       # Router + protected route setup
└── main.tsx
```
