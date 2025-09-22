import api from './api';

export interface LoginAttempt {
  id: number;
  username: string;
  ip_address: string;
  user_agent?: string;
  success: boolean;
  failure_reason?: string;
  created_at: string;
}

export interface AccessLog {
  id: number;
  ip_address: string;
  user_agent?: string;
  path: string;
  method: string;
  username?: string;
  response_status?: number;
  response_time_ms?: number;
  created_at: string;
}

export interface SecurityStats {
  total_login_attempts: number;
  failed_login_attempts: number;
  unique_ips: number;
  blocked_ips: number;
  date_range: string;
}

export interface SecurityLogQuery {
  start_date?: string;
  end_date?: string;
  ip_address?: string;
  username?: string;
  page?: number;
  size?: number;
}

export interface SecurityLogResponse<T> {
  records: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const securityService = {
  // 获取登录尝试记录
  async getLoginAttempts(query: SecurityLogQuery): Promise<SecurityLogResponse<LoginAttempt>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/security/login-attempts?${params}`);
    return response;
  },

  // 获取访问日志记录
  async getAccessLogs(query: SecurityLogQuery): Promise<SecurityLogResponse<AccessLog>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/security/access-logs?${params}`);
    return response;
  },

  // 获取未授权访问日志记录
  async getUnauthorizedAccessLogs(query: SecurityLogQuery): Promise<SecurityLogResponse<AccessLog>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/security/unauthorized-access?${params}`);
    return response;
  },

  // 获取授权用户访问日志记录
  async getAuthorizedAccessLogs(query: SecurityLogQuery): Promise<SecurityLogResponse<AccessLog>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/security/authorized-access?${params}`);
    return response;
  },

  // 获取安全统计信息
  async getSecurityStats(startDate?: string, endDate?: string): Promise<SecurityStats> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await api.get(`/security/stats?${params}`);
    return response;
  },

  // 清理旧日志
  async cleanupLogs(daysToKeep: number = 90): Promise<{ message: string; details: any }> {
    const response = await api.post(`/security/cleanup-logs?days_to_keep=${daysToKeep}`);
    return response;
  },

  // 获取我的登录历史（普通用户）
  async getMyLoginHistory(query: { page?: number; size?: number }): Promise<SecurityLogResponse<LoginAttempt>> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.size) params.append('size', query.size.toString());

    const response = await api.get(`/security/my-login-history?${params}`);
    return response;
  },
};