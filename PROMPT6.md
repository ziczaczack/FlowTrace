## Task — Analytics page + monthly report + dark mode + CSV export

Read CLAUDE.md before starting. Dashboard and Timeline are both
confirmed working but only January 2026 to April 2026 is available on timeline, could the user navigate before Janaury?. This prompt completes the full MVP.

## Task 1 — Additional query helpers

Add these functions to src/lib/supabase/queries.ts:

getLast12MonthsFlow(userId: string)
— Fetch last 12 months of aggregated data including current month
— For each month: { month, year, income, expense, net }
— Parse all amounts as numbers before returning
— Order oldest to newest
— Return: MonthlyFlow[] (12 items)

getCurrentVsPreviousMonth(userId: string)
— Current month expenses grouped by category
— Previous month expenses grouped by category (same categories)
— Return:
  {
    categories: string[]         // category names, ordered by
                                 // current month spend DESC
    current: CategoryTotal[]
    previous: CategoryTotal[]
  }
— If a category has spend in current but not previous (or vice versa)
  still include it with total: 0 for the missing month

getCategoryMonthlyBreakdown(userId: string, month: number, year: number)
— All expense transactions for the given month
— Grouped by category, ordered by total DESC
— Return: CategoryTotal[]

## Task 2 — Monthly report logic

Create src/lib/reports.ts

generateMonthlyReport(userId: string, year: number, month: number)
— Step 1: Fetch all transactions for that month (income + expense)
— Step 2: Calculate totals:
    totalIncome, totalExpense, netFlow
— Step 3: Category breakdown — top 5 expense categories by amount
    [{ name, icon, color, total, percentage }]
— Step 4: Anomaly detection
    For each expense category, fetch its average monthly spend
    over the previous 3 months
    If current month spend > 150% of that average AND
    current spend > RM 50 (avoid noise on tiny amounts):
    flag it as anomalous
    anomalies: [{ categoryName, currentSpend, average, percentageOver }]
— Step 5: Upsert into monthly_reports table
    Use onConflict on (user_id, year, month) to update if exists
— Return the complete report object

Add type to src/types/database.ts:
  MonthlyReport {
    id: string
    userId: string
    year: number
    month: number
    totalIncome: number
    totalExpense: number
    netFlow: number
    categoryBreakdown: CategoryTotal[]
    anomalies: AnomalyItem[]
    generatedAt: string
  }
  AnomalyItem {
    categoryName: string
    currentSpend: number
    average: number
    percentageOver: number
  }

Create src/app/api/reports/generate/route.ts
POST
— Body: { month, year } — defaults to previous month if not provided
— Auth check: 401 if not authenticated
— Call generateMonthlyReport(userId, year, month)
— Return { data: MonthlyReport, error: null }

getLatestReport(userId: string)
— Fetch the most recently generated monthly_report for this user
— Return MonthlyReport | null

## Task 3 — Analytics page

src/app/(dashboard)/analytics/page.tsx
Server Component.

— Get current user
— Call getLast12MonthsFlow(userId)
— Call getCurrentVsPreviousMonth(userId)
— Call getCategoryMonthlyBreakdown(userId, currentMonth, currentYear)
— Call getLatestReport(userId)
— If no report exists for last month, trigger report generation:
    fetch("/api/reports/generate", { method: "POST",
      body: JSON.stringify({ month: lastMonth, year: lastMonthYear }) })
— Pass all data as props to client chart components

Page layout (stacked sections, full width):

Section 0 — Monthly report card (top)
  src/components/analytics/monthly-report-card.tsx ("use client")
  Props: { report: MonthlyReport | null }

  Card layout:
  — Header: "Last month at a glance · [Month Year]"
  — Three stat pills in a row:
      Income (emerald), Expenses (coral red), Net (green/red)
  — Net flow vs previous month:
      "↑ RM X more than [prev month]" in green
      "↓ RM X less than [prev month]" in red
  — Top 3 spending categories:
      Rank number · icon · name · "RM X" right-aligned
  — Anomaly alerts (if any):
      Amber warning card per anomaly:
      "⚠ [Category] spending is XX% above your usual"
      subtext: "RM X this month vs RM X average"
  — If report is null: skeleton card with "Generating report..." text
  — "Regenerate" small button top-right — calls POST /api/reports/generate
    with last month, refreshes on success

