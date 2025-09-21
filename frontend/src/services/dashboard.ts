import api from './api';

export interface DashboardSummary {
  total_balance: number;
  net_profit: number;
  total_margin: number;
  available_funds: number;
  profit_rate: number;
  update_time: string;
  accounts_count: number;
}

export interface AccountSummary {
  account_id: string;
  account_name?: string;
  balance: number;
  float_pnl: number;
  total_pnl: number;
  margin: number;
  margin_rate: string;
  available: number;
  initial_capital: number;
  frozen: number;
  profit_rate: number;
  update_time: string;
}

export interface AccountHistoryPoint {
  updatetime: string;
  balance: number;
}

export interface AccountHistoryData {
  account_id: string;
  data: AccountHistoryPoint[];
}

export const dashboardService = {
  getSummary: async (accounts?: string[]): Promise<DashboardSummary> => {
    if (accounts && accounts.length > 0) {
      // Use URLSearchParams to properly serialize array parameters
      const searchParams = new URLSearchParams();
      accounts.forEach(acc => searchParams.append('accounts', acc));
      return await api.get(`/dashboard/summary?${searchParams.toString()}`);
    }
    return await api.get('/dashboard/summary');
  },

  getAccounts: async (accounts?: string[]): Promise<AccountSummary[]> => {
    if (accounts && accounts.length > 0) {
      // Use URLSearchParams to properly serialize array parameters
      const searchParams = new URLSearchParams();
      accounts.forEach(acc => searchParams.append('accounts', acc));
      return await api.get(`/dashboard/accounts?${searchParams.toString()}`);
    }
    return await api.get('/dashboard/accounts');
  },

  getAccountsHistory: async (accounts?: string[], days: number = 5): Promise<AccountHistoryData[]> => {
    const searchParams = new URLSearchParams();
    searchParams.set('days', days.toString());

    if (accounts && accounts.length > 0) {
      accounts.forEach(acc => searchParams.append('accounts', acc));
    }

    return await api.get(`/dashboard/history?${searchParams.toString()}`);
  },
};