import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Download, Upload, RefreshCw } from 'lucide-react';

const Home = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sourceLang, setSourceLang] = useState('');
  const [targetLang, setTargetLang] = useState('');
  const [statusText, setStatusText] = useState('Image Info');
  const [statusColor, setStatusColor] = useState('rgba(0, 0, 0, 0.6)');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]); 
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const startTimer = () => {
    if (!timerRef.current) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setStatusText(`Memproses gambar: ${elapsed} detik`);
      }, 1000);
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleUpload = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
      setStatusText(`Jumlah gambar yang diunggah: ${fileArray.length}`);
      setStatusColor('rgba(0, 0, 0, 0.6)');
      setResults([]);
    }
    e.target.value = null; 
  };

  const translateImage = async () => {
    if (selectedFiles.length === 0) {
      alert('Upload gambar dulu sebelum menerjemahkan!');
      return;
    }
    if (!sourceLang || !targetLang) {
      alert('Pilih bahasa sumber dan bahasa target!');
      return;
    }

    const engine = localStorage.getItem('translationEngine') || 'googletrans';
    const apiKey = localStorage.getItem('geminiApiKey') || '';

    if (engine === 'gemini' && !apiKey) {
      alert('API Key Gemini belum diatur. Silakan isi di menu Settings.');
      return;
    }

    setIsProcessing(true);
    startTimer();
    setStatusColor('rgba(0, 0, 0, 0.6)');
    setStatusText('Sedang memproses...');

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('image[]', file);
    });
    formData.append('source', sourceLang);
    formData.append('target', targetLang);
    formData.append('engine', engine);
    formData.append('apiKey', apiKey);

    try {
      const response = await fetch('http://127.0.0.1:5000/process-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error('Hasil terjemahan kosong.');
      }

      setResults(data.results);

      // Save to local storage history
      const currentHistory = JSON.parse(localStorage.getItem('translationHistory') || '[]');
      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        sourceLang,
        targetLang,
        engine,
        images: data.results
      };
      localStorage.setItem('translationHistory', JSON.stringify([newHistoryItem, ...currentHistory]));

      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      stopTimer();
      setStatusText(`Proses terjemahan selesai! \nMemakan waktu: ${elapsedSeconds} detik`);
      setStatusColor('rgba(0, 128, 0, 0.6)');
    } catch (err) {
      stopTimer();
      setStatusText('Terjadi kesalahan!');
      setStatusColor('rgba(255, 0, 0, 0.6)');
      alert('Gagal memproses gambar. Pastikan server backend menyala dan kunci API valid.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPDF = async () => {
    const imageUrls = results.map(r => r.translated).filter(url => url);
    if (!imageUrls || imageUrls.length === 0) {
      alert('Belum ada gambar untuk diunduh!');
      return;
    }

    const pdf = new jsPDF();
    const promises = imageUrls.map((url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    });

    const images = await Promise.all(promises);
    images.forEach((img, index) => {
      if (!img) return;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;

      const x = (pageWidth - w) / 2;
      const y = (pageHeight - h) / 2;

      if (index > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', x, y, w, h);
    });

    pdf.save('hasil_gambar.pdf');
  };

  return (
    <>
      <div className="flex flex-col w-full min-h-[calc(100vh-80px)] justify-center gap-[20px] items-center z-10 relative py-[40px] font-winky">
        <label
          id="imageInfo"
          className="mb-5 text-white text-center rounded-lg px-6 py-3 min-w-[300px]"
          style={{ backgroundColor: statusColor, whiteSpace: 'pre-line' }}
        >
          {statusText}
        </label>

        <input
          type="file"
          id="imageInput"
          accept="image/*"
          style={{ display: 'none' }}
          multiple
          onChange={handleUpload}
          disabled={isProcessing}
        />
        
        <label
          htmlFor="imageInput"
          className="w-[300px] md:w-[400px] h-[71px] flex gap-2 items-center justify-center bg-brand-dark text-[24px] md:text-[28px] border-[3px] border-brand-dark rounded-[5px] text-white transition-colors duration-300 ease-out hover:bg-white hover:text-brand-dark cursor-pointer text-center leading-none mt-2 shadow-lg"
          style={{ pointerEvents: isProcessing ? 'none' : 'auto', opacity: isProcessing ? 0.5 : 1 }}
        >
          <Upload /> UPLOAD GAMBAR
        </label>

        <div className="flex flex-col md:flex-row gap-[15px] items-center my-[10px]">
          <select
            id="source-lang"
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            disabled={isProcessing}
            style={{ padding: '0 15px' }}
            className="h-[55px] w-[300px] md:w-[250px] text-[18px] bg-white border-2 border-brand-blue rounded-[10px] shadow-sm text-brand-dark focus:outline-none focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue/20 transition-all duration-300 disabled:opacity-50 cursor-pointer hover:shadow-md"
          >
            <option value="">- pilih bahasa -</option>
            <option value="jp">Bahasa Jepang</option>
            <option value="ko">Bahasa Korea</option>
            <option value="ch_sim">Bahasa Mandarin</option>
            <option value="en">Bahasa Inggris</option>
          </select>

          <div className="flex items-center justify-center w-[40px] h-[40px] bg-brand-blue text-white rounded-full shadow-md rotate-90 md:rotate-0 transition-transform hover:scale-110">
            <RefreshCw size={20} />
          </div>

          <select
            id="target-lang"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            disabled={isProcessing}
            style={{ padding: '0 15px' }}
            className="h-[55px] w-[300px] md:w-[250px] text-[18px] bg-white border-2 border-brand-blue rounded-[10px] shadow-sm text-brand-dark focus:outline-none focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue/20 transition-all duration-300 disabled:opacity-50 cursor-pointer hover:shadow-md"
          >
            <option value="">- pilih bahasa -</option>
            <option value="id">Bahasa Indonesia</option>
            <option value="en">Bahasa Inggris</option>
          </select>
        </div>

        <button
          id="button-translate"
          onClick={translateImage}
          disabled={isProcessing}
          className="w-[300px] md:w-[200px] h-[53px] text-[18px] bg-brand-blue border-2 border-brand-blue rounded-[5px] shadow-[4px_4px_4px_rgba(0,0,0,0.3)] cursor-pointer text-white transition-colors duration-300 ease-out hover:bg-white hover:text-brand-blue-hover hover:border-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Memproses...' : 'Terjemahkan'}
        </button>

        {results.length > 0 && (
          <button
            id="downloadPdfBtn"
            onClick={downloadPDF}
            disabled={isProcessing}
            style={{ padding: '15px 30px', margin: '20px 0' }}
            className="flex items-center justify-center gap-3 text-lg tracking-widest bg-brand-dark text-white border-4 border-brand-dark rounded-xl shadow-lg cursor-pointer transition-all duration-300 ease-out hover:bg-white hover:text-brand-dark hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download />
            <span>DOWNLOAD PDF</span>
          </button>
        )}
      </div>

      {/* Hero Background */}
      <div className="hero">
        <img src="/assets/hero-banner (2).jpg" alt="manga page 2" />
        <img src="/assets/hero-banner (3).jpg" alt="manga page 3" />
        <img src="/assets/hero-banner (1).jpg" alt="manga page 1" />
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="bg-brand-dark w-full py-10 flex flex-col items-center justify-center shadow-inner z-20 relative">
          <div className="flex flex-col items-center w-full max-w-[1600px] px-4 gap-12">
            {results.map((result, index) => (
              <div key={index} className="flex flex-col xl:flex-row justify-center items-center gap-8 w-full">
                <div className="w-full max-w-[720px] p-[20px] bg-black rounded-[10px] flex flex-col gap-[10px] shadow-lg">
                  <p className="text-white text-center text-xl font-bold">Asli</p>
                  <img src={result.original} alt={`Original ${index + 1}`} className="w-full h-auto object-contain mx-auto rounded-lg" />
                </div>
                <div className="w-full max-w-[720px] p-[20px] bg-black rounded-[10px] flex flex-col gap-[10px] shadow-lg">
                  <p className="text-white text-center text-xl font-bold">Terjemahan</p>
                  {result.translated && (
                    <img src={result.translated} alt={`Translated ${index + 1}`} className="w-full h-auto object-contain mx-auto rounded-lg" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
