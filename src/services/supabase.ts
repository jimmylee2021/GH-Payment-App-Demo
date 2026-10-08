/**
 * Supabase Client & Remote Synchronization Service
 * Handles syncing locally cached bills and transactions with Supabase
 * when network connectivity is active.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BillItem, PaymentMethod, WalletTransaction } from '../types';

const supabaseUrl = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

export const isRealSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://')
);

// Instantiate real client if keys are present; otherwise create a dummy/fallback client
export const supabase: SupabaseClient | null = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const REMOTE_SUPABASE_BILLS_CACHE_KEY = 'gh_pay_supabase_remote_bills_v1';
const REMOTE_SUPABASE_TX_CACHE_KEY = 'gh_pay_supabase_remote_tx_v1';

/**
 * Sync a single bill to Supabase
 */
export async function syncBillToSupabase(bill: BillItem): Promise<{ success: boolean; error?: string }> {
  if (isRealSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('bills')
        .upsert({
          id: bill.id,
          card_no: bill.card_no,
          department: bill.department,
          item_name: bill.item_name,
          amount: bill.amount,
          patient_share: bill.patient_share,
          hmo_share: bill.hmo_share,
          status: bill.status,
          bundle_name: bill.bundle_name || null,
          created_at: bill.created_at,
          paid_at: bill.paid_at || null,
          receipt_no: bill.receipt_no || null,
          payment_method: bill.payment_method || null,
          cashier: bill.cashier || null,
        }, { onConflict: 'id' });

      if (error) {
        console.warn('[Supabase] Sync error for bill:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error connecting to Supabase';
      return { success: false, error: msg };
    }
  }

  // Local Supabase Simulation Layer:
  // Persists to a simulated remote database partition to emulate real Supabase syncing
  try {
    const raw = localStorage.getItem(REMOTE_SUPABASE_BILLS_CACHE_KEY);
    const existing: Record<string, BillItem> = raw ? JSON.parse(raw) : {};
    existing[bill.id] = { ...bill, sync_status: 'synced' };
    localStorage.setItem(REMOTE_SUPABASE_BILLS_CACHE_KEY, JSON.stringify(existing));
    
    // Simulate slight realistic network latency (100ms)
    await new Promise((resolve) => setTimeout(resolve, 80));
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Sync bill settlements to Supabase
 */
export async function syncSettlementToSupabase(
  card_no: string,
  receiptNo: string,
  method: PaymentMethod,
  cashier: string,
  billIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (isRealSupabaseConfigured && supabase) {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('bills')
        .update({
          status: 'paid',
          paid_at: now,
          receipt_no: receiptNo,
          payment_method: method,
          cashier,
        })
        .in('id', billIds);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error connecting to Supabase';
      return { success: false, error: msg };
    }
  }

  // Local Supabase Simulation Layer
  try {
    const raw = localStorage.getItem(REMOTE_SUPABASE_BILLS_CACHE_KEY);
    const existing: Record<string, BillItem> = raw ? JSON.parse(raw) : {};
    const now = new Date().toISOString();

    billIds.forEach((id) => {
      if (existing[id]) {
        existing[id].status = 'paid';
        existing[id].paid_at = now;
        existing[id].receipt_no = receiptNo;
        existing[id].payment_method = method;
        existing[id].cashier = cashier;
      }
    });

    localStorage.setItem(REMOTE_SUPABASE_BILLS_CACHE_KEY, JSON.stringify(existing));
    await new Promise((resolve) => setTimeout(resolve, 80));
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Sync wallet transaction to Supabase
 */
export async function syncWalletTxToSupabase(tx: WalletTransaction): Promise<{ success: boolean; error?: string }> {
  if (isRealSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('wallet_transactions')
        .upsert({
          id: tx.id,
          card_no: tx.card_no,
          type: tx.type,
          amount: tx.amount,
          balance_after: tx.balance_after,
          payment_method: tx.payment_method || null,
          created_at: tx.created_at,
          reference: tx.reference || null,
          description: tx.description,
          cashier: tx.cashier || null,
        }, { onConflict: 'id' });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  // Local simulation
  try {
    const raw = localStorage.getItem(REMOTE_SUPABASE_TX_CACHE_KEY);
    const list: WalletTransaction[] = raw ? JSON.parse(raw) : [];
    list.unshift(tx);
    localStorage.setItem(REMOTE_SUPABASE_TX_CACHE_KEY, JSON.stringify(list));
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
