import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Camera, 
  Search, 
  Banknote, 
  Building2, 
  CreditCard, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Receipt,
  UserCheck,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  Coins,
  BarChart3,
  WifiOff,
  CloudUpload
} from 'lucide-react';
import { 
  findPatient, 
  getPatientBills, 
  getStoredBills,
  payBillsForCard, 
  payBillsViaWallet,
  getCashierShiftSummary,
  subscribeToStore 
} from '../services/store';
import { isAppOnline, subscribeToSyncState } from '../services/sync';
import { Patient, BillItem, PaymentMethod } from '../types';
import { QRScannerModal } from '../components/QRScannerModal';
import { ReceiptPrintModal } from '../components/ReceiptPrintModal';
import { PaystackModal } from '../components/PaystackModal';
import { WalletTopupModal } from '../components/WalletTopupModal';
import { ShiftZReportModal } from '../components/ShiftZReportModal';
import { RevenueReportsView } from '../components/RevenueReportsView';
import { playAudio } from '../services/sound';

interface RevenuePageProps {
  initialCardNo?: string;
  initialView?: 'terminal' | 'reports';
  onNavigateToVerify?: (cardNo: string) => void;
}

export const RevenuePage: React.FC<RevenuePageProps> = ({
  initialCardNo,
  initialView = 'terminal',
  onNavigateToVerify,
}) => {
  // View Toggle: Terminal vs Data Visualization Reports
  const [activeView, setActiveView] = useState<'terminal' | 'reports'>(initialView);

  const [searchInput, setSearchInput] = useState(initialCardNo || '');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // All bills in store for reports
  const [allBills, setAllBills] = useState<BillItem[]>(getStoredBills());

  // Patient Bills
  const [patientBills, setPatientBills] = useState<BillItem[]>([]);

  // Cashier Name
  const [cashierName, setCashierName] = useState('Central Accounts Window 1');

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPaidBills, setLastPaidBills] = useState<BillItem[]>([]);
  const [lastPaidAmount, setLastPaidAmount] = useState(0);
  const [lastReceiptNo, setLastReceiptNo] = useState('');
  const [lastPaymentMethod, setLastPaymentMethod] = useState<PaymentMethod>('Cash');

  // Paystack Modal State
  const [showPaystackModal, setShowPaystackModal] = useState(false);

  // Feature 2: Wallet Modal State
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Feature 3: Shift Z-Report State
  const [showZReportModal, setShowZReportModal] = useState(false);

  // Auto-print receipt preference
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);

  // Network & Sync State
  const [isOnline, setIsOnline] = useState(isAppOnline());

  useEffect(() => {
    const unsub = subscribeToSyncState((state) => {
      setIsOnline(state.isOnline);
    });
    return unsub;
  }, []);

  // Subscribe to store updates for real-time changes
  useEffect(() => {
    const unsubscribe = subscribeToStore(() => {
      setAllBills(getStoredBills());
      if (selectedPatient) {
        setPatientBills(getPatientBills(selectedPatient.card_no));
      }
    });
    return unsubscribe;
  }, [selectedPatient]);

  useEffect(() => {
    if (initialCardNo) {
      setSearchInput(initialCardNo);
      loadPatient(initialCardNo);
    } else {
      loadPatient('12489');
    }
  }, [initialCardNo]);

  const loadPatient = (cardQuery: string) => {
    if (!cardQuery.trim()) return;
    const patient = findPatient(cardQuery);
    if (patient) {
      setSelectedPatient(patient);
      setSearchError(null);
      setPatientBills(getPatientBills(patient.card_no));
    } else {
      setSelectedPatient(null);
      setPatientBills([]);
      setSearchError(`No patient found for card "${cardQuery}".`);
    }
  };

  const handleScanSuccess = (card_no: string) => {
    setSearchInput(card_no);
    loadPatient(card_no);
    playAudio.scanBeep();
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPatient(searchInput);
  };

  const pendingBills = patientBills.filter((b) => b.status === 'pending');
  const paidBills = patientBills.filter((b) => b.status === 'paid');
  
  // Feature 4: Patient's payable co-pay total
  const totalPatientPayable = pendingBills.reduce((acc, curr) => acc + (curr.patient_share !== undefined ? curr.patient_share : curr.amount), 0);
  const totalGrossPending = pendingBills.reduce((acc, curr) => acc + curr.amount, 0);
  const totalHmoCovered = pendingBills.reduce((acc, curr) => acc + (curr.hmo_share || 0), 0);

  const handleConfirmPayment = (method: PaymentMethod) => {
    if (!selectedPatient || pendingBills.length === 0) return;

    if (method === 'Paystack') {
      setShowPaystackModal(true);
      return;
    }

    executePayment(method);
  };

  const executePayment = (method: PaymentMethod) => {
    if (!selectedPatient) return;

    const result = payBillsForCard(selectedPatient.card_no, method, cashierName);
    if (result.success) {
      playAudio.successChime();
      setLastPaidBills(result.paidBills);
      setLastPaidAmount(result.totalAmount);
      setLastReceiptNo(result.receiptNo);
      setLastPaymentMethod(method);

      setPatientBills(getPatientBills(selectedPatient.card_no));

      if (autoPrintReceipt) {
        setShowReceiptModal(true);
      }
    }
  };

  // Feature 2: Settle directly via Patient Admission Wallet
  const handlePayViaWallet = () => {
    if (!selectedPatient || pendingBills.length === 0) return;
    setWalletError(null);

    const res = payBillsViaWallet(selectedPatient.card_no, cashierName);
    if (res.success) {
      playAudio.successChime();
      setSelectedPatient({ ...selectedPatient, wallet_balance: res.remainingWallet });
      setLastPaidBills(res.paidBills);
      setLastPaidAmount(res.totalAmount);
      setLastReceiptNo(res.receiptNo);
      setLastPaymentMethod('Wallet');

      setPatientBills(getPatientBills(selectedPatient.card_no));

      if (autoPrintReceipt) {
        setShowReceiptModal(true);
      }
    } else {
      playAudio.alertTone();
      setWalletError(res.error || 'Failed to pay via wallet.');
    }
  };

  const handlePaystackSuccess = (ref: string) => {
    executePayment('Paystack');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Revenue Station Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Wallet className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Revenue & Accounts Station
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  Bill settlement · Data visualization analytics · Admission Wallet · Shift Z-Report
                </p>
              </div>
            </div>
          </div>

          {/* Action Tools: Shift Z-Report & View Toggle */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {/* View Switcher: Terminal vs Reports */}
            <div className="grid grid-cols-2 sm:flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <button
                onClick={() => setActiveView('terminal')}
                className={`px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeView === 'terminal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Cashier Terminal</span>
              </button>
              <button
                onClick={() => setActiveView('reports')}
                className={`px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeView === 'reports'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="truncate">Revenue Reports</span>
              </button>
            </div>

            {/* Shift Z-Report Button */}
            <button
              onClick={() => setShowZReportModal(true)}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-300"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Shift Z-Report</span>
            </button>
          </div>
        </div>

        {/* When in Terminal View, show Search & QR Scanner tools */}
        {activeView === 'terminal' && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch justify-between gap-3">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Camera className="w-4 h-4 text-emerald-200" />
              <span>Scan Patient Card QR</span>
            </button>

            <form onSubmit={handleManualSearch} className="flex gap-1.5 flex-1 sm:max-w-md">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Card No (e.g. 12489 or GH/2023/7890)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono-code text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {searchError && activeView === 'terminal' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Offline Awareness Banner */}
        {!isOnline && activeView === 'terminal' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Offline Accounts Terminal:</strong> Settlements confirmed now will be preserved locally and auto-synced to Supabase once connectivity is re-established.
              </span>
            </div>
            <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded shrink-0">
              OFFLINE READY
            </span>
          </div>
        )}
      </div>

      {/* VIEW A: REVENUE REPORTS & DATA VISUALIZATION (recharts) */}
      {activeView === 'reports' ? (
        <RevenueReportsView bills={allBills} />
      ) : (
        /* VIEW B: CASHIER SETTLEMENT TERMINAL */
        selectedPatient ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Patient Card & Pending Summary Banner */}
            <div className="lg:col-span-12 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center font-mono-code font-bold">
                  <span className="text-[10px] text-slate-400">CARD</span>
                  <span className="text-sm font-black">{selectedPatient.card_no}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">{selectedPatient.name}</h2>
                    <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {selectedPatient.hmo_type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                    <span>{selectedPatient.gender}, {selectedPatient.age} yrs</span>
                    <span>·</span>
                    <span>{selectedPatient.phone}</span>
                  </div>
                </div>
              </div>

              {/* Inpatient Admission Wallet Balance pill */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between sm:justify-start gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> Admission Wallet
                    </div>
                    <div className="text-xl font-black font-mono-code text-emerald-700">
                      ₦{(selectedPatient.wallet_balance || 0).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWalletModal(true)}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shrink-0"
                    title="Top-Up Patient Wallet"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Total Pending Collection */}
                <div className="bg-slate-50 px-5 py-3 rounded-xl border border-slate-200 text-left sm:text-right">
                  <span className="text-xs font-bold text-slate-500 uppercase block">Patient Co-Pay Total</span>
                  <span className={`text-2xl font-black font-mono-code ${totalPatientPayable > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₦{totalPatientPayable.toLocaleString()}
                  </span>
                  {totalHmoCovered > 0 && (
                    <span className="text-[10px] text-blue-600 block">
                      (NHIA Scheme covers ₦{totalHmoCovered.toLocaleString()})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Left Column: Itemized Table with HMO Split */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    Itemized Bills & Co-Pay Breakdown
                  </h3>
                  <span className="text-xs text-slate-500 font-mono-code">
                    Card #{selectedPatient.card_no}
                  </span>
                </div>

                {patientBills.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No bills have been posted for this card yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase">
                          <th className="pb-3 pl-1">Item / Dept</th>
                          <th className="pb-3 px-2 text-right">Gross</th>
                          <th className="pb-3 px-2 text-right">HMO Cover</th>
                          <th className="pb-3 px-2 text-right">Patient Co-pay</th>
                          <th className="pb-3 pr-1 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {patientBills.map((b) => (
                          <tr key={b.id} className={b.status === 'pending' ? 'bg-amber-50/40' : ''}>
                            <td className="py-3 pl-1">
                              <div className="font-semibold text-slate-900">{b.item_name}</div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <span>[{b.department}]</span>
                                {b.sync_status === 'pending_sync' && (
                                  <span className="text-[9px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.2 rounded inline-flex items-center gap-0.5">
                                    <CloudUpload className="w-2.5 h-2.5" />
                                    Cached Locally
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right font-mono-code text-slate-500">
                              ₦{b.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right font-mono-code text-blue-600 font-medium">
                              {b.hmo_share > 0 ? `₦${b.hmo_share.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-3 px-2 text-right font-mono-code font-bold text-slate-900">
                              ₦{(b.patient_share !== undefined ? b.patient_share : b.amount).toLocaleString()}
                            </td>
                            <td className="py-3 pr-1 text-right">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  b.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-900 font-black">
                          <td className="pt-3 text-slate-900 text-sm">TOTAL PENDING:</td>
                          <td className="pt-3 text-right font-mono-code text-xs text-slate-500">
                            ₦{totalGrossPending.toLocaleString()}
                          </td>
                          <td className="pt-3 text-right font-mono-code text-xs text-blue-700">
                            ₦{totalHmoCovered.toLocaleString()}
                          </td>
                          <td className="pt-3 text-right font-mono-code text-base text-rose-600">
                            ₦{totalPatientPayable.toLocaleString()}
                          </td>
                          <td className="pt-3" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Payment Confirmation Actions */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500/30 shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-base text-slate-900">
                    Payment Confirmation Panel
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confirm via Cash, Transfer, Paystack, or deduct from Admission Wallet.
                  </p>
                </div>

                {walletError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{walletError}</span>
                  </div>
                )}

                {/* Total display box */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Patient Co-Pay Due
                  </span>
                  <div className="text-3xl font-black font-mono-code text-emerald-700 my-1">
                    ₦{totalPatientPayable.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    {pendingBills.length} Pending Charge(s) for #{selectedPatient.card_no}
                  </span>
                </div>

                {/* Feature 2: Pay via Inpatient Admission Wallet */}
                <div className="p-3.5 bg-emerald-950 text-white rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4" /> Inpatient Admission Wallet
                    </span>
                    <span className="font-mono-code font-bold">
                      Bal: ₦{(selectedPatient.wallet_balance || 0).toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={totalPatientPayable === 0 || (selectedPatient.wallet_balance || 0) < totalPatientPayable}
                    onClick={handlePayViaWallet}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 rounded-lg font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <span>[Deduct ₦{totalPatientPayable.toLocaleString()} from Wallet]</span>
                  </button>
                  {(selectedPatient.wallet_balance || 0) < totalPatientPayable && totalPatientPayable > 0 && (
                    <p className="text-[10px] text-emerald-300 text-center">
                      Insufficient wallet funds. Top up wallet or confirm via Cash / Transfer below.
                    </p>
                  )}
                </div>

                {/* Standard Payment Buttons */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    disabled={totalPatientPayable === 0}
                    onClick={() => handleConfirmPayment('Cash')}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold text-sm flex items-center justify-between transition-all shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Banknote className="w-5 h-5 text-emerald-200" />
                      <span>[Confirm Cash]</span>
                    </div>
                    <span className="font-mono-code text-emerald-100 font-semibold">
                      ₦{totalPatientPayable.toLocaleString()}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={totalPatientPayable === 0}
                    onClick={() => handleConfirmPayment('Transfer')}
                    className="w-full py-3.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white rounded-xl font-bold text-sm flex items-center justify-between transition-all shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-5 h-5 text-blue-200" />
                      <span>[Confirm Transfer]</span>
                    </div>
                    <span className="font-mono-code text-blue-100 font-semibold">
                      Direct Bank Alert
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={totalPatientPayable === 0}
                    onClick={() => handleConfirmPayment('Paystack')}
                    className="w-full py-3.5 px-4 bg-[#001428] hover:bg-[#002244] disabled:opacity-40 text-white rounded-xl font-bold text-sm flex items-center justify-between transition-all shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-5 h-5 text-cyan-400" />
                      <span>[Confirm Paystack]</span>
                    </div>
                    <span className="font-mono-code text-cyan-300 font-semibold">
                      POS / Card / USSD
                    </span>
                  </button>
                </div>

                {/* Auto print receipt toggle */}
                <div className="pt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    id="autoprint"
                    checked={autoPrintReceipt}
                    onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <label htmlFor="autoprint" className="cursor-pointer">
                    Auto-display 58mm Thermal Receipt on Confirmation
                  </label>
                </div>

                {onNavigateToVerify && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onNavigateToVerify(selectedPatient.card_no)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      View Pharmacy Clearance for #{selectedPatient.card_no} →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center">
            <Wallet className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="font-bold text-base text-slate-800 mb-1">No Patient Loaded</h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Scan the patient's card or enter their card number to collect pending bills, deduct from admission wallet, and generate thermal receipts.
            </p>
            <button
              onClick={() => loadPatient('12489')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors"
            >
              Load Card #12489 (₦15,000 Pending)
            </button>
          </div>
        )
      )}

      {/* Optical QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanSuccess}
        title="Accounts Scan - Card QR Sticker"
      />

      {/* 58mm Thermal Receipt Modal */}
      <ReceiptPrintModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        patient={selectedPatient}
        paidBills={lastPaidBills}
        totalAmount={lastPaidAmount}
        receiptNo={lastReceiptNo}
        paymentMethod={lastPaymentMethod}
        cashierName={cashierName}
      />

      {/* Feature 2: Inpatient Admission Wallet Top-up Modal */}
      <WalletTopupModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        patient={selectedPatient}
        onSuccess={(newBal) => {
          if (selectedPatient) {
            setSelectedPatient({ ...selectedPatient, wallet_balance: newBal });
          }
        }}
      />

      {/* Feature 3: Cashier Shift Handover & End-of-Day Z-Report Modal */}
      <ShiftZReportModal
        isOpen={showZReportModal}
        onClose={() => setShowZReportModal(false)}
        summary={getCashierShiftSummary(cashierName)}
      />

      {/* Paystack Inline Simulation Modal */}
      {selectedPatient && (
        <PaystackModal
          isOpen={showPaystackModal}
          onClose={() => setShowPaystackModal(false)}
          amount={totalPatientPayable}
          cardNo={selectedPatient.card_no}
          patientName={selectedPatient.name}
          onSuccess={handlePaystackSuccess}
        />
      )}
    </div>
  );
};
