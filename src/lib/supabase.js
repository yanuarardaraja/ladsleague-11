import { createClient } from "@supabase/supabase-js";

let cached = null;

/** Klien Supabase khusus server. Pakai service role, jangan pernah dikirim ke browser. */
export function db() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi di Environment Variables.");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export const LEAGUE_SLUG = process.env.LEAGUE_SLUG || "main";

export async function getLeague() {
  const { data, error } = await db().from("leagues").select("*").eq("slug", LEAGUE_SLUG).single();
  if (error) throw new Error("Liga tidak ditemukan. Jalankan supabase/schema.sql dulu.");
  return data;
}
