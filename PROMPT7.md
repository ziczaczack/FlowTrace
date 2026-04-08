## Task — Receipt scanning + AI extraction using Gemini Vision

Read CLAUDE.md before starting. The full MVP is complete.
This feature adds receipt/photo scanning to the transaction entry flow.

## Overview
User taps a camera icon → takes photo or uploads receipt image →
image is sent to Gemini 1.5 Flash Vision API → AI extracts
transaction details → TransactionModal opens pre-filled →
user confirms and saves.

## Task 1 — Install dependencies

npm install @google/generative-ai

## Task 2 — Environment variable

Add to .env.local (and Vercel environment variables):
  GOOGLE_GEMINI_API_KEY=

This key is server-side only — do NOT prefix with NEXT_PUBLIC_

## Task 3 — Gemini client and extraction logic

Create src/lib/gemini.ts

import { GoogleGenerativeAI } from "@google/generative-ai"

Initialize the client:
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)
  Use model: "gemini-1.5-flash"

Create and export this function:

extractReceiptData(imageBase64: string, mimeType: string)
— mimeType will be "image/jpeg" | "image/png" | "image/webp" | "image/heic"
— Call Gemini with the image and this exact prompt:

"""
You are a receipt and transaction data extractor for a personal finance app.
Analyze this image and extract transaction information.

Return ONLY a valid JSON object with these exact fields:
{
  "amount": number or null,
  "merchant": string or null,
  "date": "YYYY-MM-DD" or null,
  "category": string or null,
  "paymentMethod": "cash" | "card" | "e-wallet" | "bank_transfer" | null,
  "note": string or null,
  "confidence": "high" | "medium" | "low",
  "rawText": string or null
}

Rules:
- amount: the TOTAL amount paid, as a number, no currency symbols
- merchant: the business or store name
- date: transaction date in YYYY-MM-DD format, null if not found
- category: choose the best match from this list:
  Food & Drinks, Transport, Shopping, Entertainment, Health,
  Bills & Utilities, Education, Travel, Personal Care, Others
  Return null if you cannot determine
- paymentMethod: only if clearly visible on the receipt
- note: merchant name + brief description e.g. "Tesco - Groceries"
- confidence: your confidence in the extraction accuracy
- rawText: first 200 characters of raw text you can read on the receipt

If this is not a receipt or transaction document, return:
{ "error": "Not a receipt", "confidence": "low" }

Return ONLY the JSON. No explanation, no markdown, no code blocks.
"""

— Parse the response as JSON
— If parsing fails, return { error: "Could not parse receipt" }
— Return typed object: ExtractedReceipt

Add to src/types/database.ts:
  ExtractedReceipt {
    amount: number | null
    merchant: string | null
    date: string | null
    category: string | null
    paymentMethod: string | null
    note: string | null
    confidence: "high" | "medium" | "low"
    rawText: string | null
    error?: string
  }

## Task 4 — API route

Create src/app/api/receipt/scan/route.ts
POST route.

Request body (JSON):
  { imageBase64: string, mimeType: string }

Steps:
1. Auth check — return 401 if not authenticated
2. Validate imageBase64 is present — return 400 if missing
3. Validate file size — base64 string length should not exceed
   ~10MB (10 * 1024 * 1024 * 1.37 ≈ 14000000 chars) — return 413 if too large
4. Call extractReceiptData(imageBase64, mimeType)
5. If result has error field — return 422 with the error message
6. Return { data: ExtractedReceipt, error: null }

Error responses must use consistent shape: { data: null, error: string }

## Task 5 — Receipt scanner component

Create src/components/ui/receipt-scanner.tsx
"use client" component.

Props:
  onExtracted: (data: ExtractedReceipt) => void
  onError: (message: string) => void

Internal state:
  status: "idle" | "selecting" | "processing" | "done" | "error"
  preview: string | null  (base64 data URL for image preview)

The component renders a single trigger button:
— Camera icon (lucide-react Camera, 20px)
— No label text (icon only, tooltip "Scan receipt")
— Styling: same as a ghost button, white/60%

When clicked:
— Opens a hidden <input type="file"> with:
    accept="image/jpeg,image/png,image/webp,image/heic"
    capture="environment"  (opens rear camera on mobile)
