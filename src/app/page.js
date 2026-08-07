"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { computeTable } from "@/lib/league";
import {
  Topbar, useLeague, Loading, Empty, ErrorBox,
  IcoLeft, IcoRight,
} from "@/components/ui";

const FORM_COLOR = { W: "var(--lime)", S: "var(--slate)", K: "var(--fuel)" };

export default function Home() {
  const { loading, error, data } = useLeague();
  const [view, setView] = useState("klasemen");

  const league = data?.league;
  const teams = data?.teams || [];
  const fixtures = data?.fixtures || [];
  const table = useMemo(
    () => (league ? computeTable(teams, fixtures, league) : []),
    [teams, fixtures, league]
  );

  return (
    <>
      <Topbar league={league} />
      <main className="shell" style={{ paddingTop: 16 }}>
        {loading && <Loading />}
        {error && <ErrorBox error={error} />}

        {data && (
          <div className="stack">
            <div className="seg" data-n="3">
              {[["klasemen", "Klasemen"], ["jadwal", "Jadwal"], ["hasil", "Hasil"]].map(([k, l]) => (
                <button key={k} onClick={() => setView(k)}
                  className={`btn ${view === k ? "go" : ""}`}>{l}</button>
              ))}
            </div>

            {view === "klasemen" && <Klasemen table={table} fixtures={fixtures} />}
            {view === "jadwal" && <Matches fixtures={fixtures} teams={teams} mode="jadwal" />}
            {view === "hasil" && <Matches fixtures={fixtures} teams={teams} mode="hasil" />}
          </div>
        )}
      </main>
    </>
  );
}

function Klasemen({ table, fixtures }) {
  if (table.length === 0)
    return (
      <Empty title="Liga belum dimulai" hint="Peserta belum didaftarkan admin.">
        <Link href="/admin" className="btn go">Buka panel admin</Link>
      </Empty>
    );

  const done = fixtures.filter((f) => f.status === "confirmed").length;

  return (
    <>
      <span className="lb">{done} dari {fixtures.length} match selesai</span>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="tbl-head">
          <span className="lb">#</span>
          <span className="lb">Tim</span>
          <span className="lb" style={{ textAlign: "center" }}>M</span>
          <span className="lb" style={{ textAlign: "center" }}>M</span>
          <span className="lb" style={{ textAlign: "center" }}>S</span>
          <span className="lb" style={{ textAlign: "center" }}>K</span>
          <span className="lb" style={{ textAlign: "center" }}>SG</span>
          <span className="lb" style={{ textAlign: "center" }}>Poin</span>
        </div>
        {table.map((r, i) => (
          <div key={r.id} className="tbl-row" data-top={i === 0 ? "1" : "0"}>
            <span className="num mono" style={{ fontWeight: 700, color: i === 0 ? "var(--lime)" : "var(--slate)" }}>
              {i + 1}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="name truncate">{r.name}</div>
              <div className="form">
                {r.form.length === 0 && (
                  <span className="mono" style={{ width: "auto", padding: "0 5px", color: "var(--slate)" }}>
                    BELUM MAIN
                  </span>
                )}
                {r.form.map((f, k) => (
                  <span key={k} style={{ color: FORM_COLOR[f] }}>{f}</span>
                ))}
              </div>
            </div>
            <span className="num">{r.P}</span>
            <span className="num">{r.W}</span>
            <span className="num">{r.D}</span>
            <span className="num">{r.L}</span>
            <span className="num" style={{ color: r.GD > 0 ? "var(--lime)" : r.GD < 0 ? "var(--fuel)" : "var(--slate)" }}>
              {r.GD > 0 ? `+${r.GD}` : r.GD}
            </span>
            <span className="pts">{r.Pts}</span>
          </div>
        ))}
      </div>
      <p className="muted">
        Urutan: poin → selisih gol → gol memasukkan → head-to-head. Hanya hasil yang sudah disahkan
        admin yang dihitung.
      </p>
    </>
  );
}

function Matches({ fixtures, teams, mode }) {
  const nm = (id) => teams.find((t) => t.id === id)?.name || "—";
  const maxMd = fixtures.reduce((m, f) => Math.max(m, f.md), 0);
  const [md, setMd] = useState(1);

  useEffect(() => {
    if (mode !== "jadwal") return;
    const next = fixtures.find((f) => f.status !== "confirmed");
    if (next) setMd(next.md);
  }, [fixtures, mode]);

  if (fixtures.length === 0)
    return <Empty title="Jadwal belum terbit" hint="Admin belum membuat jadwal pertandingan." />;

  const list = fixtures.filter((f) => f.md === md);

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button className="btn icon" onClick={() => setMd((m) => Math.max(1, m - 1))} aria-label="Matchday sebelumnya">
          <IcoLeft />
        </button>
        <div style={{ textAlign: "center" }}>
          <span className="lb">Matchday</span>
          <div className="disp" style={{ fontSize: 30, lineHeight: 1, color: "var(--lime)" }}>
            {String(md).padStart(2, "0")}
          </div>
          <span className="mono" style={{ fontSize: 10, color: "var(--slate)" }}>DARI {maxMd}</span>
        </div>
        <button className="btn icon" onClick={() => setMd((m) => Math.min(maxMd, m + 1))} aria-label="Matchday berikutnya">
          <IcoRight />
        </button>
      </div>

      {list.map((f) => {
        const played = f.home_score != null && f.away_score != null;
        const showScore = mode === "hasil" ? played : played && f.status === "confirmed";
        return (
          <div key={f.id} className="card pad">
            <div className="strip">
              <div className="side h truncate"
                style={{ color: showScore && f.home_score > f.away_score ? "var(--lime)" : undefined }}>
                {nm(f.home_id)}
              </div>
              <span className={`chip ${f.status === "confirmed" ? "done" : f.status === "pending" ? "pend" : ""}`}>
                {showScore ? `${f.home_score} : ${f.away_score}` : "VS"}
              </span>
              <div className="side truncate"
                style={{ color: showScore && f.away_score > f.home_score ? "var(--lime)" : undefined }}>
                {nm(f.away_id)}
              </div>
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--slate)", marginTop: 8, textAlign: "center", letterSpacing: ".1em" }}>
              {f.status === "confirmed"
                ? "FULL TIME"
                : f.status === "pending"
                ? "MENUNGGU DISAHKAN"
                : [f.match_date, f.match_time].filter(Boolean).join(" · ").toUpperCase() || "JADWAL MENYUSUL"}
            </div>
          </div>
        );
      })}

      {list.length === 0 && <p className="muted">Tidak ada match di matchday ini.</p>}
    </>
  );
}
