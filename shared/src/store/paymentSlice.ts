import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PaymentMethodType =
  | 'CASH'
  | 'CARD'
  | 'UPI'
  | 'WALLET'
  | 'STRIPE'
  | 'PAYPAL'
  | 'APPLE_PAY'
  | 'GOOGLE_PAY';

export type PaymentStatusType = 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentRecord {
  bookingRef: string;
  amount: number;
  method: PaymentMethodType;
  status: PaymentStatusType;
  transactionRef: string | null;
  message: string;
}

export interface InvoiceRecord {
  invoiceNumber: string;
  totalAmount: number;
  pdfUrl: string | null;
  generatedAt: string;
}

export interface PaymentState {
  activePayment: PaymentRecord | null;
  invoice: InvoiceRecord | null;
  isProcessing: boolean;
  error: string | null;
}

const initialState: PaymentState = {
  activePayment: null,
  invoice: null,
  isProcessing: false,
  error: null,
};

export const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    startPayment(state, action: PayloadAction<{ bookingRef: string; amount: number; method: PaymentMethodType }>) {
      state.isProcessing = true;
      state.error = null;
      state.activePayment = {
        bookingRef: action.payload.bookingRef,
        amount: action.payload.amount,
        method: action.payload.method,
        status: 'PENDING',
        transactionRef: null,
        message: 'Processing...',
      };
    },
    paymentSuccess(state, action: PayloadAction<{ transactionRef: string; message: string }>) {
      state.isProcessing = false;
      if (state.activePayment) {
        state.activePayment.status = 'SUCCESS';
        state.activePayment.transactionRef = action.payload.transactionRef;
        state.activePayment.message = action.payload.message;
      }
    },
    paymentFailed(state, action: PayloadAction<string>) {
      state.isProcessing = false;
      state.error = action.payload;
      if (state.activePayment) {
        state.activePayment.status = 'FAILED';
        state.activePayment.message = action.payload;
      }
    },
    setInvoice(state, action: PayloadAction<InvoiceRecord>) {
      state.invoice = action.payload;
    },
    resetPayment() {
      return initialState;
    },
  },
});

export const { startPayment, paymentSuccess, paymentFailed, setInvoice, resetPayment } = paymentSlice.actions;
export default paymentSlice.reducer;
