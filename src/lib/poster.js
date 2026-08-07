/* Generator poster 1080 × 1350 — ukuran feed Instagram. */

export const W = 1080;
export const H = 1350;

const C = {
  pitch: "#071a11",
  chalk: "#eef6f0",
  slate: "#7e9c8b",
  lime: "#c9f24e",
  fuel: "#ff5a3c",
};

const DISP = `Anton, Impact, "Arial Black", sans-serif`;
const MONO = `"JetBrains Mono", ui-monospace, Menlo, monospace`;

function fitText(ctx, text, maxW, size, family, weight = "400") {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    s -= 2;
  } while (s > 10);
  return s;
}

/** Balok miring — motif papan skor yang dipakai di seluruh poster. */
function skewBar(ctx, x, y, w, h, fill, skew = 0.18) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + h * skew, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - h * skew, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function paintBase(ctx, cfg, eyebrow) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#06180f");
  g.addColorStop(0.55, "#0c2618");
  g.addColorStop(1, "#04120b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, -120, 40, W / 2, 260, 900);
  glow.addColorStop(0, "rgba(201,242,78,0.16)");
  glow.addColorStop(1, "rgba(201,242,78,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // garis kapur lapangan
  ctx.strokeStyle = "rgba(238,246,240,0.09)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, H + 180, 520, Math.PI, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, H - 180);
  ctx.lineTo(W, H - 180);
  ctx.stroke();
  ctx.strokeRect(W / 2 - 240, H - 60, 480, 260);

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // label matchday
  ctx.font = `400 34px ${DISP}`;
  const label = eyebrow.toUpperCase();
  skewBar(ctx, 64, 78, ctx.measureText(label).width + 56, 54, C.lime);
  ctx.fillStyle = C.pitch;
  ctx.fillText(label, 88, 106);

  // nama liga
  const title = (cfg.name || "LIGA").toUpperCase();
  const ts = fitText(ctx, title, 952, 108, DISP);
  ctx.fillStyle = C.chalk;
  ctx.font = `400 ${ts}px ${DISP}`;
  ctx.fillText(title, 64, 190);

  ctx.fillStyle = C.slate;
  ctx.font = `500 30px ${MONO}`;
  ctx.fillText((cfg.season || "").toUpperCase(), 66, 244);

  ctx.strokeStyle = "rgba(238,246,240,0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 278);
  ctx.lineTo(W - 64, 278);
  ctx.stroke();
}

function paintFooter(ctx, cfg, right) {
  ctx.strokeStyle = "rgba(238,246,240,0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, H - 118);
  ctx.lineTo(W - 64, H - 118);
  ctx.stroke();

  ctx.textBaseline = "middle";
  ctx.fillStyle = C.slate;
  ctx.font = `500 26px ${MONO}`;
  ctx.textAlign = "left";
  ctx.fillText((cfg.handle || "").toUpperCase(), 64, H - 74);
  ctx.textAlign = "right";
  ctx.fillStyle = C.lime;
  ctx.fillText(String(right || "").toUpperCase(), W - 64, H - 74);
  ctx.textAlign = "left";
}

function matchRow(ctx, y, h, home, away, mid, midColor, sub, winner) {
  skewBar(ctx, 64, y, W - 128, h, "rgba(238,246,240,0.05)");
  skewBar(ctx, 64, y, 10, h, C.lime);

  const cx = W / 2;
  const dy = sub ? -12 : 0;
  ctx.textBaseline = "middle";

  ctx.textAlign = "right";
  ctx.fillStyle = winner === "h" ? C.lime : C.chalk;
  const s1 = fitText(ctx, home, cx - 190, 44, DISP);
  ctx.font = `400 ${s1}px ${DISP}`;
  ctx.fillText(home.toUpperCase(), cx - 92, y + h / 2 + dy);

  ctx.textAlign = "left";
  ctx.fillStyle = winner === "a" ? C.lime : C.chalk;
  const s2 = fitText(ctx, away, cx - 190, 44, DISP);
  ctx.font = `400 ${s2}px ${DISP}`;
  ctx.fillText(away.toUpperCase(), cx + 92, y + h / 2 + dy);

  ctx.textAlign = "center";
  ctx.fillStyle = midColor;
  ctx.font = `700 ${mid.length > 4 ? 40 : 52}px ${MONO}`;
  ctx.fillText(mid, cx, y + h / 2 + dy);

  if (sub) {
    ctx.fillStyle = C.slate;
    ctx.font = `500 24px ${MONO}`;
    ctx.fillText(sub.toUpperCase(), cx, y + h - 34);
  }
  ctx.textAlign = "left";
}

/** Gambar poster ke canvas. kind: 'jadwal' | 'hasil' | 'klasemen' */
export function drawPoster(canvas, { kind, cfg, list, table, nm, md, doneCount, totalCount }) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  if (kind === "klasemen") {
    paintBase(ctx, cfg, "Klasemen");
    const rows = (table || []).slice(0, 12);
    const top = 330;
    const rowH = Math.min(74, (H - top - 170) / Math.max(rows.length, 1));

    ctx.fillStyle = C.slate;
    ctx.font = `500 22px ${MONO}`;
    ctx.textAlign = "left";
    ctx.fillText("POS   TIM", 76, top - 26);
    ctx.textAlign = "center";
    ctx.fillText("M", W - 300, top - 26);
    ctx.fillText("SG", W - 210, top - 26);
    ctx.fillText("POIN", W - 110, top - 26);

    rows.forEach((r, i) => {
      const y = top + i * rowH;
      if (i === 0) skewBar(ctx, 64, y + 4, W - 128, rowH - 8, "rgba(201,242,78,0.14)");
      else if (i % 2 === 0) skewBar(ctx, 64, y + 4, W - 128, rowH - 8, "rgba(238,246,240,0.04)");

      ctx.textAlign = "left";
      ctx.fillStyle = i === 0 ? C.lime : C.slate;
      ctx.font = `700 26px ${MONO}`;
      ctx.fillText(String(i + 1).padStart(2, "0"), 82, y + rowH / 2);

      ctx.fillStyle = C.chalk;
      const s = fitText(ctx, r.name, W - 500, 40, DISP);
      ctx.font = `400 ${s}px ${DISP}`;
      ctx.fillText(r.name.toUpperCase(), 150, y + rowH / 2);

      ctx.textAlign = "center";
      ctx.font = `500 26px ${MONO}`;
      ctx.fillStyle = C.slate;
      ctx.fillText(String(r.P), W - 300, y + rowH / 2);
      ctx.fillStyle = r.GD > 0 ? C.lime : r.GD < 0 ? C.fuel : C.slate;
      ctx.fillText(r.GD > 0 ? `+${r.GD}` : String(r.GD), W - 210, y + rowH / 2);
      ctx.fillStyle = i === 0 ? C.lime : C.chalk;
      ctx.font = `700 40px ${MONO}`;
      ctx.fillText(String(r.Pts), W - 110, y + rowH / 2);
    });

    paintFooter(ctx, cfg, `${doneCount}/${totalCount} match`);
    return;
  }

  const isHasil = kind === "hasil";
  paintBase(ctx, cfg, `${isHasil ? "Hasil" : "Jadwal"} · Matchday ${String(md).padStart(2, "0")}`);

  const top = 330;
  const rowH = Math.min(140, (H - top - 170) / Math.max((list || []).length, 1));

  (list || []).forEach((f, i) => {
    const y = top + i * rowH;
    const played = f.home_score != null && f.away_score != null && f.status !== "scheduled";
    const mid = isHasil && played ? `${f.home_score} - ${f.away_score}` : "VS";
    const winner = isHasil && played
      ? f.home_score > f.away_score ? "h" : f.home_score < f.away_score ? "a" : null
      : null;
    const sub = isHasil
      ? played ? (f.status === "confirmed" ? "FULL TIME" : "BELUM SAH") : "BELUM MAIN"
      : [f.match_date, f.match_time].filter(Boolean).join(" · ") || "JADWAL MENYUSUL";

    matchRow(ctx, y + 8, rowH - 16, nm(f.home_id), nm(f.away_id), mid,
      isHasil && played ? C.lime : C.slate, sub, winner);
  });

  if (!list || list.length === 0) {
    ctx.fillStyle = C.slate;
    ctx.font = `500 30px ${MONO}`;
    ctx.textAlign = "center";
    ctx.fillText("BELUM ADA MATCH DI MATCHDAY INI", W / 2, H / 2);
    ctx.textAlign = "left";
  }

  paintFooter(ctx, cfg, `MD ${String(md).padStart(2, "0")}`);
}
