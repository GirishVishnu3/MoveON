import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WalletTransaction {
  id: string;
  amount: number;
  transaction_type: 'CREDIT' | 'DEBIT';
  reference_type: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
}

export interface WalletState {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
  isLoading: boolean;
}

const initialState: WalletState = {
  balance: 0,
  currency: 'INR',
  transactions: [],
  isLoading: false,
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setWalletData(state, action: PayloadAction<{ balance: number; currency: string; transactions: WalletTransaction[] }>) {
      state.balance = action.payload.balance;
      state.currency = action.payload.currency;
      state.transactions = action.payload.transactions;
    },
    updateBalance(state, action: PayloadAction<number>) {
      state.balance = action.payload;
    }
  },
});

export const { setLoading, setWalletData, updateBalance } = walletSlice.actions;
export default walletSlice.reducer;
