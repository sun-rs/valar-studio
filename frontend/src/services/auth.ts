import api from './api';

export interface LoginRequest {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  note1?: string;
  note2?: string;
  settings: Record<string, any>;
  permissions: string[];
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', credentials);
    // Store token
    localStorage.setItem('access_token', response.access_token);
    // Store user info
    localStorage.setItem('user', JSON.stringify(response.user));

    // 设置cookie供Nginx auth_request使用，使用服务器返回的过期时间
    // response.expires_in是秒数，直接用作max-age
    document.cookie = `valar_auth=${response.access_token}; path=/; max-age=${response.expires_in}; SameSite=Lax; Secure`;

    return response;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');

      // 清除cookie
      document.cookie = 'valar_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/current');
    return response;
  },

  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  // 初始化认证状态（在应用启动时调用）
  initializeAuth: (): void => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // 如果已经有token，设置默认的24小时cookie
      // 注意：这里无法知道原始的remember_me状态，所以使用默认24小时
      document.cookie = `valar_auth=${token}; path=/; max-age=86400; SameSite=Lax; Secure`;
    }
  }
};