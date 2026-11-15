import React, { useState } from 'react';
import { PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { Loader2, ExternalLink, Sparkles } from 'lucide-react';

interface CheckoutFormProps {
  amount: number;
  customerName?: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

export default function CheckoutForm({ amount, customerName, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasWallets, setHasWallets] = useState(false);

  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handlePaymentSuccess = (paymentIntentId: string) => {
    onSuccess(paymentIntentId);
  };

  const markPendingOrderSubmitted = () => {
    try {
      const raw = localStorage.getItem('crrave_pending_online_order');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.paymentSubmitted = true;
        localStorage.setItem('crrave_pending_online_order', JSON.stringify(parsed));
        sessionStorage.setItem('crrave_pending_online_order', JSON.stringify(parsed));
      }
    } catch (e) {}
  };

  const handleExpressConfirm = async () => {
    if (!stripe || !elements) return;
    setIsProcessing(true);
    markPendingOrderSubmitted();

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}?payment_success=true`,
      },
    });

    if (error) {
      setMessage(error.message || 'Express payment failed');
      toast.error(error.message || 'Payment failed');
    } else if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      handlePaymentSuccess(paymentIntent.id);
    }
    setIsProcessing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;
    setIsProcessing(true);
    markPendingOrderSubmitted();

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}?payment_success=true`,
      },
    });

    if (error) {
      setMessage(error.message || 'An unexpected error occurred.');
      toast.error(error.message || 'Payment failed');
    } else if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      handlePaymentSuccess(paymentIntent.id);
    }

    setIsProcessing(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto px-1 sm:px-0">
      {/* Informative helper if testing inside an embedded iframe */}
      {isInsideIframe && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <span className="leading-tight">
              Browsers block Apple Pay & Google Pay inside embedded preview frames. Open direct tab to test wallet buttons:
            </span>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-[11px] uppercase tracking-wider rounded-xl shrink-0 flex items-center gap-1.5 transition-all shadow cursor-pointer"
          >
            Open Direct Tab <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* 1-Click Express Checkout Element (Apple Pay & Google Pay) */}
      <div className="space-y-3">
        <div className="rounded-2xl overflow-hidden min-h-[48px]">
          <ExpressCheckoutElement
            onConfirm={handleExpressConfirm}
            options={{
              buttonHeight: 50,
              buttonTheme: {
                applePay: 'black',
                googlePay: 'black',
              },
              layout: {
                maxColumns: 1,
                maxRows: 2,
              },
            }}
            onReady={(event) => {
              if (event.availablePaymentMethods) {
                const methods = Object.keys(event.availablePaymentMethods).filter(
                  (m) => (event.availablePaymentMethods as any)[m]
                );
                if (methods.length > 0) {
                  setHasWallets(true);
                }
              }
            }}
          />
        </div>

        {hasWallets && (
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
              Or Pay with Card
            </span>
            <div className="flex-grow border-t border-white/10" />
          </div>
        )}
      </div>

      {/* Standard Card & Payment Element */}
      <div className="bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10 shadow-2xl">
        <PaymentElement 
          id="payment-element" 
          options={{ 
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                name: (customerName || '').trim(),
              }
            },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }} 
          onLoadError={(event) => {
            console.warn('PaymentElement load event:', event);
          }}
        />
      </div>
      
      {message && (
        <div className="text-red-500 text-[11px] sm:text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">
          {message}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full sm:w-1/3 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs sm:text-sm tracking-widest uppercase hover:bg-white/10 transition-all disabled:opacity-50 cursor-pointer"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          id="submit"
          className="w-full sm:flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs sm:text-sm tracking-widest uppercase hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              PROCESSING...
            </>
          ) : (
            `PAY £${amount.toFixed(2)}`
          )}
        </button>
      </div>
      
      <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest font-bold">
        Secure encryption by Stripe
      </p>
    </form>
  );
}
