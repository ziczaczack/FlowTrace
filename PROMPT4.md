## Task — Dashboard page

Read CLAUDE.md before starting. Transaction CRUD is confirmed working.
The temporary dashboard placeholder will be fully replaced in this prompt.

## Task 1 — Additional query helpers

Add these functions to src/lib/supabase/queries.ts:

getDashboardSummary(userId: string)
— Query 1: All-time net flow (total income - total expense across all ledgers)
— Query 2: Current month total income (type = "income")
— Query 3: Current month total expense (type = "expense")
— Query 4: Last 6 months aggregated data:
   For each of the last 6 months (including current):
   { month: number, year: number, income: number, expense: number }
   Order oldest to newest (for chart left-to-right)
— All amounts come from Supabase as strings — parse with parseFloat()
   before returning, never return raw strings for numeric fields
— Return:
   {
     totalBalance: number,
     currentMonth: { income: number, expense: number, net: number },
     last6Months: MonthlyFlow[]
   }

getCurrentMonthByCategory(userId: string)
— Current month expenses only (type = "expense")
— Group by category_id
— Join categories to get name, icon, color
— Return: CategoryTotal[]
   { categoryId, name, icon, color, total: number, percentage: number }
— Calculate percentage: (total / sum of all) * 100
— Order by total DESC

Add these types to src/types/database.ts:
  MonthlyFlow { month: number, year: number, income: number, expense: number }
  CategoryTotal { categoryId: string, name: string, icon: string,
                  color: string, total: number, percentage: number }

## Task 2 — Dashboard layout (shared)

src/app/(dashboard)/layout.tsx
Replace any existing placeholder with the real layout.

Bottom navigation bar (visible on mobile, hidden on desktop ≥768px):
— Four items: Dashboard / Timeline / Analytics / Settings (settings is
  a placeholder link for now)
— Icons: use lucide-react icons
   Dashboard → LayoutDashboard
   Timeline  → List
   Analytics → BarChart2
   Settings  → Settings
— Active item: icon + label in emerald green (#10B981)
— Inactive: white at 50% opacity
— Background: #0F2044, top border 1px #2E4060
— Fixed at bottom, full width

Left sidebar (visible on desktop ≥768px, hidden on mobile):
— 240px wide, full height, #0F2044 background
— FlowTrace wordmark at top (24px, white, font-weight 600)
— Same four nav items stacked vertically
— Active item: emerald green background pill, white text
— Inactive: white at 60% opacity, hover white at 90%
— Right border: 1px #2E4060

Main content area:
— On mobile: full width, padding bottom 80px (clear of nav bar)
— On desktop: margin-left 240px, full remaining width
— Background: #0A1628 (slightly darker than nav)

## Task 3 — Dashboard page

src/app/(dashboard)/page.tsx
This is a Server Component. It fetches data and passes to client components.

Structure:
const session = await supabase.auth.getUser()
const ledger  = await getOrCreateDefaultLedger(session.data.user.id)
const summary = await getDashboardSummary(session.data.user.id)
const byCategory = await getCurrentMonthByCategory(session.data.user.id)

Render in order:

1. Page header
   — "Good morning/afternoon/evening, [first name]"
     (derive time-of-day greeting server-side)
   — Current date: "Monday, 7 April 2026"
   — User avatar circle (initials) top-right — tapping shows a
     dropdown with Sign out option (client component)

2. Summary cards — 3 cards in a row
   src/components/dashboard/summary-cards.tsx ("use client")
   Props: { totalBalance, income, expense, net }

   Card 1 — Total balance
   — Label: "Total balance"
   — Value: formatted in MYR (RM X,XXX.XX)
   — White text, subtle border

   Card 2 — This month income
   — Label: "Income"
   — Value in emerald green
   — Small up arrow icon

   Card 3 — This month expenses
   — Label: "Expenses"
   — Value in coral red (#F43F5E)
   — Small down arrow icon

   Numbers animate counting up from 0 on first render.
   Use a simple useEffect with requestAnimationFrame — no libraries.

3. Net flow chart
   src/components/charts/net-flow-chart.tsx ("use client")
   Props: { data: MonthlyFlow[] }

   Recharts LineChart:
   — Two lines: income (stroke #10B981) and expense (stroke #F43F5E)
   — X axis: month abbreviations, white/60% text
   — Y axis: "RM X,XXX" format, white/60% text, hide axis line
   — Grid: horizontal dashed lines, white/10% opacity
   — Tooltip: dark card (#162032 background), shows both values
   — Legend: custom HTML below chart (not Recharts default legend)
     two colored squares: "Income" and "Expenses"
   — Dot on active point only (activeDot)
   — Chart background: transparent
   — Responsive container: width 100%, height 220px
   — Title above chart: "Cash flow · last 6 months" (white/70%)

4. Spending by category
   src/components/charts/category-donut-chart.tsx ("use client")
   Props: { data: CategoryTotal[] }

   Recharts PieChart (donut — innerRadius 60, outerRadius 90):
   — Each slice uses category.color
   — Center label: total expense amount in large text
   — No default Recharts legend
   — Custom legend below: grid of category pills
     each pill: colored dot + name + "RM X" + "XX%"
   — Tooltip: category name + amount + percentage
   — If data is empty: show empty state (see below)
   — Responsive container: width 100%, height 240px
   — Title: "This month · by category" (white/70%)

5. FAB button
   — Import and render the FAB component from Task 4 in Prompt ②
   — Wire to TransactionModal
   — After successful add: call router.refresh() to re-fetch
     Server Component data

6. Empty state (shown when no transactions exist at all)
   src/components/dashboard/empty-state.tsx
   — Centered in the page
   — Large icon (use lucide-react Wallet, size 64, white/20%)
   — Heading: "Nothing here yet"
   — Subtext: "Tap + to record your first transaction"
   — No button needed — FAB is always visible

## Task 4 — Skeleton loading states

src/components/ui/skeleton.tsx
Base skeleton component:
— Props: className
— Animated pulse: bg-white/10 with opacity animation
— border-radius: inherit from className

Pre-built skeleton layouts:
  SkeletonSummaryCards — three skeleton card shapes in a row
  SkeletonChart        — a skeleton rectangle 220px tall
  SkeletonDonut        — a skeleton circle + list rows below

Wrap dashboard sections in Suspense:
  <Suspense fallback={<SkeletonSummaryCards />}>
    <SummaryCards ... />
  </Suspense>

## Task 5 — Avatar dropdown (sign out)

src/components/dashboard/user-menu.tsx ("use client")
— Circular avatar top-right of dashboard header
— Shows user initials (first letter of name + first letter of last name)
— Background: emerald green, white text
— On click: small dropdown appears below
  — User email (muted, non-clickable)
  — Divider
  — "Sign out" option (calls supabase.auth.signOut() then
    router.push("/login"))
— Click outside closes dropdown

## After completing all tasks

1. Run npm run build — zero errors required
2. In dev server verify:
   — Dashboard loads with real data from Supabase
   — Summary card numbers match what is in Supabase table editor
   — Charts render (may be flat/minimal if few transactions exist)
   — Empty state shows correctly when no transactions exist
   — Sign out works and redirects to /login
   — Mobile layout: bottom nav visible, sidebar hidden
   — Desktop layout (≥768px): sidebar visible, bottom nav hidden
3. Add 5-10 test transactions of different categories and months
   via the FAB — confirm charts update after router.refresh()
4. List every file created or modified
5. Update CLAUDE.md — mark Dashboard as done