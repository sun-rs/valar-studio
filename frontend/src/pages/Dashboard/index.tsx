import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Space, Button, Switch, Tag, Spin, Select } from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  BankOutlined,
  WalletOutlined,
  ReloadOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { dashboardService, DashboardSummary, AccountSummary, AccountHistoryData } from '../../services/dashboard';
import { useRefreshStore } from '../../stores/refreshStore';
import { useStatCardClasses, useRowChangeClasses } from '../../hooks/useValueChange';
import dayjs from 'dayjs';
import './index.css';

const Dashboard: React.FC = () => {
  const { setDashboardRefresh } = useRefreshStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<AccountHistoryData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState(5);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<string | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryData, accountsData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getAccounts(),
      ]);
      setSummary(summaryData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    if (!selectedAccountForHistory) {
      setHistoryData([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const historyResult = await dashboardService.getAccountsHistory([selectedAccountForHistory], historyDays);
      setHistoryData(historyResult);
    } catch (error) {
      console.error('Failed to fetch history data:', error);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 不默认获取历史数据，提高刷新效率
    // Register this page's refresh function
    setDashboardRefresh(() => {
      fetchData();
      // 如果有选中账户才刷新历史数据
      if (selectedAccountForHistory) {
        fetchHistoryData();
      }
    });
  }, [setDashboardRefresh, selectedAccountForHistory]);

  useEffect(() => {
    fetchHistoryData();
  }, [historyDays, selectedAccountForHistory]);

  // 移除自动选择逻辑，默认不选择任何账户以提高刷新效率

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const columns = [
    {
      title: '账户ID',
      dataIndex: 'account_id',
      key: 'account_id',
      fixed: 'left' as const,
      width: 120,
    },
    {
      title: '账户名称',
      dataIndex: 'account_name',
      key: 'account_name',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: formatCurrency,
    },
    {
      title: '浮动盈亏',
      dataIndex: 'float_pnl',
      key: 'float_pnl',
      align: 'right' as const,
      render: (value: number) => (
        <span className={value >= 0 ? 'text-profit' : 'text-loss'}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: '总盈亏',
      dataIndex: 'total_pnl',
      key: 'total_pnl',
      align: 'right' as const,
      render: (value: number) => (
        <span className={value >= 0 ? 'text-profit' : 'text-loss'}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: '收益率',
      dataIndex: 'profit_rate',
      key: 'profit_rate',
      align: 'right' as const,
      render: (value: number) => (
        <span className={value >= 0 ? 'text-profit' : 'text-loss'}>
          {formatPercent(value)}
        </span>
      ),
    },
    {
      title: '保证金',
      dataIndex: 'margin',
      key: 'margin',
      align: 'right' as const,
      render: formatCurrency,
    },
    {
      title: '保证金率',
      dataIndex: 'margin_rate',
      key: 'margin_rate',
      align: 'right' as const,
    },
    {
      title: '可用资金',
      dataIndex: 'available',
      key: 'available',
      align: 'right' as const,
      render: formatCurrency,
    },
    {
      title: '初始资金',
      dataIndex: 'initial_capital',
      key: 'initial_capital',
      align: 'right' as const,
      render: formatCurrency,
    },
    {
      title: '更新时间',
      dataIndex: 'update_time',
      key: 'update_time',
      width: 180,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  // 生成资金曲线图配置
  const getHistoryChartOption = () => {
    if (!historyData || historyData.length === 0) {
      return null;
    }

    const accountHistory = historyData[0]; // 只取第一个账户的数据
    if (!accountHistory || !accountHistory.data || accountHistory.data.length === 0) {
      return null;
    }

    // 计算Y轴范围，添加适当的上下边距
    const balances = accountHistory.data.map(point => point.balance);
    const minBalance = Math.min(...balances);
    const maxBalance = Math.max(...balances);
    const range = maxBalance - minBalance;
    const padding = Math.max(range * 0.1, 1000); // 至少1000元的边距

    // 为X轴准备分类数据（只包含有数据的时间点）
    const timeLabels = accountHistory.data.map(point => point.updatetime);
    const balanceValues = accountHistory.data.map(point => point.balance);

    const series = [{
      name: `账户 ${accountHistory.account_id}`,
      type: 'line',
      data: balanceValues,
      smooth: true,
      symbol: 'none',  // 隐藏数据点
      lineStyle: {
        width: 3,
        color: '#1890ff'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
            { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
          ]
        }
      }
    }];

    // 获取选中账户的名称
    const selectedAccount = accounts.find(acc => acc.account_id === selectedAccountForHistory);
    const accountName = selectedAccount?.account_name || selectedAccountForHistory;

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const param = params[0];
          const timeLabel = timeLabels[param.dataIndex];
          const value = new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY',
            minimumFractionDigits: 2,
          }).format(param.value);
          return `
            <div style="font-weight: bold; margin-bottom: 8px;">${dayjs(timeLabel).format('YYYY-MM-DD HH:mm:ss')}</div>
            <div style="color: ${param.color};">账户余额: ${value}</div>
          `;
        },
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: 'transparent',
        textStyle: {
          color: '#fff'
        },
        borderRadius: 8
      },
      grid: {
        top: 20,  // 减少上方间距，因为没有标题了
        left: 90,
        right: 40,
        bottom: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: {
          formatter: (value: any, index: number) => {
            // 智能显示策略：根据数据点数量决定显示密度
            const totalPoints = timeLabels.length;
            let showEvery = 1;

            if (totalPoints > 50) {
              showEvery = Math.ceil(totalPoints / 20); // 最多显示20个标签
            } else if (totalPoints > 20) {
              showEvery = Math.ceil(totalPoints / 15); // 最多显示15个标签
            } else if (totalPoints > 10) {
              showEvery = 2; // 每隔一个显示
            }

            if (index % showEvery === 0 || index === totalPoints - 1) {
              const time = dayjs(value);
              // 根据时间跨度决定显示格式
              if (historyDays <= 1) {
                return time.format('HH:mm');
              } else if (historyDays <= 7) {
                return time.format('MM-DD HH:mm');
              } else {
                return time.format('MM-DD');
              }
            }
            return '';
          },
          rotate: 45,
          fontSize: 10,
          color: '#666'
        },
        axisLine: {
          lineStyle: {
            color: '#d0d7de'
          }
        },
        axisTick: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        min: Math.floor(minBalance - padding),
        max: Math.ceil(maxBalance + padding),
        axisLabel: {
          formatter: (value: number) => {
            if (Math.abs(value) >= 10000) {
              return `${(value / 10000).toFixed(1)}万`;
            }
            return value.toLocaleString();
          },
          fontSize: 10
        },
        axisLine: {
          lineStyle: {
            color: '#d0d7de'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#f0f3f6',
            type: 'dashed'
          }
        }
      },
      series: series,
      animation: true,
      animationDuration: 1000
    };
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>仪表盘</h2>
      </div>

      <Spin spinning={loading && !summary}>
        <Row gutter={[16, 16]} className="summary-cards">
          <Col xs={24} sm={12} lg={6}>
            <Card className={useStatCardClasses(summary?.total_balance)}>
              <Statistic
                title="总资产"
                value={summary?.total_balance || 0}
                formatter={(value) => formatCurrency(Number(value))}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={useStatCardClasses(summary?.net_profit)}>
              <Statistic
                title="净利润"
                value={summary?.net_profit || 0}
                formatter={(value) => formatCurrency(Number(value))}
                prefix={<RiseOutlined />}
                valueStyle={{
                  color: (summary?.net_profit || 0) >= 0 ? '#f5222d' : '#52c41a', // 中国市场：正数红色，负数绿色
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={useStatCardClasses(summary?.total_margin)}>
              <Statistic
                title="总保证金"
                value={summary?.total_margin || 0}
                formatter={(value) => formatCurrency(Number(value))}
                prefix={<BankOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={useStatCardClasses(summary?.available_funds)}>
              <Statistic
                title="可用资金"
                value={summary?.available_funds || 0}
                formatter={(value) => formatCurrency(Number(value))}
                prefix={<WalletOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      <Card title="账户明细" className="accounts-table">
        <Table
          columns={columns}
          dataSource={accounts}
          rowKey="account_id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1500 }}
          size="middle"
          rowClassName={(record) => useRowChangeClasses(record.balance)}
        />
      </Card>

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <LineChartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              账户资金曲线
            </div>
            <Space>
              <span style={{ fontSize: 14, color: '#666' }}>选择账户:</span>
              <Select
                value={selectedAccountForHistory}
                onChange={setSelectedAccountForHistory}
                size="small"
                style={{ width: 120 }}
                placeholder="选择账户"
                allowClear
                options={[
                  { value: undefined, label: '无选择' },
                  ...accounts.map(acc => ({
                    value: acc.account_id,
                    label: acc.account_id
                  }))
                ]}
              />
              <span style={{ fontSize: 14, color: '#666' }}>查看天数:</span>
              <Select
                value={historyDays}
                onChange={setHistoryDays}
                size="small"
                style={{ width: 80 }}
                options={[
                  { value: 1, label: '1天' },
                  { value: 3, label: '3天' },
                  { value: 5, label: '5天' },
                  { value: 7, label: '7天' },
                  { value: 15, label: '15天' },
                  { value: 30, label: '30天' }
                ]}
              />
            </Space>
          </div>
        }
        className="accounts-table"
        style={{ marginTop: 24 }}
      >
        <Spin spinning={historyLoading}>
          {!selectedAccountForHistory ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999',
              background: '#fafafa',
              borderRadius: '8px'
            }}>
              <LineChartOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
              <p style={{ fontSize: 16, marginBottom: 8 }}>请选择要查看的账户</p>
              <p style={{ fontSize: 14 }}>
                选择一个账户来查看其资金变化曲线
              </p>
            </div>
          ) : historyData && historyData.length > 0 && historyData[0]?.data?.length > 0 ? (
            <ReactECharts
              option={getHistoryChartOption()}
              style={{ height: '400px', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999',
              background: '#fafafa',
              borderRadius: '8px'
            }}>
              <LineChartOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
              <p style={{ fontSize: 16, marginBottom: 8 }}>暂无历史数据</p>
              <p style={{ fontSize: 14 }}>
                {historyLoading ? '正在加载历史数据...' : `账户 ${selectedAccountForHistory} 近${historyDays}天内没有资金变化记录`}
              </p>
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default Dashboard;