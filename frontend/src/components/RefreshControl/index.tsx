import React from 'react';
import { Space, Switch, Select, Button, Tooltip } from 'antd';
import { ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useRefreshStore, REFRESH_INTERVALS } from '../../stores/refreshStore';
import './index.css';

const RefreshControl: React.FC = () => {
  const {
    isEnabled,
    interval,
    isRefreshing,
    setEnabled,
    setInterval,
    triggerRefresh,
  } = useRefreshStore();

  const handleIntervalChange = (value: number) => {
    setInterval(value);
  };

  return (
    <div className="refresh-control">
      <Space size="small">
        {/* 1. 刷新按钮 */}
        <div className="refresh-button">
          <Tooltip title="立即刷新" mouseEnterDelay={0.5} mouseLeaveDelay={0}>
            <Button
              icon={<ReloadOutlined spin={isRefreshing} />}
              onClick={triggerRefresh}
              size="small"
              type="text"
              disabled={isRefreshing}
              style={{
                minWidth: '32px',
                height: '32px',
                touchAction: 'manipulation'
              }}
            />
          </Tooltip>
        </div>

        {/* 2. 开关 */}
        <div className="refresh-switch">
          <Switch
            checked={isEnabled}
            onChange={setEnabled}
            checkedChildren="自动"
            unCheckedChildren="手动"
            size="small"
          />
        </div>

        {/* 3. 时间频率选择 */}
        <div className="refresh-interval">
          <Tooltip title="刷新间隔">
            <Select
              value={interval}
              onChange={handleIntervalChange}
              size="small"
              style={{ width: 80 }}
              suffixIcon={<ClockCircleOutlined />}
              disabled={!isEnabled}
            >
              {REFRESH_INTERVALS.map(item => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Tooltip>
        </div>
      </Space>
    </div>
  );
};

export default RefreshControl;
