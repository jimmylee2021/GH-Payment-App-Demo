import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Camera, 
  Search, 
  AlertTriangle, 
  PackageCheck, 
  ArrowRight, 
  Share2, 
  Clock, 
  Sparkles,
  ShieldCheck,
  Filter,
  Pill,
  FlaskConical,
  ScanLine
} from 'lucide-react';
import { 
  findPatient, 
  getPatientBills, 
  markBillsDispensed, 
  subscribeToStore 
} from '../services/store';
import { Patient, BillItem, Department } from '../types';
import { QRScannerModal } from '../components/QRScannerModal';
import { playAudio } from '../services/sound';

interface VerifyPageProps {
  initialCardNo?: string;
  onNavigateToPay?: (cardNo: string) => void;
}

export const VerifyPage: React.FC<VerifyPageProps> = ({
  initialCardNo,
  onNavigateToPay,
}) => {
  const [searchInput, setSearchInput] = useState(initialCardNo || '');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Feature 1: Departmental Clearance Filtering
  const [deptFilter, setDeptFilter] = useState<'All' | 'Pharmacy' | 'Lab' | 'Radiology'>('All');

  // Selected item IDs for partial dispensation
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Patient Bills
  const [patientBills, setPatientBills] = useState<BillItem[]>([]);
  const [dispensedSuccess, setDispensedSuccess] = useState(false);
  const [realtimeAlert, setRealtimeAlert] = useState<string | null>(null);

  useEffect(() => {
    if (initialCardNo) {
      setSearchInput(initialCardNo);
      loadPatient(initialCardNo);
    } else {
      loadPatient('12489');
    }
  }, [initialCardNo]);

  useEffect(() => {
    const unsubscribe = subscribeToStore(() => {
      if (selectedPatient) {
        const freshBills = getPatientBills(selectedPatient.card_no);
        const prevPending = patientBills.some(b => b.status === 'pending');
        const nowPending = freshBills.some(b => b.status === 'pending');

        setPatientBills(freshBills);

        if (prevPending && !nowPending) {
          playAudio.successChime();
          setRealtimeAlert('Payment just confirmed by Accounts in real time! Clearance granted.');
          setTimeout(() => setRealtimeAlert(null), 5000);
        }
      }
    });
    return unsubscribe;
  }, [selectedPatient, patientBills]);

  const loadPatient = (cardQuery: string) => {
    if (!cardQuery.trim()) return;
    const patient = findPatient(cardQuery);
    if (patient) {
      setSelectedPatient(patient);
      setSearchError(null);
      const bills = getPatientBills(patient.card_no);
      setPatientBills(bills);
      setSelectedItemIds(bills.filter(b => b.status === 'paid' && !b.dispensed).map(b => b.id));

      const hasPending = bills.some(b => b.status === 'pending');
      if (hasPending) {
        playAudio.alertTone();
      } else if (bills.length > 0) {
        playAudio.successChime();
      }
    } else {
      setSelectedPatient(null);
      setPatientBills([]);
      setSelectedItemIds([]);
      setSearchError(`No patient found for card "${cardQuery}".`);
    }
  };

  const handleScanSuccess = (card_no: string) => {
    setSearchInput(card_no);
    loadPatient(card_no);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPatient(searchInput);
  };

  const handleToggleItemSelect = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleMarkDispensed = () => {
    if (!selectedPatient) return;
    const idsToDispense = selectedItemIds.length > 0 ? selectedItemIds : undefined;
    const success = markBillsDispensed(selectedPatient.card_no, idsToDispense);
    if (success) {
      playAudio.successChime();
      setDispensedSuccess(true);
      setPatientBills(getPatientBills(selectedPatient.card_no));
      setTimeout(() => setDispensedSuccess(false), 4000);
    }
  };

  const pendingBills = patientBills.filter((b) => b.status === 'pending');
  const paidBills = patientBills.filter((b) => b.status === 'paid');

  // Filtered by department for specialist desk (Feature 1)
  const filteredPaidBills = deptFilter === 'All' 
    ? paidBills 
    : paidBills.filter(b => b.department === deptFilter);

  const filteredPendingBills = deptFilter === 'All'
    ? pendingBills
    : pendingBills.filter(b => b.department === deptFilter);

  const totalPending = pendingBills.reduce((acc, curr) => acc + (curr.patient_share !== undefined ? curr.patient_share : curr.amount), 0);
  const totalPaid = paidBills.reduce((acc, curr) => acc + (curr.patient_share !== undefined ? curr.patient_share : curr.amount), 0);

  const isAllPaid = selectedPatient && patientBills.length > 0 && pendingBills.length === 0;
  const isPending = selectedPatient && pendingBills.length > 0;
  const hasNoBills = selectedPatient && patientBills.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Verify Station Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Pharmacy & Lab Verification Terminal
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  Departmental clearance filtering · Partial item dispensation · Auto-flips in real-time
                </p>
              </div>
            </div>
          </div>

          {/* Scanner & Manual Search */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Camera className="w-5 h-5 text-emerald-200" />
              <span>Scan Patient Card QR</span>
            </button>

            <form onSubmit={handleManualSearch} className="flex gap-1.5 flex-1 sm:w-72">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Card No (e.g. 12489)"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono-code text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {searchError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {realtimeAlert && (
          <div className="mt-4 p-3 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg animate-bounce">
            <Sparkles className="w-5 h-5" />
            <span>{realtimeAlert}</span>
          </div>
        )}

        {/* Feature 1: Departmental Clearance Filter Tabs */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>Clearance Station View:</span>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
            {(['All', 'Pharmacy', 'Lab', 'Radiology'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg transition-all ${
                  deptFilter === d
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d === 'All' ? 'All Desks' : `${d} Only`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Terminal Display */}
      {selectedPatient ? (
        <div className="space-y-6">
          {/* 1. BIG GREEN SCREEN: All bills paid */}
          {isAllPaid && (
            <div className="bg-emerald-600 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-emerald-400/60 relative overflow-hidden transition-all duration-300">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/80 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-emerald-600 rounded-3xl flex items-center justify-center shadow-lg shrink-0">
                      <CheckCircle2 className="w-10 h-10 sm:w-14 sm:h-14" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black tracking-widest uppercase bg-emerald-500/80 px-3 py-1 rounded-full inline-block mb-1 text-emerald-100">
                        OFFICIAL CLEARANCE
                      </div>
                      <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase">
                        PAID - DISPENSE
                      </h2>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-emerald-200 font-bold uppercase tracking-wider">
                      TOTAL SETTLED
                    </div>
                    <div className="text-3xl sm:text-4xl font-black font-mono-code text-white">
                      ₦{totalPaid.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Patient Summary */}
                <div className="bg-emerald-700/60 backdrop-blur-md rounded-2xl p-5 border border-emerald-500/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-emerald-200 font-bold uppercase">Patient Identity</div>
                    <div className="text-xl sm:text-2xl font-black text-white">{selectedPatient.name}</div>
                    <div className="text-xs text-emerald-100 mt-0.5">
                      {selectedPatient.gender}, {selectedPatient.age} yrs · Scheme: <strong>{selectedPatient.hmo_type}</strong>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-xs text-emerald-200 font-bold uppercase">Physical Card</div>
                    <div className="text-2xl font-mono-code font-black text-emerald-300 bg-emerald-900/60 px-4 py-1.5 rounded-xl inline-block border border-emerald-500/40">
                      #{selectedPatient.card_no}
                    </div>
                  </div>
                </div>

                {/* Patient Notes & Allergy Alert */}
                {selectedPatient.notes && (
                  <div className="bg-amber-100/90 border-2 border-amber-300 text-amber-950 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-3 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                    <div>
                      <span className="font-black uppercase tracking-wider text-amber-900 mr-1.5 bg-amber-200/80 px-2 py-0.5 rounded">
                        Medical Alert:
                      </span>
                      <span className="font-bold text-amber-950">{selectedPatient.notes}</span>
                    </div>
                  </div>
                )}

                {/* Authorized Items List with Partial Dispense Selection (Feature 1) */}
                <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      Authorized Medical Items {deptFilter !== 'All' ? `(${deptFilter} Only)` : ''}
                    </h3>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      {filteredPaidBills.length} Item(s) Verified
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredPaidBills.map((b) => (
                      <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={b.dispensed || selectedItemIds.includes(b.id)}
                            disabled={b.dispensed}
                            onChange={() => handleToggleItemSelect(b.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <div>
                            <div className="font-bold text-sm sm:text-base text-slate-900">
                              {b.item_name}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              <span className="font-semibold text-emerald-700">[{b.department}]</span>
                              <span>·</span>
                              <span>Receipt #{b.receipt_no || 'OFFICIAL'}</span>
                              <span>·</span>
                              <span>{b.payment_method || 'Verified'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono-code font-bold text-sm text-slate-900">
                            ₦{(b.patient_share !== undefined ? b.patient_share : b.amount).toLocaleString()}
                          </div>
                          {b.dispensed ? (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              DISPENSED
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded animate-pulse">
                              READY TO DISPENSE
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Partial / Full Dispense Action */}
                  <div className="pt-4 border-t border-slate-100">
                    {dispensedSuccess ? (
                      <div className="w-full p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-center font-bold text-sm">
                        ✓ Selected items recorded as dispensed and handed to patient.
                      </div>
                    ) : (
                      <button
                        onClick={handleMarkDispensed}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                      >
                        <PackageCheck className="w-5 h-5" />
                        Confirm & Mark Selected Items Dispensed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. BIG RED SCREEN: Pending bills exist */}
          {isPending && (
            <div className="bg-rose-600 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-rose-400/60 relative overflow-hidden transition-all duration-300">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-500/80 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-rose-600 rounded-3xl flex items-center justify-center shadow-lg shrink-0">
                      <XCircle className="w-10 h-10 sm:w-14 sm:h-14" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black tracking-widest uppercase bg-rose-500/80 px-3 py-1 rounded-full inline-block mb-1 text-rose-100">
                        DISPENSE STOPPED
                      </div>
                      <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase">
                        PENDING ₦{totalPending.toLocaleString()}
                      </h2>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-rose-700/80 px-4 py-2 rounded-2xl border border-rose-500">
                    <div className="text-xs text-rose-200 font-bold uppercase tracking-wider">
                      DIRECT PATIENT TO
                    </div>
                    <div className="text-base sm:text-lg font-black text-white">
                      ACCOUNTS / CASHIER
                    </div>
                  </div>
                </div>

                {/* Patient Summary */}
                <div className="bg-rose-700/60 backdrop-blur-md rounded-2xl p-5 border border-rose-500/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-rose-200 font-bold uppercase">Patient Identity</div>
                    <div className="text-xl sm:text-2xl font-black text-white">{selectedPatient.name}</div>
                    <div className="text-xs text-rose-100 mt-0.5">
                      Scheme: <strong>{selectedPatient.hmo_type}</strong> · Tel: {selectedPatient.phone}
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-xs text-rose-200 font-bold uppercase">Physical Card</div>
                    <div className="text-2xl font-mono-code font-black text-rose-200 bg-rose-900/60 px-4 py-1.5 rounded-xl inline-block border border-rose-500/40">
                      #{selectedPatient.card_no}
                    </div>
                  </div>
                </div>

                {/* Patient Notes & Allergy Alert */}
                {selectedPatient.notes && (
                  <div className="bg-amber-100/95 border-2 border-amber-300 text-amber-950 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-3 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                    <div>
                      <span className="font-black uppercase tracking-wider text-amber-900 mr-1.5 bg-amber-200/80 px-2 py-0.5 rounded">
                        Medical Alert:
                      </span>
                      <span className="font-bold text-amber-950">{selectedPatient.notes}</span>
                    </div>
                  </div>
                )}

                {/* Outstanding Items List */}
                <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-base text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      Outstanding Unpaid Bills (DO NOT DISPENSE)
                    </h3>
                    <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full">
                      {filteredPendingBills.length} Unpaid Item(s)
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredPendingBills.map((b) => (
                      <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                            ✕
                          </div>
                          <div>
                            <div className="font-bold text-sm sm:text-base text-slate-900">
                              {b.item_name}
                            </div>
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold text-rose-700">[{b.department}]</span>
                              <span> · Posted {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono-code font-bold text-base text-rose-600">
                            ₦{(b.patient_share !== undefined ? b.patient_share : b.amount).toLocaleString()}
                          </div>
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                            UNPAID
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      Family can pay online via phone or cashier can deduct from Inpatient Wallet.
                    </p>
                    {onNavigateToPay && (
                      <button
                        onClick={() => onNavigateToPay(selectedPatient.card_no)}
                        className="py-3 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors shrink-0"
                      >
                        <Share2 className="w-4 h-4 text-emerald-400" />
                        Open Public Family Pay Link →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasNoBills && (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
              <Clock className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="font-bold text-lg text-slate-800">No Bills on Record</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No charges have been posted yet for Card #{selectedPatient.card_no}.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="font-bold text-base text-slate-800 mb-1">Scan Patient Card to Verify</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            Point camera scanner at card QR sticker to immediately determine if patient is cleared for medication dispensation or lab testing.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearchInput('12489');
                loadPatient('12489');
              }}
              className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-colors hover:bg-rose-100"
            >
              Test Red: Card #12489
            </button>
            <button
              onClick={() => {
                setSearchInput('GH/2023/7890');
                loadPatient('GH/2023/7890');
              }}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition-colors hover:bg-emerald-100"
            >
              Test Green: Card #GH/2023/7890
            </button>
          </div>
        </div>
      )}

      {/* Optical QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanSuccess}
        title="Pharmacy / Lab Verify - Scan Card QR"
      />
    </div>
  );
};
