import { db, getLeague } from "@/lib/supabase";
import { checkPassword, startSession, endSession, isAdmin } from "@/lib/auth";
import { buildFixtures, shortOf } from "@/lib/league";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ok = (extra = {}) => Response.json({ ok: true, ...extra });
const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return bad("Permintaan tidak terbaca."); }
  const { action } = body;

  try {
    // ── Tanpa sesi ──────────────────────────────────────────
    if (action === "login") {
      if (!checkPassword(body.password)) return bad("Kunci admin salah.", 401);
      await startSession();
      return ok();
    }
    if (action === "logout") {
      await endSession();
      return ok();
    }

    // ── Wajib admin ─────────────────────────────────────────
    if (!(await isAdmin())) return bad("Masuk sebagai admin dulu.", 401);

    const league = await getLeague();
    const L = { league_id: league.id };

    switch (action) {
      case "config.save": {
        const f = body.config || {};
        const { error } = await db().from("leagues").update({
          name: String(f.name || "LIGA EFOOTBALL").slice(0, 60),
          season: String(f.season || "").slice(0, 40),
          handle: String(f.handle || "").slice(0, 40),
          double_round: !!f.double_round,
          auto_confirm: !!f.auto_confirm,
          registration_open: !!f.registration_open,
          pts_win: Math.max(0, parseInt(f.pts_win, 10) || 0),
          pts_draw: Math.max(0, parseInt(f.pts_draw, 10) || 0),
          pts_loss: Math.max(0, parseInt(f.pts_loss, 10) || 0),
        }).eq("id", league.id);
        if (error) throw new Error(error.message);
        return ok();
      }

      case "team.add": {
        const name = String(body.name || "").trim();
        if (!name) return bad("Nama tim belum diisi.");
        const { data: dupe } = await db().from("teams").select("id").eq("league_id", league.id).ilike("name", name);
        if (dupe?.length) return bad("Nama tim sudah dipakai.");
        const { error } = await db().from("teams").insert({
          ...L, name, player: String(body.player || "").trim().slice(0, 60), short: shortOf(name),
        });
        if (error) throw new Error(error.message);
        return ok();
      }

      case "teams.bulkAdd": {
        const lines = String(body.text || "")
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (!lines.length) return bad("Daftar tim masih kosong.");

        const { data: existing } = await db().from("teams").select("name").eq("league_id", league.id);
        const taken = new Set((existing || []).map((t) => t.name.toLowerCase()));

        const rows = [];
        const skipped = [];
        for (const line of lines) {
          // Pisahkan nama tim dan nama pemain: tab, " - ", " — ", atau koma
          const parts = line.split(/\t| — | - |,/).map((s) => s.trim()).filter(Boolean);
          const name = (parts[0] || "").replace(/^\d+[.)]\s*/, "").trim();
          if (!name) continue;
          if (taken.has(name.toLowerCase())) { skipped.push(name); continue; }
          taken.add(name.toLowerCase());
          rows.push({ ...L, name: name.slice(0, 60), player: (parts[1] || "").slice(0, 60), short: shortOf(name) });
        }

        if (!rows.length) return bad("Semua nama sudah terdaftar.");
        const { error } = await db().from("teams").insert(rows);
        if (error) throw new Error(error.message);
        return ok({ added: rows.length, skipped });
      }

      case "fixtures.autoSchedule": {
        const start = body.startDate;
        const every = Math.max(0, parseInt(body.everyDays, 10) || 0);
        const time = String(body.time || "");
        if (!start) return bad("Tanggal mulai belum diisi.");

        const { data: fx } = await db().from("fixtures").select("id, md").eq("league_id", league.id);
        if (!fx?.length) return bad("Jadwal belum dibuat.");

        const byMd = {};
        fx.forEach((f) => { (byMd[f.md] ||= []).push(f.id); });

        await Promise.all(
          Object.entries(byMd).map(([md, ids]) => {
            const d = new Date(`${start}T00:00:00`);
            d.setDate(d.getDate() + (Number(md) - 1) * every);
            const patch = { match_date: d.toISOString().slice(0, 10) };
            if (time) patch.match_time = time;
            return db().from("fixtures").update(patch).in("id", ids);
          })
        );
        return ok({ count: fx.length });
      }

      case "fixtures.bulkScore": {
        const items = (body.scores || []).filter((s) => {
          const h = parseInt(s.home, 10), a = parseInt(s.away, 10);
          return s.id && Number.isInteger(h) && Number.isInteger(a) && h >= 0 && a >= 0;
        });
        if (!items.length) return bad("Belum ada skor yang diisi.");

        await Promise.all(
          items.map((s) =>
            db().from("fixtures").update({
              home_score: parseInt(s.home, 10),
              away_score: parseInt(s.away, 10),
              status: "confirmed",
              source: "admin",
              reported_at: new Date().toISOString(),
            }).eq("id", s.id).eq("league_id", league.id)
          )
        );
        return ok({ count: items.length });
      }

      case "team.update": {
        const name = String(body.name || "").trim();
        if (!name) return bad("Nama tim belum diisi.");
        const { error } = await db().from("teams").update({
          name, player: String(body.player || "").trim().slice(0, 60), short: shortOf(name),
        }).eq("id", body.id).eq("league_id", league.id);
        if (error) throw new Error(error.message);
        return ok();
      }

      case "team.delete": {
        const { error } = await db().from("teams").delete().eq("id", body.id).eq("league_id", league.id);
        if (error) throw new Error(error.message);
        return ok();
      }

      case "fixtures.generate": {
        const { data: teams } = await db().from("teams").select("id").eq("league_id", league.id).order("created_at");
        if (!teams || teams.length < 2) return bad("Minimal 2 tim dulu.");
        await db().from("fixtures").delete().eq("league_id", league.id);
        const rows = buildFixtures(teams.map((t) => t.id), league.double_round).map((f) => ({ ...f, ...L }));
        const { error } = await db().from("fixtures").insert(rows);
        if (error) throw new Error(error.message);
        return ok({ count: rows.length });
      }

      case "fixture.schedule": {
        const patch = {};
        if ("date" in body) patch.match_date = body.date || null;
        if ("time" in body) patch.match_time = String(body.time || "");
        if (body.ids?.length) {
          const { error } = await db().from("fixtures").update(patch).in("id", body.ids).eq("league_id", league.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await db().from("fixtures").update(patch).eq("id", body.id).eq("league_id", league.id);
          if (error) throw new Error(error.message);
        }
        return ok();
      }

      case "fixture.setScore": {
        const hs = parseInt(body.homeScore, 10), as = parseInt(body.awayScore, 10);
        if (!Number.isInteger(hs) || !Number.isInteger(as) || hs < 0 || as < 0) return bad("Skor belum valid.");
        const { error } = await db().from("fixtures").update({
          home_score: hs, away_score: as, status: "confirmed", source: "admin",
          reported_at: new Date().toISOString(),
        }).eq("id", body.id).eq("league_id", league.id);
        if (error) throw new Error(error.message);
        return ok();
      }

      case "fixture.confirm": {
        const { error } = await db().from("fixtures").update({ status: "confirmed" })
          .eq("id", body.id).eq("league_id", league.id);
        if (error) throw new Error(error.message);
        return ok();
      }

      case "fixture.reject": {
        const { error } = await db().from("fixtures").update({
          status: "scheduled", home_score: null, away_score: null,
          reporter: "", source: "", ai_note: "", evidence_url: "", reported_at: null,
        }).eq("id", body.id).eq("league_id", league.id);
        if (error) throw new Error(error.message);
        return ok();
      }

      case "league.reset": {
        await db().from("fixtures").delete().eq("league_id", league.id);
        await db().from("teams").delete().eq("league_id", league.id);
        return ok();
      }

      case "results.clear": {
        const { error } = await db().from("fixtures").update({
          home_score: null, away_score: null, status: "scheduled",
          reporter: "", source: "", ai_note: "", evidence_url: "", reported_at: null,
        }).eq("league_id", league.id);
        if (error) throw new Error(error.message);
        return ok();
      }

      default:
        return bad("Perintah tidak dikenal.");
    }
  } catch (e) {
    return bad(e.message, 500);
  }
}
