import api from './api';

export interface Position {
  accountid?: string;
  code: string;
  symbol: string;
  name: string; // 中文名
  exchange: string;
  industry: string;
  direction: string; // "多" or "空"
  float_pnl: number; // 浮动盈亏
  margin: number;
  current_price: number;
  open_price: number;
  volume: number;
  yd_volume: number;
  prev_settlement: number; // 昨结
  pnl: number; // 盯市盈亏
  frozen: number;
  updatetime: string;
}

export interface PositionsResponse {
  positions: Position[];
  update_time: string;
}

export const positionsService = {
  getPositions: async (accountId?: string, accounts?: string[]): Promise<PositionsResponse> => {
    // Collect all specified accounts into a single array
    const targetAccounts: string[] = [];
    if (accountId) targetAccounts.push(accountId);
    if (accounts && accounts.length > 0) targetAccounts.push(...accounts);

    if (targetAccounts.length === 0) {
      return { positions: [], update_time: '' };
    }

    // Use URLSearchParams to properly serialize array parameters
    const searchParams = new URLSearchParams();
    targetAccounts.forEach(acc => searchParams.append('accounts', acc));
    return await api.get(`/positions?${searchParams.toString()}`);
  },

  getPositionsSummary: async (): Promise<PositionsResponse> => {
    return await api.get('/positions/summary');
  },
};