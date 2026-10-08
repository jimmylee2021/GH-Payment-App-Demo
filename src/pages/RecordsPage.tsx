import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  FileText, 
  Search, 
  UserPlus, 
  Printer, 
  Check, 
  AlertCircle, 
  CreditCard, 
  Calendar, 
  Phone, 
  User, 
  Clock,
  Sparkles,
  Receipt,
  Wallet,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { 
  getStoredPatients, 
  findPatient, 
  createPatient, 
  getNextCardNumberSuggestion, 
  getPatientBills,
  updatePatientHMO,
  matchCardNumber,
  getPatientByCard
} from '../services/store';
import { Patient, BillItem, Gender, HMOType } from '../types';
import { StickerPrintModal } from '../components/StickerPrintModal';
import { WalletTopupModal } from '../components/WalletTopupModal';
import { PatientNotesCard } from '../components/PatientNotesCard';
import { playAudio } from '../services/sound';

interface RecordsPageProps {
  initialCardNo?: string;
  onSelectPatientForStation?: (cardNo: string) => void;
}

export const RecordsPage: React.FC<RecordsPageProps> = ({
  initialCardNo,
  onSelectPatientForStation,
}) => {
  const [activeTab, setActiveTab] = useState<'old' | 'new'>('old');
  
  // Tab A (Old Patient)
  const [searchInput, setSearchInput] = useState(initialCardNo || '');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Tab B (New Patient)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [cardNoInput, setCardNoInput] = useState('');
  const [hmoType, setHmoType] = useState<HMOType>('Private / Self-Pay (100%)');
  const [hmoNumber, setHmoNumber] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('0');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Modals
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Bills list for selected patient
  const [patientBills, setPatientBills] = useState<BillItem[]>([]);

  useEffect(() => {
    if (initialCardNo) {
      setSearchInput(initialCardNo);
      handleSearch(initialCardNo);
    } else {
      handleSearch('12489');
    }
  }, [initialCardNo]);

  useEffect(() => {
    if (activeTab === 'new' && !cardNoInput) {
      setCardNoInput(getNextCardNumberSuggestion());
    }
  }, [activeTab]);

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

  const handleSearch = (queryToUse?: string) => {
    const q = (queryToUse !== undefined ? queryToUse : searchInput).trim();
    if (!q) {
      setSearchError('Please enter a card number to search.');
      return;
    }

    setSearchError(null);
    const found = findPatient(q);
    if (found) {
      playAudio.scanBeep();
      setSelectedPatient(found);
      const bills = getPatientBills(found.card_no);
      setPatientBills(bills);
      if (onSelectPatientForStation) {
        onSelectPatientForStation(found.card_no);
      }
    } else {
      playAudio.alertTone();
      setSelectedPatient(null);
      setPatientBills([]);
      setSearchError(`No patient found matching "${q}". Verify number or register under "New Patient" tab.`);
    }
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Patient full name is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    if (!age || parseInt(age, 10) <= 0) {
      setFormError('Please enter a valid age.');
      return;
    }
    if (!cardNoInput.trim()) {
      setFormError('Physical card number is required.');
      return;
    }

    const depositNum = parseFloat(initialDeposit || '0');

    const result = createPatient({
      name: fullName.trim(),
      phone: phone.trim(),
      age: parseInt(age, 10),
      gender,
      card_no: cardNoInput.trim(),
      hmo_type: hmoType,
      hmo_number: hmoNumber.trim() || undefined,
      wallet_balance: isNaN(depositNum) ? 0 : depositNum,
      notes: notes.trim() || undefined,
    });

    if (result.success && result.patient) {
      playAudio.successChime();
      setSelectedPatient(result.patient);
      setPatientBills([]);
      setActiveTab('old');
      setSearchInput(result.patient.card_no);
      setShowStickerModal(true);
      if (onSelectPatientForStation) {
        onSelectPatientForStation(result.patient.card_no);
      }
    } else {
      playAudio.alertTone();
      setFormError(result.error || 'Failed to create patient record.');
    }
  };

  const handleUpdateHmo = (type: HMOType) => {
    if (!selectedPatient) return;
    updatePatientHMO(selectedPatient.card_no, type);
    setSelectedPatient({ ...selectedPatient, hmo_type: type });
    playAudio.tapSound();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Records Station Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileText className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Records Department
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Hospital physical card registry, 58mm QR stickers, Inpatient Wallet & NHIA/HMO setup
              </p>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 sm:flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto gap-1">
          <button
            onClick={() => setActiveTab('old')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all text-center ${
              activeTab === 'old'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="truncate">Tab A: Old Patient</span>
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all text-center ${
              activeTab === 'new'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span className="truncate">Tab B: New Patient</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-5 space-y-6">
          {activeTab === 'old' ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Look Up Existing Physical Card
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type card number exactly as written on physical card (e.g. 12489, GH/2023/7890, 023411)
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wider">
                    Physical Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="e.g. 12489, 023411, GH/2023/7890"
                      className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 rounded-xl font-mono-code text-lg font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:bg-white transition-all shadow-inner"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-2 bottom-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <Search className="w-4 h-4" />
                      Search
                    </button>
                  </div>
                </div>

                {searchError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{searchError}</span>
                  </div>
                )}

                {/* Quick test hints */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Smart Card Matching Demo:
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      { label: 'Card 12489 (Self-Pay)', query: '12489' },
                      { label: 'Card 023411 (NHIA 10%)', query: '023411' },
                      { label: 'Card GH/2023/7890', query: 'GH/2023/7890' },
                      { label: 'Card GH/2024/0042 (State 0%)', query: 'GH/2024/0042' },
                    ].map((btn) => (
                      <button
                        key={btn.query}
                        type="button"
                        onClick={() => {
                          setSearchInput(btn.query);
                          handleSearch(btn.query);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-400 rounded-lg text-slate-700 font-mono-code text-xs transition-colors"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  Register New Patient (Allocate Physical Card)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Card number auto-suggests next in series, but can be edited to match hospital register book.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreatePatient} className="space-y-4">
                {/* Physical Card Number Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Physical Card Number <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCardNoInput(getNextCardNumberSuggestion())}
                      className="text-[11px] text-emerald-600 hover:underline font-semibold"
                    >
                      Suggest Next Number
                    </button>
                  </div>
                  <input
                    type="text"
                    value={cardNoInput}
                    onChange={(e) => setCardNoInput(e.target.value)}
                    placeholder="e.g. 023412 or GH/2026/001"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-emerald-500/50 rounded-xl font-mono-code text-base font-bold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                    required
                  />
                </div>

                {/* Patient Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Adebayo Ogunlesi"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0802 345 6789"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                {/* Age & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Age (Years) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="125"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 34"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender)}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Feature 4: Health Insurance / HMO Scheme */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Insurance / Billing Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={hmoType}
                    onChange={(e) => setHmoType(e.target.value as HMOType)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Private / Self-Pay (100%)">Private / Self-Pay (100%)</option>
                    <option value="NHIA Standard (10% Co-pay)">NHIA Standard (10% Co-pay)</option>
                    <option value="State Health Scheme (0% Co-pay)">State Health Scheme (0% Co-pay)</option>
                    <option value="Emergency / Indigent Waiver">Emergency / Indigent Waiver</option>
                  </select>
                </div>

                {/* Optional HMO Policy Number */}
                {hmoType !== 'Private / Self-Pay (100%)' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      NHIA / HMO Enrollee Number
                    </label>
                    <input
                      type="text"
                      value={hmoNumber}
                      onChange={(e) => setHmoNumber(e.target.value)}
                      placeholder="e.g. NHIA/2026/9021"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono-code font-bold text-slate-800"
                    />
                  </div>
                )}

                {/* Feature 2: Inpatient Admission Initial Deposit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Initial Admission Deposit to Wallet (₦)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={initialDeposit}
                    onChange={(e) => setInitialDeposit(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono-code font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Leave as 0 for outpatient, or pre-fund for ward admissions.
                  </p>
                </div>

                {/* Patient Notes & Allergies Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Patient Notes / Allergy Memo (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Allergic to penicillin, Asthmatic, Diabetic on Metformin..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Saved to patient card registry and prominently visible to Doctors and Pharmacists.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Check className="w-5 h-5" />
                  Save Patient & Generate QR Sticker
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: BIG QR Code, Card Details & Sticker Print */}
        <div className="lg:col-span-7 space-y-6">
          {selectedPatient ? (
            <div className="space-y-6">
              {/* BIG QR Code Display Card */}
              <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500/40 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* BIG QR Code */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-md flex flex-col items-center">
                    <QRCodeSVG
                      value={selectedPatient.card_no}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                    <div className="mt-2 text-center">
                      <span className="text-[11px] font-mono-code font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                        {selectedPatient.card_no}
                      </span>
                    </div>
                  </div>

                  {/* Patient Info & Print Sticker Action */}
                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-extrabold uppercase">
                        Physical Card Registered
                      </span>
                      {/* HMO badge */}
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-extrabold">
                        {selectedPatient.hmo_type}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">
                        {selectedPatient.name}
                      </h3>
                      <div className="text-sm text-slate-600 flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                        <span className="font-mono-code font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          CARD #{selectedPatient.card_no}
                        </span>
                        <span>·</span>
                        <span>{selectedPatient.gender}, {selectedPatient.age} yrs</span>
                        {selectedPatient.blood_group && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-rose-600">Blood: {selectedPatient.blood_group}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Feature 2: Inpatient Wallet Banner */}
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5" /> Admission Deposit Wallet
                        </div>
                        <div className="text-lg font-mono-code font-black text-emerald-700">
                          ₦{(selectedPatient.wallet_balance || 0).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowWalletModal(true)}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Top-Up Wallet
                      </button>
                    </div>

                    {/* Quick HMO switcher */}
                    <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-1.5 text-[11px]">
                      <span className="text-slate-500 font-medium">HMO Scheme:</span>
                      {(['Private / Self-Pay (100%)', 'NHIA Standard (10% Co-pay)', 'State Health Scheme (0% Co-pay)'] as HMOType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => handleUpdateHmo(t)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            selectedPatient.hmo_type === t
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {t.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    {/* Print QR Sticker Button */}
                    <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
                      <button
                        onClick={() => setShowStickerModal(true)}
                        className="py-3 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md hover:scale-[1.01]"
                      >
                        <Printer className="w-4 h-4 text-emerald-400" />
                        Print QR Sticker for this card (58mm)
                      </button>
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

              {/* Patient Bills Overview */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-base text-slate-900">
                      All Bills for Card #{selectedPatient.card_no}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {patientBills.length} Bill Item(s)
                  </span>
                </div>

                {patientBills.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No hospital charges posted yet for this card. Staff in Doctor/Lab can post new bills.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {patientBills.map((b) => (
                      <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-sm text-slate-900">{b.item_name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-medium text-slate-700">{b.department}</span>
                            <span>·</span>
                            <span>{new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {b.hmo_share > 0 && (
                              <span className="text-blue-600 font-semibold">
                                (HMO covers ₦{b.hmo_share.toLocaleString()})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono-code font-bold text-sm text-slate-900">
                            ₦{(b.patient_share !== undefined ? b.patient_share : b.amount).toLocaleString()}
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              b.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {b.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-800 mb-1">No Patient Loaded</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                Search an existing physical card number or register a new patient to view profile and print thermal QR stickers.
              </p>
              <button
                onClick={() => handleSearch('12489')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors"
              >
                Load Sample Card #12489
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 58mm Sticker Print Modal */}
      <StickerPrintModal
        isOpen={showStickerModal}
        onClose={() => setShowStickerModal(false)}
        patient={selectedPatient}
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
    </div>
  );
};

