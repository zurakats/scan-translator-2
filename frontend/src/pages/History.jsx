import React, { useState, useEffect } from 'react';
import { Trash2, LayoutGrid, List, X } from 'lucide-react';

const History = () => {
  const [history, setHistory] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('translationHistory');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const clearHistory = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua riwayat terjemahan?")) {
      localStorage.removeItem('translationHistory');
      setHistory([]);
    }
  };

  const openModal = (item) => setSelectedItem(item);
  const closeModal = () => setSelectedItem(null);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] items-center font-winky bg-brand-dark relative py-10">
      
      {/* Dashboard Header */}
      <div className="w-full max-w-[1200px] px-6 flex flex-col md:flex-row justify-between items-center mb-8 gap-4 z-10">
        <h1 className="text-3xl font-bold text-white tracking-widest drop-shadow-md">RIWAYAT TERJEMAHAN</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/10">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-brand-blue text-white' : 'text-white/50 hover:text-white'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-brand-blue text-white' : 'text-white/50 hover:text-white'}`}
            >
              <List size={20} />
            </button>
          </div>

          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/90 text-white rounded-lg hover:bg-red-500 transition-colors shadow-lg"
            >
              <Trash2 size={20} />
              <span className="hidden md:inline">Hapus Semua</span>
            </button>
          )}
        </div>
      </div>

      {/* History Content */}
      {history.length === 0 ? (
        <div className="flex-1 flex items-center justify-center z-10">
          <p className="text-xl text-white/40 tracking-wider">Belum ada riwayat terjemahan.</p>
        </div>
      ) : (
        <div className={`w-full max-w-[1200px] px-6 z-10 ${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'flex flex-col gap-4'
        }`}>
          {history.map((item) => (
            <div 
              key={item.id} 
              onClick={() => openModal(item)}
              className={`bg-black/60 backdrop-blur-md rounded-xl border border-white/10 cursor-pointer group hover:border-brand-blue hover:shadow-[0_0_20px_rgba(0,123,255,0.2)] transition-all overflow-hidden ${
                viewMode === 'list' ? 'flex flex-row items-center h-[120px]' : 'flex flex-col h-[280px]'
              }`}
            >
              {/* Thumbnail */}
              <div className={`${viewMode === 'list' ? 'w-[120px] h-full' : 'w-full h-[160px]'} bg-black/80 flex-shrink-0 relative overflow-hidden border-r border-white/5`}>
                <img 
                  src={item.images[0]?.original} 
                  alt="Thumbnail" 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                />
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col justify-center flex-1 w-full">
                <p className="text-sm text-brand-blue-hover font-bold mb-1">{item.date}</p>
                <div className="flex items-center justify-between mt-auto">
                  <p className="text-xs text-white/60">
                    <span className="uppercase text-white">{item.engine}</span> | {item.sourceLang.toUpperCase()} &rarr; {item.targetLang.toUpperCase()}
                  </p>
                  <p className="text-xs bg-white/10 text-white px-2 py-1 rounded-full">{item.images.length} Gbr</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Modal for Reading */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <button 
            onClick={closeModal}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-red-500 text-white rounded-full transition-colors z-[101]"
          >
            <X size={28} />
          </button>
          
          <div className="w-full max-w-[1400px] flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="text-center mb-8 pt-10">
              <h2 className="text-2xl text-white font-bold">{selectedItem.date}</h2>
              <p className="text-white/60">{selectedItem.sourceLang.toUpperCase()} &rarr; {selectedItem.targetLang.toUpperCase()}</p>
            </div>

            <div className="flex flex-col gap-12 pb-20">
              {selectedItem.images.map((imgData, idx) => (
                <div key={idx} className="flex flex-col lg:flex-row gap-6 w-full items-start">
                  <div className="flex-1 w-full bg-black/50 p-2 rounded-xl border border-white/10">
                    <p className="text-center text-white/70 font-semibold mb-2">Asli</p>
                    <img src={imgData.original} alt="Original" className="w-full h-auto object-contain rounded-lg" />
                  </div>
                  <div className="flex-1 w-full bg-black/50 p-2 rounded-xl border border-white/10">
                    <p className="text-center text-brand-blue-hover font-semibold mb-2">Terjemahan</p>
                    <img src={imgData.translated} alt="Translated" className="w-full h-auto object-contain rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
