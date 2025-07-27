/**
 * AI诊断面板组件
 * 用于测试和诊断AI服务连接状态
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  status: 'success' | 'error' | 'loading';
  message: string;
  details?: any;
}

const DiagnosticPanel: React.FC = () => {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setDiagnostic({ status: 'loading', message: '正在诊断AI服务连接...' });

    try {
      const response = await fetch(`${process.env.AIPA_API_DOMAIN}/api/diagrams/diagnose`);
      const result = await response.json();

      setDiagnostic({
        status: result.status === 'success' ? 'success' : 'error',
        message: result.message,
        details: result.details
      });

    } catch (error) {
      setDiagnostic({
        status: 'error',
        message: '诊断请求失败，请检查网络连接',
        details: { error: error.message }
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = () => {
    switch (diagnostic?.status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'loading':
        return <RefreshCw className="text-blue-500 animate-spin" size={20} />;
      default:
        return <Activity className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (diagnostic?.status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity size={16} className="text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">AI服务诊断</h3>
        </div>

        <motion.button
          onClick={runDiagnostic}
          disabled={isRunning}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Activity size={12} />
          )}
          <span>{isRunning ? '诊断中...' : '开始诊断'}</span>
        </motion.button>
      </div>

      {diagnostic && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg border ${getStatusColor()}`}
        >
          <div className="flex items-center space-x-2 mb-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{diagnostic.message}</span>
          </div>

          {diagnostic.details && (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-gray-600">详细信息:</div>
              
              {typeof diagnostic.details === 'object' && (
                <div className="space-y-1 text-xs">
                  {Object.entries(diagnostic.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className={
                        typeof value === 'boolean' 
                          ? value ? 'text-green-600' : 'text-red-600'
                          : 'text-gray-900'
                      }>
                        {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        诊断功能可以帮助识别AI服务的连接问题，包括API密钥、网络连接和模型可用性。
      </div>
    </div>
  );
};

export default DiagnosticPanel;
