## Context
I am building FlowTrace — a personal finance tracker using:
- Next.js (App Router) with TypeScript
- Tailwind CSS
- Supabase (PostgreSQL) for database + auth
- Recharts for charts
- Vercel for deployment

I previously installed Drizzle ORM and Neon packages by mistake.
I have NOT started writing any feature code yet — only the base
Next.js project exists.

## Task 1 — Clean up wrong packages
Remove all Drizzle and Neon packages that were installed by mistake:
- drizzle-orm
- drizzle-kit
- @neondatabase/serverless
- @auth/drizzle-adapter
- next-auth

Also delete these files if they exist:
- drizzle.config.ts
- src/db/schema.ts
- src/db/index.ts
- src/auth.ts
- drizzle/ (folder)

## Task 2 — Install correct packages
Install the following:
  npm install @supabase/supabase-js @supabase/ssr
  npm install @supabase/auth-helpers-nextjs

## Task 3 — Create Supabase client files
Create the following files exactly as described:

src/lib/supabase/client.ts
— Browser-side Supabase client using createBrowserClient from @supabase/ssr

src/lib/supabase/server.ts
— Server-side Supabase client using createServerClient from @supabase/ssr
— Must read cookies from Next.js headers() for use in Server Components and API routes

src/lib/supabase/middleware.ts
— Supabase middleware helper that refreshes the session on every request

middleware.ts (project root)
— Next.js middleware that calls the Supabase middleware helper
— Protect all routes under /dashboard, /analytics, /timeline
— Redirect unauthenticated users to /login

## Task 4 — Create .env.local
Create .env.local with the following placeholders (do NOT fill in values,
just create the file with empty values for me to fill in):

  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=

Tell me exactly where to find these values in the Supabase dashboard.

## Task 5 — Create folder structure
Create the following empty folders with a .gitkeep file in each:
  src/app/(auth)/login/
  src/app/(auth)/signup/
  src/app/(dashboard)/
  src/components/ui/
  src/components/charts/
  src/hooks/
  src/types/

## Task 6 — Verify
After completing all tasks:
1. Run `npm run build` to confirm no TypeScript or import errors
2. List all created/modified files
3. Tell me exactly what I need to do next (paste schema into Supabase,
   fill in .env.local, etc.)

Use best practices for Next.js 14+ App Router and Supabase SSR throughout.