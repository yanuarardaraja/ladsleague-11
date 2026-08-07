"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeTable } from "@/lib/league";
import { drawPoster } from "@/lib/poster";
import {
  Topbar, useLeague, Loading, Empty, ErrorBox, useToast, post,
  IcoDownload, IcoShare, IcoLeft, IcoRight, IcoSpin, IcoUpload, IcoCheck, IcoX,
} from "@/components/ui";

export default function PosterPage() {
  const { loading, error, data } = useLeague();
  const [kind, setKind] = useState("jadwal");
  const [md, setMd] = useState(1);
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [say, toast] = useToast();
  const canvasRef = useRef(null);
  const isAdmin = !!data?.admin;

  const league = data?.league;
  const teams = useMemo(() => data?.teams || [], [data]);
  const fixtures = useMemo(() => data?.fixtures || [], [data]);
  const table = useMemo(
    () => (league ? computeTable(teams, fixtures, league) : []),
    [teams, fixtures, league]
  );
  const maxMd = fixtures.reduce((m, f) => Math.max(m, f.md), 0);

  const render = useCallback(async () => {
    if (!league || !canvasRef.current) return;
    setBusy(true);
    try { await document.fonts.ready; } catch { /* pakai font sistem */ }
    await drawPoster(canvasRef.current, {
      kind,
      cfg: league,
      list: fixtures.filter((f) => f.md === md),
      table,
      nm: (id) => teams.find((t) => t.id === id)?.name || "—",
      md,
      doneCount: fixtures.filter((f) => f.status === "confirmed").length,
      totalCount: fixtures.length,
    });
    setUrl(canvasRef.current.toDataURL("image/png"));
    setBusy(false);
  }, [kind, md, league, fixtures, table, teams]);

  useEffect(() => { render(); }, [render]);

  const filename = `${(league?.name || "liga").toLowerCase().replace(/\s+/g, "-")}-${kind}${
    kind !== "klasemen" ? `-md${md}` : ""
  }.png`;

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    say("Poster diunduh.");
  };

  const share = async () => {
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: league?.name });
      } else download();
    } catch { download(); }
  };

  const defaultCaption = () => {
    if (!league) return "";
    const lines = [league.name];
    lines.push(
      kind === "klasemen" ? "Klasemen terkini" : `${kind === "hasil" ? "Hasil" : "Jadwal"} Matchday ${String(md).padStart(2, "0")}`
    );
    if (league.season) lines.push(league.season);
    if (league.handle) lines.push(league.handle);
    return lines.join("\n");
  };

  const openPost = () => { setCaption(defaultCaption()); setShowPost(true); };

  const confirmPost = async () => {
    if (!url) return;
    setPosting(true);
    const j = await post("/api/poster/publish", { image: url.split(",")[1], caption });
    setPosting(false);
    if (j.ok) { say("Terposting ke Instagram."); setShowPost(false); }
    else say(j.error || "Gagal posting.", "bad");
  };

  return (
    <>
      <Topbar league={league} />
      <main className="shell" style={{ paddingTop: 16 }}>
        {loading && <Loading />}
        {error && <ErrorBox error={error} />}

        {data && fixtures.length === 0 && teams.length === 0 && (
          <Empty title="Belum ada yang bisa dibuat poster" hint="Daftarkan tim dan buat jadwal di panel admin." />
        )}

        {data && (teams.length > 0 || fixtures.length > 0) && (
          <div className="stack">
            <div className="seg" data-n="3">
              {[["jadwal", "Jadwal"], ["hasil", "Hasil"], ["klasemen", "Klasemen"]].map(([k, l]) => (
                <button key={k} className={`btn ${kind === k ? "go" : ""}`} onClick={() => setKind(k)}>{l}</button>
              ))}
            </div>

            {kind !== "klasemen" && maxMd > 0 && (
              <div className="card pad row">
                <span className="lb grow">Matchday</span>
                <button className="btn sm" onClick={() => setMd((m) => Math.max(1, m - 1))} aria-label="Sebelumnya">
                  <IcoLeft />
                </button>
                <span className="mono" style={{ fontWeight: 700, fontSize: 18, minWidth: 34, textAlign: "center", color: "var(--lime)" }}>
                  {String(md).padStart(2, "0")}
                </span>
                <button className="btn sm" onClick={() => setMd((m) => Math.min(maxMd, m + 1))} aria-label="Berikutnya">
                  <IcoRight />
                </button>
              </div>
            )}

            <div className="card" style={{ overflow: "hidden", position: "relative" }}>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              {url && <img src={url} alt={`Poster ${kind}`} style={{ width: "100%", display: "block" }} />}
              {busy && (
                <div style={{
                  position: "absolute", inset: 0, display: "grid", placeItems: "center",
                  background: "rgba(7,26,17,.7)", color: "var(--lime)",
                }}>
                  <IcoSpin className="spin" width="24" height="24" />
                </div>
              )}
            </div>

            <div className="seg" data-n="2">
              <button className="btn go" onClick={download}><IcoDownload /> Unduh PNG</button>
              <button className="btn" onClick={share}><IcoShare /> Bagikan</button>
            </div>
            <p className="muted">Ukuran 1080 × 1350 px, pas untuk feed Instagram.</p>

            {isAdmin && !showPost && (
              <button className="btn go full" onClick={openPost} disabled={!url || busy}>
                <IcoUpload /> Post ke Instagram
              </button>
            )}

            {isAdmin && showPost && (
              <div className="card pad stack">
                <span className="lb">Caption</span>
                <textarea className="in" value={caption} onChange={(e) => setCaption(e.target.value)}
                  style={{ minHeight: 110 }} />
                <p className="muted" style={{ margin: 0 }}>
                  Poster akan langsung tayang di Instagram begitu ditekan Posting — pastikan sudah benar.
                </p>
                <div className="seg" data-n="2">
                  <button className="btn" onClick={() => setShowPost(false)} disabled={posting}>
                    <IcoX /> Batal
                  </button>
                  <button className="btn go" onClick={confirmPost} disabled={posting}>
                    {posting ? <><IcoSpin className="spin" /> Posting…</> : <><IcoCheck /> Posting</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      {toast}
    </>
  );
}
