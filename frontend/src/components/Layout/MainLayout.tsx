import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Drawer } from 'antd';
import {
  DashboardOutlined,
  DatabaseOutlined,
  OrderedListOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useRefreshStore } from '../../stores/refreshStore';
import RefreshControl from '../RefreshControl';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { setCurrentPage, isEnabled, interval, triggerRefresh } = useRefreshStore();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track current page for refresh targeting
  useEffect(() => {
    setCurrentPage(location.pathname);
  }, [location.pathname, setCurrentPage]);

  // Auto refresh timer
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isEnabled && interval > 0) {
      timer = setInterval(() => {
        // Only refresh on main pages
        if (['/dashboard', '/positions', '/orders'].includes(location.pathname)) {
          triggerRefresh();
        }
      }, interval);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isEnabled, interval, location.pathname, triggerRefresh]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/positions',
      icon: <DatabaseOutlined />,
      label: '持仓管理',
    },
    {
      key: '/orders',
      icon: <OrderedListOutlined />,
      label: '订单管理',
    },
  ];

  // Admin menu items
  if (user?.role === 'admin') {
    menuItems.push({
      key: '/account-config',
      icon: <UserOutlined />,
      label: '账户配置',
    });
  }

  menuItems.push({
    key: '/settings',
    icon: <SettingOutlined />,
    label: '设置',
  });

  const userMenuItems = [
    {
      key: 'profile',
      label: `用户：${user?.username}`,
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '个人设置',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const siderContent = (
    <>
      <div className="logo">
        <h3>{collapsed && !isMobile ? 'V' : 'Valar'}</h3>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </>
  );

  return (
    <Layout className="main-layout">
      {!isMobile ? (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="dark"
          width={240}
          collapsedWidth={80}
          className="desktop-sider"
        >
          {siderContent}
        </Sider>
      ) : (
        <Drawer
          placement="left"
          open={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          closable={false}
          width={240}
          bodyStyle={{ padding: 0, background: '#001529' }}
          className="mobile-drawer"
        >
          {siderContent}
        </Drawer>
      )}
      <Layout>
        <Header className="layout-header">
          <div className="header-left">
            {React.createElement(
              isMobile ? MenuOutlined : (collapsed ? MenuUnfoldOutlined : MenuFoldOutlined),
              {
                className: 'trigger',
                onClick: () => isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed),
              }
            )}
          </div>
          <div className="header-right">
            <Space size="middle">
              {/* 刷新控制（条件显示） */}
              {(['/dashboard', '/positions', '/orders'].includes(location.pathname)) && (
                <RefreshControl />
              )}

              {/* 用户头像和下拉菜单 */}
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space className="header-user">
                  <Avatar icon={<UserOutlined />} />
                  <span>{user?.username}</span>
                </Space>
              </Dropdown>
            </Space>
          </div>
        </Header>
        <Content className="layout-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;