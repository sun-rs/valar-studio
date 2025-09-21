import { create } from 'zustand';

export interface RefreshInterval {
  value: number;
  label: string;
}

export const REFRESH_INTERVALS: RefreshInterval[] = [
  { value: 1000, label: '1秒' },
  { value: 5000, label: '5秒' },
  { value: 10000, label: '10秒' },
  { value: 30000, label: '30秒' },
  { value: 40000, label: '40秒' },
  { value: 50000, label: '50秒' },
  { value: 60000, label: '1分钟' },
  { value: 120000, label: '2分钟' },
  { value: 180000, label: '3分钟' },
  { value: 300000, label: '5分钟' },
  { value: 600000, label: '10分钟' },
  { value: 900000, label: '15分钟' },
  { value: 1800000, label: '30分钟' },
];

interface RefreshState {
  isEnabled: boolean;
  interval: number;
  currentPage: string;
  isRefreshing: boolean;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setInterval: (interval: number) => void;
  setCurrentPage: (page: string) => void;
  setRefreshing: (refreshing: boolean) => void;
  triggerRefresh: () => void;

  // Callbacks for each page
  dashboardRefresh?: () => void;
  positionsRefresh?: () => void;
  ordersRefresh?: () => void;

  // Setters for page refresh functions
  setDashboardRefresh: (fn: () => void) => void;
  setPositionsRefresh: (fn: () => void) => void;
  setOrdersRefresh: (fn: () => void) => void;
}

const STORAGE_KEY = 'valar_refresh_settings';

// Load saved settings
const loadSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        isEnabled: parsed.isEnabled ?? true,
        interval: parsed.interval ?? 5000,
      };
    }
  } catch (error) {
    console.warn('Failed to load refresh settings:', error);
  }
  return {
    isEnabled: true,
    interval: 5000, // Default 5 seconds
  };
};

// Save settings
const saveSettings = (isEnabled: boolean, interval: number) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      isEnabled,
      interval,
    }));
  } catch (error) {
    console.warn('Failed to save refresh settings:', error);
  }
};

const initialSettings = loadSettings();

export const useRefreshStore = create<RefreshState>((set, get) => ({
  isEnabled: initialSettings.isEnabled,
  interval: initialSettings.interval,
  currentPage: '',
  isRefreshing: false,

  // Page refresh functions
  dashboardRefresh: undefined,
  positionsRefresh: undefined,
  ordersRefresh: undefined,

  setEnabled: (enabled: boolean) => {
    set({ isEnabled: enabled });
    const { interval } = get();
    saveSettings(enabled, interval);
  },

  setInterval: (interval: number) => {
    set({ interval });
    const { isEnabled } = get();
    saveSettings(isEnabled, interval);
  },

  setCurrentPage: (page: string) => {
    set({ currentPage: page });
  },

  setRefreshing: (refreshing: boolean) => {
    set({ isRefreshing: refreshing });
  },

  triggerRefresh: () => {
    const { currentPage, dashboardRefresh, positionsRefresh, ordersRefresh } = get();

    set({ isRefreshing: true });

    // Trigger refresh based on current page (remove isEnabled check for manual refresh)
    switch (currentPage) {
      case '/dashboard':
        if (dashboardRefresh) dashboardRefresh();
        break;
      case '/positions':
        if (positionsRefresh) positionsRefresh();
        break;
      case '/orders':
        if (ordersRefresh) ordersRefresh();
        break;
    }

    // Reset refreshing state after a short delay
    setTimeout(() => {
      set({ isRefreshing: false });
    }, 1000);
  },

  setDashboardRefresh: (fn: () => void) => {
    set({ dashboardRefresh: fn });
  },

  setPositionsRefresh: (fn: () => void) => {
    set({ positionsRefresh: fn });
  },

  setOrdersRefresh: (fn: () => void) => {
    set({ ordersRefresh: fn });
  },
}));