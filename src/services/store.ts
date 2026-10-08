import { 
  Patient, 
  BillItem, 
  StationStats, 
  PaymentMethod, 
  ClinicalBundle, 
  WalletTransaction, 
  CashierShiftSummary,
  HMOType 
} from '../types';
import { enqueueSyncAction, isAppOnline } from './sync';

const PATIENTS_STORAGE_KEY = 'gh_pay_patients_v2';
const BILLS_STORAGE_KEY = 'gh_pay_bills_v2';
const WALLET_STORAGE_KEY = 'gh_pay_wallet_v2';
const SYNC_CHANNEL_NAME = 'gh_pay_realtime_broadcast';

// Standard Hospital Clinical Bundles (Feature 1)
export const CLINICAL_BUNDLES: ClinicalBundle[] = [
  {
    id: 'bundle_malaria',
    name: 'Acute Severe Malaria Pack',
    description: 'Full clinical workup, parasite microscopy & complete course antimalarials',
    category: 'General',
    items: [
      { department: 'Consultation', name: 'General Outpatient Medical Review', amount: 3500 },
      { department: 'Lab', name: 'Malaria Parasite (MP) + Full Blood Count (FBC)', amount: 6500 },
      { department: 'Pharmacy', name: 'Artemether/Lumefantrine (Coartem) + Paracetamol', amount: 4000 },
    ]
  },
  {
    id: 'bundle_antenatal',
    name: 'Antenatal Booking & Screening Pack',
    description: 'Obstetric registration, baseline ultrasound, viral serology & hematinics',
    category: 'Maternal',
    items: [
      { department: 'Consultation', name: 'Obstetric & Gynecological Booking Consultation', amount: 5000 },
      { department: 'Lab', name: 'Obstetric Ultrasound Pelvic Scan', amount: 8500 },
      { department: 'Lab', name: 'Routine Antenatal Blood Serology & Urinalysis', amount: 4500 },
      { department: 'Pharmacy', name: 'Prenatal Multivitamin, Folic Acid & Iron Pack', amount: 3000 },
    ]
  },
  {
    id: 'bundle_trauma',
    name: 'Accident & Trauma Resuscitation Pack',
    description: 'Emergency cannulation, wound dressing, blood crossmatch & analgesics',
    category: 'Emergency',
    items: [
      { department: 'Emergency', name: 'Trauma Resuscitation & Wound Debridement', amount: 6500 },
      { department: 'Lab', name: 'Urgent ABO Blood Grouping & Crossmatch (2 Units)', amount: 4500 },
      { department: 'Pharmacy', name: 'IV Ringers Lactate + Cannula + Tetanus Toxoid', amount: 5000 },
    ]
  },
  {
    id: 'bundle_chronic',
    name: 'Hypertension & Diabetes Review Pack',
    description: 'Cardiometabolic review, Fasting Blood Sugar, Lipid Profile & 30-day refill',
    category: 'Chronic',
    items: [
      { department: 'Consultation', name: 'Consultant Cardiologist Review', amount: 5000 },
      { department: 'Lab', name: 'Fasting Blood Sugar (FBS) + Lipid Profile', amount: 7500 },
      { department: 'Pharmacy', name: 'Amlodipine 5mg + Metformin 500mg (30-day supply)', amount: 5500 },
    ]
  }
];

// Calculate HMO vs Patient split (Feature 4)
export function calculateShares(grossAmount: number, hmoType: HMOType): { patientShare: number; hmoShare: number } {
  switch (hmoType) {
    case 'NHIA Standard (10% Co-pay)':
      const patient = Math.round(grossAmount * 0.1);
      return { patientShare: patient, hmoShare: grossAmount - patient };
    case 'State Health Scheme (0% Co-pay)':
    case 'Emergency / Indigent Waiver':
      return { patientShare: 0, hmoShare: grossAmount };
    case 'Private / Self-Pay (100%)':
    default:
      return { patientShare: grossAmount, hmoShare: 0 };
  }
}

