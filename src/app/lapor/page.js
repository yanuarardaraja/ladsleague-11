"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Topbar, useLeague, Loading, Empty, ErrorBox, post, shrinkImage,
  IcoUpload, IcoSpin, IcoCheck, IcoX,
} from "@/components/ui";

export default function LaporPage() {
  const { loading, error, data, reload } = useLeague();

  const league = data?.league;
  const teams = data?.teams || [];
  const fixtures = data?.fixtures || [];
  const nm = (id) => teams.find((t) => t.id === id)?.name || "—";
  const open = fixtures.filter((f) => f.status !== "confirmed");

  return (
    <>
      <Topbar league={league} />
      <main className="shell" style={{ paddingTop: 16 }}>
        {loading && <Loading />}
        {error && <ErrorBox error={error} />}

        {data && !data.admin && (
          <Empty title="Hanya admin yang bisa lapor hasil"
            hint="Kirim screenshot hasil match ke admin liga, atau masuk sebagai admin untuk input langsung.">
            <Link href="/admin" className="btn go">Masuk sebagai admin</Link>
          </Empty>
        )}

        {data && data.admin && open.length === 0 && (
          <Empty title="Semua match sudah selesai" hint="Tidak ada hasil yang perlu dilaporkan sekarang." />
        )}

        {data && data.admin && open.length > 0 && (
          <div className="stack">
            <BulkLapor open={open} nm={nm} reload={reload} />

            {!league?.auto_confirm && (
              <p className="muted">
                Skor yang masuk ditahan sampai admin mengesahkan, baru terhitung di klasemen.
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}

/* ── Upload banyak sekaligus: AI baca nama tim + skor, cocokkan ke match ── */
function BulkLapor({ open, nm, reload }) {
  const fileRef = useRef(null);
  const nextId = useRef(0);
  const [rows, setRows] = useState([]);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState(null);

  const patchRow = (id, patch) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id) => setRows((rs) => rs.filter((r) => r.id !== id));

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setSummary(null);

    const candidates = open.map((f) => ({ home: nm(f.home_id), away: nm(f.away_id) }));
    const newRows = files.map((file) => ({
      id: nextId.current++,
      preview: null, b64: null, mediaType: "image/jpeg",
      status: "reading", fixtureId: "", homeScore: "", awayScore: "",
      confidence: "", note: "Membaca…",
    }));
    setRows((rs) => [...rs, ...newRows]);

    for (let i = 0; i < files.length; i++) {
      const row = newRows[i];
      try {
        const b64 = await shrinkImage(files[i]);
        patchRow(row.id, { b64, preview: `data:image/jpeg;base64,${b64}` });

        const j = await post("/api/vision-bulk", { image: b64, mediaType: "image/jpeg", candidates });

        if (j.ok && j.result?.found && open[j.result.candidateIndex]) {
          const fx = open[j.result.candidateIndex];
          patchRow(row.id, {
            status: "ok",
            fixtureId: fx.id,
            homeScore: String(j.result.homeScore),
            awayScore: String(j.result.awayScore),
            confidence: j.result.confidence || "",
            note: j.result.note || "Terbaca otomatis.",
          });
        } else {
          patchRow(row.id, {
            status: "unmatched",
            note: j.result?.note || j.error || "Tidak ketemu match-nya, pilih manual.",
          });
        }
      } catch (err) {
        patchRow(row.id, { status: "error", note: err.message || "Gagal membaca gambar." });
      }
    }
  };

  const usedFixtures = rows.filter((r) => r.fixtureId).map((r) => r.fixtureId);
  const dupes = new Set(usedFixtures.filter((id, i) => usedFixtures.indexOf(id) !== i));
  const ready = rows.filter(
    (r) => r.fixtureId && r.homeScore !== "" && r.awayScore !== "" && !dupes.has(r.fixtureId)
  );

  const sendAll = async () => {
    setSending(true);
    let ok = 0, fail = 0;
    for (const row of ready) {
      const j = await post("/api/report", {
        fixtureId: row.fixtureId,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        source: row.status === "ok" ? "ai" : "manual",
        aiNote: row.status === "ok" ? `AI · keyakinan ${row.confidence || "-"}` : "Dicocokkan manual",
        image: row.b64,
        mediaType: row.mediaType,
      });
      if (j.ok) { ok++; removeRow(row.id); } else { fail++; patchRow(row.id, { note: j.error || "Gagal terkirim." }); }
    }
    setSending(false);
    setSummary(`${ok} hasil terkirim${fail ? `, ${fail} gagal — cek pesan di kartu terkait` : ""}.`);
    if (ok) reload();
  };

  return (
    <div className="stack">
      <div className="card pad stack">
        <span className="lb">Unggah beberapa screenshot hasil sekaligus</span>
        <button className="btn go full" onClick={() => fileRef.current?.click()}>
          <IcoUpload /> Pilih screenshot
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
        <p className="muted" style={{ margin: 0 }}>
          AI membaca nama tim dan skor tiap gambar, lalu mencocokkan ke match yang masih terbuka.
          Cek hasilnya di bawah, koreksi kalau perlu, baru kirim.
        </p>
      </div>

      {rows.length > 0 && (
        <>
          {rows.map((r) => {
            const chosen = open.find((f) => f.id === r.fixtureId);
            const isDupe = r.fixtureId && dupes.has(r.fixtureId);
            return (
              <div key={r.id} className="card pad stack">
                <div className="row" style={{ alignItems: "flex-start" }}>
                  {r.preview ? (
                    <img src={r.preview} alt="Screenshot hasil match" className="thumb" />
                  ) : (
                    <div className="thumb" style={{ display: "grid", placeItems: "center" }}>
                      <IcoSpin className="spin" />
                    </div>
                  )}
                  <div className="grow" style={{ minWidth: 0 }}>
                    <select className="in" value={r.fixtureId} onChange={(e) => patchRow(r.id, { fixtureId: e.target.value })}>
                      <option value="">— pilih match —</option>
                      {open.map((f) => (
                        <option key={f.id} value={f.id}>MD{f.md} · {nm(f.home_id)} vs {nm(f.away_id)}</option>
                      ))}
                    </select>
                    <div className="mono" style={{ fontSize: 11, marginTop: 6, letterSpacing: ".05em",
                      color: r.status === "error" || r.status === "unmatched" ? "var(--fuel)" : "var(--slate)" }}>
                      {r.status === "reading" ? "MEMBACA…" : String(r.note || "").toUpperCase()}
                    </div>
                  </div>
                  <button className="btn icon" aria-label="Buang gambar ini" onClick={() => removeRow(r.id)}><IcoX /></button>
                </div>

                {isDupe && (
                  <div className="note warn">Match ini dipilih dobel — pilih match lain di salah satu, atau buang.</div>
                )}

                <div className="row">
                  <div className="grow">
                    <label className="lb">{chosen ? nm(chosen.home_id) : "Kandang"}</label>
                    <input className="in num" inputMode="numeric" placeholder="0" style={{ marginTop: 6 }}
                      value={r.homeScore}
                      onChange={(e) => patchRow(r.id, { homeScore: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
                  </div>
                  <div className="grow">
                    <label className="lb">{chosen ? nm(chosen.away_id) : "Tandang"}</label>
                    <input className="in num" inputMode="numeric" placeholder="0" style={{ marginTop: 6 }}
                      value={r.awayScore}
                      onChange={(e) => patchRow(r.id, { awayScore: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
                  </div>
                </div>
              </div>
            );
          })}

          {summary && <div className="note good">{summary}</div>}

          <button className="btn go full" onClick={sendAll} disabled={sending || ready.length === 0}>
            {sending ? <><IcoSpin className="spin" /> Mengirim…</> : <><IcoCheck /> Kirim {ready.length || ""} hasil</>}
          </button>
        </>
      )}
    </div>
  );
}
