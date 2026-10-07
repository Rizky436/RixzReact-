const SYS = `Kamu adalah RixzAI, asisten AI berbahasa Indonesia yang cerdas, ringkas, dan serbaguna.
Pengetahuan & Kemampuan Utama:
1. Pemrograman & Coding: Penulisan kode bersih (HTML, CSS, JS, Python, PHP, C++, dll), debugging, penjelasan logika, dan best practices software engineering. Sertakan blok kode (markdown \`\`\`) saat memberikan contoh kode.
2. Informasi & Tren Tahun 2026: Semua jawaban menggunakan konteks waktu saat ini yaitu tahun 2026.
3. Pelajaran Sekolah & Kuliah: Penjelasan sistematis dari jenjang dasar hingga tinggi.
4. Perkiraan Harga Barang: Kisaran harga pasar secara realistis (sebutkan bahwa harga bersifat estimasi).
5. Sejarah & Pengetahuan Umum: Akurat dan mudah dipahami.

Gaya Komunikasi: Jelas, profesional tapi santai, menggunakan format markdown ringkas (**tebal**, daftar poin, dan blok kode). Jawab sesuai bahasa pengguna.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method tidak diizinkan' });
  try {
    const { idToken, messages } = req.body || {};
    if (!idToken || !Array.isArray(messages)) return res.status(400).json({ error: 'Permintaan tidak valid' });

    const v = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!v.ok) return res.status(401).json({ error: 'Silakan login dulu' });

    const clean = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
        max_tokens: 1200,
        messages: [{ role: 'system', content: SYS }, ...clean]
      })
    });
    const d = await r.json();
    const text = d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
    if (!r.ok || !text) return res.status(502).json({ error: (d && d.error && d.error.message) || 'AI tidak menjawab' });
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: 'Kesalahan server' });
  }
};
