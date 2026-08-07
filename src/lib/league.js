/** Bikin jadwal round-robin dengan metode lingkaran. */
export function buildFixtures(teamIds, doubleRound) {
  const ids = [...teamIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push("__BYE__");
  const n = ids.length, half = n / 2, rounds = n - 1;
  let rot = ids.slice(1);
  const out = [];
  for (let r = 0; r < rounds; r++) {
    const line = [ids[0], ...rot];
    for (let i = 0; i < half; i++) {
      const a = line[i], b = line[n - 1 - i];
      if (a === "__BYE__" || b === "__BYE__") continue;
      const flip = (r + i) % 2 === 1;
      out.push({ md: r + 1, home_id: flip ? b : a, away_id: flip ? a : b });
    }
    rot.unshift(rot.pop());
  }
  if (doubleRound) {
    out.slice().forEach((f) =>
      out.push({ md: f.md + rounds, home_id: f.away_id, away_id: f.home_id })
    );
  }
  return out;
}

/** Hitung klasemen dari hasil yang sudah disahkan. */
export function computeTable(teams, fixtures, cfg) {
  const rows = {};
  teams.forEach((t) => {
    rows[t.id] = {
      id: t.id, name: t.name, short: t.short, player: t.player,
      P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0, form: [],
    };
  });

  const done = fixtures
    .filter((f) => f.status === "confirmed" && f.home_score != null && f.away_score != null)
    .sort((a, b) => a.md - b.md);

  done.forEach((f) => {
    const h = rows[f.home_id], a = rows[f.away_id];
    if (!h || !a) return;
    h.P++; a.P++;
    h.GF += f.home_score; h.GA += f.away_score;
    a.GF += f.away_score; a.GA += f.home_score;
    if (f.home_score > f.away_score) {
      h.W++; a.L++; h.Pts += cfg.pts_win; a.Pts += cfg.pts_loss; h.form.push("W"); a.form.push("K");
    } else if (f.home_score < f.away_score) {
      a.W++; h.L++; a.Pts += cfg.pts_win; h.Pts += cfg.pts_loss; a.form.push("W"); h.form.push("K");
    } else {
      h.D++; a.D++; h.Pts += cfg.pts_draw; a.Pts += cfg.pts_draw; h.form.push("S"); a.form.push("S");
    }
  });

  const h2h = (x, y) => {
    let px = 0, py = 0;
    done.forEach((f) => {
      const pair = (f.home_id === x && f.away_id === y) || (f.home_id === y && f.away_id === x);
      if (!pair) return;
      const xHome = f.home_id === x;
      const xs = xHome ? f.home_score : f.away_score;
      const ys = xHome ? f.away_score : f.home_score;
      if (xs > ys) px += cfg.pts_win;
      else if (xs < ys) py += cfg.pts_win;
      else { px += cfg.pts_draw; py += cfg.pts_draw; }
    });
    return py - px;
  };

  return Object.values(rows)
    .map((r) => ({ ...r, GD: r.GF - r.GA, form: r.form.slice(-5) }))
    .sort(
      (a, b) =>
        b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || h2h(a.id, b.id) || a.name.localeCompare(b.name)
    );
}

export const shortOf = (n) =>
  (n || "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase() ||
  (n || "TIM").slice(0, 3).toUpperCase();
