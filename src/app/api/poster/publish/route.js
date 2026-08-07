import { db, getLeague } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRAPH_API_BASE = "https://graph.instagram.com/v21.0";
const CONTAINER_POLL_INTERVAL_MS = 2000;
const CONTAINER_POLL_TIMEOUT_MS = 60_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Instagram proses gambar container secara async — media_publish gagal dengan
 * "Media ID is not available" kalau dipanggil sebelum status_code jadi FINISHED.
 */
async function waitForContainerReady(containerId, accessToken) {
  const deadline = Date.now() + CONTAINER_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`
    );
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") {
      throw new Error(`Container gagal diproses Instagram: ${data.error?.message ?? "status ERROR"}`);
    }
    await sleep(CONTAINER_POLL_INTERVAL_MS);
  }
  throw new Error("Timeout menunggu container siap di-publish (>60 detik).");
}

async function publishToInstagram({ imageUrl, caption }) {
  const igAccountId = process.env.IG_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.IG_ACCESS_TOKEN;
  if (!igAccountId || !accessToken) {
    throw new Error("IG_BUSINESS_ACCOUNT_ID / IG_ACCESS_TOKEN belum diisi.");
  }

  const containerRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok || !containerData.id) {
    throw new Error(`Gagal membuat media container: ${containerData.error?.message ?? containerRes.statusText}`);
  }

  await waitForContainerReady(containerData.id, accessToken);

  const publishRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    throw new Error(`Gagal publish media: ${publishData.error?.message ?? publishRes.statusText}`);
  }

  return publishData.id;
}

export async function POST(req) {
  try {
    if (!(await isAdmin())) {
      return Response.json({ ok: false, error: "Masuk sebagai admin dulu." }, { status: 401 });
    }

    const league = await getLeague();
    const { image, caption } = await req.json();
    if (!image) return Response.json({ ok: false, error: "Poster tidak terkirim." }, { status: 400 });

    const path = `${league.slug}/${Date.now()}.png`;
    const bytes = Buffer.from(image, "base64");
    const { error: upErr } = await db().storage.from("posters").upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (upErr) throw new Error(`Gagal unggah poster: ${upErr.message}`);

    const imageUrl = db().storage.from("posters").getPublicUrl(path).data.publicUrl;
    const igMediaId = await publishToInstagram({ imageUrl, caption: String(caption || "").slice(0, 2200) });

    return Response.json({ ok: true, igMediaId });
  } catch (e) {
    console.error("Publish IG gagal", e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
