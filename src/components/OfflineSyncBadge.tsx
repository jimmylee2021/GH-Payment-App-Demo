import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CloudCheck, 
  CloudUpload, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  HardDrive,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { 
  subscribeToSyncState, 
  isAppOnline, 
  isSimulatedOffline, 
  setSimulatedOffline, 
  flushSyncQueue, 
  getSyncState 
} from '../services/sync';
import { OfflineSyncState } from '../types';

interface OfflineSyncBadgeProps {
  compact?: boolean;
}

export const OfflineSyncBadge: React.FC<OfflineSyncBadgeProps> = ({ compact = false }) => {
  const [syncState, setSyncState] = useState<OfflineSyncState>(getSyncState());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncingAction, setIsSyncingAction] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSyncState((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsSyncingAction(true);
    await flushSyncQueue();
    setIsSyncingAction(false);
  };

  const handleToggleSimulation = () => {
    const next = !syncState.isSimulatedOffline;
    setSimulatedOffline(next);
  };

  const isOnline = syncState.isOnline;
  const isSyncing = syncState.isSyncing || isSyncingAction;
  const pendingCount = syncState.pendingCount;

  return (
    <>
      {/* Trigger Badge */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
          isSyncing
            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
            : !isOnline
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
            : pendingCount > 0
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
        }`}
        title="Hospital Network & Supabase Offline Sync Manager"
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Syncing Supabase...</span>
          </>
        ) : !isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {compact 
                ? `Offline (${pendingCount})` 
                : `Offline Mode (${pendingCount} cached)`}
            </span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <CloudUpload className="w-3.5 h-3.5 text-amber-400" />
            <span>{pendingCount} Pending Sync</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>{compact ? 'Online' : 'Supabase Live'}</span>
          </>
        )}
      </button>

      {/* Sync Management Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Service Worker & Supabase Sync
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Offline-first hospital bill cache & automatic sync
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Status Banner */}
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                isOnline 
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' 
                  : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
              }`}>
                {isOnline ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {isOnline ? 'Online & Supabase Connected' : 'Offline Mode Active'}
                  </div>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {isOnline
                      ? 'Service worker is precaching hospital routes. All charges and payments stream directly to Supabase.'
                      : 'Hospital network connection unavailable or simulated offline. Doctors can continue posting bills, cashier receipts, and QR scans uninterrupted. All transactions are securely preserved in offline cache.'}
                  </p>
                </div>
              </div>

              {/* Offline Simulator Switch for AI Studio Testing */}
              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">
                      Simulate Network Drop / Reconnect
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Test offline doctor posting & auto-sync without turning off Wi-Fi
                    </span>
                  </div>
                  <button
                    onClick={handleToggleSimulation}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      syncState.isSimulatedOffline ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        syncState.isSimulatedOffline ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {syncState.isSimulatedOffline && (
                  <div className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    Simulation Active: Posts made right now will be queued locally with status "pending_sync". Toggle back to trigger automatic Supabase upload!
                  </div>
                )}
              </div>

              {/* Queue Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-[10px]">
                    Offline Sync Queue ({syncState.queue.length} items)
                  </span>
                  {syncState.lastSyncTime && (
                    <span className="text-[10px] font-mono-code">
                      Last sync: {syncState.lastSyncTime}
                    </span>
                  )}
                </div>

                {syncState.queue.length === 0 ? (
                  <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500">
                    <CloudCheck className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                    <span>All bills and payments are fully synchronized.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {syncState.queue.slice(-6).map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between font-mono-code text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-200">
                              {item.action === 'CREATE_BILL'
                                ? `Bill #${item.payload.card_no}`
                                : item.action === 'SETTLE_BILLS'
                                ? `Settle #${item.payload.card_no}`
                                : 'Wallet Top-up'}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {item.action === 'CREATE_BILL' && item.payload.item_name}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            item.status === 'synced'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : item.status === 'syncing'
                              ? 'bg-blue-500/20 text-blue-300 animate-pulse'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-emerald-400" />
                Service Worker Cached
              </span>

              <button
                disabled={!isOnline || isSyncing || pendingCount === 0}
                onClick={handleManualSync}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Now ({pendingCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
