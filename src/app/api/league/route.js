import { db, getLeague } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const league = await getLeague();

    const [{ data: teams }, { data: fixtures }] = await Promise.all([
      db().from("teams").select("*").eq("league_id", league.id).order("created_at"),
      db().from("fixtures").select("*").eq("league_id", league.id).order("md").order("created_at"),
    ]);

    return Response.json({
      ok: true,
      admin: await isAdmin(),
      league,
      teams: teams || [],
      fixtures: fixtures || [],
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
