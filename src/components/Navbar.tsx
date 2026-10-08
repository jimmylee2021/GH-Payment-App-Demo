import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  Stethoscope, 
  Wallet, 
  CheckCircle2, 
  Share2, 
  RotateCcw,
  Activity,
  Layers,
  LogOut,
  User,
  Shield,
  CreditCard
} from 'lucide-react';
import { resetToDemoData, getStoredPatients } from '../services/store';
import { AuthUser, UserRole } from '../types';
import { canAccessStation } from '../services/auth';
import { OfflineSyncBadge } from './OfflineSyncBadge';

export type ActiveStation = 'dashboard' | 'records' | 'doctor' | 'revenue' | 'verify' | 'pay' | 'patient_portal';

interface NavbarProps {
  currentStation: ActiveStation;
  onNavigate: (station: ActiveStation, cardNo?: string) => void;
  selectedCardNo?: string;
  currentUser: AuthUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStation,
  onNavigate,
  selectedCardNo,
  currentUser,
  onLogout,
}) => {
  const [pulse, setPulse] = useState(false);
  const [patients, setPatients] = useState(getStoredPatients());

  useEffect(() => {
    const handleSync = () => {
      setPulse(true);
      setPatients(getStoredPatients());
      setTimeout(() => setPulse(false), 800);
    };

    window.addEventListener('gh_pay_change', handleSync);
    return () => window.removeEventListener('gh_pay_change', handleSync);
  }, []);

  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleResetData = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      setTimeout(() => setConfirmingReset(false), 4000);
      return;
    }
    resetToDemoData();
    setConfirmingReset(false);
  };

  // Station definitions
  const allNavItems: { id: ActiveStation; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers, desc: 'Overview & Stats' },
    { id: 'records', label: '1. Records', icon: FileText, desc: 'Cards & QR Stickers' },
    { id: 'doctor', label: '2. Doctor / Lab', icon: Stethoscope, desc: 'Post Bills' },
    { id: 'revenue', label: '3. Accounts', icon: Wallet, desc: 'Collect & Receipt' },
    { id: 'verify', label: '4. Pharmacy / Verify', icon: CheckCircle2, desc: 'Dispense Clearance' },
    { id: 'patient_portal', label: 'My Patient Portal', icon: CreditCard, desc: 'Self-Service' },
    { id: 'pay', label: 'Family Pay Link', icon: Share2, desc: 'Public Link' },
  ];

  // Filter items based on logged-in user role
  const visibleNavItems = allNavItems.filter((item) => {
    if (!currentUser) return true;
    return canAccessStation(currentUser.role, item.id);
  });

  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'doctor': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'cashier': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'records': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'patient': return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <>
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        {/* Top hospital bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Logo */}
            <div 
              onClick={() => {
                if (currentUser?.role === 'patient') onNavigate('patient_portal', currentUser.card_no);
                else onNavigate('dashboard');
              }} 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white text-base sm:text-xl shadow-lg shadow-emerald-900/30">
                GH
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                    GH PAY
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                    HOSPITAL
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                  Role-Controlled Seamless Gateway
                </p>
              </div>
            </div>

            {/* User Profile & Session Bar */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Live Service Worker & Supabase Sync Badge */}
              <OfflineSyncBadge />

              {/* Current Logged-in User Profile */}
              {currentUser && (
                <div className="flex items-center gap-1.5 sm:gap-2.5 bg-slate-800 border border-slate-700 p-1 sm:pr-3 rounded-xl sm:rounded-2xl">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {currentUser.role === 'patient' ? <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />}
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[120px] lg:max-w-[150px]">
                        {currentUser.name}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeColor(currentUser.role)}`}>
                        {currentUser.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px] lg:max-w-[170px]">
                      {currentUser.stationTitle}
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    onClick={onLogout}
                    title="Switch Role or Log Out"
                    className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}

              {/* Reset Demo Data button for Admin */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={handleResetData}
                  title={confirmingReset ? 'Click again to confirm database reset' : 'Reset sample hospital database'}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1 text-xs ${
                    confirmingReset 
                      ? 'bg-rose-600/90 text-white font-bold px-2' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {confirmingReset && <span className="text-[10px]">Confirm?</span>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Role-Restricted Hospital Station Tab Navigation (Scrollable row) */}
        <div className="bg-slate-950/90 border-t border-slate-800/80 px-2 sm:px-6 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center gap-1 py-1.5 min-w-max">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentStation === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id, selectedCardNo)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Floating Bottom Bar for Mobile Devices (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1.5 py-1 shadow-2xl no-print">
        <div className="grid grid-flow-col auto-cols-fr gap-1 items-center max-w-lg mx-auto">
          {visibleNavItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = currentStation === item.id;
            // Clean mobile label (strip number prefix like "1. ")
            const shortLabel = item.label.replace(/^\d+\.\s*/, '');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id, selectedCardNo)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-emerald-400 bg-emerald-950/70 font-bold'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="text-[10px] leading-tight truncate w-full text-center">
                  {shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
