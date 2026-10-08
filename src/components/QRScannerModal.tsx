import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, Sparkles, Upload } from 'lucide-react';
import { playAudio } from '../services/sound';
import { getStoredPatients } from '../services/store';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (card_no: string) => void;
  title?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Patient Card QR Sticker',
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'gh-pay-qr-reader';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const patients = getStoredPatients();

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setCameraError(null);
      setManualInput('');
      return;
    }

    // Start scanner when modal opens
    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {
        // ignore cleanup errors
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  const handleSuccess = (decodedText: string) => {
    playAudio.scanBeep();
    stopScanner();
    onScan(decodedText.trim());
    onClose();
  };

  const startScanner = async () => {
    setIsInitializing(true);
    setCameraError(null);

    // Short timeout to ensure DOM container is rendered
    setTimeout(async () => {
      try {
        const container = document.getElementById(scannerContainerId);
        if (!container) {
          setIsInitializing(false);
          return;
        }

        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
          ],
          verbose: false,
        });
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleSuccess(decodedText);
          },
          () => {
            // frame decode failure (expected during continuous scan)
          }
        );
        setIsScanning(true);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setCameraError(errorMsg.includes('Permission') 
          ? 'Camera permission denied or camera not accessible in current window.' 
          : 'Unable to open camera. Please use manual entry or demo card quick-scan below.');
      } finally {
        setIsInitializing(false);
      }
    }, 250);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleSuccess(manualInput.trim());
    }
  };

  const handleQuickSelect = (card_no: string) => {
    handleSuccess(card_no);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }
      const result = await html5QrCodeRef.current.scanFile(file, true);
      handleSuccess(result);
    } catch {
      setCameraError('Could not read QR code from image. Please try another image or manual input.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">{title}</h3>
              <p className="text-xs text-slate-400">Point at 58mm card sticker QR or enter card no</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Scanner Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 border-2 border-slate-800 min-h-[260px] flex flex-col items-center justify-center">
            <div id={scannerContainerId} className="w-full max-w-[320px] aspect-square" />

            {/* Target reticle overlay if scanning */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative animate-pulse">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  <div className="absolute inset-x-4 top-1/2 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-bounce" />
                </div>
              </div>
            )}

            {isInitializing && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-slate-300 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-sm font-medium">Starting optical camera...</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center text-slate-300">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                <p className="text-sm font-semibold text-white mb-1">Camera Feed Unavailable</p>
                <p className="text-xs text-slate-400 max-w-xs mb-3">{cameraError}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={startScanner}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-lg transition-colors"
                  >
                    Retry Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload QR Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick Simulation / Demo Cards for quick testing */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Quick Test Existing Cards (Simulate Scan):
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {patients.map(p => (
                <button
                  key={p.card_no}
                  onClick={() => handleQuickSelect(p.card_no)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-lg text-xs font-mono-code font-bold text-slate-800 hover:text-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <span className="text-emerald-600 font-bold">#</span>
                  <span>{p.card_no}</span>
                  <span className="text-[10px] font-sans font-normal text-slate-500 truncate max-w-[70px]">
                    ({p.name.split(' ')[0]})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Manual Card Number Fallback
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g. 12489 or GH/2023/7890"
                className="flex-1 px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl font-mono-code text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
              >
                Find Card
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