// Realistic initial dummy patients with Wallet balance & HMO settings
const INITIAL_PATIENTS: Patient[] = [
  {
    card_no: '12489',
    name: 'Ibrahim Babatunde',
    phone: '0803 241 5982',
    age: 42,
    gender: 'Male',
    blood_group: 'O+',
    wallet_balance: 0, // ₦0 - ready to test top-up!
    hmo_type: 'Private / Self-Pay (100%)',
    created_at: '2022-04-12T08:30:00.000Z',
    notes: 'Allergic to penicillin. Outpatient. Regular checkup card.',
  },
  {
    card_no: '023411',
    name: 'Ngozi Amadi',
    phone: '0814 982 7361',
    age: 29,
    gender: 'Female',
    blood_group: 'B+',
    wallet_balance: 25000, // Pre-funded admission wallet
    hmo_type: 'NHIA Standard (10% Co-pay)',
    hmo_number: 'NHIA/2026/88219',
    created_at: '2023-01-19T10:15:00.000Z',
    notes: 'Asthmatic (Salbutamol inhaler user). Antenatal clinic card. Pre-funded deposit wallet.',
  },
  {
    card_no: 'GH/2023/7890',
    name: 'Emeka Okafor',
    phone: '0705 123 9845',
    age: 36,
    gender: 'Male',
    blood_group: 'A+',
    wallet_balance: 15000,
    hmo_type: 'Private / Self-Pay (100%)',
    created_at: '2023-08-04T14:20:00.000Z',
    notes: 'Cardiology clinic referral. Cleared all bills.',
  },
  {
    card_no: 'GH/2024/0042',
    name: 'Fatima Bello',
    phone: '0901 884 5512',
    age: 19,
    gender: 'Female',
    blood_group: 'AA',
    wallet_balance: 0,
    hmo_type: 'State Health Scheme (0% Co-pay)',
    hmo_number: 'LSHS/TR/0491',
    created_at: '2024-02-11T11:00:00.000Z',
    notes: 'Emergency casualty covered by State Health Scheme.',
  }
];

// Initial realistic bills
const INITIAL_BILLS: BillItem[] = [
  // Ibrahim Babatunde ('12489') - Exactly N15,000 PENDING (Self-pay)
  {
    id: 'bill_101',
    card_no: '12489',
    department: 'Consultation',
    item_name: 'Consultant Physician Review',
    amount: 3500,
    patient_share: 3500,
    hmo_share: 0,
    status: 'pending',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'bill_102',
    card_no: '12489',
    department: 'Lab',
    item_name: 'Full Blood Count (FBC) + MP Test',
    amount: 7500,
    patient_share: 7500,
    hmo_share: 0,
    status: 'pending',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'bill_103',
    card_no: '12489',
    department: 'Pharmacy',
    item_name: 'Artemether/Lumefantrine + Paracetamol',
    amount: 4000,
    patient_share: 4000,
    hmo_share: 0,
    status: 'pending',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },

  // Ngozi Amadi ('023411') - NHIA 10% co-pay
  {
    id: 'bill_201',
    card_no: '023411',
    department: 'Consultation',
    item_name: 'Obstetric & Antenatal Booking Fee',
    amount: 5000,
    patient_share: 500, // 10% co-pay
    hmo_share: 4500,
    status: 'paid',
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    payment_method: 'Wallet',
    receipt_no: 'REC-2026-9041',
    cashier: 'Accounts Window 1'
  },
  {
    id: 'bill_202',
    card_no: '023411',
    department: 'Lab',
    item_name: 'Obstetric Ultrasound Pelvic Scan',
    amount: 8500,
    patient_share: 850, // 10% co-pay
    hmo_share: 7650,
    status: 'pending',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },

  // Emeka Okafor ('GH/2023/7890') - ALL PAID (Green Screen)
  {
    id: 'bill_301',
    card_no: 'GH/2023/7890',
    department: 'Consultation',
    item_name: 'Specialist Cardiology Consultation',
    amount: 10000,
    patient_share: 10000,
    hmo_share: 0,
    status: 'paid',
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 170 * 60 * 1000).toISOString(),
    payment_method: 'Transfer',
    receipt_no: 'REC-2026-8812',
    cashier: 'Accounts Window 2'
  },
  {
    id: 'bill_302',
    card_no: 'GH/2023/7890',
    department: 'Lab',
    item_name: 'Lipid Profile & 12-Lead ECG Analysis',
    amount: 14500,
    patient_share: 14500,
    hmo_share: 0,
    status: 'paid',
    created_at: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    payment_method: 'Transfer',
    receipt_no: 'REC-2026-8812',
    cashier: 'Accounts Window 2'
  },
  {
    id: 'bill_303',
    card_no: 'GH/2023/7890',
    department: 'Pharmacy',
    item_name: 'Amlodipine 5mg (30 Tabs) + Atorvastatin',
    amount: 6200,
    patient_share: 6200,
    hmo_share: 0,
    status: 'paid',
    created_at: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    payment_method: 'Transfer',
    receipt_no: 'REC-2026-8812',
    cashier: 'Accounts Window 2'
  },

  // Fatima Bello ('GH/2024/0042') - State Health 0% co-pay
  {
    id: 'bill_401',
    card_no: 'GH/2024/0042',
    department: 'Emergency',
    item_name: 'Accident Resuscitation & Wound Debridement',
    amount: 6800,
    patient_share: 0,
    hmo_share: 6800,
    status: 'pending',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  }
];