Section 1 — This month vs last month (bar chart)
  src/components/charts/comparison-bar-chart.tsx ("use client")
  Props: { data: { categories, current, previous } }

  Recharts BarChart:
  — Grouped bars per category
  — Current month bar: solid category color
  — Previous month bar: same color at 35% opacity
  — X axis: category names (truncate to 8 chars if longer)
  — Y axis: "RM X" format, white/60%
  — Tooltip: shows both month names and amounts
  — Custom legend: two squares "This month" (solid) /
    "Last month" (faded)
  — Title: "This month vs last month · by category"
  — Responsive container: width 100%, height 280px
  — If no data: empty state "No expenses this month yet"

Section 2 — Category breakdown with month selector
  src/components/analytics/category-breakdown.tsx ("use client")
  Props: { initialData: CategoryTotal[], initialMonth, initialYear }

  — MonthSelector at top (reuse existing component)
    On change: fetch new data from
    GET /api/categories/breakdown?month=X&year=Y
  — Horizontal bar chart (Recharts BarChart, layout="vertical"):
      Each bar is a category
      Bar height: 32px
      Bar color: category.color
      Label inside bar if bar is wide enough (>80px): category name
      Label right of bar: "RM X · XX%"
      X axis hidden
      Y axis: category icons + names (12px)
  — Below chart: total expenses for selected month
    "Total: RM X,XXX.XX" right-aligned, white/70%
  — Responsive container: width 100%, height = (categories * 48) + 60px
  — Title: "Spending breakdown · [Month Year]"

Add API route:
src/app/api/categories/breakdown/route.ts
  GET — query params: month, year
  — Auth check
  — Call getCategoryMonthlyBreakdown(userId, month, year)
  — Return { data: CategoryTotal[], error: null }

