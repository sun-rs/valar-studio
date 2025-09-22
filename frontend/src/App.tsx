import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useAuthStore } from './stores/authStore';
import MainLayout from './components/Layout/MainLayout';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Positions from './pages/Positions';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import AccountConfig from './pages/AccountConfig';
import Modules from './pages/Modules';
import './App.css';

// Configure dayjs
dayjs.locale('zh-cn');

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          colorInfo: '#0ea5e9',
          colorSuccess: '#16a34a',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorBgLayout: '#eef2ff',
          colorBgContainer: '#ffffff',
          colorBorder: 'rgba(148, 163, 184, 0.28)',
          colorTextBase: '#0f172a',
          colorTextSecondary: '#475569',
          fontFamily: "'Inter', 'Roboto', 'PingFang SC', 'Microsoft YaHei', sans-serif",
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
        },
        components: {
          Layout: {
            headerBg: 'transparent',
            bodyBg: 'transparent',
            siderBg: 'transparent',
          },
          Menu: {
            itemSelectedBg: 'rgba(37, 99, 235, 0.12)',
            itemSelectedColor: '#2563eb',
            itemHoverBg: 'rgba(37, 99, 235, 0.08)',
            itemHoverColor: '#2563eb',
            itemBorderRadius: 12,
          },
          Card: {
            borderRadiusLG: 20,
            colorBorderSecondary: 'rgba(148, 163, 184, 0.2)',
            headerFontSize: 16,
          },
          Button: {
            controlHeight: 44,
            borderRadius: 999,
            fontWeight: 600,
          },
          Table: {
            headerBg: 'rgba(241, 245, 249, 0.9)',
            rowHoverBg: 'rgba(37, 99, 235, 0.05)',
            borderColor: 'rgba(226, 232, 240, 0.6)',
          },
          Tabs: {
            itemSelectedColor: '#2563eb',
            inkBarColor: '#2563eb',
          },
          Dropdown: {
            controlItemBgHover: 'rgba(37, 99, 235, 0.08)',
            colorBgElevated: 'rgba(255, 255, 255, 0.96)',
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="positions" element={<Positions />} />
            <Route path="orders" element={<Orders />} />
            <Route path="modules" element={
              <AdminRoute>
                <Modules />
              </AdminRoute>
            } />
            <Route path="account-config" element={
              <AdminRoute>
                <AccountConfig />
              </AdminRoute>
            } />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