// Initial wallet transactions
const INITIAL_WALLET_TX: WalletTransaction[] = [
  {
    id: 'wtx_1',
    card_no: '023411',
    type: 'deposit',
    amount: 30000,
    balance_after: 30000,
    payment_method: 'Transfer',
    created_at: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    cashier: 'Accounts Window 1',
    reference: 'WAL-DEP-8841',
    description: 'Inpatient Antenatal Pre-funding Deposit'
  },
  {
    id: 'wtx_2',
    card_no: '023411',
    type: 'deduction',
    amount: 5000,
    balance_after: 25000,
    payment_method: 'Wallet',
    created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    cashier: 'Accounts Window 1',
    reference: 'REC-2026-9041',
    description: 'Auto-settlement for Obstetric Booking Fee'
  },
  {
    id: 'wtx_3',
    card_no: 'GH/2023/7890',
    type: 'deposit',
    amount: 15000,
    balance_after: 15000,
    payment_method: 'Cash',
    created_at: new Date(Date.now() - 200 * 60 * 1000).toISOString(),
    cashier: 'Accounts Window 2',
    reference: 'WAL-DEP-8799',
    description: 'Cardiology Ward Deposit'
  }
];

// Broadcast channel
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    // fallback
  }
}

function broadcastUpdate(type: string, payload?: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('gh_pay_change', { detail: { type, payload } }));
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type, payload, timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
}

// Auto-mark local cached bills as synced when Supabase sync completes
if (typeof window !== 'undefined') {
  window.addEventListener('gh_pay_sync_completed', () => {
    const raw = localStorage.getItem(BILLS_STORAGE_KEY);
    if (!raw) return;
    try {
      const bills: BillItem[] = JSON.parse(raw);
      let changed = false;
      const updated = bills.map((b) => {
        if (b.sync_status === 'pending_sync') {
          changed = true;
          return { ...b, sync_status: 'synced' as const };
        }
        return b;
      });
      if (changed) {
        localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(updated));
        broadcastUpdate('BILLS_SYNCED');
      }
    } catch {
      // ignore
    }
  });
}