Section 3 — 12-month net flow history (bottom)
  src/components/charts/annual-flow-chart.tsx ("use client")
  Props: { data: MonthlyFlow[] }

  Recharts ComposedChart:
  — Income bars: emerald green (#10B981), 60% opacity
  — Expense bars: coral red (#F43F5E), 60% opacity
  — Net flow line: white, strokeWidth 2, dot on each point
  — X axis: "Jan", "Feb" etc — white/60%
  — Y axis: "RM X,XXXk" compact format — white/60%
  — Tooltip: all three values (income, expense, net)
  — Custom legend: Income bar / Expense bar / Net line
  — Title: "12-month overview"
  — Responsive container: width 100%, height 300px

## Task 4 — Dark mode

Tailwind dark mode is already set to class strategy in tailwind.config.

src/components/ui/theme-toggle.tsx ("use client")
— Icon button: Sun (light mode) / Moon (dark mode)
  Use lucide-react Sun and Moon icons, 20px
— On click: toggle "dark" class on document.documentElement
— Persist preference in localStorage key "flowtrace-theme"
— On mount: read localStorage and apply immediately to avoid flash
— Button style: white/60%, hover white/90%, no background

src/hooks/use-theme.ts ("use client")
— Manages theme state: "light" | "dark"
— On mount: check localStorage → apply to html element
— toggle() function
— Return: { theme, toggle }

Place ThemeToggle in the dashboard layout header (top right,
next to the user avatar).

Update all existing components with dark: variants.
Go through every component file and ensure:

Background colors:
  bg-[#0A1628] stays as-is (already dark)
  Any white backgrounds → dark:bg-[#162032]
  Any light gray backgrounds → dark:bg-[#1E2D45]

Text colors:
  Any black or dark text → dark:text-white or dark:text-white/80

Border colors:
  Any gray borders → dark:border-white/10

Form elements (Input component):
  dark:bg-[#1E2D45] dark:border-[#2E4060]
  dark:text-white dark:placeholder-white/30
  dark:focus:border-[#10B981]

Cards and modals:
  dark:bg-[#162032] dark:border-white/10

Note: since the entire app already uses a dark navy theme,
most components may already look correct. Focus dark: overrides
on any component that has explicit light-mode colors.

## Task 5 — CSV export

src/app/api/export/route.ts
GET route
Query params: ledgerId (optional), month (optional), year (optional)
— Auth check: 401 if not authenticated
— If month + year provided: filter to that month
— If ledgerId provided: filter to that ledger
— Otherwise: export all transactions for the user
— Build CSV with these columns:
    Date, Type, Category, Amount (MYR), Payment Method, Note
— Format:
    Date: "YYYY-MM-DD"
    Type: capitalised ("Income", "Expense", "Transfer")
    Category: category name
    Amount: plain number with 2 decimal places e.g. "1234.50"
             positive for income, negative for expense
    Payment Method: capitalised ("Cash", "Card", etc.)
    Note: empty string if null
— Response headers:
    Content-Type: text/csv
    Content-Disposition: attachment; filename="flowtrace-[YYYY-MM].csv"
    If no month filter: filename="flowtrace-all.csv"
— Stream the response for large datasets

src/components/ui/export-button.tsx ("use client")
Props: { month?: number, year?: number, ledgerId?: string }
— Small outlined button: download icon (lucide-react Download, 14px)
  + "Export CSV" label
— White/70% border, white/70% text, hover white background/10%
— On click: constructs the URL with params and uses
  window.location.href = url to trigger browser download
— Loading state while download initiates (spinner replaces icon)

Place ExportButton in the Analytics page header, top right.

## Task 6 — Settings page placeholder

src/app/(dashboard)/settings/page.tsx
Simple placeholder page (will be built post-MVP).

Sections (UI only, no functionality):
— Profile section: display name, email (read-only from Supabase Auth)
— Preferences: currency selector (disabled, shows MYR)
— Danger zone: "Delete all data" button (disabled, red outlined)
— Export section: ExportButton component (all transactions, no filter)

This gives the Settings nav item a destination so it does not 404.

## Task 7 — Final cleanup and polish

1. Add a loading.tsx in src/app/(dashboard)/:
   — Shows a full-page subtle pulse animation
   — Used by Next.js automatically during page transitions

2. Add error.tsx in src/app/(dashboard)/:
   — "use client" (required by Next.js)
   — Shows a centered error card: "Something went wrong"
   — "Try again" button calls reset()
   — "Go home" button links to /dashboard

3. Add not-found.tsx in src/app/:
   — 404 page matching the dark navy theme
   — "Page not found" heading
   — Link back to /dashboard

4. Review all console.log statements — remove any that were
   added during development

5. Make sure all images/assets use Next.js <Image> component
   if any were added

## After completing all tasks

1. Run npm run build — must be zero TypeScript errors,
   zero ESLint errors, zero warnings
2. Run npm run lint — fix anything that appears
3. In dev server verify each item:

   Analytics page:
   — Monthly report card loads (or shows "Generating..." then loads)
   — Anomaly alerts appear if any categories are flagged
   — Comparison bar chart shows current vs previous month
   — Category breakdown chart loads, month selector works
   — 12-month overview chart renders all 12 bars
   — Export CSV button downloads a valid .csv file
     open in Excel/Numbers and confirm columns are correct

   Dark mode:
   — Toggle in header switches theme
   — Theme persists after page refresh
   — No flash of wrong theme on load
   — All pages look correct in both light and dark mode

   Settings:
   — /dashboard/settings loads without error
   — User name and email display correctly
   — Export button on settings page works

   General:
   — /dashboard → loads correctly
   — /timeline → loads correctly
   — /analytics → loads correctly
   — /settings → loads correctly
   — Sign out → redirects to /login
   — Visiting /dashboard while logged out → redirects to /login
   — 404 page renders for unknown routes

4. List every single file created or modified across this prompt
5. Mark all remaining checkboxes in CLAUDE.md as done
6. Print a complete file tree of src/ so the full project
   structure is visible