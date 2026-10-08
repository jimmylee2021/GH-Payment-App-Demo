import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Wallet, 
  Clock, 
  Users, 
  Receipt, 
  CheckCircle2, 
  FileText, 
  Stethoscope, 
  Share2, 
  ArrowUpRight,
  Sparkles,
  Search,
  Activity,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { 
  getStats, 
  getStoredBills, 
  getStoredPatients, 
  subscribeToStore 
} from '../services/store';
import { StationStats, BillItem, Patient } from '../types';
import { ActiveStation } from '../components/Navbar';

interface DashboardPageProps {
  onNavigate: (station: ActiveStation, cardNo?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<StationStats>(getStats());
  const [bills, setBills] = useState<BillItem[]>(getStoredBills());
  const [patients, setPatients] = useState<Patient[]>(getStoredPatients());
  const [quickSearch, setQuickSearch] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToStore(() => {
      setStats(getStats());
      setBills(getStoredBills());
      setPatients(getStoredPatients());
    });
    return unsubscribe;
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      onNavigate('revenue', quickSearch.trim());
    }
  };

  // Department revenue breakdown
  const deptBreakdown: Record<string, { count: number; total: number }> = {};
  bills.forEach((b) => {
    if (!deptBreakdown[b.department]) {
      deptBreakdown[b.department] = { count: 0, total: 0 };
    }
    deptBreakdown[b.department].count += 1;
    deptBreakdown[b.department].total += b.amount;
  });

  const recentBills = bills.slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hospital Banner & System Concept */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Seamless Hospital Payment Architecture
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            GH Pay System
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            <strong>POST EVERYWHERE, PAY ONCE, VERIFY EVERYWHERE.</strong> Operates directly on the hospital's existing physical cards (e.g. 12489, GH/2023/7890, 023411) with no new number generation. Stick 58mm thermal QR stickers on physical cards for instant tablet scanning across all clinical desks.
          </p>

          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Jump to Card (e.g. 12489)..."
                className="w-full pl-10 pr-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl font-mono-code text-sm font-bold text-white placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors shrink-0 shadow-md"
            >
              Open Card
            </button>
          </form>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Revenue Today */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Revenue Today</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono-code text-slate-900">
              ₦{stats.totalRevenueToday.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{stats.paidBillsCount} bills collected & cleared</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('revenue')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center justify-between w-full pt-2 border-t border-slate-100 transition-colors cursor-pointer"
          >
            <span>View Revenue Reports & Charts</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pending Uncollected Balance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Uncollected Balance</span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono-code text-rose-600">
            ₦{stats.pendingAmountTotal.toLocaleString()}
          </div>
          <div className="text-xs text-rose-700 font-semibold flex items-center gap-1">
            <span>{stats.pendingBillsCount} pending clinical charges</span>
          </div>
        </div>

        {/* Feature 2: Inpatient Admission Pre-funding Wallets */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Admission Wallets</span>
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono-code text-teal-700">
            ₦{stats.totalWalletBalances.toLocaleString()}
          </div>
          <div className="text-xs text-teal-700 font-semibold">
            Pre-funded patient deposits on cards
          </div>
        </div>

        {/* Feature 4: NHIA / State Health Insurance Claims */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">NHIA Claims Tracked</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono-code text-blue-700">
            ₦{stats.totalHmoClaims.toLocaleString()}
          </div>
          <div className="text-xs text-blue-600 font-semibold">
            Insurance scheme reimbursement claims
          </div>
        </div>
      </div>

      {/* Station Launchpad: 4 Primary Department Modules */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            Hospital Workstation Terminals
          </h2>
          <span className="text-xs text-slate-500 font-medium">Click to access station</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Station 1: Records */}
          <div
            onClick={() => onNavigate('records')}
            className="group bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-700 transition-colors">
                  1. Records Dept
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Lookup existing physical cards (any format), register patients, and print 58mm QR adhesive stickers.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>Open Records Station</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* Station 2: Doctor / Lab */}
          <div
            onClick={() => onNavigate('doctor')}
            className="group bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-blue-500 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-700 transition-colors">
                  2. Doctor & Lab
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Camera QR scanner to scan card sticker directly. Post consultation, lab tests, and clinical bills in 1 tap.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
              <span>Open Doctor Station</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* Station 3: Revenue / Accounts */}
          <div
            onClick={() => onNavigate('revenue')}
            className="group bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-800 transition-colors">
                  3. Accounts & Cashier
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Confirm Cash, Transfer, or Paystack. Auto-prints 58mm thermal receipts and broadcasts real-time clearance.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>Open Accounts Station</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* Station 4: Pharmacy / Lab Verify */}
          <div
            onClick={() => onNavigate('verify')}
            className="group bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-emerald-600 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-700 transition-colors">
                  4. Pharmacy / Verify
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  High-visibility terminal: BIG GREEN SCREEN (PAID - DISPENSE) or BIG RED SCREEN (PENDING ₦15,000).
                </p>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>Open Verify Station</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Department Breakdown & Live Transactions Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Revenue Breakdown */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-700" />
              Department Revenue Volume
            </h3>
            <button
              onClick={() => onNavigate('revenue')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              View Charts →
            </button>
          </div>
          <div className="space-y-3">
            {Object.entries(deptBreakdown).map(([dept, val]) => (
              <div key={dept} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">{dept}</div>
                  <div className="text-xs text-slate-500">{val.count} bill item(s) posted</div>
                </div>
                <div className="text-right">
                  <div className="font-mono-code font-bold text-sm text-slate-900">
                    ₦{val.total.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Hospital Activity Stream */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Live Hospital Transactions & Bills
            </h3>
            <span className="text-xs text-slate-500 font-medium">Auto-updated</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {recentBills.map((b) => (
              <div
                key={b.id}
                onClick={() => onNavigate('revenue', b.card_no)}
                className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>{b.item_name}</span>
                    <span className="font-mono-code text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      #{b.card_no}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {b.department} · {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {b.receipt_no && ` · ${b.receipt_no}`}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono-code font-bold text-sm text-slate-900">
                    ₦{b.amount.toLocaleString()}
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      b.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