export function getStoredPatients(): Patient[] {
  if (typeof window === 'undefined') return INITIAL_PATIENTS;
  const raw = localStorage.getItem(PATIENTS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
    return INITIAL_PATIENTS;
  }
  try {
    const parsed: Patient[] = JSON.parse(raw);
    let updated = false;
    const migrated = parsed.map(p => {
      if (p.card_no === '12489' && (!p.notes || p.notes === 'Outpatient. Regular checkup card.')) {
        updated = true;
        return { ...p, notes: 'Allergic to penicillin. Outpatient. Regular checkup card.' };
      }
      return p;
    });
    if (updated) {
      localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return parsed;
  } catch {
    return INITIAL_PATIENTS;
  }
}

export function savePatients(patients: Patient[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
  broadcastUpdate('PATIENTS_UPDATED');
}

export function getStoredBills(): BillItem[] {
  if (typeof window === 'undefined') return INITIAL_BILLS;
  const raw = localStorage.getItem(BILLS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(INITIAL_BILLS));
    return INITIAL_BILLS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_BILLS;
  }
}

export function saveBills(bills: BillItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(bills));
  broadcastUpdate('BILLS_UPDATED');
}

export function getStoredWalletTx(): WalletTransaction[] {
  if (typeof window === 'undefined') return INITIAL_WALLET_TX;
  const raw = localStorage.getItem(WALLET_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(INITIAL_WALLET_TX));
    return INITIAL_WALLET_TX;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_WALLET_TX;
  }
}

export function saveWalletTx(txList: WalletTransaction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(txList));
  broadcastUpdate('WALLET_UPDATED');
}

export function normalizeCardDigits(card: string): string {
  if (!card) return '';
  return card.replace(/[^0-9]/g, '');
}

export function matchCardNumber(query: string, candidate: string): boolean {
  if (!query || !candidate) return false;
  const cleanQ = query.trim();
  const cleanCand = candidate.trim();

  if (cleanQ.toLowerCase() === cleanCand.toLowerCase()) return true;
  if (cleanCand.toLowerCase().includes(cleanQ.toLowerCase())) return true;

  const digitsQ = normalizeCardDigits(cleanQ);
  const digitsCand = normalizeCardDigits(cleanCand);

  if (digitsQ.length > 0 && digitsCand.length > 0) {
    if (digitsQ === digitsCand) return true;
    const strippedQ = digitsQ.replace(/^0+/, '');
    const strippedCand = digitsCand.replace(/^0+/, '');
    if (strippedQ.length >= 3 && strippedCand.includes(strippedQ)) return true;
    if (digitsCand.endsWith(digitsQ)) return true;
  }

  return false;
}

export function findPatient(query: string): Patient | null {
  if (!query || !query.trim()) return null;
  const patients = getStoredPatients();
  const q = query.trim();

  const byCard = patients.find(p => matchCardNumber(q, p.card_no));
  if (byCard) return byCard;

  const qLower = q.toLowerCase();
  const byNameOrPhone = patients.find(p => 
    p.name.toLowerCase().includes(qLower) || 
    p.phone.replace(/[^0-9]/g, '').includes(normalizeCardDigits(q))
  );

  return byNameOrPhone || null;
}

export function getPatientByCard(card_no: string): Patient | null {
  if (!card_no) return null;
  const patients = getStoredPatients();
  const exact = patients.find(p => p.card_no.toLowerCase() === card_no.trim().toLowerCase());
  if (exact) return exact;
  return patients.find(p => matchCardNumber(card_no, p.card_no)) || null;
}

