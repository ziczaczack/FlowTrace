## Task — Build auth pages (login + signup)

Read CLAUDE.md before starting. All decisions about clients,
conventions, and constraints are documented there.

### Pages to create

src/app/(auth)/login/page.tsx
- Full-page centered layout, dark navy background (#0F2044)
- FlowTrace logo/wordmark at top (text-based, no image needed)
- Email + password fields
- "Sign in" submit button
- Link to /signup
- "Forgot password?" link (no functionality yet, just the link)
- On submit: call supabase.auth.signInWithPassword()
- On success: redirect to /dashboard
- On error: show inline error message below the form
- Show loading state on the button while request is in flight

src/app/(auth)/signup/page.tsx
- Same layout as login
- Full name, email, password, confirm password fields
- Password must be at least 8 characters — validate client-side
- Confirm password must match — validate client-side
- On submit: call supabase.auth.signUp()
- On success: show a "Check your email to confirm your account"
  message — do NOT redirect yet
- On error: show inline error message
- Link back to /login

src/app/(auth)/layout.tsx
- Shared layout for all auth pages
- Centers content vertically and horizontally
- Dark navy background that covers full viewport

### Shared UI components to create

src/components/ui/input.tsx
- Controlled input component
- Props: label, type, value, onChange, error, placeholder, disabled
- Show red border + error message below when error prop is set
- Dark-mode compatible

src/components/ui/button.tsx
- Props: children, onClick, type, variant, loading, disabled
- variant: "primary" | "ghost"
- When loading=true: show a small spinner, disable the button
- Primary: emerald green (#10B981) background, white text
- Ghost: transparent background, white border

### Design spec
- Background: #0F2044 (Deep Navy)
- Card/form background: slightly lighter navy, e.g. #162032
- Input background: #1E2D45
- Input border: #2E4060, focus ring: #10B981
- Label text: white/80 opacity
- Primary button: #10B981 background, hover: #059669
- Error text: #F43F5E
- All text on dark background — ensure contrast is sufficient
- Subtle fade-in animation on the card when page loads

### TypeScript types to create

src/types/auth.ts
- AuthError type that wraps Supabase error messages into
  user-friendly strings (e.g. "Invalid login credentials" →
  "Incorrect email or password")

### After completing
1. Run npm run build — confirm zero errors
2. List all files created or modified
3. Confirm middleware.ts correctly redirects logged-in users
   away from /login to /dashboard