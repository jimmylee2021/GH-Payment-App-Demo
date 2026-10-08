import React, { useState } from 'react';
import { Wallet, X, CheckCircle2, ArrowRight, Printer, ShieldCheck } from 'lucide-react';
import { Patient, PaymentMethod } from '../types';
import { topUpPatientWallet } from '../services/store';
import { playAudio } from '../services/sound';

interface WalletTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSuccess?: (newBalance: number) => void;
}

export const WalletTopupModal: React.FC<WalletTopupModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSuccess,
}) => {
  const [amountInput, setAmountInput] = useState('50000');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [cashier, setCashier] = useState('Central Accounts Window 1');
  const [note, setNote] = useState('Inpatient Admission Pre-funding');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastRef, setLastRef] = useState('');
  const [finalBalance, setFinalBalance] = useState(0);

  if (!isOpen || !patient) return null;

  const presets = [10000, 25000, 50000, 100000, 200000];

  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountInput);
    if (isNaN(num) || num <= 0) return;

    const res = topUpPatientWallet(patient.card_no, num, method, cashier, note);
    if (res.success) {
      playAudio.successChime();
      setLastRef(res.reference);
      setFinalBalance(res.newBalance);
      setIsSuccess(true);
      if (onSuccess) onSuccess(res.newBalance);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Inpatient Admission Wallet</h3>
              <p className="text-xs text-slate-400">Pre-fund card balance for auto-clearance</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isSuccess ? (
          <form onSubmit={handleTopup} className="p-5 space-y-4 overflow-y-auto">
            {/* Patient Header */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Patient Card</span>
                <div className="font-bold text-sm text-slate-900">{patient.name}</div>
                <div className="font-mono-code text-xs text-slate-600">Card #{patient.card_no}</div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Current Wallet</span>
                <div className="font-mono-code font-black text-base text-emerald-600">
                  ₦{(patient.wallet_balance || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Quick Top-Up Amounts
              </label>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmountInput(p.toString())}
                    className={`py-2 px-2 rounded-xl text-xs font-mono-code font-bold transition-all border ${
                      amountInput === p.toString()
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ₦{p.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Deposit Amount (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 font-mono-code font-bold text-slate-500">
                  ₦
                </span>
                <input
                  type="number"
                  step="500"
                  min="500"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono-code text-lg font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Funding Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'Transfer', 'Paystack'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      method === m
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Cashier & Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Deposit Purpose / Notes
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Inpatient Admission Pre-funding"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform shadow-md active:scale-98"
            >
              <span>Deposit ₦{parseFloat(amountInput || '0').toLocaleString()} to Card Wallet</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="p-6 flex flex-col items-center space-y-4">
            {/* 58mm Thermal Wallet Slip Simulation */}
            <div
              className="print-area w-[58mm] bg-white border border-slate-300 shadow-md p-3 text-black text-[11px] leading-tight font-mono-code text-center"
              style={{ width: '58mm', maxWidth: '58mm' }}
            >
              <div className="text-xs font-black uppercase tracking-wider">GENERAL HOSPITAL</div>
              <div className="text-[9px] font-sans text-slate-800">PATIENT ADMISSION WALLET</div>
              <div className="text-[8px] font-sans text-slate-600 border-b border-dashed border-black pb-1 mb-1">
                OFFICIAL DEPOSIT SLIP
              </div>

              <div className="text-left space-y-0.5 text-[10px] py-1 border-b border-dashed border-black">
                <div>Ref: <strong>{lastRef}</strong></div>
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div>Card No: <strong className="bg-black text-white px-1">{patient.card_no}</strong></div>
                <div>Patient: <span className="font-sans font-bold">{patient.name}</span></div>
                <div>Method: {method}</div>
                <div>Cashier: {cashier}</div>
              </div>

              <div className="py-2 border-b border-dashed border-black text-left">
                <div className="text-[10px] text-slate-600">AMOUNT DEPOSITED:</div>
                <div className="text-sm font-black text-black">₦{parseFloat(amountInput).toLocaleString()}</div>
                <div className="text-[10px] text-slate-600 mt-1">NEW CARD WALLET BALANCE:</div>
                <div className="text-base font-black text-black">₦{finalBalance.toLocaleString()}</div>
              </div>

              <div className="pt-1 text-[8px] font-sans text-slate-500">
                Hospital doctors and labs will automatically deduct charges from this balance.
              </div>
            </div>

            <div className="w-full flex gap-2">
              <button
                onClick={handlePrintSlip}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print 58mm Slip
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
