import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // TEMP DEBUG — remove after fixing auth
  if (typeof window !== "undefined") {
    console.log("[supabase] url:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log(
      "[supabase] key prefix:",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 12),
      "len:",
    );
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
