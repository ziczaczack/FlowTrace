## Task — Transaction CRUD + category system

Read CLAUDE.md before starting. Auth pages are already built and working.
Login and signup are confirmed functional. The user is now authenticated
and lands on /dashboard (currently empty).

## Task 1 — Database query helpers

Create src/lib/supabase/queries.ts with the following server-side
functions. Use the server Supabase client from @/lib/supabase/server.

getOrCreateDefaultLedger(userId: string)
— Query ledgers table for a row where user_id = userId and is_default = true
— If none exists, insert a new ledger:
   { name: "My Wallet", type: "personal", currency: "MYR", is_default: true }
— Return the ledger row

getTransactions(ledgerId: string, month: number, year: number)
— Fetch all transactions where ledger_id = ledgerId
— Filter by month and year using txn_date
— Join with categories to get name, icon, color
— Order by txn_date DESC, created_at DESC
— Return typed array

addTransaction(ledgerId: string, data: NewTransaction)
— Insert one row into transactions table
— Return the inserted row

updateTransaction(id: string, data: Partial<NewTransaction>)
— Update the row with matching id
— Return the updated row

deleteTransaction(id: string)
— Delete the row with matching id

getCategories(userId: string)
— Fetch all categories where user_id IS NULL (system defaults)
  UNION all categories where user_id = userId (custom)
— Order: system categories first, then custom, both alphabetical
— Return typed array

## Task 2 — TypeScript types

Create src/types/database.ts with these interfaces matching the schema:

  Ledger, Category, Transaction, RecurringRule, Budget, MonthlyReport

Create src/types/forms.ts with:

  NewTransaction — fields needed to create a transaction:
  { amount: number, type: "income"|"expense"|"transfer",
    categoryId: string, paymentMethod: string,
    note?: string, txnDate: string }

## Task 3 — API route handlers

src/app/api/transactions/route.ts
  GET
  — Read ledgerId, month, year from searchParams
  — Verify the ledger belongs to the current user (auth check)
  — Call getTransactions() and return { data, error }

  POST
  — Parse body: { ledgerId, amount, type, categoryId,
                  note, paymentMethod, txnDate }
  — Verify ledger ownership
  — Call addTransaction() and return { data, error }
  — Return 401 if not authenticated, 403 if wrong ledger owner

src/app/api/transactions/[id]/route.ts
  PATCH
  — Parse body with partial transaction fields
  — Verify the transaction belongs to the current user
  — Call updateTransaction() and return { data, error }

  DELETE
  — Verify ownership
  — Call deleteTransaction() and return { data, error }

src/app/api/categories/route.ts
  GET
  — Call getCategories(userId) and return { data, error }

All route handlers must:
— Call supabase.auth.getUser() first, return 401 if not authenticated
— Return consistent shape: { data: T | null, error: string | null }
— Use try/catch and return 500 with error message on unexpected failure

## Task 4 — Quick-add transaction modal

src/components/ui/transaction-modal.tsx
"use client" component.

Props:
  open: boolean
  onClose: () => void
  onSave: (data: NewTransaction) => Promise<void>
  initialData?: Transaction  (if provided, modal is in edit mode)
  mode: "create" | "edit"

Layout — fields in this exact order:
1. Amount input
   — Large centered number display at top of modal
   — Supports simple math: if user types "10+5" evaluate to 15
   — Auto-focus when modal opens
   — Display "RM 0.00" placeholder

2. Type selector
   — Three pill buttons in a row: Income / Expense / Transfer
   — Income: emerald green when active
   — Expense: coral red when active
   — Transfer: blue when active
   — Expense selected by default

3. Category grid
   — Horizontal scrollable row of icon + label pills
   — Fetch from GET /api/categories on mount
   — Each pill shows category icon and name
   — Selected category gets colored border matching its color

4. Payment method
   — Four pills: Cash / Card / E-wallet / Bank transfer
   — Cash selected by default

5. Date picker
   — Shows formatted date: "Today", "Yesterday", or "Mon, 12 Jan"
   — Tapping opens native <input type="date">
   — Defaults to today

6. Note field
   — Single line text input, optional
   — Placeholder: "Add a note..."

7. Action buttons
   — Full-width "Save" button (emerald green)
     disabled until amount > 0 and category is selected
   — In edit mode: also show a "Delete" button (coral red, outlined)
   — Show loading spinner on Save while request is in flight

Behavior:
— Slides up from bottom on mobile (use CSS transform transition)
— Centered modal with backdrop on desktop (min-width: 768px)
— Backdrop click closes the modal
— ESC key closes the modal
— After successful save: close modal and call onSave callback

src/components/ui/fab.tsx
— Fixed position circular button, bottom-right corner
— 56px diameter, emerald green (#10B981) background
— Large "+" icon, white
— z-index above all content
— On click: sets open=true on TransactionModal
— Hide when TransactionModal is open

## Task 5 — useTransactions hook

src/hooks/use-transactions.ts
"use client" hook.

State managed:
  transactions: Transaction[]
  loading: boolean
  error: string | null
  currentMonth: number  (default: current month)
  currentYear: number   (default: current year)

Functions:
  fetchTransactions() — GET /api/transactions with ledgerId + month + year
  add(data: NewTransaction) — POST, optimistic: prepend to list immediately,
    rollback on error
  update(id: string, data: Partial<NewTransaction>) — PATCH, optimistic update
  remove(id: string) — DELETE, optimistic: remove from list immediately,
    rollback on error
  setMonth(month: number, year: number) — update month/year and re-fetch

Return:
  { transactions, loading, error, add, update, remove,
    setMonth, currentMonth, currentYear, refetch: fetchTransactions }

Auto-fetch on mount and whenever currentMonth or currentYear changes.

## Task 6 — Seed default categories

Create src/lib/supabase/seed-categories.ts
A one-time server function that inserts system default categories
(user_id = NULL) if none exist. Categories to seed:

Expense categories:
  Food & Drinks 🍜 #F59E0B
  Transport 🚗 #3B82F6
  Shopping 🛍️ #8B5CF6
  Entertainment 🎮 #EC4899
  Health 💊 #EF4444
  Bills & Utilities 💡 #6366F1
  Education 📚 #14B8A6
  Travel ✈️ #F97316
  Personal Care 💆 #A855F7
  Others 📦 #6B7280

Income categories:
  Salary 💰 #10B981
  Freelance 💻 #10B981
  Investment 📈 #10B981
  Gift 🎁 #10B981
  Others 💵 #10B981

Also create src/app/api/seed/route.ts
— GET route that calls seedCategories() and returns { seeded: true }
— ONLY runs if NODE_ENV !== "production" (dev only for safety)

## Task 7 — Temporary dashboard placeholder

src/app/(dashboard)/page.tsx
For now, just render a dark navy page with:
— "FlowTrace" heading
— The FAB button
— The TransactionModal wired up to useTransactions.add()
— A simple list of transactions from useTransactions showing:
  date, category name, amount (no styling needed — just verify data flows)

This placeholder will be replaced entirely in the next prompt.

## After completing all tasks

1. Run npm run build — must pass with zero errors
2. Start dev server and visit http://localhost:3000/api/seed
   to seed the default categories
3. Visit /dashboard, tap the FAB, add one transaction of each type
   (income, expense, transfer)
4. Open Supabase table editor and confirm the rows exist in the
   transactions table
5. List every file created or modified
6. Update CLAUDE.md — mark Transaction CRUD as done