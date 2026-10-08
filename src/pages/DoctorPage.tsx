import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Camera, 
  Search, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  FlaskConical, 
  FilePlus, 
  User, 
  CreditCard,
  Sparkles,
  Package,
  Layers,
  Wallet,
  ShieldCheck,
  WifiOff,
  CloudUpload
} from 'lucide-react';
import { 
  findPatient, 
  getPatientBills, 
  addBill, 
  postClinicalBundle,
  CLINICAL_BUNDLES,
  calculateShares,
  getStoredPatients,
  getPatientByCard 
} from '../services/store';
import { isAppOnline, subscribeToSyncState } from '../services/sync';
import { Patient, BillItem, Department, ClinicalBundle } from '../types';
import { QRScannerModal } from '../components/QRScannerModal';
import { PatientNotesCard } from '../components/PatientNotesCard';
import { playAudio } from '../services/sound';

interface DoctorPageProps {
  initialCardNo?: string;
  onNavigateToAccounts?: (cardNo: string) => void;
}

export const DoctorPage: React.FC<DoctorPageProps> = ({
  initialCardNo,
  onNavigateToAccounts,
}) => {
  const [searchInput, setSearchInput] = useState(initialCardNo || '');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Tab between Single Item vs Multi-Item Bundle
  const [billingMode, setBillingMode] = useState<'single' | 'bundle'>('single');

  // Bill Post Form State
  const [department, setDepartment] = useState<Department>('Consultation');
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [postSuccessMessage, setPostSuccessMessage] = useState<string | null>(null);

  // Patient Bills
  const [patientBills, setPatientBills] = useState<BillItem[]>([]);
  const [isOnline, setIsOnline] = useState(isAppOnline());

  useEffect(() => {
    const unsub = subscribeToSyncState((state) => {
      setIsOnline(state.isOnline);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handleStoreChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === 'PATIENTS_UPDATED' && selectedPatient) {
        const fresh = getPatientByCard(selectedPatient.card_no);
        if (fresh) {
          setSelectedPatient(fresh);
        }
      }
    };
    window.addEventListener('gh_pay_change', handleStoreChange);
    return () => window.removeEventListener('gh_pay_change', handleStoreChange);
  }, [selectedPatient]);

  // Clinical quick item presets
  const clinicalPresets: { name: string; dept: Department; price: number }[] = [
    { name: 'General Outpatient Consultation', dept: 'Consultation', price: 3500 },
    { name: 'Specialist Physician Review', dept: 'Consultation', price: 6000 },
    { name: 'Full Blood Count (FBC)', dept: 'Lab', price: 5000 },
    { name: 'Malaria Parasite (MP) Rapid & Micro', dept: 'Lab', price: 2500 },
    { name: 'Widal Agglutination Reaction (Typhoid)', dept: 'Lab', price: 3000 },
    { name: 'Routine Urinalysis Panel', dept: 'Lab', price: 2000 },
    { name: 'Fasting Blood Sugar (FBS)', dept: 'Lab', price: 2500 },
    { name: 'Chest X-Ray (AP/Lateral)', dept: 'Radiology', price: 8500 },
    { name: 'Pelvic / Abdominal Ultrasound Scan', dept: 'Radiology', price: 9000 },
    { name: 'Emergency IV Cannulation & Fluids', dept: 'Emergency', price: 4500 },
  ];

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
      const bills = getPatientBills(patient.card_no);
      setPatientBills(bills);
    } else {
      setSelectedPatient(null);
      setPatientBills([]);
      setSearchError(`No patient card found for "${cardQuery}". Try scanning again or search in Records.`);
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

  const handleApplyPreset = (preset: { name: string; dept: Department; price: number }) => {
    setDepartment(preset.dept);
    setItemName(preset.name);
    setAmount(preset.price.toString());
    playAudio.tapSound();
  };

  const handlePostBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!itemName.trim()) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    addBill({
      card_no: selectedPatient.card_no,
      department,
      item_name: itemName.trim(),
      amount: numAmount,
    });

    playAudio.tapSound();
    setPostSuccessMessage(`Bill posted: ${itemName} (Gross: ₦${numAmount.toLocaleString()})`);
    setTimeout(() => setPostSuccessMessage(null), 3000);

    setPatientBills(getPatientBills(selectedPatient.card_no));
    setItemName('');
    setAmount('');
  };

  // Feature 1: Post Multi-Item Clinical Bundle in 1 tap
  const handlePostBundle = (bundle: ClinicalBundle) => {
    if (!selectedPatient) return;
    postClinicalBundle(selectedPatient.card_no, bundle.id);
    playAudio.successChime();
    setPostSuccessMessage(`Pack posted: ${bundle.name} (${bundle.items.length} items queued)`);
    setTimeout(() => setPostSuccessMessage(null), 3500);
    setPatientBills(getPatientBills(selectedPatient.card_no));
  };

  const pendingBills = patientBills.filter((b) => b.status === 'pending');
  const paidBills = patientBills.filter((b) => b.status === 'paid');
  const totalPendingPatientShare = pendingBills.reduce((acc, curr) => acc + (curr.patient_share !== undefined ? curr.patient_share : curr.amount), 0);
  const totalGrossPending = pendingBills.reduce((acc, curr) => acc + curr.amount, 0);

  // Live calculation of preview for current input amount
  const grossNum = parseFloat(amount || '0');
  const previewSplit = selectedPatient ? calculateShares(grossNum, selectedPatient.hmo_type) : { patientShare: grossNum, hmoShare: 0 };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Bar with Camera Scanner & Manual Input */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Stethoscope className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Doctor / Laboratory Station
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  Scan physical card QR sticker · Multi-Item Clinical Bundles · NHIA Co-pay calculation
                </p>
              </div>
            </div>
          </div>

          {/* QR Scanner Trigger & Manual Input */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Camera className="w-5 h-5 text-emerald-200" />
              <span>Scan Card Sticker QR</span>
            </button>

            <form onSubmit={handleManualSearch} className="flex gap-1.5 flex-1 sm:w-72">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Card No (e.g. 12489)"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono-code text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
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
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Offline Awareness Banner */}
        {!isOnline && (
          <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Offline Workstation Active:</span> Charges posted now are safely cached locally in Service Worker storage and will auto-sync with Supabase when connectivity returns.
              </div>
            </div>
            <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded shrink-0">
              OFFLINE CACHING
            </span>
          </div>
        )}
      </div>

      {selectedPatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Patient Profile + Form to Post Bill */}
          <div className="lg:col-span-6 space-y-6">
            {/* Patient Header Card with Wallet & HMO info */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Clinical Patient
                </span>
                <span className="font-mono-code font-black text-sm bg-slate-900 text-white px-2.5 py-1 rounded-md">
                  CARD: {selectedPatient.card_no}
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900">{selectedPatient.name}</h2>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2 mt-1">
                  <span>{selectedPatient.gender}, {selectedPatient.age} yrs</span>
                  <span>·</span>
                  <span>{selectedPatient.phone}</span>
                  {selectedPatient.blood_group && (
                    <>
                      <span>·</span>
                      <span className="font-bold text-rose-600">Group {selectedPatient.blood_group}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Badges for Wallet & HMO */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-left">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Admission Wallet
                  </div>
                  <div className="font-mono-code font-black text-base text-emerald-700">
                    ₦{(selectedPatient.wallet_balance || 0).toLocaleString()}
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-left">
                  <div className="text-[10px] font-bold text-blue-800 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Insurance / Scheme
                  </div>
                  <div className="text-xs font-bold text-blue-900 truncate">
                    {selectedPatient.hmo_type}
                  </div>
                </div>
              </div>
            </div>

            {/* Feature: Prominently Displayed Patient Notes & Allergy Alerts */}
            <PatientNotesCard
              cardNo={selectedPatient.card_no}
              patientName={selectedPatient.name}
              notes={selectedPatient.notes}
              onNotesSaved={(newNotes) => {
                setSelectedPatient({ ...selectedPatient, notes: newNotes });
              }}
            />

            {/* Posting Mode Tabs: Single Item vs Multi-Item Clinical Bundles */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FilePlus className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-base text-slate-900">Post Hospital Charges</h3>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setBillingMode('single')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      billingMode === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Single Item
                  </button>
                  <button
                    onClick={() => setBillingMode('bundle')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      billingMode === 'bundle' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Clinical Bundles
                  </button>
                </div>
              </div>

              {postSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{postSuccessMessage}</span>
                </div>
              )}

              {/* Mode 1: Multi-Item Clinical Bundles (Feature 1) */}
              {billingMode === 'bundle' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Post complete care packages across Consultation, Lab, and Pharmacy with 1 click:
                  </p>
                  <div className="space-y-3">
                    {CLINICAL_BUNDLES.map((bundle) => {
                      const totalGross = bundle.items.reduce((s, i) => s + i.amount, 0);
                      const { patientShare } = calculateShares(totalGross, selectedPatient.hmo_type);
                      return (
                        <div
                          key={bundle.id}
                          className="p-4 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 rounded-xl transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {bundle.category} Package
                              </span>
                              <h4 className="font-black text-sm text-slate-900 mt-1">{bundle.name}</h4>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 line-through">
                                Gross: ₦{totalGross.toLocaleString()}
                              </span>
                              <div className="text-sm font-black font-mono-code text-blue-700">
                                Patient: ₦{patientShare.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200">
                            {bundle.items.map((it, i) => (
                              <div key={i} className="flex justify-between">
                                <span>• [{it.department}] {it.name}</span>
                                <span className="font-mono-code text-slate-500">₦{it.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => handlePostBundle(bundle)}
                            className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Post Entire {bundle.name} to Bill
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Mode 2: Standard Single Item Post */
                <form onSubmit={handlePostBill} className="space-y-4">
                  {/* Quick Preset Buttons */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      Quick Clinical Presets
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                      {clinicalPresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-lg text-left text-xs transition-colors flex items-center gap-2 shadow-2xs"
                        >
                          <span className="font-medium text-slate-800 truncate max-w-[170px]">
                            {preset.name}
                          </span>
                          <span className="font-mono-code font-bold text-blue-700 text-[11px]">
                            ₦{preset.price.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Department
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(['Consultation', 'Lab', 'Radiology', 'Pharmacy', 'Emergency', 'Ward'] as Department[]).map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => setDepartment(dept)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                            department === dept
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Item Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Item / Service Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Full Blood Count or Specialist Review"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  {/* Amount in Naira */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Gross Amount (₦) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 font-mono-code font-bold text-base text-slate-500">
                        ₦
                      </span>
                      <input
                        type="number"
                        step="50"
                        min="50"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono-code text-base font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>

                    {/* HMO Co-pay split preview (Feature 4) */}
                    {grossNum > 0 && selectedPatient && (
                      <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
                        <div>
                          <span className="text-blue-900 font-bold">{selectedPatient.hmo_type}</span>
                          <div className="text-[11px] text-blue-700">
                            Patient Co-pay: <strong>₦{previewSplit.patientShare.toLocaleString()}</strong>
                          </div>
                        </div>
                        {previewSplit.hmoShare > 0 && (
                          <div className="text-right text-[11px] text-slate-600">
                            NHIA Covers: <strong className="text-emerald-700">₦{previewSplit.hmoShare.toLocaleString()}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Add to Bill (Status: Pending)
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Pending Bills List + Patient History */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-amber-300 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Current Pending Bills
                    </h3>
                    <p className="text-xs text-slate-500">
                      Payable via Accounts or Inpatient Wallet
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Patient Payable</div>
                  <div className="text-xl font-black font-mono-code text-amber-600">
                    ₦{totalPendingPatientShare.toLocaleString()}
                  </div>
                  {totalGrossPending > totalPendingPatientShare && (
                    <div className="text-[10px] text-slate-400 line-through">
                      Gross: ₦{totalGrossPending.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {pendingBills.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                  No pending bills for Card #{selectedPatient.card_no}. Patient is cleared.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900">{bill.item_name}</div>
                        <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-blue-700">[{bill.department}]</span>
                          {bill.bundle_name && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 rounded">
                              {bill.bundle_name}
                            </span>
                          )}
                          <span>·</span>
                          <span className="text-slate-500">
                            {new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>·</span>
                          {bill.sync_status === 'pending_sync' ? (
                            <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                              <CloudUpload className="w-2.5 h-2.5" />
                              Cached ⏱
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                              Synced ☁️
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono-code font-bold text-base text-slate-900">
                          ₦{(bill.patient_share !== undefined ? bill.patient_share : bill.amount).toLocaleString()}
                        </div>
                        {bill.hmo_share > 0 && (
                          <div className="text-[10px] text-blue-600 font-semibold">
                            HMO: ₦{bill.hmo_share.toLocaleString()}
                          </div>
                        )}
                        <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                          PENDING
                        </span>
                      </div>
                    </div>
                  ))}

                  {onNavigateToAccounts && (
                    <div className="pt-2">
                      <button
                        onClick={() => onNavigateToAccounts(selectedPatient.card_no)}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        Proceed to Accounts Station for Card #{selectedPatient.card_no} →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Previously Paid Bills History */}
            {paidBills.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Paid & Cleared Charges History
                  </h4>
                  <span className="text-xs text-slate-500 font-mono-code">{paidBills.length} item(s)</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {paidBills.map((b) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900">{b.item_name}</span>
                        <div className="text-[11px] text-slate-500">
                          {b.department} · {b.payment_method === 'Wallet' ? 'Paid via Wallet' : `Receipt ${b.receipt_no || 'N/A'}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono-code font-bold text-emerald-700">
                          ₦{(b.patient_share !== undefined ? b.patient_share : b.amount).toLocaleString()}
                        </span>
                        <div className="text-[10px] text-emerald-600 font-bold uppercase">PAID</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center">
          <Stethoscope className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="font-bold text-base text-slate-800 mb-1">No Patient Loaded</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            Scan the patient's card QR sticker or enter their existing card number to post lab, clinical bundles, and consultation fees.
          </p>
          <button
            onClick={() => loadPatient('12489')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors"
          >
            Load Card #12489 (Ibrahim Babatunde)
          </button>
        </div>
      )}

      {/* Optical QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanSuccess}
        title="Doctor Scan - Card QR Sticker"
      />
    </div>
  );
};
