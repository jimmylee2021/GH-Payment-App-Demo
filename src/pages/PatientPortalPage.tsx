import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  CreditCard, 
  Wallet, 
  ShieldCheck, 
  Receipt, 
  Clock, 
  CheckCircle2, 
  Share2, 
  Printer, 
  Plus, 
  MessageCircle, 
  AlertCircle,
  Copy,
  Sparkles,
  PackageCheck
} from 'lucide-react';
import { 
  getPatientByCard, 
  getPatientBills, 
  payBillsViaWallet, 
  subscribeToStore 
} from '../services/store';
import { Patient, BillItem } from '../types';
import { PaystackModal } from '../components/PaystackModal';
import { WalletTopupModal } from '../components/WalletTopupModal';
import { StickerPrintModal } from '../components/StickerPrintModal';
import { playAudio } from '../services/sound';

interface PatientPortalPageProps {
  cardNo: string;
}

export const PatientPortalPage: React.FC<PatientPortalPageProps> = ({ cardNo }) => {
  const [patient, setPatient] = useState<Patient | null>(getPatientByCard(cardNo));
  const [bills, setBills] = useState<BillItem[]>(getPatientBills(cardNo));
  
  // Modals
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showStickerModal, setShowStickerModal] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setPatient(getPatientByCard(cardNo));
      setBills(getPatientBills(cardNo));
    };

    const unsubscribe = subscribeToStore(refresh);
    return unsubscribe;
  }, [cardNo]);

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-500">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Patient Record Not Found</h2>
        <p className="text-sm text-slate-600 mt-1">
          Could not locate card #{cardNo}. Please re-login with your valid physical hospital card.
        </p>
      </div>
    );
  }

  const pendingBills = bills.filter(b => b.status === 'pending');
  const paidBills = bills.filter(b => b.status === 'paid');

  const totalPatientPayable = pendingBills.reduce((acc, curr) => acc + (curr.patient_share !== undefined ? curr.patient_share : curr.amount), 0);
  const totalHmoCovered = pendingBills.reduce((acc, curr) => acc + (curr.hmo_share || 0), 0);

  const handlePayViaWallet = () => {
    setWalletError(null);
    const res = payBillsViaWallet(patient.card_no, 'Patient Portal Self-Checkout');
    if (res.success) {
      playAudio.successChime();
      setPatient(getPatientByCard(cardNo));
      setBills(getPatientBills(cardNo));
    } else {
      playAudio.alertTone();
      setWalletError(res.error || 'Failed to pay via wallet.');
    }
  };

  const getFullShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/pay/${encodeURIComponent(patient.card_no)}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getFullShareUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = `Hospital bill payment for ${patient.name} (Card #${patient.card_no}): ${getFullShareUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Patient Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-[11px] font-bold tracking-wider uppercase text-emerald-200">
              Personal Patient Portal
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold text-emerald-100">
              {patient.hmo_type}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome, {patient.name}
          </h1>

          <div className="text-xs sm:text-sm text-emerald-100 flex flex-wrap items-center gap-2">
            <span>Physical Card #{patient.card_no}</span>
            <span>·</span>
            <span>{patient.gender}, {patient.age} yrs</span>
            <span>·</span>
            <span>Tel: {patient.phone}</span>
          </div>

          {patient.notes && (
            <div className="mt-3 p-3 bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl text-xs text-white flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
              <div>
                <span className="font-black text-amber-200 uppercase text-[10px] tracking-wider mr-1.5 bg-amber-900/40 px-1.5 py-0.5 rounded">
                  Clinical Alert / File Memo:
                </span>
                <span className="font-bold text-emerald-50">{patient.notes}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action button to view digital sticker */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStickerModal(true)}
            className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/20 transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>58mm Card QR Sticker</span>
          </button>
        </div>
      </div>

      {/* Grid: Wallet & Settlement Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Wallet & Outstanding Balance */}
        <div className="lg:col-span-5 space-y-6">
          {/* Admission Wallet Card */}
          <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Admission Deposit Wallet
              </span>
              <span className="text-[10px] font-mono-code font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                CARD #{patient.card_no}
              </span>
            </div>

            <div>
              <div className="text-3xl font-black font-mono-code text-slate-900">
                ₦{(patient.wallet_balance || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Pre-funded balance automatically covers lab orders, medicines, and consultation.
              </p>
            </div>

            <button
              onClick={() => setShowWalletModal(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Top-Up Admission Wallet</span>
            </button>
          </div>

          {/* Outstanding Invoice Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pending Charges Due
              </span>
              <span className="text-xs font-bold font-mono-code text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                {pendingBills.length} Item(s)
              </span>
            </div>

            <div>
              <div className="text-3xl font-black font-mono-code text-rose-600">
                ₦{totalPatientPayable.toLocaleString()}
              </div>
              {totalHmoCovered > 0 && (
                <div className="text-xs text-blue-700 font-semibold mt-1">
                  ✓ {patient.hmo_type} covers ₦{totalHmoCovered.toLocaleString()}
                </div>
              )}
            </div>

            {walletError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{walletError}</span>
              </div>
            )}

            {totalPatientPayable > 0 ? (
              <div className="space-y-2.5 pt-2">
                {/* 1. Pay with Paystack */}
                <button
                  onClick={() => setShowPaystackModal(true)}
                  className="w-full py-3.5 bg-[#001428] hover:bg-[#002244] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform shadow-md active:scale-98"
                >
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>Pay ₦{totalPatientPayable.toLocaleString()} via Paystack</span>
                </button>

                {/* 2. Deduct from Wallet if balance is enough */}
                {(patient.wallet_balance || 0) >= totalPatientPayable && (
                  <button
                    onClick={handlePayViaWallet}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Deduct from My Wallet (₦{(patient.wallet_balance || 0).toLocaleString()} available)</span>
                  </button>
                )}

                {/* 3. Share with family on WhatsApp */}
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex-1 py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>WhatsApp Sponsor</span>
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Pay Link'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All charges are settled. You are cleared for Pharmacy and Lab!</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bills Breakdown & Dispensing Clearance */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Pending Items Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Pending Charges Awaiting Payment
              </h3>
              <span className="text-xs text-slate-500 font-mono-code">{pendingBills.length} Items</span>
            </div>

            {pendingBills.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No unpaid items. You have zero pending hospital charges!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingBills.map(b => (
                  <div key={b.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{b.item_name}</div>
                      <div className="text-xs text-slate-500">
                        [{b.department}] · {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {b.hmo_share > 0 && (
                          <span className="text-blue-600 ml-1.5 font-semibold">
                            (NHIA covers ₦{b.hmo_share.toLocaleString()})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-code font-bold text-sm text-slate-900">
                        ₦{(b.patient_share !== undefined ? b.patient_share : b.amount).toLocaleString()}
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        UNPAID
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cleared & Paid Receipts History */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                Paid Medical Items & Pharmacy Dispense Status
              </h3>
              <span className="text-xs text-slate-500 font-mono-code">{paidBills.length} Paid</span>
            </div>

            {paidBills.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No past settled charges on record for this card yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {paidBills.map(b => (
                  <div key={b.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{b.item_name}</div>
                      <div className="text-xs text-slate-500">
                        [{b.department}] · {b.receipt_no || 'OFFICIAL RECEIPT'} · {b.payment_method || 'Verified'}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-mono-code font-bold text-sm text-emerald-700">
                        ₦{(b.patient_share !== undefined ? b.patient_share : b.amount).toLocaleString()}
                      </div>
                      {b.dispensed ? (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          DISPENSED TO PATIENT
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded animate-pulse">
                          CLEARANCE GRANTED
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 58mm Sticker Modal */}
      <StickerPrintModal
        isOpen={showStickerModal}
        onClose={() => setShowStickerModal(false)}
        patient={patient}
      />

      {/* Admission Wallet Top-up Modal */}
      <WalletTopupModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        patient={patient}
        onSuccess={() => {
          setPatient(getPatientByCard(cardNo));
        }}
      />

      {/* Paystack Inline Simulation Modal */}
      <PaystackModal
        isOpen={showPaystackModal}
        onClose={() => setShowPaystackModal(false)}
        amount={totalPatientPayable}
        cardNo={patient.card_no}
        patientName={patient.name}
        onSuccess={() => {
          setPatient(getPatientByCard(cardNo));
          setBills(getPatientBills(cardNo));
        }}
      />
    </div>
  );
};
