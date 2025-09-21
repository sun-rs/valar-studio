import React, { useState, useEffect } from 'react';
import { Checkbox, Space, Card } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

interface AccountSelectorProps {
  accounts: string[];
  selectedAccounts: string[];
  onChange: (selectedAccounts: string[]) => void;
  loading?: boolean;
  style?: React.CSSProperties;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts,
  selectedAccounts,
  onChange,
  loading = false,
  style
}) => {
  const [indeterminate, setIndeterminate] = useState<boolean>(false);
  const [checkAll, setCheckAll] = useState<boolean>(false);

  useEffect(() => {
    const isIndeterminate = selectedAccounts.length > 0 && selectedAccounts.length < accounts.length;
    const isCheckAll = selectedAccounts.length === accounts.length && accounts.length > 0;

    setIndeterminate(isIndeterminate);
    setCheckAll(isCheckAll);
  }, [selectedAccounts, accounts]);

  const onCheckAllChange = (e: CheckboxChangeEvent) => {
    if (e.target.checked) {
      onChange(accounts);
    } else {
      onChange([]);
    }
  };

  const onAccountChange = (checkedValues: string[]) => {
    onChange(checkedValues);
  };

  if (loading || accounts.length === 0) {
    return (
      <Card style={style}>
        <div style={{ color: '#999', textAlign: 'center', padding: '8px' }}>
          {loading ? '正在加载账户...' : '暂无可选账户'}
        </div>
      </Card>
    );
  }

  return (
    <Card style={style}>
      <Space direction="horizontal" style={{ width: '100%' }} wrap>
        <Checkbox
          indeterminate={indeterminate}
          onChange={onCheckAllChange}
          checked={checkAll}
          style={{ fontWeight: 'bold' }}
        >
          全选 ({accounts.length}个账户)
        </Checkbox>

        <Checkbox.Group
          value={selectedAccounts}
          onChange={onAccountChange}
          style={{ flex: 1 }}
        >
          <Space wrap>
            {accounts.map(accountId => (
              <Checkbox key={accountId} value={accountId}>
                {accountId}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </Space>
    </Card>
  );
};

export default AccountSelector;