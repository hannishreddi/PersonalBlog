/**
 * Supabase connection settings. Both values are public by design: the
 * publishable key only grants what RLS allows the `anon` role. Never add a
 * service-role or secret key here; this module can reach client bundles.
 *
 * The `process.env.NEXT_PUBLIC_*` references must stay literal so Next.js
 * can inline them at build time.
 */
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.",
    );
  }
  return { url, publishableKey };
}
