"use client";

import { useRef, useState } from "react";
import {
  Topbar, useLeague, Loading, Empty, ErrorBox, post, shrinkImage,
  IcoUpload, IcoSpin, IcoSwap, IcoCheck, IcoWarn, IcoX,
} from "@/components/ui";

export default function LaporPage() {
  const { loading, error, data, reload } = useLeague();
  const [mode, setMode] = useState("satu");
  const [sel, setSel] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(null);
  const [imageB64, setImageB64] = useState(null);
  const [read, setRead] = useState(null);
  const [hs, setHs] = useState("");
  const [as, setAs] = useState("");
  const [reporter, setReporter] = useState("");
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  const league = data?.league;
  const teams = data?.teams || [];
  const fixtures = data?.fixtures || [];
  const nm = (id) => teams.find((t) => t.id === id)?.name || "—";
  const open = fixtures.filter((f) => f.status !== "confirmed");
  const fx = fixtures.find((f) => f.id === sel);

  const reset = () => {
    setSel(""); setHs(""); setAs(""); setRead(null);
    setPreview(null); setImageB64(null);
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!fx) { setMsg({ kind: "bad", text: "Pilih match-nya dulu." }); return; }

    setBusy(true); setRead(null); setMsg(null);
    try {
      const b64 = await shrinkImage(file);
      setImageB64(b64);
      setPreview(`data:image/jpeg;base64,${b64}`);

      const j = await post("/api/vision", {
        image: b64, mediaType: "image/jpeg",
        homeName: nm(fx.home_id), awayName: nm(fx.away_id),
      });

      if (j.ok && j.result?.found) {
        setRead(j.result);
        setHs(String(j.result.leftScore));
        setAs(String(j.result.rightScore));
      } else {
        setRead({ found: false, note: j.error || j.result?.note || "Skor tidak terbaca dari gambar." });
      }
    } catch (err) {
      setRead({ found: false, note: err.message });
    }
    setBusy(false);
  };

  const swap = () => { setHs(as); setAs(hs); };

  const submit = async () => {
    setSending(true); setMsg(null);
    const j = await post("/api/report", {
      fixtureId: sel,
      homeScore: hs, awayScore: as,
      reporter,
      source: read?.found ? "ai" : "manual",
      aiNote: read?.found ? `AI · keyakinan ${read.confidence || "-"}` : "Diketik manual",
      image: imageB64, mediaType: "image/jpeg",
    });
    setSending(false);
    if (j.ok) { setMsg({ kind: "ok", text: j.message }); reset(); reload(); }
    else setMsg({ kind: "bad", text: j.error });
  };

  return (
    <>
      <Topbar league={league} />
      <main className="shell" style={{ paddingTop: 16 }}>
        {loading && <Loading />}
        {error && <ErrorBox error={error} />}

        {data && open.length === 0 && (
          <Empty title="Semua match sudah selesai" hint="Tidak ada hasil yang perlu dilaporkan sekarang." />
        )}

        {data && open.length > 0 && (
          <div className="stack">
            <div className="seg" data-n="2">
              <button className={`btn ${mode === "satu" ? "go" : ""}`} onClick={() => setMode("satu")}>Satu match</button>
              <button className={`btn ${mode === "banyak" ? "go" : ""}`} onClick={() => setMode("banyak")}>Upload banyak</button>
            </div>

            {mode === "banyak" && <BulkLapor open={open} nm={nm} reload={reload} />}

            {mode === "satu" && (
            <div className="card pad stack">
              <div>
                <label className="lb" htmlFor="match">Pilih match</label>
                <select id="match" className="in" style={{ marginTop: 6 }} value={sel}
                  onChange={(e) => { reset(); setSel(e.target.value); }}>
                  <option value="">— pilih match —</option>
                  {open.map((f) => (
                    <option key={f.id} value={f.id}>
                      MD{f.md} · {nm(f.home_id)} vs {nm(f.away_id)}
                      {f.status === "pending" ? " (sudah dilaporkan)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {fx && (
                <>
                  <div>
                    <span className="lb">Screenshot hasil match</span>
                    <button className="btn go full" style={{ marginTop: 6 }} disabled={busy}
                      onClick={() => fileRef.current?.click()}>
                      {busy ? <><IcoSpin className="spin" /> Membaca skor…</> : <><IcoUpload /> Unggah screenshot</>}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                    <p className="muted" style={{ marginTop: 8 }}>
                      Skor dibaca otomatis dari gambar. Screenshot disimpan sebagai bukti kalau ada protes.
                    </p>
                  </div>

                  {preview && (
                    <img src={preview} alt="Screenshot hasil match"
                      style={{ width: "100%", maxHeight: 220, objectFit: "contain", background: "#000", borderRadius: 10 }} />
                  )}

                  {read && (
                    <div className={`note ${read.found ? "good" : "warn"}`}>
                      {read.found ? (
                        <>
                          <div className="mono" style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--lime)" }}>
                            TERBACA · KEYAKINAN {String(read.confidence || "").toUpperCase()}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            {read.leftName} {read.leftScore} — {read.rightScore} {read.rightName}
                          </div>
                          <p className="muted" style={{ margin: "4px 0 0" }}>
                            Cek posisi kandang dan tandang. Kalau kebalik, tekan tombol tukar.
                          </p>
                        </>
                      ) : (
                        <div className="row" style={{ alignItems: "flex-start" }}>
                          <IcoWarn style={{ color: "var(--fuel)", flexShrink: 0 }} />
                          <span>{read.note}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="row" style={{ alignItems: "flex-end" }}>
                    <div className="grow">
                      <label className="lb" htmlFor="hs">{nm(fx.home_id)} (kandang)</label>
                      <input id="hs" className="in num" inputMode="numeric" placeholder="0" style={{ marginTop: 6 }}
                        value={hs} onChange={(e) => setHs(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                    </div>
                    <button className="btn icon" onClick={swap} aria-label="Tukar skor" style={{ marginBottom: 2 }}>
                      <IcoSwap />
                    </button>
                    <div className="grow">
                      <label className="lb" htmlFor="as">{nm(fx.away_id)} (tandang)</label>
                      <input id="as" className="in num" inputMode="numeric" placeholder="0" style={{ marginTop: 6 }}
                        value={as} onChange={(e) => setAs(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                    </div>
                  </div>

                  <div>
                    <label className="lb" htmlFor="rep">Nama pelapor</label>
                    <input id="rep" className="in" style={{ marginTop: 6 }} placeholder="Nama kamu"
                      value={reporter} onChange={(e) => setReporter(e.target.value)} />
                  </div>

                  <button className="btn go full" onClick={submit} disabled={sending || hs === "" || as === ""}>
                    {sending ? <><IcoSpin className="spin" /> Mengirim…</> : <><IcoCheck /> Kirim skor</>}
                  </button>
                </>
              )}
            </div>
            )}

            {mode === "satu" && msg && (
              <div className={`note ${msg.kind === "bad" ? "warn" : "good"}`}>{msg.text}</div>
            )}

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
  const [reporter, setReporter] = useState("");
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
        reporter,
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
          <div>
            <label className="lb" htmlFor="bulk-rep">Nama pelapor</label>
            <input id="bulk-rep" className="in" style={{ marginTop: 6 }} placeholder="Nama kamu"
              value={reporter} onChange={(e) => setReporter(e.target.value)} />
          </div>

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
