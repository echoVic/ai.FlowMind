/**
 * 会话隔离测试组件
 * 用于验证和演示会话隔离功能
 */
import { testSessionIsolation } from '@/lib/utils/sessionTest';
import { clearCurrentSession, getCurrentSessionId, getSessionRemainingTime } from '@/lib/utils/sessionUtils';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { useState } from 'react';

const { Title, Text, Paragraph } = Typography;

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    session1History: number;
    session2History: number;
    globalHistory: number;
  };
}

export default function SessionIsolationTest() {
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 刷新会话信息
  const refreshSessionInfo = () => {
    setCurrentSessionId(getCurrentSessionId());
    setRemainingTime(getSessionRemainingTime());
  };

  // 运行隔离测试
  const runIsolationTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const result = await testSessionIsolation();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `测试异常: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 清除当前会话
  const handleClearSession = () => {
    clearCurrentSession();
    refreshSessionInfo();
  };

  // 格式化剩余时间
  const formatRemainingTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}小时${minutes}分钟`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>会话隔离测试</Title>
      
      <Alert
        message="会话隔离功能说明"
        description="此功能确保不同用户的对话历史完全隔离，每个浏览器会话都有独立的sessionId和Agent实例。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Card title="当前会话信息" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>会话ID: </Text>
            <Text code>{currentSessionId || '未获取'}</Text>
          </div>
          <div>
            <Text strong>剩余时间: </Text>
            <Text>{remainingTime > 0 ? formatRemainingTime(remainingTime) : '已过期'}</Text>
          </div>
          <Space>
            <Button onClick={refreshSessionInfo}>刷新信息</Button>
            <Button onClick={handleClearSession} danger>清除会话</Button>
          </Space>
        </Space>
      </Card>

      <Card title="隔离测试" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Paragraph>
            此测试将模拟两个不同的会话，验证它们的对话历史是否正确隔离。
          </Paragraph>
          
          <Button 
            type="primary" 
            onClick={runIsolationTest}
            loading={isLoading}
          >
            运行隔离测试
          </Button>

          {testResult && (
            <Alert
              message={testResult.success ? '测试通过' : '测试失败'}
              description={
                <div>
                  <div>{testResult.message}</div>
                  {testResult.details && (
                    <div style={{ marginTop: '8px' }}>
                      <Text>会话1历史: {testResult.details.session1History}条</Text><br/>
                      <Text>会话2历史: {testResult.details.session2History}条</Text><br/>
                      <Text>全局历史: {testResult.details.globalHistory}条</Text>
                    </div>
                  )}
                </div>
              }
              type={testResult.success ? 'success' : 'error'}
              showIcon
            />
          )}
        </Space>
      </Card>

      <Card title="技术说明">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4}>问题背景</Title>
          <Paragraph>
            在多用户环境下，不同用户使用相同模型时会共享Agent实例，导致对话历史混淆。
          </Paragraph>

          <Title level={4}>解决方案</Title>
          <Paragraph>
            <ul>
              <li>为每个浏览器会话生成唯一的sessionId</li>
              <li>AgentManager支持基于sessionId的Agent隔离</li>
              <li>每个sessionId对应独立的Agent实例和对话历史</li>
              <li>会话ID存储在localStorage中，24小时有效期</li>
            </ul>
          </Paragraph>

          <Title level={4}>数据结构</Title>
          <Paragraph>
            <Text code>
              sessionAgents: Map&lt;sessionId, Map&lt;modelKey, Agent&gt;&gt;
            </Text>
          </Paragraph>

          <Title level={4}>API变更</Title>
          <Paragraph>
            所有chat相关API都支持sessionId参数，实现会话级隔离。
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
}