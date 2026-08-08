export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export async function POST(req) {
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return Response.json(
        { ok: false, error: "ANTHROPIC_API_KEY belum diisi. Cocokkan match secara manual." },
        { status: 503 }
      );
    }

    const { image, mediaType, candidates } = await req.json();
    if (!image) return Response.json({ ok: false, error: "Gambar tidak terkirim." }, { status: 400 });
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return Response.json({ ok: false, error: "Tidak ada match yang masih terbuka." }, { status: 400 });
    }

    const list = candidates.map((c, i) => `${i}. Kandang "${c.home}" vs Tandang "${c.away}"`).join("\n");

    const prompt = `Ini screenshot layar hasil pertandingan game eFootball Mobile.
Baca nama tim di papan skor dan skor akhirnya. Cocokkan nama tim yang terbaca ke SALAH SATU
kandidat match di bawah (penulisan nama boleh sedikit berbeda/singkatan, pilih yang paling mendekati):
${list}

Balas HANYA JSON, tanpa markdown dan tanpa penjelasan:
{"found":true,"candidateIndex":0,"homeScore":0,"awayScore":0,"confidence":"tinggi","note":""}

Aturan:
- candidateIndex = nomor kandidat di atas yang cocok dengan tim di gambar.
- homeScore/awayScore ikut posisi Kandang/Tandang pada kandidat itu, BUKAN posisi kiri/kanan di gambar.
- found=false kalau skor tidak terlihat jelas, gambar bukan hasil pertandingan, atau tidak ada kandidat yang cocok.
- confidence salah satu dari: tinggi, sedang, rendah.
- note: satu kalimat pendek bahasa Indonesia (jelaskan kalau ragu atau tidak ketemu).`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        // claude-sonnet-5 thinks adaptively by default even tanpa param "thinking" —
        // baca skor tidak butuh reasoning dalam, jadi effort rendah supaya budget
        // token tidak habis untuk thinking dan menyisakan 0 buat teks/JSON.
        output_config: { effort: "low" },
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
        { ok: false, error: "Pembacaan otomatis sedang tidak tersedia. Cocokkan manual." },
        { status: 502 }
      );
    }

    const data = await r.json();
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Vision-bulk: tidak ada JSON di balasan model. stop_reason:", data.stop_reason, "text:", text.slice(0, 500));
      throw new Error("Model tidak mengembalikan JSON yang valid.");
    }
    const parsed = JSON.parse(jsonMatch[0]);

    let result = { found: false, note: parsed.note || "Tidak ada kandidat yang cocok." };
    if (
      parsed.found &&
      Number.isInteger(parsed.candidateIndex) &&
      candidates[parsed.candidateIndex] &&
      Number.isInteger(parsed.homeScore) &&
      Number.isInteger(parsed.awayScore) &&
      parsed.homeScore >= 0 &&
      parsed.awayScore >= 0
    ) {
      result = {
        found: true,
        candidateIndex: parsed.candidateIndex,
        homeScore: parsed.homeScore,
        awayScore: parsed.awayScore,
        confidence: parsed.confidence || "sedang",
        note: parsed.note || "",
      };
    }

    return Response.json({ ok: true, result });
  } catch (e) {
    console.error(e);
    return Response.json(
      { ok: false, error: "Skor tidak terbaca dari gambar. Cocokkan manual." },
      { status: 200 }
    );
  }
}
