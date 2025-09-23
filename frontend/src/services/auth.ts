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

    // 设置cookie供Nginx使用（24小时过期）
    // 注意：这个cookie只用于直接访问外部服务时的认证，不影响正常网页使用
    document.cookie = `valar_auth=${response.access_token}; path=/; max-age=86400; SameSite=Lax`;

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
  }
};