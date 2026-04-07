## Task — Timeline page

Read CLAUDE.md before starting. Dashboard is confirmed working.
Build the timeline at src/app/(dashboard)/timeline/page.tsx.

## Task 1 — Additional query helpers

Add these functions to src/lib/supabase/queries.ts:

getTransactionsByMonth(userId: string, month: number, year: number)
— Fetch all transactions across ALL ledgers belonging to this user
  for the given month and year
— Join categories to get name, icon, color
— Order by txn_date DESC, created_at DESC
— Return: Transaction[] with category nested

getMonthSummary(userId: string, month: number, year: number)
— Total income, total expense, net for the given month
— Return: { income: number, expense: number, net: number }

Add this helper to src/types/database.ts:
  GroupedTransactions {
    date: string            // "YYYY-MM-DD"
    label: string           // "Today" | "Yesterday" | "Mon, 12 Jan"
    transactions: Transaction[]
  }

Add this utility to src/lib/utils.ts (create file if it does not exist):
  groupTransactionsByDate(transactions: Transaction[]): GroupedTransactions[]
  — Groups a flat Transaction[] into GroupedTransactions[]
  — Date labels:
      today's date     → "Today"
      yesterday's date → "Yesterday"
      anything older   → format as "EEE, d MMM" using date-fns
        e.g. "Mon, 7 Apr"
  — Within each group, preserve the original DESC order

  formatMYR(amount: number): string
  — Returns formatted string: "RM 1,234.56"
  — Always 2 decimal places
  — Use toLocaleString("en-MY", { minimumFractionDigits: 2,
                                   maximumFractionDigits: 2 })
  — Prepend "RM "

  formatMYRCompact(amount: number): string
  — Same as formatMYR but uses compact notation for large numbers
  — Below 1000: "RM 999.00"
  — 1000 and above: "RM 1.2k"
  — 1000000 and above: "RM 1.2M"

## Task 2 — Month selector component

src/components/timeline/month-selector.tsx ("use client")

Props:
  month: number
  year: number
  onChange: (month: number, year: number) => void

Layout:
— Centered row: left arrow · "April 2026" · right arrow
— Left arrow disabled when month = January of the year the
  user's account was created (do not allow navigating before
  account creation — default to disabling before Jan of current year
  if creation date is unavailable)
— Right arrow disabled when month = current month
  (cannot navigate into the future)
— Month/year text: white, font-weight 500, min-width 140px centered
  so layout does not shift between months
— Arrows: lucide-react ChevronLeft and ChevronRight
  white/60% normally, white/20% when disabled
— On arrow click: calculate new month/year correctly
  (handle January → December of previous year and vice versa)

## Task 3 — Transaction row component

src/components/timeline/transaction-row.tsx ("use client")

Props:
  transaction: Transaction  (with category nested)
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => Promise<void>

Layout (left to right, vertically centered):
— Left: category icon in a colored circle
    36px diameter, background = category.color at 20% opacity
    icon (emoji) centered, 18px
— Middle (flex-grow):
    Line 1: category name, white, 14px, font-weight 500
    Line 2: note (if exists) in white/50%, 12px
             OR payment method in white/40%, 12px if no note
             show both if both exist, note first
