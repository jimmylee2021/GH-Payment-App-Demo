import React from 'react';
import { Printer, X, FileSpreadsheet, ShieldCheck, Banknote, Building2, CreditCard, Wallet } from 'lucide-react';
import { CashierShiftSummary } from '../types';

interface ShiftZReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: CashierShiftSummary;
}

export const ShiftZReportModal: React.FC<ShiftZReportModalProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Cashier Shift Handover (Z-Report)</h3>
              <p className="text-xs text-slate-400">Shift reconciliation & drawer balancing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-slate-100 overflow-y-auto flex flex-col items-center">
          {/* 58mm Thermal Z-Report Layout */}
          <div
            className="print-area w-[58mm] bg-white border border-slate-300 shadow-md p-3 text-black text-[11px] leading-tight font-mono-code"
            style={{ width: '58mm', maxWidth: '58mm' }}
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-black">
              <div className="text-xs font-black uppercase tracking-wider">GENERAL HOSPITAL</div>
              <div className="text-[9px] font-sans text-slate-800 font-bold">REVENUE & ACCOUNTS DEPT</div>
              <div className="text-[10px] font-black uppercase mt-1 bg-black text-white px-1 py-0.5">
                *** END OF SHIFT Z-REPORT ***
              </div>
            </div>

            {/* Shift Metadata */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{currentDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Terminal / Cashier:</span>
                <span className="font-bold truncate max-w-[130px]">{summary.cashier_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Shift Window:</span>
                <span>{summary.start_time} - {summary.end_time}</span>
              </div>
            </div>

            {/* Collections Breakdown by Payment Method */}
            <div className="py-2 border-b border-dashed border-black space-y-1">
              <div className="text-[10px] font-black uppercase border-b border-slate-400 pb-0.5">
                PAYMENT CHANNELS AUDIT
              </div>
              
              <div className="flex justify-between text-[10px]">
                <span>1. Cash in Drawer:</span>
                <span className="font-bold">₦{summary.cash_total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>2. Bank Transfers:</span>
                <span className="font-bold">₦{summary.transfer_total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>3. Paystack POS / Card:</span>
                <span className="font-bold">₦{summary.paystack_total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>Incl. Wallet Pre-funds:</span>
                <span>(₦{summary.wallet_topups.toLocaleString()})</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="py-2 border-b-2 border-black space-y-1">
              <div className="flex justify-between font-black text-xs">
                <span>TOTAL REVENUE:</span>
                <span className="text-sm">₦{summary.grand_total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-700">
                <span>Receipts Issued:</span>
                <span className="font-bold">{summary.receipts_count}</span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-700">
                <span>Bill Charges Cleared:</span>
                <span className="font-bold">{summary.bills_cleared_count}</span>
              </div>
            </div>

            {/* HMO / NHIA Co-pay Section */}
            <div className="py-2 border-b border-dashed border-black text-[9px] space-y-0.5">
              <div className="font-bold text-black uppercase">NHIA / HMO BILLING CLAIMS:</div>
              <div className="flex justify-between">
                <span>Total HMO Claims:</span>
                <span className="font-bold">₦{summary.hmo_claims_total.toLocaleString()}</span>
              </div>
              <div className="text-[8px] text-slate-600">
                Submitted to National Health Insurance Scheme
              </div>
            </div>

            {/* Sign-off signatures */}
            <div className="pt-3 pb-1 text-[9px] space-y-3">
              <div>
                <div className="border-b border-black w-32 mb-0.5" />
                <span>Cashier Signature & Date</span>
              </div>
              <div>
                <div className="border-b border-black w-32 mb-0.5" />
                <span>Accounts Supervisor Stamp</span>
              </div>
            </div>

            <div className="text-center pt-2 text-[7px] text-slate-500 border-t border-dotted border-slate-400">
              Generated by GH Pay Seamless System
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
            className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-emerald-400" /> Print 58mm Z-Report
          </button>
        </div>
      </div>
    </div>
  );
};
