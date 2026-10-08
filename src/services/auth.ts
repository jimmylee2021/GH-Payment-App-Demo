import { AuthUser, UserRole } from '../types';
import { findPatient, getPatientByCard } from './store';

const AUTH_STORAGE_KEY = 'gh_pay_auth_session_v1';

export const STAFF_ACCOUNTS: { email: string; pin: string; name: string; role: UserRole; title: string; dept: string }[] = [
  {
    email: 'admin@ghpay.hospital',
    pin: '1234',
    name: 'Dr. A. Olatunji (Medical Director)',
    role: 'admin',
    title: 'Hospital Administrator',
    dept: 'Hospital Management Board'
  },
  {
    email: 'doctor@ghpay.hospital',
    pin: '1234',
    name: 'Dr. Chidi Nwosu (Consultant)',
    role: 'doctor',
    title: 'Clinician / Medical Officer',
    dept: 'Clinical Services & Lab'
  },
  {
    email: 'cashier@ghpay.hospital',
    pin: '1234',
    name: 'Mrs. Funke Adeleke (Head Cashier)',
    role: 'cashier',
    title: 'Accounts & Revenue Officer',
    dept: 'Finance & Revenue Division'
  },
  {
    email: 'records@ghpay.hospital',
    pin: '1234',
    name: 'Mallam Haruna Bello',
    role: 'records',
    title: 'Health Records Officer',
    dept: 'Health Information & Registry'
  }
];

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserSession(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }
  window.dispatchEvent(new CustomEvent('gh_pay_auth_change', { detail: user }));
}

// Gateway 1: Patient Login via Existing Physical Card Number
export function loginPatient(card_no: string): { success: boolean; user?: AuthUser; error?: string } {
  if (!card_no || !card_no.trim()) {
    return { success: false, error: 'Please enter your physical hospital card number' };
  }

  const patient = findPatient(card_no.trim());
  if (!patient) {
    return { 
      success: false, 
      error: `Card "${card_no.trim()}" not found in hospital register. Please check the number stamped on your physical card.` 
    };
  }

  const user: AuthUser = {
    id: `usr_pat_${patient.card_no}`,
    name: patient.name,
    role: 'patient',
    card_no: patient.card_no,
    stationTitle: `Patient Portal (Card #${patient.card_no})`,
    department: patient.hmo_type
  };

  saveUserSession(user);
  return { success: true, user };
}

// Gateway 2: Staff / Clinician / Admin Login
export function loginStaff(email: string, pin: string): { success: boolean; user?: AuthUser; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const found = STAFF_ACCOUNTS.find(s => s.email.toLowerCase() === cleanEmail);

  if (!found) {
    return { success: false, error: 'Staff account not recognized. Select a demo staff role below.' };
  }

  if (pin !== found.pin && pin !== '1234') {
    return { success: false, error: 'Invalid PIN. (Default demo PIN is 1234)' };
  }

  const user: AuthUser = {
    id: `usr_stf_${found.role}`,
    name: found.name,
    role: found.role,
    email: found.email,
    department: found.dept,
    stationTitle: found.title
  };

  saveUserSession(user);
  return { success: true, user };
}

export function logout(): void {
  saveUserSession(null);
}

// Permission matrix: What each role is authorized to see
export function canAccessStation(role: UserRole | undefined, station: string): boolean {
  if (!role) return false;

  // Admin sees everything
  if (role === 'admin') return true;

  // Patient only sees their own Patient Portal and Public Pay
  if (role === 'patient') {
    return station === 'patient_portal' || station === 'pay';
  }

  // Doctor can see Doctor/Lab and Verify
  if (role === 'doctor') {
    return station === 'doctor' || station === 'verify';
  }

  // Cashier can see Accounts/Revenue and Verify
  if (role === 'cashier') {
    return station === 'revenue' || station === 'verify';
  }

  // Records officer can see Records and Verify
  if (role === 'records') {
    return station === 'records' || station === 'verify';
  }

  return false;
}

export function getDefaultStationForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'dashboard';
    case 'doctor':
      return 'doctor';
    case 'cashier':
      return 'revenue';
    case 'records':
      return 'records';
    case 'patient':
      return 'patient_portal';
    default:
      return 'dashboard';
  }
}
