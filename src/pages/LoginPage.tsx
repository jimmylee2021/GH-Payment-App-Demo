import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  Lock, 
  Stethoscope, 
  Wallet, 
  FileText, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  UserCheck,
  Sparkles,
  Check
} from 'lucide-react';
import { loginPatient, loginStaff, STAFF_ACCOUNTS } from '../services/auth';
import { getStoredPatients } from '../services/store';
import { AuthUser, UserRole } from '../types';
import { playAudio } from '../services/sound';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
  onOpenPublicPay?: (cardNo?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenPublicPay }) => {
  const [activeGateway, setActiveGateway] = useState<'patient' | 'staff'>('staff');

  // Gateway A: Patient Form
  const [patientCardNo, setPatientCardNo] = useState('');
  const [patientError, setPatientError] = useState<string | null>(null);

  // Gateway B: Staff Form
  const [staffEmail, setStaffEmail] = useState('admin@ghpay.hospital');
  const [staffPin, setStaffPin] = useState('1234');
  const [staffError, setStaffError] = useState<string | null>(null);

  const samplePatients = getStoredPatients();

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPatientError(null);
    const res = loginPatient(patientCardNo);
    if (res.success && res.user) {
      playAudio.successChime();
      onLoginSuccess(res.user);
    } else {
      playAudio.alertTone();
      setPatientError(res.error || 'Failed to login with card number.');
    }
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    const res = loginStaff(staffEmail, staffPin);
    if (res.success && res.user) {
      playAudio.successChime();
      onLoginSuccess(res.user);
    } else {
      playAudio.alertTone();
      setStaffError(res.error || 'Failed to login.');
    }
  };

  const handleQuickPatientLogin = (card_no: string) => {
    const res = loginPatient(card_no);
    if (res.success && res.user) {
      playAudio.successChime();
      onLoginSuccess(res.user);
    }
  };

  const handleQuickStaffLogin = (email: string) => {
    setStaffEmail(email);
    setStaffPin('1234');
    const res = loginStaff(email, '1234');
    if (res.success && res.user) {
      playAudio.successChime();
      onLoginSuccess(res.user);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 mx-auto flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-emerald-950/60 border border-emerald-400/30">
          GH
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          GH PAY GATEWAY
        </h1>
        <p className="text-xs text-slate-400">
          General Hospital Seamless Authentication & Role Access Control
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Dual Gateway Selector Tabs */}
          <div className="grid grid-cols-2 p-2 bg-slate-950/80 border-b border-slate-800">
            <button
              onClick={() => setActiveGateway('staff')}
              className={`py-3 text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all ${
                activeGateway === 'staff'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Hospital Staff & Admin</span>
            </button>
            <button
              onClick={() => setActiveGateway('patient')}
              className={`py-3 text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all ${
                activeGateway === 'patient'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Patient & Family Portal</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* GATEWAY A: HOSPITAL STAFF / CLINICIANS / ADMIN */}
            {activeGateway === 'staff' ? (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Clinical & Staff Workstation Sign In
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select your clinical role or enter hospital credentials
                  </p>
                </div>

                {staffError && (
                  <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{staffError}</span>
                  </div>
                )}

                {/* 1-Click Demo Staff Role Badges for Instant Evaluation */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    1-Click Staff Roles (Instant Demo Access):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {STAFF_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.role}
                        type="button"
                        onClick={() => handleQuickStaffLogin(acc.email)}
                        className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between ${
                          staffEmail === acc.email
                            ? 'bg-slate-800 border-emerald-500 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white capitalize">{acc.role}</span>
                          <span className="text-[10px] font-mono-code font-bold bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded">
                            LOGIN
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-semibold truncate mt-1">
                          {acc.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {acc.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Form */}
                <form onSubmit={handleStaffSubmit} className="space-y-4 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Staff Email / ID
                    </label>
                    <input
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="e.g. doctor@ghpay.hospital"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      4-Digit Staff PIN (Demo PIN: 1234)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={staffPin}
                      onChange={(e) => setStaffPin(e.target.value)}
                      placeholder="••••"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl font-mono-code text-sm font-bold text-white focus:outline-none focus:border-emerald-500 tracking-widest text-center"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform shadow-lg active:scale-98"
                  >
                    <span>Sign In to Hospital Workstation</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              /* GATEWAY B: PATIENT & FAMILY PORTAL */
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    Patient & Family Card Access
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Log in using your existing physical hospital card number (e.g. 12489, GH/2023/7890)
                  </p>
                </div>

                {patientError && (
                  <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{patientError}</span>
                  </div>
                )}

                {/* Quick Patient Cards for Instant Testing */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Quick Sample Patient Cards:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {samplePatients.slice(0, 3).map((p) => (
                      <button
                        key={p.card_no}
                        type="button"
                        onClick={() => handleQuickPatientLogin(p.card_no)}
                        className="p-3 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 rounded-xl text-left transition-all"
                      >
                        <div className="text-xs font-mono-code font-bold text-emerald-400">
                          #{p.card_no}
                        </div>
                        <div className="text-xs font-bold text-white truncate mt-0.5">
                          {p.name.split(' ')[0]}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {p.hmo_type.split(' ')[0]}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Patient Form */}
                <form onSubmit={handlePatientSubmit} className="space-y-4 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Physical Hospital Card Number
                    </label>
                    <input
                      type="text"
                      value={patientCardNo}
                      onChange={(e) => setPatientCardNo(e.target.value)}
                      placeholder="e.g. 12489, 023411, GH/2023/7890"
                      className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-800 focus:border-emerald-500 rounded-xl font-mono-code text-base font-bold text-white focus:outline-none"
                      required
                      autoFocus
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Works with any card number format stamped on physical hospital cards.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform shadow-lg active:scale-98"
                  >
                    <span>Access My Patient Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {onOpenPublicPay && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => onOpenPublicPay(patientCardNo.trim() || '12489')}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline transition-colors"
                      >
                        Sponsoring from home? Open Public Family Pay Link (No Login Required) →
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Global Public Pay Banner for External Relatives */}
        {onOpenPublicPay && (
          <div className="mt-4 p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
            <span>Are you a relative paying bills remotely?</span>
            <button
              onClick={() => onOpenPublicPay('12489')}
              className="text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors"
            >
              Public Family Pay Link →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
