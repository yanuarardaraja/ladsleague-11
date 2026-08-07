# Liga eFootball

Sistem turnamen format liga untuk eFootball Mobile. Peserta melaporkan skor lewat screenshot
hasil match, Claude membacanya otomatis, admin mengesahkan, klasemen dan poster ikut jalan sendiri.

- **Publik** — `/` klasemen, jadwal, hasil
- **Peserta** — `/lapor` unggah screenshot, skor terbaca otomatis
- **Poster** — `/poster` jadwal, hasil, klasemen, ukuran 1080 × 1350 siap feed Instagram
- **Admin** — `/admin` kelola tim, generate jadwal, sahkan atau tolak laporan

Next.js 15 · Supabase · Claude vision di server.

---

## 1. Siapkan Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, tempel seluruh isi `supabase/schema.sql`, jalankan.
3. Cek **Storage** — bucket `evidence` harus ada dan berstatus public. Kalau belum, buat manual:
   *New bucket* → nama `evidence` → centang *Public bucket*.
4. Buka **Project Settings → API**, catat:
   - `Project URL`
   - `service_role` secret key

> Service role key punya akses penuh. Simpan hanya di environment variable Vercel,
> jangan pernah dipakai di kode yang jalan di browser.

## 2. Siapkan kunci Claude

Ambil API key di [console.anthropic.com](https://console.anthropic.com) → **API Keys**.
Pembacaan screenshot berjalan di server, jadi kunci tidak pernah sampai ke perangkat peserta.

Kalau `ANTHROPIC_API_KEY` dikosongkan, aplikasi tetap jalan — peserta tinggal mengetik skor manual.

## 3. Deploy ke Vercel

```bash
git init && git add -A && git commit -m "Liga eFootball"
git remote add origin git@github.com:USERNAME/liga-efootball.git
git push -u origin main
```

Di [vercel.com](https://vercel.com) → **Add New → Project** → pilih repo → **Deploy**.

Isi **Settings → Environment Variables**:

| Nama | Isi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL dari Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret key |
| `ANTHROPIC_API_KEY` | `sk-ant-…` |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` (opsional) |
| `ADMIN_PASSWORD` | kunci masuk panel admin |
| `SESSION_SECRET` | string acak, 32 karakter atau lebih |

Bikin `SESSION_SECRET` cepat:

```bash
openssl rand -base64 32
```

Setelah variabel terisi, jalankan **Redeploy** sekali supaya terbaca.

## 4. Jalan lokal

```bash
cp .env.example .env.local   # isi nilainya
npm install
npm run dev
```

Buka `http://localhost:3000`.

## 5. Mulai turnamen

1. Buka `/admin`, masuk pakai `ADMIN_PASSWORD`.
2. Tab **Tim** — daftarkan semua peserta.
3. **Pengaturan** — atur nama liga, musim, handle poster, dan format satu atau dua putaran. Simpan.
4. Tab **Jadwal** — tekan *Buat jadwal*, lalu isi tanggal per matchday.
5. Sebar link `/lapor` ke grup peserta.
6. Laporan masuk ke tab **Verifikasi** — sahkan, koreksi, atau tolak.
7. Buka `/poster` tiap selesai matchday, unduh, posting.

Kalau mau laporan peserta langsung masuk klasemen tanpa diperiksa, nyalakan
*Sahkan hasil otomatis* di Pengaturan.

---

## Catatan teknis

**Keamanan.** RLS aktif di ketiga tabel tanpa policy, jadi tidak ada akses langsung dari browser.
Seluruh baca-tulis lewat API route yang jalan di server. Sesi admin memakai cookie httpOnly
bertanda tangan HMAC, berlaku 14 hari.

**Urutan klasemen.** Poin → selisih gol → gol memasukkan → head-to-head → abjad.
Hanya hasil berstatus `confirmed` yang dihitung.

**Jadwal.** Round-robin metode lingkaran. Jumlah tim ganjil otomatis dapat bye tiap putaran.
Dua putaran menggandakan jadwal dengan kandang-tandang dibalik.

**Bukti screenshot.** Gambar dikecilkan di perangkat peserta sebelum dikirim, lalu disimpan di
bucket `evidence` sebagai bukti kalau ada protes hasil. Link-nya muncul di tab Verifikasi.

**Ganti nama liga di URL.** Set environment variable `LEAGUE_SLUG` dan tambahkan baris liga baru
di tabel `leagues` kalau mau menjalankan lebih dari satu musim dalam satu database.
