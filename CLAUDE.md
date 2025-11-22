# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Architecture Overview

**PisamaApp** is a reservation management system for "Espacio Pisama" - a consulting room rental service. Built with React 18 + Vite + Supabase.

### Tech Stack
- **Frontend**: React 18, React Router v7, TailwindCSS
- **State Management**: Zustand (with persist middleware)
- **Backend**: Supabase (Auth, Database, Realtime)
- **UI Components**: Radix UI primitives + shadcn/ui pattern
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack Query
- **Calendar**: react-big-calendar

### Project Structure

```
src/
├── pages/           # Route components
│   ├── admin/       # Admin-only pages (Dashboard, UserManagement, etc.)
│   └── *.jsx        # User pages (Reservas, Facturas, Perfil, etc.)
├── components/
│   ├── ui/          # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── admin/       # Admin-specific components
│   ├── calendar/    # Calendar components and helpers
│   └── *.jsx        # Shared components
├── stores/          # Zustand stores
│   ├── authStore.js       # Auth state + user profile
│   ├── uiStore.js         # Loading, toasts, global UI state
│   ├── calendarStore.js   # Calendar/reservation state
│   └── notificationStore.js
├── services/        # Business logic layer
├── supabase/        # Supabase client + service functions
├── hooks/           # Custom React hooks
└── utils/           # Helpers and constants
```

### Key Patterns

**Authentication Flow**:
- `authStore` manages user session with Supabase Auth
- User profile stored in `user_profiles` table
- Admin routes protected by `AdminRouteGuard` component

**State Management**:
- `uiStore` handles global loading states and toast notifications
- Stores communicate via `useUIStore.getState()` for cross-store access

**Routing**:
- Authenticated vs unauthenticated routes split in `App.jsx`
- Admin routes under `/admin/*` with guard component

### Supabase Tables
- `user_profiles` - User profile data linked to auth.users
- `reservations` - Booking records
- `invoices` - Billing records
- `notifications` - User notifications (realtime subscriptions)

### Language
The application UI is in Spanish. Code comments and variable names may be in Spanish or English.
