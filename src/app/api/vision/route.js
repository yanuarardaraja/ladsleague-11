export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export async function POST(req) {
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return Response.json(
        { ok: false, error: "ANTHROPIC_API_KEY belum diisi. Skor bisa diketik manual." },
        { status: 503 }
      );
    }

    const { image, mediaType, homeName, awayName } = await req.json();
    if (!image) return Response.json({ ok: false, error: "Gambar tidak terkirim." }, { status: 400 });

    const prompt = `Ini screenshot layar hasil pertandingan game eFootball Mobile.
Baca papan skor akhir. Nama tim atau klub biasanya ada di kiri dan kanan, angka skor di tengah.
Match yang diharapkan: kandang = "${homeName || "?"}", tandang = "${awayName || "?"}".

Balas HANYA JSON, tanpa markdown dan tanpa penjelasan:
{"found":true,"leftName":"","rightName":"","leftScore":0,"rightScore":0,"confidence":"tinggi","note":""}

Aturan:
- found=false kalau angka skor tidak terlihat jelas atau gambar bukan hasil pertandingan.
- confidence salah satu dari: tinggi, sedang, rendah.
- note: satu kalimat pendek bahasa Indonesia.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error("Anthropic error", r.status, detail);
      return Response.json(
        { ok: false, error: "Pembacaan otomatis sedang tidak tersedia. Ketik skor manual." },
        { status: 502 }
      );
    }

    const data = await r.json();
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    return Response.json({ ok: true, result: parsed });
  } catch (e) {
    console.error(e);
    return Response.json(
      { ok: false, error: "Skor tidak terbaca dari gambar. Ketik manual." },
      { status: 200 }
    );
  }
}
