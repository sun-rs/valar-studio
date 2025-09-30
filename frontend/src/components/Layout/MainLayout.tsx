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
  AppstoreOutlined,
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
  const [menuKey, setMenuKey] = useState(0); // 用于强制重渲染

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
    let timer: ReturnType<typeof setInterval>;

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

  const handleCollapse = () => {
    setCollapsed(!collapsed);
    // 延迟触发菜单重渲染，确保折叠动画完成后重绘
    setTimeout(() => {
      setMenuKey(prev => prev + 1);
    }, 250);
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
      key: '/modules',
      icon: <AppstoreOutlined />,
      label: '功能模块',
    });
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

  const activeMenu = menuItems.find(item => item.key === location.pathname);
  const pageTitle = activeMenu?.label || '控制中心';

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
        <div className="logo-mark">V</div>
        {!collapsed || isMobile ? (
          <div className="logo-text">
            <span className="logo-title">Valar</span>
            <span className="logo-subtitle">Quant Studio</span>
          </div>
        ) : null}
      </div>
      <Menu
        key={menuKey}
        theme="light"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        className="main-menu"
        inlineCollapsed={collapsed && !isMobile}
        forceSubMenuRender={true}
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
          theme="light"
          width={200}
          collapsedWidth={72}
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
          width={200}
          bodyStyle={{ padding: 0, background: 'transparent' }}
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
                onClick: () => isMobile ? setDrawerVisible(true) : handleCollapse(),
              }
            )}
            <div className="header-title">
              <span className="title-main">{pageTitle}</span>
            <span className="title-sub">Module Selected</span>
            </div>
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
          <div className="content-wrapper">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
