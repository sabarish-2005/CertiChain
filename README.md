# CertiChain Verify

CertiChain Verify is a React + TypeScript web application for blockchain-based certificate verification.

## Getting started

### Prerequisites

- Node.js 18+
- npm 9+

### Install and run

```sh
npm install
npm run dev
```

### Build and preview

```sh
npm run build
npm run preview
```

### Run tests

```sh
npm run test
```

## Tech stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Supabase database setup (optional)

This project can store records in Supabase (Postgres + Storage). If Supabase env vars are not set, it will use localStorage.

1. Create a Supabase project.
2. Create a storage bucket named `certichain-docs` (public).
3. Run the SQL in [supabase/migrations/202602230001_init_certichain.sql](supabase/migrations/202602230001_init_certichain.sql).
4. Create two auth users (one college, one company) and insert their roles into `app_users`.
5. Add env vars:

```sh
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

Example roles:

```sql
insert into public.app_users (email, role) values
('collegeadmin@certichain.com', 'college'),
('companyhr@certichain.com', 'company');
```