export function createPatient(newPatient: Omit<Patient, 'created_at' | 'wallet_balance'> & { wallet_balance?: number }): { success: boolean; error?: string; patient?: Patient } {
  const patients = getStoredPatients();
  const trimmedCard = newPatient.card_no.trim();

  if (!trimmedCard) {
    return { success: false, error: 'Card number is required' };
  }

  const exists = patients.some(p => p.card_no.toLowerCase() === trimmedCard.toLowerCase());
  if (exists) {
    return { success: false, error: `Card number "${trimmedCard}" already exists in the hospital registry.` };
  }

  const patient: Patient = {
    ...newPatient,
    card_no: trimmedCard,
    wallet_balance: newPatient.wallet_balance || 0,
    hmo_type: newPatient.hmo_type || 'Private / Self-Pay (100%)',
    created_at: new Date().toISOString()
  };

  const updated = [patient, ...patients];
  savePatients(updated);
  return { success: true, patient };
}

export function updatePatientHMO(card_no: string, hmoType: HMOType, hmoNumber?: string): boolean {
  const patients = getStoredPatients();
  let changed = false;
  const updated = patients.map(p => {
    if (p.card_no.toLowerCase() === card_no.trim().toLowerCase() || matchCardNumber(p.card_no, card_no)) {
      changed = true;
      return {
        ...p,
        hmo_type: hmoType,
        hmo_number: hmoNumber || p.hmo_number
      };
    }
    return p;
  });
  if (changed) {
    savePatients(updated);
    return true;
  }
  return false;
}

export function updatePatientNotes(card_no: string, notes: string): boolean {
  const patients = getStoredPatients();
  let changed = false;
  const updated = patients.map(p => {
    if (p.card_no.toLowerCase() === card_no.trim().toLowerCase() || matchCardNumber(p.card_no, card_no)) {
      changed = true;
      return {
        ...p,
        notes: notes.trim()
      };
    }
    return p;
  });
  if (changed) {
    savePatients(updated);
    return true;
  }
  return false;
}

export function getPatientNotes(card_no: string): string {
  const patient = getPatientByCard(card_no);
  return patient?.notes || '';
}

export function getNextCardNumberSuggestion(): string {
  const patients = getStoredPatients();
  let maxNum = 23411;
  patients.forEach(p => {
    const digits = normalizeCardDigits(p.card_no);
    const num = parseInt(digits, 10);
    if (!isNaN(num) && num > maxNum && num < 999999) {
      maxNum = num;
    }
  });
  const next = maxNum + 1;
  return next < 100000 ? `0${next}` : `${next}`;
}

export function getPatientBills(card_no: string): BillItem[] {
  if (!card_no) return [];
  const bills = getStoredBills();
  return bills.filter(b => b.card_no.toLowerCase() === card_no.trim().toLowerCase() || matchCardNumber(b.card_no, card_no));
}

// Post single bill with HMO share calculation
export function addBill(item: {
  card_no: string;
  department: BillItem['department'];
  item_name: string;
  amount: number;
  bundle_name?: string;
}): BillItem {
  const patient = getPatientByCard(item.card_no);
  const hmoType = patient?.hmo_type || 'Private / Self-Pay (100%)';
  const { patientShare, hmoShare } = calculateShares(item.amount, hmoType);

  const bills = getStoredBills();
  const syncStatus = isAppOnline() ? 'synced' : 'pending_sync';
  const newBill: BillItem = {
    ...item,
    id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    patient_share: patientShare,
    hmo_share: hmoShare,
    status: 'pending',
    sync_status: syncStatus,
    created_at: new Date().toISOString()
  };
  const updated = [newBill, ...bills];
  saveBills(updated);
  enqueueSyncAction('CREATE_BILL', newBill);
  return newBill;
}

