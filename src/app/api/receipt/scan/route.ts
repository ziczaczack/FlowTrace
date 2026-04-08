import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractReceiptData } from "@/lib/gemini";

const MAX_BASE64_LENGTH = 14_000_000; // ~10MB raw

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: "Not authenticated" },
        { status: 401 },
      );
    }

    let body: { imageBase64?: string; mimeType?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { data: null, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { imageBase64, mimeType } = body ?? {};

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { data: null, error: "Missing imageBase64" },
        { status: 400 },
      );
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { data: null, error: "Image too large" },
        { status: 413 },
      );
    }

    const effectiveMime =
      typeof mimeType === "string" && mimeType.length > 0
        ? mimeType
        : "image/jpeg";

    const result = await extractReceiptData(imageBase64, effectiveMime);

    if (result.error) {
      return NextResponse.json(
        { data: null, error: result.error },
        { status: 422 },
      );
    }

    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 },
    );
  }
}
