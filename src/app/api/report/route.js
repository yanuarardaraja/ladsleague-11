import { db, getLeague } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    if (!(await isAdmin())) {
      return Response.json({ ok: false, error: "Masuk sebagai admin dulu." }, { status: 401 });
    }

    const league = await getLeague();
    const { fixtureId, homeScore, awayScore, reporter, source, aiNote, image, mediaType } = await req.json();

    const hs = parseInt(homeScore, 10);
    const as = parseInt(awayScore, 10);
    if (!fixtureId) return Response.json({ ok: false, error: "Match belum dipilih." }, { status: 400 });
    if (!Number.isInteger(hs) || !Number.isInteger(as) || hs < 0 || as < 0 || hs > 99 || as > 99) {
      return Response.json({ ok: false, error: "Skor belum valid." }, { status: 400 });
    }

    const { data: fx } = await db()
      .from("fixtures").select("id, status").eq("id", fixtureId).eq("league_id", league.id).single();
    if (!fx) return Response.json({ ok: false, error: "Match tidak ditemukan." }, { status: 404 });
    if (fx.status === "confirmed") {
      return Response.json({ ok: false, error: "Hasil match ini sudah disahkan admin." }, { status: 409 });
    }

    // Simpan bukti screenshot (opsional — kalau gagal, laporan tetap masuk)
    let evidenceUrl = "";
    if (image) {
      try {
        const ext = (mediaType || "image/jpeg").includes("png") ? "png" : "jpg";
        const path = `${league.slug}/${fixtureId}-${Date.now()}.${ext}`;
        const bytes = Buffer.from(image, "base64");
        const { error } = await db().storage.from("evidence")
          .upload(path, bytes, { contentType: mediaType || "image/jpeg", upsert: true });
        if (!error) {
          evidenceUrl = db().storage.from("evidence").getPublicUrl(path).data.publicUrl;
        }
      } catch (e) {
        console.error("Upload bukti gagal", e);
      }
    }

    const { error } = await db().from("fixtures").update({
      home_score: hs,
      away_score: as,
      status: league.auto_confirm ? "confirmed" : "pending",
      reporter: String(reporter || "").slice(0, 60),
      source: source === "ai" ? "ai" : "manual",
      ai_note: String(aiNote || "").slice(0, 200),
      evidence_url: evidenceUrl,
      reported_at: new Date().toISOString(),
    }).eq("id", fixtureId);

    if (error) throw new Error(error.message);

    return Response.json({
      ok: true,
      status: league.auto_confirm ? "confirmed" : "pending",
      message: league.auto_confirm ? "Skor masuk klasemen." : "Skor terkirim, menunggu disahkan admin.",
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
