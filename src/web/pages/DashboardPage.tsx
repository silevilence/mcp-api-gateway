// ============================================================
// 核心工作台页面
// ============================================================
import React, { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  uptime: number;
  timestamp: string;
}

export const DashboardPage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/internal/health')
      .then((res) => res.json())
      .then((json) => {
        if (json.code === 0) {
          setHealth(json.data as HealthStatus);
        } else {
          setError(json.message ?? '未知错误');
        }
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div>
      <h1>MCP API Gateway · 工作台</h1>
      <section style={{ marginTop: 16 }}>
        <h2>系统状态</h2>
        {error && <p style={{ color: 'red' }}>连接失败：{error}</p>}
        {health && (
          <ul>
            <li>状态：{health.status}</li>
            <li>运行时间：{Math.floor(health.uptime)}s</li>
            <li>检查时间：{health.timestamp}</li>
          </ul>
        )}
        {!health && !error && <p>正在检测服务状态…</p>}
      </section>
    </div>
  );
};
