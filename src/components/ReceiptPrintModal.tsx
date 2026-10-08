import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { BillItem, Patient, PaymentMethod } from '../types';

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  paidBills: BillItem[];
  totalAmount: number;
  receiptNo: string;
  paymentMethod: PaymentMethod;
  cashierName?: string;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  isOpen,
  onClose,
  patient,
  paidBills,
  totalAmount,
  receiptNo,
  paymentMethod,
  cashierName = 'Accounts Cashier',
}) => {
  if (!isOpen || !patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base">Payment Confirmed</h3>
              <p className="text-xs text-emerald-100">58mm Thermal Receipt Generated</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Container */}
        <div className="p-6 bg-slate-100 overflow-y-auto flex flex-col items-center">
          {/* 58mm Thermal Receipt Simulation */}
          <div
            className="print-area w-[58mm] bg-white border border-slate-300 shadow-md p-3 text-black text-[11px] leading-tight font-mono-code"
            style={{ width: '58mm', maxWidth: '58mm' }}
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <div className="text-xs font-black uppercase tracking-wider">GENERAL HOSPITAL</div>
              <div className="text-[9px] font-sans text-slate-800">REVENUE & ACCOUNTS DEPT</div>
              <div className="text-[8px] font-sans text-slate-600">GH PAY SYSTEM - OFFICIAL RECEIPT</div>
            </div>

            {/* Receipt Metadata */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold">{receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{currentDate}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Card No:</span>
                <span className="bg-black text-white px-1">{patient.card_no}</span>
              </div>
              <div className="flex justify-between">
                <span>Patient:</span>
                <span className="truncate max-w-[120px] font-sans font-semibold">{patient.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Method:</span>
                <span className="font-bold">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{cashierName}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="flex justify-between text-[9px] font-bold pb-1 border-b border-slate-400">
                <span>ITEM / DEPT</span>
                <span>AMOUNT</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {paidBills.map((b) => (
                  <div key={b.id} className="text-[10px]">
                    <div className="font-semibold text-black leading-none">{b.item_name}</div>
                    <div className="flex justify-between text-[9px] text-slate-700">
                      <span>[{b.department}]</span>
                      <span>₦{b.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="py-2 border-b border-dashed border-black text-xs">
              <div className="flex justify-between items-baseline font-black">
                <span>TOTAL PAID:</span>
                <span className="text-sm">₦{totalAmount.toLocaleString()}</span>
              </div>
              <div className="text-[9px] text-center text-slate-700 mt-1 uppercase font-bold">
                STATUS: PAID IN FULL
              </div>
            </div>

            {/* Verification QR */}
            <div className="pt-2 text-center flex flex-col items-center">
              <div className="p-1 bg-white inline-block">
                <QRCodeSVG value={patient.card_no} size={65} level="L" />
              </div>
              <div className="text-[8px] font-sans text-slate-600 mt-1">
                Scan this card QR at Pharmacy or Lab for instant clearance
              </div>
              <div className="text-[7px] font-sans text-slate-500 mt-1">
                Thank you for your payment · GH Pay System
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print 58mm Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
