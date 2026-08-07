"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Topbar, useLeague, Loading, Empty, ErrorBox, useToast, post,
  IcoPlus, IcoTrash, IcoPencil, IcoCheck, IcoX, IcoShuffle, IcoSpin, IcoLock,
} from "@/components/ui";

export default function AdminPage() {
  const { loading, error, data, reload } = useLeague();
  const [say, toast] = useToast();
  const [tab, setTab] = useState("verifikasi");

  const league = data?.league;
  const teams = useMemo(() => data?.teams || [], [data]);
  const fixtures = useMemo(() => data?.fixtures || [], [data]);
  const nm = (id) => teams.find((t) => t.id === id)?.name || "—";

  const call = async (body, okMsg) => {
    const j = await post("/api/admin", body);
    if (j.ok) { if (okMsg) say(okMsg); await reload(); }
    else say(j.error || "Gagal.", "bad");
    return j.ok;
  };

  if (loading) return (<><Topbar league={null} /><main className="shell" style={{ paddingTop: 16 }}><Loading /></main></>);
  if (error) return (<><Topbar league={null} /><main className="shell" style={{ paddingTop: 16 }}><ErrorBox error={error} /></main></>);
  if (!data.admin) return <Login onDone={reload} say={say} toast={toast} />;

  const pending = fixtures.filter((f) => f.status === "pending");

  return (
    <>
      <Topbar
        league={league}
        right={<button className="btn sm" onClick={() => call({ action: "logout" })}>Keluar</button>}
      />
      <main className="shell" style={{ paddingTop: 16 }}>
        <div className="stack">
          <div className="seg" data-n="4">
            {[
              ["verifikasi", `Cek${pending.length ? ` (${pending.length})` : ""}`],
              ["skor", "Skor"],
              ["tim", "Tim"],
              ["jadwal", "Jadwal"],
            ].map(([k, l]) => (
              <button key={k} className={`btn ${tab === k ? "go" : ""}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {tab === "verifikasi" && <Verifikasi {...{ fixtures, nm, call }} />}
          {tab === "skor" && <SkorCepat {...{ fixtures, nm, call }} />}
          {tab === "tim" && <Tim {...{ teams, call }} />}
          {tab === "jadwal" && <Jadwal {...{ fixtures, teams, nm, call }} />}

          <Pengaturan {...{ league, call, say }} />
        </div>
      </main>
      {toast}
    </>
  );
}

/* ── Login ────────────────────────────────────────────────── */
function Login({ onDone, say, toast }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const j = await post("/api/admin", { action: "login", password: pw });
    setBusy(false);
    if (j.ok) onDone();
    else say(j.error || "Kunci admin salah.", "bad");
  };

  return (
    <>
      <Topbar league={null} />
      <main className="shell" style={{ paddingTop: 40 }}>
        <div className="card pad stack" style={{ maxWidth: 380, margin: "0 auto" }}>
          <div style={{ textAlign: "center", color: "var(--lime)" }}><IcoLock width="26" height="26" /></div>
          <div className="disp" style={{ fontSize: 22, textAlign: "center" }}>Panel admin</div>
          <p className="muted" style={{ textAlign: "center", margin: 0 }}>
            Masukkan kunci admin untuk mengelola tim, jadwal, dan hasil.
          </p>
          <input className="in" type="password" placeholder="Kunci admin" value={pw}
            onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <button className="btn go full" onClick={submit} disabled={busy || !pw}>
            {busy ? <><IcoSpin className="spin" /> Memeriksa…</> : "Masuk"}
          </button>
        </div>
      </main>
      {toast}
    </>
  );
}

/* ── Verifikasi hasil ─────────────────────────────────────── */
function Verifikasi({ fixtures, nm, call }) {
  const pending = fixtures.filter((f) => f.status === "pending");
  const [edit, setEdit] = useState(null);
  const [hs, setHs] = useState("");
  const [as, setAs] = useState("");

  const openEdit = (f) => {
    setEdit(f.id);
    setHs(f.home_score ?? "");
    setAs(f.away_score ?? "");
  };

  const unplayed = fixtures.filter((f) => f.status === "scheduled");

  return (
    <div className="stack">
      {pending.length === 0 ? (
        <Empty title="Antrean kosong" hint="Tidak ada laporan skor yang menunggu diperiksa." />
      ) : (
        pending.map((f) => (
          <div key={f.id} className="card pad">
            <div className="strip">
              <div className="side h truncate">{nm(f.home_id)}</div>
              <span className="chip pend">{f.home_score} : {f.away_score}</span>
              <div className="side truncate">{nm(f.away_id)}</div>
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--slate)", marginTop: 8, letterSpacing: ".08em" }}>
              MD{f.md} · {(f.ai_note || f.source || "").toUpperCase()}
              {f.reporter ? ` · ${f.reporter.toUpperCase()}` : ""}
            </div>
            {f.evidence_url && (
              <a href={f.evidence_url} target="_blank" rel="noreferrer"
                style={{ display: "block", marginTop: 10 }}>
                <img src={f.evidence_url} alt="Bukti screenshot"
                  style={{ width: "100%", maxHeight: 180, objectFit: "contain", background: "#000", borderRadius: 8 }} />
              </a>
            )}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn go sm grow" onClick={() => call({ action: "fixture.confirm", id: f.id }, "Hasil disahkan.")}>
                <IcoCheck /> Sahkan
              </button>
              <button className="btn sm" onClick={() => openEdit(f)}><IcoPencil /> Koreksi</button>
              <button className="btn danger sm" onClick={() => call({ action: "fixture.reject", id: f.id }, "Laporan ditolak.")}>
                <IcoX /> Tolak
              </button>
            </div>
            {edit === f.id && (
              <div className="row" style={{ marginTop: 10 }}>
                <input className="in num" inputMode="numeric" value={hs}
                  onChange={(e) => setHs(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                <input className="in num" inputMode="numeric" value={as}
                  onChange={(e) => setAs(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                <button className="btn go" onClick={async () => {
                  const ok = await call({ action: "fixture.setScore", id: f.id, homeScore: hs, awayScore: as }, "Skor dikoreksi dan disahkan.");
                  if (ok) setEdit(null);
                }}>Simpan</button>
              </div>
            )}
          </div>
        ))
      )}

      {unplayed.length > 0 && (
        <>
          <span className="lb">Input langsung · {unplayed.length} match belum ada hasil</span>
          {unplayed.slice(0, 30).map((f) => (
            <InputLangsung key={f.id} f={f} nm={nm} call={call} />
          ))}
        </>
      )}
    </div>
  );
}

function InputLangsung({ f, nm, call }) {
  const [hs, setHs] = useState("");
  const [as, setAs] = useState("");
  return (
    <div className="card pad">
      <div className="strip">
        <div className="side h truncate">{nm(f.home_id)}</div>
        <span className="chip">MD{f.md}</span>
        <div className="side truncate">{nm(f.away_id)}</div>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <input className="in num" inputMode="numeric" placeholder="0" value={hs}
          onChange={(e) => setHs(e.target.value.replace(/\D/g, "").slice(0, 2))} />
        <input className="in num" inputMode="numeric" placeholder="0" value={as}
          onChange={(e) => setAs(e.target.value.replace(/\D/g, "").slice(0, 2))} />
        <button className="btn go" disabled={hs === "" || as === ""}
          onClick={() => call({ action: "fixture.setScore", id: f.id, homeScore: hs, awayScore: as }, "Hasil disimpan.")}>
          Simpan
        </button>
      </div>
    </div>
  );
}

/* ── Skor cepat: satu matchday, sekali simpan ─────────────── */
function SkorCepat({ fixtures, nm, call }) {
  const maxMd = fixtures.reduce((m, f) => Math.max(m, f.md), 0);
  const [md, setMd] = useState(1);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => fixtures.filter((f) => f.md === md), [fixtures, md]);

  // Muat ulang isian tiap ganti matchday
  useEffect(() => {
    const d = {};
    list.forEach((f) => {
      d[f.id] = {
        home: f.home_score != null ? String(f.home_score) : "",
        away: f.away_score != null ? String(f.away_score) : "",
      };
    });
    setDraft(d);
  }, [md, fixtures]);

  useEffect(() => {
    const next = fixtures.find((f) => f.status !== "confirmed");
    if (next) setMd(next.md);
  }, []);

  if (fixtures.length === 0)
    return <Empty title="Jadwal belum dibuat" hint="Buat jadwal dulu di tab Jadwal." />;

  const set = (id, side, v) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], [side]: v.replace(/\D/g, "").slice(0, 2) } }));

  const ready = list.filter((f) => draft[f.id]?.home !== "" && draft[f.id]?.away !== "");
  const changed = ready.filter(
    (f) => String(f.home_score ?? "") !== draft[f.id].home || String(f.away_score ?? "") !== draft[f.id].away
  );

  const saveAll = async () => {
    setSaving(true);
    await call(
      {
        action: "fixtures.bulkScore",
        scores: changed.map((f) => ({ id: f.id, home: draft[f.id].home, away: draft[f.id].away })),
      },
      `${changed.length} hasil disimpan.`
    );
    setSaving(false);
  };

  return (
    <div className="stack">
      <div className="card pad row">
        <span className="lb grow">Matchday</span>
        <select className="in" style={{ width: "auto" }} value={md} onChange={(e) => setMd(+e.target.value)}>
          {Array.from({ length: maxMd }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>MD {n}</option>
          ))}
        </select>
      </div>

      <p className="muted" style={{ margin: 0 }}>
        Isi semua skor matchday ini, lalu simpan sekali. Kolom kiri kandang, kolom kanan tandang.
      </p>

      {list.map((f) => (
        <div key={f.id} className="card pad quick">
          <div className="who">
            <b>{nm(f.home_id)}</b>
            <span style={{ color: "var(--slate)" }}> vs </span>
            {nm(f.away_id)}
            {f.status === "confirmed" && (
              <div className="mono" style={{ fontSize: 10, color: "var(--lime)", letterSpacing: ".08em", marginTop: 2 }}>
                SUDAH SAH
              </div>
            )}
          </div>
          <input inputMode="numeric" placeholder="–" aria-label={`Skor ${nm(f.home_id)}`}
            data-filled={draft[f.id]?.home ? "1" : "0"}
            value={draft[f.id]?.home ?? ""} onChange={(e) => set(f.id, "home", e.target.value)} />
          <input inputMode="numeric" placeholder="–" aria-label={`Skor ${nm(f.away_id)}`}
            data-filled={draft[f.id]?.away ? "1" : "0"}
            value={draft[f.id]?.away ?? ""} onChange={(e) => set(f.id, "away", e.target.value)} />
        </div>
      ))}

      <div className="bar">
        <button className="btn go full" onClick={saveAll} disabled={saving || changed.length === 0}>
          {saving ? <><IcoSpin className="spin" /> Menyimpan…</>
            : changed.length ? <><IcoCheck /> Simpan {changed.length} hasil</> : "Belum ada yang diubah"}
        </button>
      </div>
    </div>
  );
}

/* ── Tim ──────────────────────────────────────────────────── */
function Tim({ teams, call }) {
  const [name, setName] = useState("");
  const [player, setPlayer] = useState("");
  const [edit, setEdit] = useState(null);
  const [draft, setDraft] = useState({ name: "", player: "" });
  const [mode, setMode] = useState("satu");
  const [bulk, setBulk] = useState("");

  const add = async () => {
    if (await call({ action: "team.add", name, player }, "Tim didaftarkan.")) {
      setName(""); setPlayer("");
    }
  };

  const bulkLines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
  const importAll = async () => {
    if (await call({ action: "teams.bulkAdd", text: bulk }, `${bulkLines.length} baris diproses.`)) {
      setBulk(""); setMode("satu");
    }
  };

  return (
    <div className="stack">
      <div className="seg" data-n="2">
        <button className={`btn ${mode === "satu" ? "go" : ""}`} onClick={() => setMode("satu")}>Satu per satu</button>
        <button className={`btn ${mode === "massal" ? "go" : ""}`} onClick={() => setMode("massal")}>Tempel daftar</button>
      </div>

      {mode === "satu" ? (
        <div className="card pad stack">
          <span className="lb">Daftarkan tim</span>
          <input className="in" placeholder="Nama tim atau klub" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <input className="in" placeholder="Nama pemain (opsional)" value={player}
            onChange={(e) => setPlayer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button className="btn go full" onClick={add}><IcoPlus /> Tambah tim</button>
        </div>
      ) : (
        <div className="card pad stack">
          <span className="lb">Tempel daftar tim — satu baris satu tim</span>
          <textarea className="in" value={bulk} onChange={(e) => setBulk(e.target.value)}
            placeholder={"Garuda FC - Budi\nElang United - Sari\nMacan Kemayoran\nRajawali FC, Dimas"} />
          <p className="muted" style={{ margin: 0 }}>
            Nama pemain opsional, pisahkan pakai tanda hubung atau koma. Nomor urut di depan
            otomatis dibuang. Nama yang sudah terdaftar dilewati.
          </p>
          <button className="btn go full" onClick={importAll} disabled={bulkLines.length === 0}>
            <IcoPlus /> Import {bulkLines.length || ""} tim
          </button>
        </div>
      )}

      <span className="lb">{teams.length} tim terdaftar</span>
      {teams.map((t, i) => (
        <div key={t.id} className="card pad row">
          <span className="mono" style={{ fontSize: 12, color: "var(--slate)", width: 22 }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          {edit === t.id ? (
            <>
              <input className="in grow" value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <button className="btn go sm" onClick={async () => {
                if (await call({ action: "team.update", id: t.id, name: draft.name, player: draft.player }, "Tim diperbarui."))
                  setEdit(null);
              }}><IcoCheck /></button>
            </>
          ) : (
            <>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="disp truncate" style={{ fontSize: 16 }}>{t.name}</div>
                {t.player && <div className="muted truncate">{t.player}</div>}
              </div>
              <button className="btn icon" aria-label={`Ubah ${t.name}`}
                onClick={() => { setEdit(t.id); setDraft({ name: t.name, player: t.player || "" }); }}>
                <IcoPencil />
              </button>
              <button className="btn danger icon" aria-label={`Hapus ${t.name}`}
                onClick={() => confirm(`Hapus ${t.name}? Jadwal yang sudah dibuat perlu digenerate ulang.`) &&
                  call({ action: "team.delete", id: t.id }, "Tim dihapus.")}>
                <IcoTrash />
              </button>
            </>
          )}
        </div>
      ))}

      {teams.length === 0 && <Empty title="Belum ada peserta" hint="Isi nama tim di atas untuk memulai liga." />}
    </div>
  );
}

/* ── Jadwal ───────────────────────────────────────────────── */
function Jadwal({ fixtures, teams, nm, call }) {
  const maxMd = fixtures.reduce((m, f) => Math.max(m, f.md), 0);
  const [md, setMd] = useState(1);
  const [bulk, setBulk] = useState("");
  const [auto, setAuto] = useState({ startDate: "", everyDays: "7", time: "20:00" });

  const generate = () => {
    if (fixtures.some((f) => f.status !== "scheduled") &&
      !confirm("Membuat ulang jadwal menghapus semua skor yang sudah masuk. Lanjut?")) return;
    call({ action: "fixtures.generate" }, "Jadwal dibuat.");
  };

  if (fixtures.length === 0)
    return (
      <Empty title="Jadwal belum dibuat" hint={`${teams.length} tim terdaftar. Buat jadwal round-robin sekarang.`}>
        <button className="btn go" onClick={generate} disabled={teams.length < 2}>
          <IcoShuffle /> Buat jadwal
        </button>
      </Empty>
    );

  const list = fixtures.filter((f) => f.md === md);

  return (
    <div className="stack">
      <div className="card pad row">
        <span className="lb grow">Matchday</span>
        <select className="in" style={{ width: "auto" }} value={md} onChange={(e) => setMd(+e.target.value)}>
          {Array.from({ length: maxMd }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>MD {n}</option>
          ))}
        </select>
      </div>

      <div className="card pad stack">
        <span className="lb">Isi tanggal semua matchday sekaligus</span>
        <div className="row">
          <div className="grow">
            <label className="lb" htmlFor="start">Matchday 1 main</label>
            <input id="start" className="in" type="date" style={{ marginTop: 6 }} value={auto.startDate}
              onChange={(e) => setAuto({ ...auto, startDate: e.target.value })} />
          </div>
          <div style={{ width: 96 }}>
            <label className="lb" htmlFor="jam">Jam</label>
            <input id="jam" className="in" type="time" style={{ marginTop: 6 }} value={auto.time}
              onChange={(e) => setAuto({ ...auto, time: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="lb" htmlFor="jeda">Jarak antar matchday</label>
          <select id="jeda" className="in" style={{ marginTop: 6 }} value={auto.everyDays}
            onChange={(e) => setAuto({ ...auto, everyDays: e.target.value })}>
            <option value="0">Semua di hari yang sama</option>
            <option value="1">Tiap hari</option>
            <option value="2">Tiap 2 hari</option>
            <option value="3">Tiap 3 hari</option>
            <option value="7">Tiap minggu</option>
            <option value="14">Tiap 2 minggu</option>
          </select>
        </div>
        <button className="btn go full" disabled={!auto.startDate}
          onClick={() => call({ action: "fixtures.autoSchedule", ...auto }, "Tanggal seluruh matchday terisi.")}>
          Terapkan ke {maxMd} matchday
        </button>
      </div>

      <div className="card pad row" style={{ alignItems: "flex-end" }}>
        <div className="grow">
          <label className="lb" htmlFor="bulk">Ubah tanggal MD {md} saja</label>
          <input id="bulk" className="in" type="date" style={{ marginTop: 6 }} value={bulk}
            onChange={(e) => setBulk(e.target.value)} />
        </div>
        <button className="btn" disabled={!bulk}
          onClick={() => call({ action: "fixture.schedule", ids: list.map((f) => f.id), date: bulk }, "Tanggal diterapkan.")}>
          Terapkan
        </button>
      </div>

      {list.map((f) => (
        <div key={f.id} className="card pad">
          <div className="strip">
            <div className="side h truncate">{nm(f.home_id)}</div>
            <span className={`chip ${f.status === "confirmed" ? "done" : f.status === "pending" ? "pend" : ""}`}>
              {f.home_score != null ? `${f.home_score} : ${f.away_score}` : "VS"}
            </span>
            <div className="side truncate">{nm(f.away_id)}</div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <input className="in mono" type="date" style={{ fontSize: 13, padding: "8px 10px" }}
              defaultValue={f.match_date || ""}
              onChange={(e) => call({ action: "fixture.schedule", id: f.id, date: e.target.value })} />
            <input className="in mono" type="time" style={{ fontSize: 13, padding: "8px 10px" }}
              defaultValue={f.match_time || ""}
              onChange={(e) => call({ action: "fixture.schedule", id: f.id, time: e.target.value })} />
          </div>
        </div>
      ))}

      <button className="btn danger full" onClick={generate}><IcoShuffle /> Buat ulang jadwal</button>
    </div>
  );
}

/* ── Pengaturan ───────────────────────────────────────────── */
function Pengaturan({ league, call }) {
  const [f, setF] = useState(league);
  useEffect(() => setF(league), [league]);
  if (!f) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div className="card pad stack">
      <span className="lb">Pengaturan liga</span>

      <div>
        <label className="lb" htmlFor="lname">Nama liga</label>
        <input id="lname" className="in" style={{ marginTop: 6 }} value={f.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <label className="lb" htmlFor="lseason">Musim</label>
        <input id="lseason" className="in" style={{ marginTop: 6 }} value={f.season} onChange={(e) => set("season", e.target.value)} />
      </div>
      <div>
        <label className="lb" htmlFor="lhandle">Handle di poster</label>
        <input id="lhandle" className="in" style={{ marginTop: 6 }} value={f.handle} onChange={(e) => set("handle", e.target.value)} />
      </div>

      <label className="switch">
        <span>Kandang–tandang (dua putaran)</span>
        <input type="checkbox" checked={f.double_round} onChange={(e) => set("double_round", e.target.checked)} />
      </label>
      <label className="switch">
        <span>
          Sahkan hasil otomatis
          <br /><span className="muted">Laporan peserta langsung masuk klasemen</span>
        </span>
        <input type="checkbox" checked={f.auto_confirm} onChange={(e) => set("auto_confirm", e.target.checked)} />
      </label>

      <div className="seg" data-n="3">
        {[["pts_win", "Menang"], ["pts_draw", "Seri"], ["pts_loss", "Kalah"]].map(([k, l]) => (
          <div key={k}>
            <label className="lb" htmlFor={k}>{l}</label>
            <input id={k} className="in mono" style={{ marginTop: 6, textAlign: "center" }} inputMode="numeric"
              value={f[k]} onChange={(e) => set(k, e.target.value.replace(/\D/g, ""))} />
          </div>
        ))}
      </div>

      <button className="btn go full" onClick={() => call({ action: "config.save", config: f }, "Pengaturan disimpan.")}>
        Simpan pengaturan
      </button>

      <div className="seg" data-n="2">
        <button className="btn danger" onClick={() => confirm("Semua skor dikosongkan, jadwal tetap. Lanjut?") &&
          call({ action: "results.clear" }, "Semua hasil dikosongkan.")}>
          Kosongkan hasil
        </button>
        <button className="btn danger" onClick={() => confirm("Semua tim, jadwal, dan hasil dihapus. Lanjut?") &&
          call({ action: "league.reset" }, "Liga direset.")}>
          <IcoTrash /> Reset liga
        </button>
      </div>
    </div>
  );
}
