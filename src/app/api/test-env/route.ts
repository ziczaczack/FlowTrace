export const runtime = "edge";
export function GET() {
  return new Response(JSON.stringify({ 
    url: process.env.NEXT_PUBLIC_SUPABASE_URL, 
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  }));
}