// Feature 1: Post Multi-Item Clinical Bundle
export function postClinicalBundle(card_no: string, bundleId: string): BillItem[] {
  const bundle = CLINICAL_BUNDLES.find(b => b.id === bundleId);
  if (!bundle) return [];

  const patient = getPatientByCard(card_no);
  const hmoType = patient?.hmo_type || 'Private / Self-Pay (100%)';
  const syncStatus = isAppOnline() ? 'synced' : 'pending_sync';

  const newBills: BillItem[] = bundle.items.map((it, idx) => {
    const { patientShare, hmoShare } = calculateShares(it.amount, hmoType);
    const bill: BillItem = {
      id: `bill_b_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      card_no,
      department: it.department,
      item_name: it.name,
      amount: it.amount,
      patient_share: patientShare,
      hmo_share: hmoShare,
      bundle_name: bundle.name,
      status: 'pending',
      sync_status: syncStatus,
      created_at: new Date().toISOString()
    };
    enqueueSyncAction('CREATE_BILL', bill);
    return bill;
  });

  const existingBills = getStoredBills();
  saveBills([...newBills, ...existingBills]);
  return newBills;
}

// Feature 2: Top-Up Inpatient Patient Wallet (Admission Deposit)
export function topUpPatientWallet(
  card_no: string,
  amount: number,
  paymentMethod: PaymentMethod = 'Cash',
  cashierName: string = 'Central Accounts',
  description: string = 'Admission Pre-funding Deposit'
): { success: boolean; newBalance: number; reference: string; error?: string } {
  if (amount <= 0) return { success: false, newBalance: 0, reference: '', error: 'Amount must be greater than zero' };

  const patients = getStoredPatients();
  let targetPatient: Patient | null = null;
  let newBalance = 0;

  const updatedPatients = patients.map(p => {
    if (p.card_no.toLowerCase() === card_no.trim().toLowerCase() || matchCardNumber(p.card_no, card_no)) {
      newBalance = (p.wallet_balance || 0) + amount;
      targetPatient = { ...p, wallet_balance: newBalance };
      return targetPatient;
    }
    return p;
  });

  if (!targetPatient) {
    return { success: false, newBalance: 0, reference: '', error: 'Patient not found' };
  }

  savePatients(updatedPatients);

  const reference = `WAL-DEP-${Math.floor(1000 + Math.random() * 9000)}`;
  const txList = getStoredWalletTx();
  const newTx: WalletTransaction = {
    id: `wtx_${Date.now()}`,
    card_no: (targetPatient as Patient).card_no,
    type: 'deposit',
    amount,
    balance_after: newBalance,
    payment_method: paymentMethod,
    cashier: cashierName,
    created_at: new Date().toISOString(),
    reference,
    description
  };
  saveWalletTx([newTx, ...txList]);
  enqueueSyncAction('TOPUP_WALLET', newTx);

  return { success: true, newBalance, reference };
}

// Standard Bill Settlement (Cash, Transfer, Paystack)
export function payBillsForCard(
  card_no: string, 
  paymentMethod: PaymentMethod = 'Cash',
  cashierName: string = 'Central Accounts'
): { success: boolean; paidBills: BillItem[]; totalAmount: number; receiptNo: string; error?: string } {
  const bills = getStoredBills();
  const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  let totalAmount = 0;
  const paidBills: BillItem[] = [];

  const updated = bills.map(b => {
    if (b.status === 'pending' && (b.card_no.toLowerCase() === card_no.trim().toLowerCase() || matchCardNumber(b.card_no, card_no))) {
      // Patient pays patient_share (after HMO discount)
      const charge = b.patient_share !== undefined ? b.patient_share : b.amount;
      totalAmount += charge;
      const paidItem: BillItem = {
        ...b,
        status: 'paid',
        paid_at: now,
        payment_method: paymentMethod,
        receipt_no: receiptNo,
        cashier: cashierName
      };
      paidBills.push(paidItem);
      return paidItem;
    }
    return b;
  });

  if (paidBills.length > 0) {
    saveBills(updated);
    enqueueSyncAction('SETTLE_BILLS', {
      card_no,
      receiptNo,
      method: paymentMethod,
      cashier: cashierName,
      billIds: paidBills.map(b => b.id)
    });
    return { success: true, paidBills, totalAmount, receiptNo };
  }

  return { success: false, paidBills: [], totalAmount: 0, receiptNo, error: 'No pending bills found' };
}

// Feature 2: Settle bills directly from Patient Pre-funded Wallet
export function payBillsViaWallet(
  card_no: string,
  cashierName: string = 'Central Accounts'
): { success: boolean; paidBills: BillItem[]; totalAmount: number; receiptNo: string; remainingWallet: number; error?: string } {
  const patient = getPatientByCard(card_no);
  if (!patient) return { success: false, paidBills: [], totalAmount: 0, receiptNo: '', remainingWallet: 0, error: 'Patient not found' };

  const patientBills = getPatientBills(card_no).filter(b => b.status === 'pending');
  if (patientBills.length === 0) return { success: false, paidBills: [], totalAmount: 0, receiptNo: '', remainingWallet: patient.wallet_balance, error: 'No pending bills to pay' };

  const totalRequired = patientBills.reduce((sum, b) => sum + (b.patient_share !== undefined ? b.patient_share : b.amount), 0);

  if (patient.wallet_balance < totalRequired) {
    return {
      success: false,
      paidBills: [],
      totalAmount: totalRequired,
      receiptNo: '',
      remainingWallet: patient.wallet_balance,
      error: `Insufficient wallet balance (₦${patient.wallet_balance.toLocaleString()}). Required: ₦${totalRequired.toLocaleString()}. Please top up wallet first.`
    };
  }

  // Deduct from wallet
  const newWalletBalance = patient.wallet_balance - totalRequired;
  const patients = getStoredPatients().map(p => {
    if (p.card_no.toLowerCase() === patient.card_no.toLowerCase()) {
      return { ...p, wallet_balance: newWalletBalance };
    }
    return p;
  });
  savePatients(patients);

  // Mark bills paid
  const receiptNo = `REC-WAL-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const allBills = getStoredBills();
  const paidBills: BillItem[] = [];

  const updatedBills = allBills.map(b => {
    if (b.status === 'pending' && (b.card_no.toLowerCase() === patient.card_no.toLowerCase() || matchCardNumber(b.card_no, patient.card_no))) {
      const paidItem: BillItem = {
        ...b,
        status: 'paid',
        paid_at: now,
        payment_method: 'Wallet',
        receipt_no: receiptNo,
        cashier: cashierName
      };
      paidBills.push(paidItem);
      return paidItem;
    }
    return b;
  });
  saveBills(updatedBills);

  // Record wallet transaction
  const txList = getStoredWalletTx();
  const newTx: WalletTransaction = {
    id: `wtx_${Date.now()}`,
    card_no: patient.card_no,
    type: 'deduction',
    amount: totalRequired,
    balance_after: newWalletBalance,
    payment_method: 'Wallet',
    cashier: cashierName,
    created_at: now,
    reference: receiptNo,
    description: `Auto-deduction for ${paidBills.length} pending bill items`
  };
  saveWalletTx([newTx, ...txList]);

  enqueueSyncAction('SETTLE_BILLS', {
    card_no: patient.card_no,
    receiptNo,
    method: 'Wallet',
    cashier: cashierName,
    billIds: paidBills.map(b => b.id)
  });

  return {
    success: true,
    paidBills,
    totalAmount: totalRequired,
    receiptNo,
    remainingWallet: newWalletBalance
  };
}

// Feature 1: Mark specific or all items dispensed (supports partial dispensation)
export function markBillsDispensed(card_no: string, itemIds?: string[]): boolean {
  const bills = getStoredBills();
  const now = new Date().toISOString();
  let changed = false;

  const updated = bills.map(b => {
    if (b.status === 'paid' && !b.dispensed && (b.card_no.toLowerCase() === card_no.trim().toLowerCase() || matchCardNumber(b.card_no, card_no))) {
      if (!itemIds || itemIds.includes(b.id)) {
        changed = true;
        return {
          ...b,
          dispensed: true,
          dispensed_at: now
        };
      }
    }
    return b;
  });

  if (changed) {
    saveBills(updated);
    return true;
  }
  return false;
}

// Feature 3: Cashier Shift Handover & End-of-Day Z-Report
export function getCashierShiftSummary(cashierName: string = 'Central Accounts Window 1'): CashierShiftSummary {
  const bills = getStoredBills();
  const walletTx = getStoredWalletTx();

  let cashTotal = 0;
  let transferTotal = 0;
  let paystackTotal = 0;
  let walletTopups = 0;
  let billsCleared = 0;
  let hmoClaims = 0;
  const receiptSet = new Set<string>();

  bills.forEach(b => {
    if (b.status === 'paid') {
      const charge = b.patient_share !== undefined ? b.patient_share : b.amount;
      if (b.payment_method === 'Cash') cashTotal += charge;
      else if (b.payment_method === 'Transfer') transferTotal += charge;
      else if (b.payment_method === 'Paystack') paystackTotal += charge;

      if (b.hmo_share) {
        hmoClaims += b.hmo_share;
      }
      billsCleared++;
      if (b.receipt_no) receiptSet.add(b.receipt_no);
    }
  });

  walletTx.forEach(tx => {
    if (tx.type === 'deposit') {
      walletTopups += tx.amount;
      if (tx.payment_method === 'Cash') cashTotal += tx.amount;
      else if (tx.payment_method === 'Transfer') transferTotal += tx.amount;
      else if (tx.payment_method === 'Paystack') paystackTotal += tx.amount;
      if (tx.reference) receiptSet.add(tx.reference);
    }
  });

  const grandTotal = cashTotal + transferTotal + paystackTotal;

  return {
    cashier_name: cashierName,
    start_time: '08:00 AM Today',
    end_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cash_total: cashTotal,
    transfer_total: transferTotal,
    paystack_total: paystackTotal,
    wallet_topups: walletTopups,
    grand_total: grandTotal,
    bills_cleared_count: billsCleared,
    receipts_count: receiptSet.size,
    hmo_claims_total: hmoClaims
  };
}

export function getStats(): StationStats {
  const bills = getStoredBills();
  const patients = getStoredPatients();

  let totalRevenueToday = 0;
  let pendingAmountTotal = 0;
  let paidBillsCount = 0;
  let pendingBillsCount = 0;
  let totalHmoClaims = 0;
  let totalWalletBalances = 0;

  bills.forEach(b => {
    if (b.status === 'paid') {
      const charge = b.patient_share !== undefined ? b.patient_share : b.amount;
      totalRevenueToday += charge;
      paidBillsCount++;
      if (b.hmo_share) totalHmoClaims += b.hmo_share;
    } else {
      const charge = b.patient_share !== undefined ? b.patient_share : b.amount;
      pendingAmountTotal += charge;
      pendingBillsCount++;
    }
  });

  patients.forEach(p => {
    totalWalletBalances += (p.wallet_balance || 0);
  });

  return {
    totalRevenueToday,
    pendingAmountTotal,
    patientsCount: patients.length,
    billsCountToday: bills.length,
    paidBillsCount,
    pendingBillsCount,
    totalWalletBalances,
    totalHmoClaims
  };
}

export function subscribeToStore(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === PATIENTS_STORAGE_KEY || e.key === BILLS_STORAGE_KEY || e.key === WALLET_STORAGE_KEY) {
      callback();
    }
  };

  const handleBroadcast = () => callback();

  window.addEventListener('gh_pay_change', handleCustom);
  window.addEventListener('storage', handleStorage);
  if (syncChannel) {
    syncChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('gh_pay_change', handleCustom);
    window.removeEventListener('storage', handleStorage);
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

export function resetToDemoData(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
  localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(INITIAL_BILLS));
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(INITIAL_WALLET_TX));
  broadcastUpdate('RESET_DEMO_DATA');
}
