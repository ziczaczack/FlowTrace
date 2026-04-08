import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedReceipt } from "@/types/database";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const PROMPT = `You are a receipt and transaction data extractor for a personal finance app.
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

Return ONLY the JSON. No explanation, no markdown, no code blocks.`;

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  return t.trim();
}

export async function extractReceiptData(
  imageBase64: string,
  mimeType: string,
): Promise<ExtractedReceipt> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      { text: PROMPT },
      {
        inlineData: {
          data: imageBase64,
          mimeType,
        },
      },
    ]);

    const text = result.response.text();
    const cleaned = stripJsonFences(text);

    let parsed: Partial<ExtractedReceipt> & { error?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return {
        amount: null,
        merchant: null,
        date: null,
        category: null,
        paymentMethod: null,
        note: null,
        confidence: "low",
        rawText: null,
        error: "Could not parse receipt",
      };
    }

    if (parsed.error) {
      return {
        amount: null,
        merchant: null,
        date: null,
        category: null,
        paymentMethod: null,
        note: null,
        confidence: parsed.confidence ?? "low",
        rawText: null,
        error: parsed.error,
      };
    }

    return {
      amount: parsed.amount ?? null,
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      category: parsed.category ?? null,
      paymentMethod: parsed.paymentMethod ?? null,
      note: parsed.note ?? null,
      confidence: parsed.confidence ?? "low",
      rawText: parsed.rawText ?? null,
    };
  } catch (err) {
    return {
      amount: null,
      merchant: null,
      date: null,
      category: null,
      paymentMethod: null,
      note: null,
      confidence: "low",
      rawText: null,
      error: err instanceof Error ? err.message : "Could not parse receipt",
    };
  }
}
