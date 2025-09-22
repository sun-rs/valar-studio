import React from 'react';
import { Card, Row, Col, Alert, Typography } from 'antd';
import {
  ContainerOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import './index.css';

const { Title, Paragraph } = Typography;

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  color: string;
  disabled?: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  icon,
  url,
  color,
  disabled = false
}) => {
  const handleClick = () => {
    if (!disabled) {
      window.open(url, '_blank');
    }
  };

  return (
    <Card
      hoverable={!disabled}
      className={`module-card${disabled ? ' is-disabled' : ''}`}
      onClick={handleClick}
    >
      <div
        className="module-icon"
        style={{
          background: disabled
            ? 'linear-gradient(135deg, rgba(148,163,184,0.6), rgba(203,213,225,0.6))'
            : `linear-gradient(135deg, ${color}, ${color}cc)`
        }}
      >
        {icon}
      </div>
      <Title level={4} style={{ margin: 0, color: disabled ? '#94a3b8' : undefined }}>
        {title}
      </Title>
      <Paragraph style={{ margin: 0, color: disabled ? '#cbd5f5' : 'var(--color-text-secondary)' }}>
        {description}
      </Paragraph>
      {!disabled && (
        <LinkOutlined className="module-link-icon" />
      )}
    </Card>
  );
};

const Modules: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const modules = [
    {
      title: 'Portainer',
      description: 'Docker容器管理平台',
      icon: <ContainerOutlined />,
      url: '/portainer/',
      color: '#1890ff'
    },
    {
      title: 'Semaphore',
      description: 'Ansible自动化部署工具',
      icon: <DeploymentUnitOutlined />,
      url: '/semaphore/',
      color: '#52c41a'
    },
    {
      title: 'JupyterLab',
      description: '数据科学开发环境',
      icon: <ExperimentOutlined />,
      url: '/jupyterlab/',
      color: '#fa8c16'
    }
  ];

  return (
    <div className="modules">
      {!isAdmin && (
        <Alert
          message="权限提示"
          description="当前功能模块仅对管理员开放，如需访问请联系系统管理员。"
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {isAdmin && (
        <Row gutter={[24, 24]} className="modules-grid">
          {modules.map((module, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <ModuleCard
                title={module.title}
                description={module.description}
                icon={module.icon}
                url={module.url}
                color={module.color}
              />
            </Col>
          ))}
        </Row>
      )}

      {isAdmin && (
        <Card className="module-instructions" style={{ marginTop: '24px' }}>
          <Title level={4}>使用说明</Title>
          <ul>
            <li><strong>Portainer</strong>: 用于管理Docker容器、镜像、网络等资源</li>
            <li><strong>Semaphore</strong>: 基于Web的Ansible UI，用于自动化部署和配置管理</li>
            <li><strong>JupyterLab</strong>: 交互式开发环境，支持Python、R等多种编程语言</li>
          </ul>
          <Alert
            message="安全提示"
            description="这些工具具有较高的系统权限，请谨慎操作。所有访问操作都会被记录在安全日志中。"
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </Card>
      )}
    </div>
  );
};

export default Modules;
