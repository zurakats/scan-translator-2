import React, { useState, useEffect } from 'react';
import { Save, Settings2 } from 'lucide-react';

const Settings = () => {
  const [engine, setEngine] = useState('googletrans');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedEngine = localStorage.getItem('translationEngine');
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedEngine) setEngine(savedEngine);
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('translationEngine', engine);
    localStorage.setItem('geminiApiKey', apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] items-center font-winky bg-brand-dark relative py-10">

      {/* Background Hero */}
      <div className="hero absolute top-0 left-0 -z-10 h-full w-full overflow-hidden flex items-center justify-center pointer-events-none opacity-20">
        <img src="/assets/hero-banner (2).jpg" alt="manga" className="object-cover h-full" />
        <img src="/assets/hero-banner (3).jpg" alt="manga" className="object-cover h-full" />
        <img src="/assets/hero-banner (1).jpg" alt="manga" className="object-cover h-full" />
      </div>

      {/* Settings Card */}
      <div className="w-full max-w-[600px] mt-10 bg-black/60 backdrop-blur-lg p-10 rounded-2xl border border-white/10 shadow-2xl flex flex-col gap-8 z-10">

        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Settings2 size={28} className="text-brand-blue-hover" />
          <h1 className="text-3xl font-bold text-white tracking-wide">Pengaturan</h1>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-lg font-bold text-white/90 tracking-wide">Mesin Penerjemah (Engine)</label>
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            className="p-4 bg-brand-dark text-white border border-white/20 rounded-xl text-lg focus:outline-none focus:border-brand-blue-hover focus:ring-2 focus:ring-brand-blue/50 transition-all cursor-pointer shadow-inner appearance-none"
          >
            <option value="googletrans">Google Translate (Gratis & Default)</option>
            <option value="gemini">Google Gemini AI (Lebih Natural & Pintar)</option>
          </select>
          <p className="text-sm text-white/50 mt-1 leading-relaxed">
            Gemini AI menghasilkan terjemahan yang jauh lebih luwes dan sesuai konteks komik, namun memerlukan API Key.
          </p>
        </div>

        {engine === 'gemini' && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="text-lg font-bold text-white/90 tracking-wide">Google Gemini API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Masukkan API Key Anda di sini..."
              className="p-4 bg-brand-dark text-white border border-white/20 rounded-xl text-lg focus:outline-none focus:border-brand-blue-hover focus:ring-2 focus:ring-brand-blue/50 transition-all placeholder:text-white/30"
            />
            <p className="text-sm text-white/50 mt-1 leading-relaxed">
              Dapatkan API Key secara gratis di <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-brand-blue-hover font-bold hover:underline transition-all">Google AI Studio</a>.
            </p>
            <p className="text-sm text-yellow-400/80 mt-1 leading-relaxed">
              ⚠️ Free tier Gemini dibatasi 5 request/menit. Kalau komik punya banyak teks per halaman, proses bisa memakan waktu beberapa menit karena sistem otomatis menunggu & mencoba ulang saat limit tercapai.
            </p>
          </div>
        )}

        <button
          onClick={handleSave}
          className="mt-4 flex items-center justify-center gap-3 w-full py-4 bg-brand-blue text-white text-lg font-bold tracking-widest rounded-xl hover:bg-brand-blue-hover transition-all duration-300 shadow-[0_4px_14px_rgba(0,123,255,0.3)] hover:shadow-[0_6px_20px_rgba(0,123,255,0.4)]"
        >
          <Save size={22} />
          SIMPAN PENGATURAN
        </button>

        {saved && (
          <p className="text-green-400 text-center font-bold text-sm tracking-widest animate-pulse">
            PENGATURAN BERHASIL DISIMPAN!
          </p>
        )}
      </div>
    </div>
  );
};

export default Settings;