— On file select:
    1. Read file as base64 using FileReader
    2. Strip the data URL prefix to get raw base64
      e.g. "data:image/jpeg;base64,XXXX" → take only "XXXX"
    3. Show a processing overlay (see below)
    4. POST to /api/receipt/scan with { imageBase64, mimeType }
    5. On success: call onExtracted(data)
    6. On error: call onError(message), show error state

Processing overlay (renders over the TransactionModal):
— Semi-transparent dark backdrop
— Centered card:
    Small receipt image preview (max 120px tall, rounded)
    Animated scanning line sweeping top to bottom (CSS animation)
    "Reading receipt..." text (white, 14px)
    Subtext: "This takes a few seconds" (white/50%, 12px)
— Cannot be dismissed while processing

Error state (shown inside the overlay briefly before closing):
— Red icon (lucide-react XCircle)
— Error message
— Auto-dismisses after 2.5 seconds

## Task 6 — Wire into TransactionModal

Modify src/components/ui/transaction-modal.tsx

Changes:
1. Import ReceiptScanner component

2. Add camera icon button in the modal header area
   — Position: top-right of the modal, next to the close button
   — Render: <ReceiptScanner onExtracted={handleExtracted} onError={handleScanError} />

3. Add handleExtracted function:
   (data: ExtractedReceipt) => void

   When called:
   — If data.amount: set amount state to data.amount
   — If data.date: set txnDate state to data.date
   — If data.paymentMethod: set paymentMethod state to data.paymentMethod
   — If data.note: set note state to data.note
   — If data.category: find the matching category from the loaded
     categories list by name (case-insensitive match)
     If found: set selectedCategoryId to that category's id
   — Set type to "expense" (receipts are almost always expenses)
   — Show a small green "Receipt scanned" toast for 2 seconds

4. Add handleScanError function:
   (message: string) => void
   — Call showToast(message, "error")

5. Add a subtle visual indicator when fields were auto-filled:
   — A small "✓ Auto-filled" badge in emerald green
     appears below the amount display for 3 seconds after scan
   — Then fades out

## Task 7 — Image compression before upload

Create src/lib/image-utils.ts

compressImage(file: File, maxWidthPx: number, qualityPercent: number): Promise<string>
— Uses canvas to resize and compress the image client-side
  BEFORE sending to the API
— maxWidthPx: 1200 (sufficient for receipt OCR, keeps API payload small)
— qualityPercent: 0.85
— Returns base64 string (without data URL prefix)
— Preserves aspect ratio
— Handles HEIC on iOS by treating as image/jpeg for canvas

Use this in ReceiptScanner before the API call:
  const compressed = await compressImage(file, 1200, 0.85)
  Then POST compressed instead of raw base64

This keeps the payload under ~500KB for most receipt photos.

## Task 8 — Update CLAUDE.md

Add a new section after the environment variables section:

### AI integrations
Google Gemini 1.5 Flash is used for receipt scanning (vision + extraction).
Client: src/lib/gemini.ts
API route: src/app/api/receipt/scan/route.ts
Environment variable: GOOGLE_GEMINI_API_KEY (server-side only)

Do not use Gemini for anything other than receipt scanning.
Do not expose GOOGLE_GEMINI_API_KEY to the browser.

## After completing all tasks

1. Run npm run build — zero errors required

2. Manual testing steps:

   Test A — Happy path (clear receipt photo):
   — Open TransactionModal via FAB
   — Tap the camera icon
   — Upload a photo of any receipt (supermarket, restaurant, etc.)
   — Confirm the processing overlay appears with the preview image
   — Confirm the modal fields are pre-filled after scan
   — Confirm amount, note, and category are populated correctly
   — Save the transaction and verify in Supabase table editor

   Test B — Low quality or unclear image:
   — Upload a blurry or partial receipt photo
   — Confirm it still returns something (may be partial data)
   — Confidence field should be "low" or "medium"

   Test C — Non-receipt image:
   — Upload a photo of something that is not a receipt (e.g. a landscape)
   — Confirm the error toast appears: "Not a receipt"
   — Confirm the modal stays open and fields are not changed

   Test D — Mobile camera:
   — On a real mobile device or browser DevTools mobile mode
   — Confirm tapping camera icon opens the rear camera directly
   — Take a photo of a receipt and confirm the flow works end to end

   Test E — Large image:
   — Upload a high-resolution photo (e.g. from a DSLR, >5MB)
   — Confirm compression runs and the API call still succeeds
   — Check network tab: request payload should be under 1MB

3. List every file created or modified
4. Update CLAUDE.md — mark Receipt Scanning as done