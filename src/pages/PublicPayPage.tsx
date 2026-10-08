import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Share2, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Building2, 
  Phone, 
  Calendar, 
  Receipt,
  MessageCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  findPatient, 
  getPatientBills, 
  payBillsForCard, 
  subscribeToStore 
} from '../services/store';
import { Patient, BillItem } from '../types';
import { PaystackModal } from '../components/PaystackModal';
import { playAudio } from '../services/sound';

interface PublicPayPageProps {
  initialCardNo?: string;
  onNavigateHome?: () => void;
}

export const PublicPayPage: React.FC<PublicPayPageProps> = ({
  initialCardNo = '12489',
  onNavigateHome,
}) => {
  const [cardNoInput, setCardNoInput] = useState(initialCardNo);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [paidSuccessReceipt, setPaidSuccessReceipt] = useState<string | null>(null);

  useEffect(() => {
    loadPatientData(cardNoInput);
  }, [cardNoInput]);

  useEffect(() => {
    const unsubscribe = subscribeToStore(() => {
      if (patient) {
        setBills(getPatientBills(patient.card_no));
      }
    });
    return unsubscribe;
  }, [patient]);

  const loadPatientData = (card: string) => {
    if (!card.trim()) return;
    const found = findPatient(card);
    if (found) {
      setPatient(found);
      setBills(getPatientBills(found.card_no));
    } else {
      setPatient(null);
      setBills([]);
    }
  };

  const pendingBills = bills.filter((b) => b.status === 'pending');
  const paidBills = bills.filter((b) => b.status === 'paid');
  const totalPending = pendingBills.reduce((acc, curr) => acc + (curr.patient_share !== undefined ? curr.patient_share : curr.amount), 0);
  const totalHmoDiscount = pendingBills.reduce((acc, curr) => acc + (curr.hmo_share || 0), 0);

  const getFullShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/pay/${encodeURIComponent(patient?.card_no || cardNoInput)}`;
  };

  const handleCopyLink = () => {
    const url = getFullShareUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!patient) return;
    const url = getFullShareUrl();
    // Prompt specification: WhatsApp share "Pay for patient 12489: yourapp.com/pay/12489"
    const text = `Pay for patient ${patient.card_no} (${patient.name}): ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePaystackSuccess = (ref: string) => {
    if (!patient) return;
    const result = payBillsForCard(patient.card_no, 'Paystack', 'Public Family Pay Portal');
    if (result.success) {
      playAudio.successChime();
      setPaidSuccessReceipt(result.receiptNo);
      setBills(getPatientBills(patient.card_no));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4 sm:px-6 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Public Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            Official Hospital Patient Pay Link
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            General Hospital Pay Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Sponsor or family member direct payment for hospital bill clearance
          </p>
        </div>

        {/* Card Number Switcher / Search for testing */}
        <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-mono-code">
            <span className="text-slate-400">Viewing Card:</span>
            <input
              type="text"
              value={cardNoInput}
              onChange={(e) => setCardNoInput(e.target.value)}
              placeholder="e.g. 12489"
              className="bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-white font-bold w-36 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Quick Samples:</span>
            {['12489', '023411', 'GH/2023/7890'].map((c) => (
              <button
                key={c}
                onClick={() => setCardNoInput(c)}
                className={`px-2 py-0.5 rounded font-mono-code text-[11px] font-bold ${
                  cardNoInput === c
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                #{c}
              </button>
            ))}
          </div>
        </div>

        {patient ? (
          <div className="space-y-6">
            {/* Payment Cleared Banner if all paid */}
            {totalPending === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-emerald-500 shadow-xl text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    ALL CHARGES SETTLED
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-2">
                    Patient Bills Fully Cleared!
                  </h2>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1">
                    No pending hospital balance for <strong>{patient.name}</strong> (Card #{patient.card_no}).
                    Medications and laboratory investigations are cleared for immediate dispensation.
                  </p>
                </div>

                {paidSuccessReceipt && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono-code text-slate-700">
                    Payment Reference / Receipt: <strong>{paidSuccessReceipt}</strong>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleCopyLink}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition-colors"
                  >
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Link Copied!' : 'Copy Link for Patient Records'}
                  </button>
                </div>
              </div>
            ) : (
              /* Invoice Card with Paystack Checkout Button */
              <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
                {/* Invoice Top Stripe */}
                <div className="bg-emerald-700 text-white p-6 sm:p-8 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                      Hospital Invoice
                    </span>
                    <span className="font-mono-code font-bold text-xs bg-emerald-900/60 text-emerald-200 px-3 py-1 rounded-full border border-emerald-500/40">
                      Card #{patient.card_no}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">{patient.name}</h2>
                    <div className="text-xs text-emerald-100 mt-0.5">
                      {patient.gender}, {patient.age} yrs · Tel: {patient.phone}
                    </div>
                  </div>

                  {/* Big Pending Total */}
                  <div className="pt-4 border-t border-emerald-600/80 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
                      Total Outstanding Balance
                    </span>
                    <span className="text-3xl sm:text-4xl font-black font-mono-code text-white">
                      ₦{totalPending.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Itemized List */}
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                      Pending Clinical & Pharmacy Items ({pendingBills.length})
                    </h3>
                    <div className="divide-y divide-slate-100 border-y border-slate-100">
                      {pendingBills.map((b) => (
                        <div key={b.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm text-slate-900">{b.item_name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <span className="text-emerald-700 font-medium">[{b.department}]</span>
                              <span>·</span>
                              <span>{new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {b.hmo_share > 0 && (
                                <span className="text-blue-600 font-semibold">(NHIA covers ₦{b.hmo_share.toLocaleString()})</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono-code font-bold text-base text-slate-900">
                              ₦{(b.patient_share !== undefined ? b.patient_share : b.amount).toLocaleString()}
                            </div>
                            {b.hmo_share > 0 && (
                              <div className="text-[10px] text-slate-400 line-through">
                                Gross ₦{b.amount.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Paystack Inline Button (Prompt requirement) */}
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowPaystackModal(true)}
                      className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-transform shadow-xl active:scale-98"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>Pay ₦{totalPending.toLocaleString()} with Paystack</span>
                    </button>
                    <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Secured by Paystack · Accepts Debit Card, Bank Transfer & USSD
                    </p>
                  </div>

                  {/* Share buttons (WhatsApp Share & Copy Link) */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
                      Share Payment Link with Family
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* WhatsApp Share button */}
                      <button
                        onClick={handleWhatsAppShare}
                        className="py-3 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>Share on WhatsApp</span>
                      </button>

                      {/* Copy Link button */}
                      <button
                        onClick={handleCopyLink}
                        className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Payment Link'}</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-mono-code text-slate-600 truncate text-center">
                      {getFullShareUrl()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-3xl p-12 text-center text-slate-400 border border-slate-700 space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto text-amber-400" />
            <h3 className="font-bold text-lg text-white">Card Not Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No hospital record was found for physical card "#{cardNoInput}". Please check the number stamped on the patient's card.
            </p>
          </div>
        )}

        {/* Back to hospital station link */}
        {onNavigateHome && (
          <div className="text-center pt-4">
            <button
              onClick={onNavigateHome}
              className="text-xs text-slate-400 hover:text-white transition-colors underline"
            >
              ← Return to GH Pay Hospital Staff Terminals
            </button>
          </div>
        )}
      </div>

      {/* Paystack Inline Simulation Modal */}
      {patient && (
        <PaystackModal
          isOpen={showPaystackModal}
          onClose={() => setShowPaystackModal(false)}
          amount={totalPending}
          cardNo={patient.card_no}
          patientName={patient.name}
          onSuccess={handlePaystackSuccess}
        />
      )}
    </div>
  );
};