— Right:
    Line 1: amount, 15px, font-weight 600
      income → emerald green (#10B981), prefix "+"
      expense → coral red (#F43F5E), prefix "−"
      transfer → white, prefix "→"
    Line 2: time of day from created_at, white/40%, 11px
      format: "9:41 AM"

Interactions:
— Tap/click anywhere on row → calls onEdit(transaction)
— Long press (500ms) on mobile → reveal delete UI
— On desktop: hover reveals a trash icon on the far right
  (lucide-react Trash2, white/40%, 16px)
  clicking trash icon triggers delete flow

Delete flow (inline — no browser confirm()):
— When delete is triggered, the row transitions to a
  confirmation state:
  "Delete this transaction?" [Cancel] [Delete]
  — Cancel restores normal row appearance
  — Delete: calls onDelete(id), row fades out smoothly
  — Both buttons are small, inline within the row height
  — Delete button: coral red text
  — Cancel button: white/60% text

## Task 4 — Transaction feed component

src/components/timeline/transaction-feed.tsx ("use client")

Props:
  initialTransactions: Transaction[]
  month: number
  year: number
  userId: string

This component owns the mutable transaction state for the timeline.

State:
  transactions: Transaction[]  (initialised from initialTransactions)
  editingTransaction: Transaction | null
  modalOpen: boolean

Functions:
  handleAdd(data: NewTransaction)
  — POST /api/transactions
  — Optimistically prepend to transactions
  — On error: rollback and show toast error

  handleUpdate(id: string, data: Partial<NewTransaction>)
  — PATCH /api/transactions/[id]
  — Optimistically update in transactions
  — On error: rollback

  handleDelete(id: string)
  — DELETE /api/transactions/[id]
  — Optimistically remove from transactions
  — On error: rollback

  handleEdit(transaction: Transaction)
  — Set editingTransaction = transaction
  — Set modalOpen = true

Render:
— Month selector at top (MonthSelector component)
  On month change: fetch new transactions from API and replace state
— Month summary strip below selector:
  "Income RM X · Expenses RM X · Net RM X"
  Calculate from current transactions state (not a separate API call)
  Net: green if positive, red if negative
— Group transactions using groupTransactionsByDate()
— For each group:
    Date label row:
    — date label left (white/60%, 12px, font-weight 500)
    — thin divider line to the right (white/10%)
    — daily total right (white/40%, 12px)
      sum of: + income - expense for that day
    Transaction rows below the label
— FAB button rendered here (opens modal in create mode)
— TransactionModal:
    open={modalOpen}
    mode={editingTransaction ? "edit" : "create"}
    initialData={editingTransaction}
    onSave={editingTransaction ? handleUpdate : handleAdd}
    onClose={() => { setModalOpen(false); setEditingTransaction(null) }}
— Empty state when transactions.length === 0:
    "No transactions in [Month Year]"
    subtext: "Tap + to add one"

## Task 5 — Toast notification

src/components/ui/toast.tsx ("use client")
Simple toast for error and success feedback.

— Fixed position: bottom center, above FAB (bottom: 90px on mobile,
  bottom: 24px on desktop)
— Props: message, type: "success" | "error", visible
— Success: emerald green background
— Error: coral red background
— White text, rounded, subtle shadow
— Auto-dismisses after 3 seconds
— Fade in/out with CSS transition

src/hooks/use-toast.ts
  const { showToast } = useToast()
  showToast("Transaction added", "success")
  showToast("Something went wrong", "error")

## Task 6 — Timeline page

src/app/(dashboard)/timeline/page.tsx
Server Component.

— Read searchParams: { month, year } — default to current month/year
— Get current user from supabase.auth.getUser()
— Call getTransactionsByMonth(userId, month, year)
— Call getMonthSummary(userId, month, year)
— Pass all data as props to TransactionFeed client component

Page also renders:
— Page title "Timeline" in the header area
— Suspense boundary around TransactionFeed with a skeleton:
    SkeletonTimeline — 3 date groups each with 2–3 skeleton rows
    Create this in src/components/ui/skeleton.tsx

## After completing all tasks

1. Run npm run build — zero errors required
2. In dev server verify:
   — Timeline loads with existing test transactions
   — Transactions are correctly grouped by date
   — "Today" and "Yesterday" labels appear correctly
   — Tap a transaction row — modal opens pre-filled
   — Edit a field and save — row updates immediately
   — Delete a transaction — confirmation appears inline,
     row fades out on confirm
   — Change month using arrows — correct transactions load
   — FAB opens modal in create mode
   — Adding a transaction via FAB appears in feed immediately
   — Month summary strip numbers are correct
   — Toast appears on error (test by temporarily breaking
     the API route, then restore)
3. Test on mobile viewport (375px):
   — Long press triggers delete confirmation
   — Modal slides up from bottom
   — Bottom nav still visible
4. List every file created or modified
5. Update CLAUDE.md — mark Timeline as done