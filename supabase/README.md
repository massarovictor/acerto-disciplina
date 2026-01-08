# Supabase Setup

## 1) Create project and enable email/password auth
- Create a Supabase project.
- In Auth settings, enable Email/Password.

## 2) Apply database schema
- Open Supabase SQL editor.
- Run the contents of `supabase/schema.sql`.

## 3) Configure environment variables
- Create `.env.local` with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 4) Install client dependency
```
npm install
```

## Notes
- Data is scoped per user (owner_id) via RLS.
- New users get a profile row automatically via trigger.
