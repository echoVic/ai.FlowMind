/**
 * API连接验证面板
 * 提供前端和服务端的连接验证功能
 */
import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Zap, Server, Loader2, Wifi } from 'lucide-react';
import { selectedModelAtom, availableModelsAtom, useDirectCallAtom } from '../../../stores/diagramStore';
import { useDiagramGenerator } from '../../../hooks/useDiagramGenerator';

const ValidationPanel: React.FC = () => {
  const [selectedModel] = useAtom(selectedModelAtom);
  const [availableModels] = useAtom(availableModelsAtom);
  const [useDirectCall] = useAtom(useDirectCallAtom);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  const { validateConnection, diagnoseConnection } = useDiagramGenerator();

  const modelInfo = availableModels.find(m => m.name === selectedModel);

  const handleValidateConnection = async () => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      let result;
      
      if (useDirectCall) {
        // 前端验证
        result = await validateConnection();
      } else {
        // 服务端验证
        result = await diagnoseConnection();
      }
      
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        success: false,
        message: error.message,
        details: { error: error.message }
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'volcengine':
        return '🌋';
      case 'openai':
        return '🤖';
      case 'claude':
        return '🧠';
      default:
        return '⚡';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-lg p-4 space-y-4"
    >
      <div className="flex items-center space-x-2">
        <Wifi size={20} className="text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">连接验证</h3>
      </div>

      {/* 当前配置信息 */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="text-sm font-medium text-gray-700">当前配置</div>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{modelInfo ? getProviderIcon(modelInfo.provider) : '❓'}</span>
            <span>模型: {modelInfo?.displayName || selectedModel}</span>
          </div>
          <div className="flex items-center space-x-2">
            {useDirectCall ? (
              <>
                <Zap size={14} className="text-green-600" />
                <span>前端直接调用</span>
              </>
            ) : (
              <>
                <Server size={14} className="text-blue-600" />
                <span>服务端转发调用</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 验证按钮 */}
      <button
        onClick={handleValidateConnection}
        disabled={isValidating}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isValidating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>验证中...</span>
          </>
        ) : (
          <>
            <CheckCircle size={16} />
            <span>验证连接</span>
          </>
        )}
      </button>

      {/* 验证结果 */}
      {validationResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-lg p-3 ${
            validationResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-start space-x-2">
            {validationResult.success ? (
              <CheckCircle size={16} className="text-green-600 mt-0.5" />
            ) : (
              <XCircle size={16} className="text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <div className={`text-sm font-medium ${
                validationResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {validationResult.message}
              </div>
              
              {validationResult.details && (
                <div className="mt-2 space-y-1">
                  {validationResult.success ? (
                    <>
                      {validationResult.details.model && (
                        <div className="text-xs text-green-700">
                          模型: {validationResult.details.model}
                        </div>
                      )}
                      {validationResult.details.responseTime && (
                        <div className="text-xs text-green-700">
                          响应时间: {validationResult.details.responseTime}ms
                        </div>
                      )}
                      {validationResult.details.usage && (
                        <div className="text-xs text-green-700">
                          Token使用: {validationResult.details.usage.totalTokens || 'N/A'}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {validationResult.details.error && (
                        <div className="text-xs text-red-700">
                          错误: {validationResult.details.error}
                        </div>
                      )}
                      {validationResult.details.apiKeyPreview && (
                        <div className="text-xs text-red-700">
                          API密钥: {validationResult.details.apiKeyPreview}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* 说明文字 */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>• 前端直接调用：验证浏览器到AI服务的连接</div>
        <div>• 服务端转发：验证服务器到AI服务的连接</div>
        <div>• 建议先验证连接再进行正式调用</div>
      </div>
    </motion.div>
  );
};

export default ValidationPanel;
