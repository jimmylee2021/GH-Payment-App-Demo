export type Gender = 'Male' | 'Female' | 'Other';

export type Department = 
  | 'Consultation' 
  | 'Lab' 
  | 'Pharmacy' 
  | 'Radiology' 
  | 'Emergency' 
  | 'Ward';

export type BillStatus = 'pending' | 'paid';

export type PaymentMethod = 'Cash' | 'Transfer' | 'Paystack' | 'Wallet';

export type HMOType = 
  | 'Private / Self-Pay (100%)' 
  | 'NHIA Standard (10% Co-pay)' 
  | 'State Health Scheme (0% Co-pay)' 
  | 'Emergency / Indigent Waiver';

export type UserRole = 'patient' | 'doctor' | 'cashier' | 'records' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  card_no?: string; // If role === 'patient'
  email?: string;
  department?: string;
  stationTitle: string;
}

export interface Patient {
  card_no: string; // TEXT unique primary ID from physical card (e.g. '12489', '023411', 'GH/2023/7890')
  name: string;
  phone: string;
  age: number;
  gender: Gender;
  created_at: string;
  notes?: string;
  blood_group?: string;
  wallet_balance: number; // Admission deposit & prepayment wallet in Naira (₦)
  hmo_type: HMOType;
  hmo_number?: string;
}

export type SyncStatus = 'synced' | 'pending_sync' | 'syncing' | 'failed';

export type SyncActionType = 'CREATE_BILL' | 'SETTLE_BILLS' | 'TOPUP_WALLET';

export interface SyncQueueItem {
  id: string;
  action: SyncActionType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  created_at: string;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
}

export interface OfflineSyncState {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  queue: SyncQueueItem[];
}

export interface BillItem {
  id: string;
  card_no: string;
  department: Department;
  item_name: string;
  amount: number; // Gross total cost
  patient_share: number; // Amount payable by patient after HMO co-pay discount
  hmo_share: number; // Amount covered by NHIA / Scheme
  status: BillStatus;
  created_at: string;
  paid_at?: string;
  payment_method?: PaymentMethod;
  receipt_no?: string;
  cashier?: string;
  dispensed?: boolean;
  dispensed_at?: string;
  bundle_name?: string;
  sync_status?: SyncStatus; // Offline cache and Supabase sync tracking
}

export interface BundleItemDef {
  department: Department;
  name: string;
  amount: number;
}

export interface ClinicalBundle {
  id: string;
  name: string;
  description: string;
  category: 'Emergency' | 'Maternal' | 'General' | 'Chronic';
  items: BundleItemDef[];
}

export interface WalletTransaction {
  id: string;
  card_no: string;
  type: 'deposit' | 'deduction';
  amount: number;
  balance_after: number;
  payment_method?: PaymentMethod;
  created_at: string;
  cashier?: string;
  reference?: string;
  description: string;
}

export interface CashierShiftSummary {
  cashier_name: string;
  start_time: string;
  end_time?: string;
  cash_total: number;
  transfer_total: number;
  paystack_total: number;
  wallet_topups: number;
  grand_total: number;
  bills_cleared_count: number;
  receipts_count: number;
  hmo_claims_total: number;
}

export interface StationStats {
  totalRevenueToday: number;
  pendingAmountTotal: number;
  patientsCount: number;
  billsCountToday: number;
  paidBillsCount: number;
  pendingBillsCount: number;
  totalWalletBalances: number;
  totalHmoClaims: number;
}
