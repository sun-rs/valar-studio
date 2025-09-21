import api from './api';

export interface Order {
  accountid: string;
  code: string;
  exchange: string;
  direction: string;
  offset: string;
  price: number;
  volume: number;
  order_id: string;
  type: string;
  traded: number;
  status: string;
  createtime: string;
  updatetime: string;
}

export interface Trade {
  accountid: string;
  code: string;
  exchange: string;
  direction: string;
  offset: string;
  price: number;
  volume: number;
  order_id: string;
  tradeid: string;
  createtime: string;
}

export const ordersService = {
  getCurrentTradeDate: async () => {
    const response = await api.get('/orders/current-date');
    return response.current_date as string;
  },

  getOrders: async (accountId?: string, accounts?: string[], tradeDate?: string, isSpecial?: boolean) => {
    // Collect all specified accounts into a single array
    const targetAccounts: string[] = [];
    if (accountId) targetAccounts.push(accountId);
    if (accounts && accounts.length > 0) targetAccounts.push(...accounts);

    if (targetAccounts.length === 0) {
      return [];
    }

    // Use URLSearchParams to properly serialize array parameters
    const searchParams = new URLSearchParams();
    if (isSpecial !== undefined) {
      searchParams.append('is_special', String(isSpecial));
    }
    if (tradeDate) searchParams.append('tradedate', tradeDate);
    targetAccounts.forEach(acc => searchParams.append('accounts', acc));
    const response = await api.get(`/orders?${searchParams.toString()}`);
    return response.orders as Order[];
  },

  getSpecialOrders: async (accounts?: string[]) => {
    if (accounts && accounts.length > 0) {
      // Use URLSearchParams to properly serialize array parameters
      const searchParams = new URLSearchParams();
      accounts.forEach(acc => searchParams.append('accounts', acc));
      const response = await api.get(`/orders/special?${searchParams.toString()}`);
      return response.orders as Order[];
    }
    const response = await api.get('/orders/special');
    return response.orders as Order[];
  },

  getTrades: async (accountId?: string, accounts?: string[], tradeDate?: string) => {
    // Collect all specified accounts into a single array
    const targetAccounts: string[] = [];
    if (accountId) targetAccounts.push(accountId);
    if (accounts && accounts.length > 0) targetAccounts.push(...accounts);

    if (targetAccounts.length === 0) {
      return [];
    }

    // Use URLSearchParams to properly serialize array parameters
    const searchParams = new URLSearchParams();
    if (tradeDate) searchParams.append('trade_date', tradeDate);
    targetAccounts.forEach(acc => searchParams.append('accounts', acc));
    const response = await api.get(`/orders/trades?${searchParams.toString()}`);
    return response.trades as Trade[];
  },
};