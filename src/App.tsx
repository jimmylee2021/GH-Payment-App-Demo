/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveStation } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RecordsPage } from './pages/RecordsPage';
import { DoctorPage } from './pages/DoctorPage';
import { RevenuePage } from './pages/RevenuePage';
import { VerifyPage } from './pages/VerifyPage';
import { PublicPayPage } from './pages/PublicPayPage';
import { PatientPortalPage } from './pages/PatientPortalPage';
import { 
  getStoredUser, 
  logout, 
  canAccessStation, 
  getDefaultStationForRole 
} from './services/auth';
import { AuthUser } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser());
  const [station, setStation] = useState<ActiveStation>(() => {
    const user = getStoredUser();
    if (!user) return 'dashboard';
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (path.startsWith('/records') && canAccessStation(user.role, 'records')) return 'records';
    if (path.startsWith('/doctor') && canAccessStation(user.role, 'doctor')) return 'doctor';
    if (path.startsWith('/revenue') && canAccessStation(user.role, 'revenue')) return 'revenue';
    if (path.startsWith('/verify') && canAccessStation(user.role, 'verify')) return 'verify';
    if (path.startsWith('/patient') && canAccessStation(user.role, 'patient_portal')) return 'patient_portal';
    return (getDefaultStationForRole(user.role) as ActiveStation) || 'dashboard';
  });
  const [selectedCardNo, setSelectedCardNo] = useState<string>('12489');
  const [isPublicPayMode, setIsPublicPayMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/pay');
    }
    return false;
  });

  // Initialize station based on user role or URL
  useEffect(() => {
    const path = window.location.pathname;

    if (path.startsWith('/pay')) {
      const card = decodeURIComponent(path.replace(/^\/pay\/?/, '')).trim();
      if (card) setSelectedCardNo(card);
      setIsPublicPayMode(true);
      return;
    }

    if (!currentUser) {
      setIsPublicPayMode(false);
      return;
    }

    let targetStation: ActiveStation = (getDefaultStationForRole(currentUser.role) as ActiveStation);

    if (path.startsWith('/records')) targetStation = 'records';
    else if (path.startsWith('/doctor')) targetStation = 'doctor';
    else if (path.startsWith('/revenue')) targetStation = 'revenue';
    else if (path.startsWith('/verify')) targetStation = 'verify';
    else if (path.startsWith('/patient')) targetStation = 'patient_portal';

    // Role-based guarding
    if (canAccessStation(currentUser.role, targetStation)) {
      setStation(targetStation);
    } else {
      setStation(getDefaultStationForRole(currentUser.role) as ActiveStation);
    }
    setIsPublicPayMode(false);
  }, [currentUser]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsPublicPayMode(false);
    if (user.card_no) {
      setSelectedCardNo(user.card_no);
    }
    const defaultStation = getDefaultStationForRole(user.role) as ActiveStation;
    setStation(defaultStation);
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setIsPublicPayMode(false);
  };

  const handleOpenPublicPay = (cardNo: string = '12489') => {
    setSelectedCardNo(cardNo);
    setIsPublicPayMode(true);
    try {
      window.history.pushState({}, '', `/pay/${encodeURIComponent(cardNo)}`);
    } catch {
      // ignore
    }
  };

  const handleNavigate = (nextStation: ActiveStation, cardNo?: string) => {
    if (nextStation === 'pay') {
      handleOpenPublicPay(cardNo || selectedCardNo);
      return;
    }

    if (!currentUser) {
      setIsPublicPayMode(false);
      return;
    }

    // Check permission
    if (!canAccessStation(currentUser.role, nextStation)) {
      return;
    }

    setIsPublicPayMode(false);
    setStation(nextStation);
    if (cardNo) {
      setSelectedCardNo(cardNo);
    }

    let newPath = '/';
    if (nextStation === 'records') newPath = '/records';
    else if (nextStation === 'doctor') newPath = '/doctor';
    else if (nextStation === 'revenue') newPath = '/revenue';
    else if (nextStation === 'verify') newPath = '/verify';
    else if (nextStation === 'patient_portal') newPath = '/patient';

    try {
      window.history.pushState({}, '', newPath);
    } catch {
      // ignore
    }
  };

  // If in public family pay mode (works for both unauthenticated visitors and logged-in users)
  if (isPublicPayMode) {
    return (
      <PublicPayPage
        initialCardNo={selectedCardNo}
        onNavigateHome={() => {
          setIsPublicPayMode(false);
          try {
            window.history.pushState({}, '', '/');
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  // If not logged in, show the Hospital Login Gateway
  if (!currentUser) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess} 
        onOpenPublicPay={handleOpenPublicPay}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Role-adaptive Station Navbar */}
      <Navbar
        currentStation={station}
        onNavigate={handleNavigate}
        selectedCardNo={selectedCardNo}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Workstation View guarded by User Role */}
      <main className="flex-1 pb-16 md:pb-6">
        {station === 'dashboard' && canAccessStation(currentUser.role, 'dashboard') && (
          <DashboardPage onNavigate={handleNavigate} />
        )}

        {station === 'patient_portal' && (
          <PatientPortalPage cardNo={currentUser.card_no || selectedCardNo} />
        )}

        {station === 'records' && canAccessStation(currentUser.role, 'records') && (
          <RecordsPage
            initialCardNo={selectedCardNo}
            onSelectPatientForStation={(card) => setSelectedCardNo(card)}
          />
        )}

        {station === 'doctor' && canAccessStation(currentUser.role, 'doctor') && (
          <DoctorPage
            initialCardNo={selectedCardNo}
            onNavigateToAccounts={(card) => handleNavigate('revenue', card)}
          />
        )}

        {station === 'revenue' && canAccessStation(currentUser.role, 'revenue') && (
          <RevenuePage
            initialCardNo={selectedCardNo}
            onNavigateToVerify={(card) => handleNavigate('verify', card)}
          />
        )}

        {station === 'verify' && canAccessStation(currentUser.role, 'verify') && (
          <VerifyPage
            initialCardNo={selectedCardNo}
            onNavigateToPay={(card) => handleNavigate('pay', card)}
          />
        )}

        {station === 'pay' && (
          <PublicPayPage
            initialCardNo={selectedCardNo}
            onNavigateHome={() => handleNavigate(getDefaultStationForRole(currentUser.role) as ActiveStation)}
          />
        )}

        {/* Fallback for unauthorized station navigation */}
        {!canAccessStation(currentUser.role, station) && station !== 'patient_portal' && station !== 'pay' && (
          <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
              🔒
            </div>
            <h2 className="text-lg font-bold text-slate-800">Station Access Restricted</h2>
            <p className="text-xs text-slate-500">
              Your role ({currentUser.role}) does not have permission to access the "{station}" station.
            </p>
            <button
              onClick={() => handleNavigate(getDefaultStationForRole(currentUser.role) as ActiveStation)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Go to My Station ({currentUser.stationTitle})
            </button>
          </div>
        )}
      </main>

      {/* Hospital Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 px-4 border-t border-slate-800 text-xs text-center no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">GH PAY</span>
            <span>·</span>
            <span>Hospital Role-Based Payment Terminal</span>
          </div>
          <div className="text-slate-500 font-mono-code">
            Active Session: <span className="text-slate-300 font-bold">{currentUser.name}</span> ({currentUser.stationTitle})
          </div>
        </div>
      </footer>
    </div>
  );
}
