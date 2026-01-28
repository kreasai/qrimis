import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { QRCodeSVG } from 'qrcode.react';
import { Upload, ArrowRight, RefreshCcw, Trash2, History, QrCode } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { AppStep, SavedQR } from './types';
import { getMerchantName, convertToDynamicQRIS } from './utils/qris';
import { Keypad } from './components/Keypad';

function App() {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [originalPayload, setOriginalPayload] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [dynamicPayload, setDynamicPayload] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedQR[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    try {
      const stored = localStorage.getItem('qris_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  // --- Helpers ---
  const formatRupiah = (numStr: string) => {
    const num = parseInt(numStr.replace(/\D/g, '') || '0', 10);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const saveToHistory = (payload: string, name: string) => {
    setHistory(prev => {
      // Remove duplicates based on payload to avoid clutter
      const filtered = prev.filter(item => item.payload !== payload);
      
      const newItem: SavedQR = {
        id: Date.now().toString(),
        payload,
        merchantName: name,
        createdAt: Date.now(),
      };
      
      const newHistory = [newItem, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem('qris_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const newHistory = prev.filter(item => item.id !== id);
      localStorage.setItem('qris_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const selectFromHistory = (item: SavedQR) => {
    setOriginalPayload(item.payload);
    setMerchantName(item.merchantName);
    setError(null);
    setStep(AppStep.AMOUNT);
  };

  // --- Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          console.log("Found QR code", code.data);
          const name = getMerchantName(code.data);
          
          setOriginalPayload(code.data);
          setMerchantName(name);
          saveToHistory(code.data, name);
          
          setStep(AppStep.AMOUNT);
        } else {
          setError("QR Code tidak ditemukan atau tidak valid. Pastikan gambar jelas.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input value so same file can be selected again if needed
    e.target.value = '';
  };

  const handleKeypadPress = (val: string) => {
    setAmountStr((prev) => {
      if (prev === '0') return val;
      if (prev.length > 12) return prev; // Limit length
      return prev + val;
    });
  };

  const handleDelete = () => {
    setAmountStr((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setAmountStr('0');
  };

  const handleGenerate = () => {
    const amount = parseInt(amountStr, 10);
    if (amount < 1) {
      setError("Nominal harus lebih dari 0");
      return;
    }
    
    try {
      const newPayload = convertToDynamicQRIS(originalPayload, amount);
      setDynamicPayload(newPayload);
      setStep(AppStep.RESULT);
    } catch (err) {
      setError("Gagal membuat QRIS dinamis.");
    }
  };

  const handleReset = () => {
    setStep(AppStep.UPLOAD);
    setOriginalPayload('');
    setMerchantName('');
    setAmountStr('0');
    setDynamicPayload('');
    setError(null);
  };

  const handleBackToAmount = () => {
    setStep(AppStep.AMOUNT);
  };

  // --- Render Steps ---

  const renderUpload = () => (
    <div className="flex flex-col items-center min-h-[60vh] animate-in fade-in zoom-in duration-300 w-full">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex flex-col items-center justify-center w-full max-w-sm p-10 border-2 border-dashed border-slate-300 rounded-3xl hover:border-rose-500 hover:bg-rose-50/50 transition-all cursor-pointer bg-white mb-8"
      >
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Upload size={32} />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Scan QRIS Baru</h3>
        <p className="text-sm text-slate-500 text-center mt-2">
          Upload gambar QRIS statis dari galeri
        </p>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 max-w-sm w-full">
          {error}
        </div>
      )}

      {history.length > 0 && (
        <div className="w-full max-w-sm animate-in slide-in-from-bottom duration-500 delay-100">
          <div className="flex items-center gap-2 mb-4 px-1">
            <History className="text-slate-400" size={16} />
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Tersimpan</h4>
          </div>
          
          <div className="space-y-3">
            {history.map((item) => (
              <div 
                key={item.id}
                onClick={() => selectFromHistory(item)}
                className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-rose-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors shrink-0">
                    <QrCode size={20} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-slate-800 truncate group-hover:text-rose-600 transition-colors">{item.merchantName}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => deleteFromHistory(item.id, e)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hapus"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderAmount = () => (
    <div className="flex flex-col items-center w-full max-w-md mx-auto animate-in slide-in-from-right duration-300">
      <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="text-center mb-6">
          <p className="text-xs font-bold tracking-widest text-rose-500 uppercase mb-1">Merchant</p>
          <h2 className="text-xl font-bold text-slate-900 truncate">{merchantName}</h2>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-2">
          <p className="text-xs text-slate-500 mb-1">Nominal Transaksi</p>
          <div className="text-3xl font-bold text-slate-800 tracking-tight break-all">
            {formatRupiah(amountStr)}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {[10000, 20000, 50000, 100000].map(val => (
            <button
              key={val}
              onClick={() => setAmountStr(val.toString())}
              className="px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 hover:bg-rose-100 hover:text-rose-600 transition-colors whitespace-nowrap"
            >
              {val / 1000}k
            </button>
          ))}
        </div>

        <button 
          onClick={handleGenerate}
          className="w-full py-4 bg-rose-600 text-white rounded-xl font-semibold shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Generate QRIS <ArrowRight size={20} />
        </button>
      </div>

      <Keypad 
        onKeyPress={handleKeypadPress} 
        onDelete={handleDelete} 
        onClear={handleClear}
      />
      
      <button 
        onClick={handleReset} 
        className="mt-6 text-slate-400 text-sm hover:text-slate-600"
      >
        Ganti Merchant / Kembali
      </button>
    </div>
  );

  const renderResult = () => (
    <div className="flex flex-col items-center w-full max-w-md mx-auto animate-in zoom-in duration-300">
      <div className="w-full bg-white p-6 pb-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        {/* Decorative header */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 to-orange-500"></div>
        
        <div className="text-center mb-8 mt-2">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg" alt="QRIS" className="h-8 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">{merchantName}</h2>
          <p className="text-slate-500 text-sm">NMID: {originalPayload.substring(originalPayload.indexOf('5102') + 4, originalPayload.indexOf('5102') + 4 + 15) || 'Unknown'}</p>
        </div>

        <div className="flex justify-center mb-8 relative">
          <div className="p-4 bg-white border-2 border-slate-900 rounded-2xl relative z-10">
            <QRCodeSVG 
              value={dynamicPayload} 
              size={240}
              level="M"
              imageSettings={{
                src: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg",
                height: 24,
                width: 50,
                excavate: true,
              }}
            />
          </div>
          {/* Decorative corners for QR */}
          <div className="absolute top-0 left-10 w-8 h-8 border-t-4 border-l-4 border-rose-500 -translate-x-2 -translate-y-2 rounded-tl-lg"></div>
          <div className="absolute bottom-0 right-10 w-8 h-8 border-b-4 border-r-4 border-rose-500 translate-x-2 translate-y-2 rounded-br-lg"></div>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-500 mb-1">Total Pembayaran</p>
          <div className="text-3xl font-extrabold text-slate-900">
            {formatRupiah(amountStr)}
          </div>
        </div>
      </div>

      <div className="w-full mt-6">
        <button 
          onClick={handleBackToAmount}
          className="flex w-full items-center justify-center gap-2 py-3 bg-rose-600 text-white rounded-xl font-medium shadow-md hover:bg-rose-700 transition-colors"
        >
          <RefreshCcw size={18} />
          Ubah Nominal
        </button>
      </div>

       <button 
        onClick={handleReset} 
        className="mt-6 text-slate-400 text-sm hover:text-slate-600 underline decoration-slate-300 underline-offset-4"
      >
        Buat Baru
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900">
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
              Q
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-slate-900 leading-none">QRIMIS</h1>
              <span className="text-[10px] font-semibold text-rose-600 tracking-wide uppercase">QRIS Dinamis Generator</span>
            </div>
          </div>
          <div className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-500">
            v1.2
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col justify-start pt-8">
        {step === AppStep.UPLOAD && renderUpload()}
        {step === AppStep.AMOUNT && renderAmount()}
        {step === AppStep.RESULT && renderResult()}
      </main>
      
      <footer className="py-6 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} QRIMIS - QRIS Dinamis</p>
      </footer>
    </div>
  );
}

export default App;