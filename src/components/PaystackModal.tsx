import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CreditCard, Building2, Smartphone, ShieldCheck, X, CheckCircle, Loader2 } from 'lucide-react';
import { playAudio } from '../services/sound';

interface PaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  email?: string;
  cardNo: string;
  patientName: string;
  onSuccess: (reference: string) => void;
}

export const PaystackModal: React.FC<PaystackModalProps> = ({
  isOpen,
  onClose,
  amount,
  email = 'patient@ghpay.hospital',
  cardNo,
  patientName,
  onSuccess,
}) => {
  const [tab, setTab] = useState<'card' | 'transfer' | 'ussd'>('card');
  const [cardNumber, setCardNumber] = useState('4084 0841 2345 6789');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('408');
  const [pin, setPin] = useState('1234');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [otp, setOtp] = useState('123456');

  if (!isOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);
    // Simulate gateway delay
    setTimeout(() => {
      setIsProcessing(false);
      setStep('otp');
    }, 1000);
  };

  const handleVerifyOtp = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep('success');
      playAudio.successChime();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
      setTimeout(() => {
        const ref = `pstk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        onSuccess(ref);
        onClose();
        setStep('form');
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Paystack Top Branding Bar */}
        <div className="bg-[#001428] text-white p-4 flex items-center justify-between border-b border-cyan-900/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#0ba4db] flex items-center justify-center font-black text-white text-sm">
              P
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                <span>paystack</span>
                <span className="text-[10px] bg-cyan-900/80 text-cyan-300 px-1.5 py-0.5 rounded font-mono-code">SECURED</span>
              </div>
              <p className="text-[11px] text-slate-400">General Hospital GH Pay</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Paying for:</div>
            <div className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{patientName}</div>
            <div className="text-[11px] font-mono-code text-slate-500">Card #{cardNo}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Amount to pay</div>
            <div className="text-xl font-extrabold text-slate-950 font-mono-code">
              ₦{amount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5">
          {step === 'form' && (
            <div className="space-y-4">
              {/* Payment Methods tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTab('card')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    tab === 'card'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setTab('transfer')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    tab === 'transfer'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setTab('ussd')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    tab === 'ussd'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  USSD
                </button>
              </div>

              {tab === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono-code text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0ba4db]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Expiry
                      </label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono-code text-xs font-semibold text-slate-900 text-center focus:outline-none focus:border-[#0ba4db]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        CVV
                      </label>
                      <input
                        type="password"
                        maxLength={3}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="123"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono-code text-xs font-semibold text-slate-900 text-center focus:outline-none focus:border-[#0ba4db]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="••••"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono-code text-xs font-semibold text-slate-900 text-center focus:outline-none focus:border-[#0ba4db]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePay}
                    disabled={isProcessing}
                    className="w-full py-3 bg-[#0ba4db] hover:bg-[#098ec0] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Authorizing Payment...
                      </>
                    ) : (
                      `Pay ₦${amount.toLocaleString()}`
                    )}
                  </button>
                </div>
              )}

              {tab === 'transfer' && (
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600">
                    Transfer exactly <strong>₦{amount.toLocaleString()}</strong> to the designated hospital checkout account:
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-300 space-y-1">
                    <div className="text-[11px] text-slate-500">Bank Name:</div>
                    <div className="font-bold text-sm text-slate-900">Wema Bank / Titan Paystack</div>
                    <div className="text-[11px] text-slate-500 mt-1">Account Number:</div>
                    <div className="font-mono-code font-bold text-base text-[#001428] tracking-wider">
                      9948 2018 41
                    </div>
                  </div>
                  <button
                    onClick={handlePay}
                    disabled={isProcessing}
                    className="w-full py-2.5 bg-[#0ba4db] hover:bg-[#098ec0] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'I Have Sent The Transfer'}
                  </button>
                </div>
              )}

              {tab === 'ussd' && (
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600">
                    Dial this USSD string on your registered bank phone number:
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-300 text-center">
                    <div className="font-mono-code font-bold text-base text-slate-900">
                      *737*000*4192#
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">GTBank / Zenith / Access</div>
                  </div>
                  <button
                    onClick={handlePay}
                    disabled={isProcessing}
                    className="w-full py-2.5 bg-[#0ba4db] hover:bg-[#098ec0] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm USSD Dialed'}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-cyan-50 text-[#0ba4db] flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Enter Bank One-Time Password</h4>
                <p className="text-xs text-slate-500">
                  Enter the 6-digit verification code sent to your registered mobile phone.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full text-center tracking-widest text-xl font-mono-code font-bold px-4 py-3 bg-slate-50 border-2 border-[#0ba4db] rounded-xl text-slate-900 focus:outline-none"
                />
                <p className="text-[11px] text-center text-slate-400 mt-1">Test OTP pre-filled: 123456</p>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isProcessing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying with Bank...
                  </>
                ) : (
                  'Authorize & Complete Payment'
                )}
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-slate-900">Payment Successful!</h4>
              <p className="text-xs text-slate-600">
                Hospital records updated in real time. Pharmacy & Lab clearance granted.
              </p>
            </div>
          )}

          {/* Paystack Trust Badge */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit SSL encrypted · PCI-DSS Level 1 Certified</span>
          </div>
        </div>
      </div>
    </div>
  );
};
