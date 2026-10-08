import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Download, ShieldCheck, Tag } from 'lucide-react';
import { Patient } from '../types';

interface StickerPrintModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StickerPrintModal: React.FC<StickerPrintModalProps> = ({
  patient,
  isOpen,
  onClose,
}) => {
  const stickerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const svgElement = document.getElementById('sticker-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR_Sticker_${patient.card_no.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">58mm Thermal Sticker Print</h3>
              <p className="text-xs text-slate-400">Adhesive QR for physical hospital card</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 bg-slate-100 flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-600 mb-3 text-center">
            Standard 58mm Thermal Sticker Preview (100×100px QR)
          </p>

          {/* Thermal Sticker Layout (58mm width simulation) */}
          <div
            ref={stickerRef}
            className="print-area w-[58mm] min-h-[58mm] bg-white border border-dashed border-slate-400 rounded-sm p-2 flex flex-col items-center text-center shadow-md text-black"
            style={{ width: '58mm', maxWidth: '58mm' }}
          >
            <div className="text-[9px] font-black tracking-wider uppercase border-b border-black pb-0.5 w-full">
              GENERAL HOSPITAL
            </div>
            <div className="text-[8px] font-medium text-slate-700 tracking-tight my-0.5">
              GH PAY SEAMLESS CARD
            </div>

            {/* Exactly 100x100px QR Code per specification */}
            <div className="my-1.5 p-1 bg-white inline-block">
              <QRCodeSVG
                id="sticker-qr-svg"
                value={patient.card_no}
                size={100}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Card Number in large bold font */}
            <div className="text-sm font-black font-mono-code tracking-tight bg-black text-white px-1.5 py-0.5 rounded-xs w-full text-center">
              CARD: {patient.card_no}
            </div>

            <div className="text-[10px] font-bold text-black truncate w-full mt-1">
              {patient.name}
            </div>

            <div className="text-[8px] text-slate-700 flex justify-between w-full mt-0.5 px-0.5">
              <span>{patient.gender}, {patient.age}y</span>
              <span>{patient.phone}</span>
            </div>

            <div className="text-[7px] text-slate-500 mt-1 pt-0.5 border-t border-dotted border-slate-400 w-full">
              Scan at Doctor / Lab / Pharmacy
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2 w-full">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Peel and stick this sticker directly onto physical card <strong>#{patient.card_no}</strong>. 
              Staff in Doctor, Lab, Accounts, and Pharmacy can now scan this card instantly.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" /> SVG Download
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Sticker (58mm)
          </button>
        </div>
      </div>
    </div>
  );
};
