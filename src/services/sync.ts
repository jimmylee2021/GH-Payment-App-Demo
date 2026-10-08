/**
 * Offline Sync Engine & Queue Manager
 * Coordinates offline bill caching, connectivity listeners,
 * and automatic synchronization with Supabase.
 */

import { SyncQueueItem, SyncActionType, OfflineSyncState } from '../types';
import { syncBillToSupabase, syncSettlementToSupabase, syncWalletTxToSupabase } from './supabase';
import { requestBackgroundSync } from '../sw-register';
import { playAudio } from './sound';

const QUEUE_STORAGE_KEY = 'gh_pay_offline_sync_queue_v2';
const SIMULATED_OFFLINE_KEY = 'gh_pay_simulated_offline_v2';

let isSyncInProgress = false;
let lastSyncTimestamp: string | null = null;

// Track simulated offline mode for testing/demoing network dropouts
function getStoredSimulatedOffline(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
}

export function isSimulatedOffline(): boolean {
  return getStoredSimulatedOffline();
}

export function setSimulatedOffline(simulated: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIMULATED_OFFLINE_KEY, simulated ? 'true' : 'false');
  notifyListeners();

  // If brought back online, immediately attempt auto-sync
  if (!simulated && navigator.onLine) {
    flushSyncQueue();
  }
}

/**
 * Check if the application currently has effective network connectivity
 */
export function isAppOnline(): boolean {
  if (typeof window === 'undefined') return true;
  if (getStoredSimulatedOffline()) return false;
  return navigator.onLine;
}

export function getSyncQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSyncQueue(queue: SyncQueueItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  notifyListeners();
}

export function getPendingQueueCount(): number {
  return getSyncQueue().filter((item) => item.status === 'pending_sync' || item.status === 'failed').length;
}

export function getSyncState(): OfflineSyncState {
  const queue = getSyncQueue();
  const pendingCount = queue.filter((i) => i.status === 'pending_sync' || i.status === 'failed').length;

  return {
    isOnline: isAppOnline(),
    isSimulatedOffline: isSimulatedOffline(),
    isSyncing: isSyncInProgress,
    pendingCount,
    lastSyncTime: lastSyncTimestamp,
    queue,
  };
}

/**
 * Enqueue an action when created offline or for optimistic background syncing
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function enqueueSyncAction(action: SyncActionType, payload: any): SyncQueueItem {
  const queue = getSyncQueue();
  const item: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action,
    payload,
    created_at: new Date().toISOString(),
    status: isAppOnline() ? 'pending_sync' : 'pending_sync',
    retryCount: 0,
  };

  const updated = [...queue, item];
  saveSyncQueue(updated);

  // If online, immediately process queue in background
  if (isAppOnline()) {
    setTimeout(() => {
      flushSyncQueue();
    }, 50);
  } else {
    // Register background sync with Service Worker
    requestBackgroundSync('sync-bills');
  }

  return item;
}

/**
 * Flush and sync all pending items to Supabase
 */
export async function flushSyncQueue(): Promise<{ total: number; succeeded: number; failed: number }> {
  if (isSyncInProgress || !isAppOnline()) {
    return { total: 0, succeeded: 0, failed: 0 };
  }

  const queue = getSyncQueue();
  const pendingItems = queue.filter((i) => i.status === 'pending_sync' || i.status === 'failed');

  if (pendingItems.length === 0) {
    return { total: 0, succeeded: 0, failed: 0 };
  }

  isSyncInProgress = true;
  notifyListeners();

  let succeeded = 0;
  let failed = 0;

  const updatedQueue = [...queue];

  for (const item of pendingItems) {
    const queueIndex = updatedQueue.findIndex((q) => q.id === item.id);
    if (queueIndex === -1) continue;

    updatedQueue[queueIndex].status = 'syncing';
    saveSyncQueue(updatedQueue);

    let res: { success: boolean; error?: string } = { success: false };

    try {
      if (item.action === 'CREATE_BILL') {
        res = await syncBillToSupabase(item.payload);
      } else if (item.action === 'SETTLE_BILLS') {
        res = await syncSettlementToSupabase(
          item.payload.card_no,
          item.payload.receiptNo,
          item.payload.method,
          item.payload.cashier,
          item.payload.billIds
        );
      } else if (item.action === 'TOPUP_WALLET') {
        res = await syncWalletTxToSupabase(item.payload);
      }
    } catch (err) {
      res = { success: false, error: String(err) };
    }

    if (res.success) {
      updatedQueue[queueIndex].status = 'synced';
      succeeded += 1;
    } else {
      updatedQueue[queueIndex].status = 'failed';
      updatedQueue[queueIndex].retryCount += 1;
      updatedQueue[queueIndex].lastError = res.error;
      failed += 1;
    }
  }

  lastSyncTimestamp = new Date().toLocaleTimeString();
  isSyncInProgress = false;

  // Prune synced items older than 20 items to save space
  const synced = updatedQueue.filter((i) => i.status === 'synced');
  const nonSynced = updatedQueue.filter((i) => i.status !== 'synced');
  const prunedQueue = [...nonSynced, ...synced.slice(-15)];

  saveSyncQueue(prunedQueue);

  if (succeeded > 0) {
    playAudio.successChime();
    // Dispatch update so bills store marks local items as synced
    window.dispatchEvent(new CustomEvent('gh_pay_sync_completed', {
      detail: { succeeded, failed }
    }));
  }

  return { total: pendingItems.length, succeeded, failed };
}

// Event notification listeners
function notifyListeners(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('gh_pay_sync_state_change', {
    detail: getSyncState()
  }));
}

export function subscribeToSyncState(callback: (state: OfflineSyncState) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    callback(getSyncState());
  };

  window.addEventListener('gh_pay_sync_state_change', handler);
  window.addEventListener('online', () => {
    handler();
    flushSyncQueue();
  });
  window.addEventListener('offline', handler);

  // Initial call
  callback(getSyncState());

  return () => {
    window.removeEventListener('gh_pay_sync_state_change', handler);
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}

// Listen to service worker background sync trigger
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'TRIGGER_OFFLINE_SYNC') {
      flushSyncQueue();
    }
  });
}
