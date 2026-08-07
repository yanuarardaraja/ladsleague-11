"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/* ── Ikon (inline SVG, tanpa dependensi) ─────────────────── */
const svg = (d, extra = null) => (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" width="18" height="18" {...props}>
    {d.map((p, i) => <path key={i} d={p} />)}
    {extra}
  </svg>
);

export const IcoTable = svg(["M3 6h18", "M3 12h18", "M3 18h18"]);
export const IcoCalendar = svg(["M8 2v4", "M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"]);
export const IcoCamera = svg(["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"], <circle cx="12" cy="13" r="4" />);
export const IcoImage = svg(["M3 3h18v18H3z", "m21 15-5-5L5 21"], <circle cx="8.5" cy="8.5" r="1.5" />);
export const IcoCheck = svg(["M20 6 9 17l-5-5"]);
export const IcoX = svg(["M18 6 6 18", "M6 6l12 12"]);
export const IcoUpload = svg(["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"]);
export const IcoDownload = svg(["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"]);
export const IcoShare = svg(["M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", "M16 6l-4-4-4 4", "M12 2v13"]);
export const IcoSwap = svg(["M8 3 4 7l4 4", "M4 7h16", "M16 21l4-4-4-4", "M20 17H4"]);
export const IcoTrash = svg(["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"]);
export const IcoPlus = svg(["M12 5v14", "M5 12h14"]);
export const IcoPencil = svg(["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"]);
export const IcoShuffle = svg(["M16 3h5v5", "M4 20 21 3", "M21 16v5h-5", "M15 15l6 6", "M4 4l5 5"]);
export const IcoLock = svg(["M7 11V7a5 5 0 0 1 10 0v4", "M5 11h14v10H5z"]);
export const IcoLeft = svg(["m15 18-6-6 6-6"]);
export const IcoRight = svg(["m9 18 6-6-6-6"]);
export const IcoSpin = svg(["M21 12a9 9 0 1 1-6.2-8.6"]);
export const IcoWarn = svg(["M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z", "M12 9v4", "M12 17h.01"]);

/* ── Toast ───────────────────────────────────────────────── */
export function useToast() {
  const [toast, setToast] = useState(null);
  const say = useCallback((msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const node = toast ? <div className="toast" data-kind={toast.kind}>{toast.msg}</div> : null;
  return [say, node];
}

/* ── Navigasi bawah ──────────────────────────────────────── */
const LINKS = [
  ["/", IcoTable, "Liga"],
  ["/lapor", IcoCamera, "Lapor"],
  ["/poster", IcoImage, "Poster"],
  ["/admin", IcoLock, "Admin"],
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="navbar">
      <div className="navbar-in">
        {LINKS.map(([href, Icon, label]) => (
          <Link key={href} href={href} className="navlink" data-on={path === href ? "1" : "0"}>
            <Icon />
            <span>{label.toUpperCase()}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

/* ── Header ──────────────────────────────────────────────── */
export function Topbar({ league, right }) {
  return (
    <header className="topbar">
      <div className="topbar-in">
        <div style={{ minWidth: 0 }}>
          <span className="lb">{league?.season || "\u00a0"}</span>
          <div className="disp truncate" style={{ fontSize: 24, lineHeight: 1 }}>
            {league?.name || "Liga eFootball"}
          </div>
        </div>
        {right}
      </div>
    </header>
  );
}

/* ── Data liga ───────────────────────────────────────────── */
export function useLeague() {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/league", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setState({ loading: false, error: null, data: j });
    } catch (e) {
      setState({ loading: false, error: e.message, data: null });
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

/* ── Kondisi kosong & memuat ─────────────────────────────── */
export function Loading({ label = "Memuat data liga…" }) {
  return (
    <div className="empty row" style={{ justifyContent: "center", color: "var(--slate)" }}>
      <IcoSpin className="spin" /> {label}
    </div>
  );
}

export function Empty({ title, hint, children }) {
  return (
    <div className="card empty">
      <div className="disp" style={{ fontSize: 20 }}>{title}</div>
      <p className="muted" style={{ marginTop: 8, marginBottom: 16 }}>{hint}</p>
      {children}
    </div>
  );
}

export function ErrorBox({ error }) {
  return (
    <div className="note warn row" style={{ alignItems: "flex-start" }}>
      <IcoWarn style={{ color: "var(--fuel)", flexShrink: 0 }} />
      <span>{error}</span>
    </div>
  );
}

/* ── Kecilkan gambar sebelum dikirim ─────────────────────── */
export function shrinkImage(file, max = 1400) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * sc);
        cv.height = Math.round(img.height * sc);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL("image/jpeg", 0.82).split(",")[1]);
      };
      img.onerror = () => rej(new Error("Gambar tidak terbaca."));
      img.src = fr.result;
    };
    fr.onerror = () => rej(new Error("File gagal dibuka."));
    fr.readAsDataURL(file);
  });
}
