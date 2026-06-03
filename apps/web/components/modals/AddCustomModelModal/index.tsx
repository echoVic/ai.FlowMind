/**
 * 添加自定义模型弹窗组件
 * 使用 Zustand 状态管理，保持原有功能
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { useAddCustomModelModal } from '@/lib/stores/hooks';
import type { AIModelConfig } from '@/types/types';

interface CustomModelForm {
  provider: string;
  displayName: string;
  model: string;
  apiKey: string;
  endpoint?: string;
  description?: string;
  maxTokens?: number;
  temperature?: number;
}

const AddCustomModelModal: React.FC = () => {
  const {
    // 状态
    showAddCustomModel,
    errorMessage: globalErrorMessage,
    successMessage: globalSuccessMessage,
    // 操作
    setShowAddCustomModel,
    saveAndCloseModal,
    showError,
    showSuccess,
    clearMessages
  } = useAddCustomModelModal();

  const [form, setForm] = useState<CustomModelForm>({
    provider: '',
    displayName: '',
    model: '',
    apiKey: '',
    endpoint: '',
    description: '',
    maxTokens: 2048,
    temperature: 0.7
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const providerOptions = [
    { value: 'openai', label: 'OpenAI', icon: '🤖', placeholder: 'gpt-4, gpt-3.5-turbo' },
    { value: 'claude', label: 'Claude (Anthropic)', icon: '🧠', placeholder: 'claude-3-sonnet-20240229' },
    { value: 'volcengine', label: '火山引擎', icon: '🌋', placeholder: 'ep-20250617131345-rshkp' },
    { value: 'qwen', label: 'Qwen (通义千问)', icon: '🌟', placeholder: 'qwen-max, qwen-turbo, qwen-plus' },
    { value: 'azure', label: 'Azure OpenAI', icon: '☁️', placeholder: 'gpt-4' },
    { value: 'gemini', label: 'Google Gemini', icon: '💎', placeholder: 'gemini-pro' },
    { value: 'custom', label: '其他自定义', icon: '⚙️', placeholder: '自定义模型名称' }
  ];

  const handleInputChange = (field: keyof CustomModelForm, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // 清除错误消息
    if (globalErrorMessage) {
      clearMessages();
    }
  };

  const validateForm = (): string | null => {
    if (!form.provider.trim()) return '请选择服务商';
    if (!form.displayName.trim()) return '请输入模型显示名称';
    if (!form.model.trim()) return '请输入模型名称';
    if (!form.apiKey.trim()) return '请输入API密钥';
    
    if (form.maxTokens && (form.maxTokens < 1 || form.maxTokens > 32000)) {
      return 'Max Tokens 应在 1-32000 之间';
    }
    
    if (form.temperature && (form.temperature < 0 || form.temperature > 2)) {
      return 'Temperature 应在 0-2 之间';
    }
    
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      showError(validationError);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 构建模型配置
      const modelConfig: Omit<AIModelConfig, 'name'> = {
        displayName: form.displayName.trim(),
        provider: form.provider,
        model: form.model.trim(),
        apiKey: form.apiKey.trim(),
        endpoint: form.endpoint?.trim() || undefined,
        description: form.description?.trim() || `自定义${form.provider}模型`,
        maxTokens: form.maxTokens || 2048,
        temperature: form.temperature || 0.7,
        enabled: true,
        supportDirectCall: true,
        implementationType: form.provider === 'openai' ? 'openai-native' : 
                           form.provider === 'claude' ? 'anthropic-native' : 
                           form.provider === 'qwen' ? 'qwen-native' : 'openai-compatible',
        useOpenAIFormat: form.provider !== 'claude',
        isUsingDefaultKey: false,
        icon: providerOptions.find(p => p.value === form.provider)?.icon || '⚙️'
      };

      const result = saveAndCloseModal(modelConfig);
      
      if (result) {
        showSuccess('自定义模型添加成功！');
        
        // 重置表单
        setForm({
          provider: '',
          displayName: '',
          model: '',
          apiKey: '',
          endpoint: '',
          description: '',
          maxTokens: 2048,
          temperature: 0.7
        });
      } else {
        showError('添加模型失败，请重试');
      }
    } catch (error) {
      console.error('添加自定义模型失败:', error);
      showError('添加模型失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowAddCustomModel(false);
    clearMessages();
  };

  const selectedProvider = providerOptions.find(p => p.value === form.provider);

  return (
    <AnimatePresence>
      {showAddCustomModel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg w-[600px] max-h-[90vh] overflow-y-auto"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Plus size={20} className="text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">添加自定义模型</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6 space-y-6">
              {/* 提示信息 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">添加自定义模型</p>
                    <p>您的API密钥将安全存储在浏览器本地，不会发送到我们的服务器。添加后可在模型选择器中使用。</p>
                  </div>
                </div>
              </div>

              {/* 表单 */}
              <div className="space-y-4">
                {/* 服务商选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    服务商 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.provider}
                    onChange={(e) => handleInputChange('provider', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">请选择服务商</option>
                    {providerOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 模型显示名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模型显示名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    placeholder="例如：GPT-4 自定义版本"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 模型名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模型名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder={selectedProvider?.placeholder || '请输入模型名称'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    这是调用API时使用的实际模型名称
                  </p>
                </div>

                {/* API 密钥 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API 密钥 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    placeholder="请输入API密钥"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 自定义端点 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    自定义端点 (可选)
                  </label>
                  <input
                    type="url"
                    value={form.endpoint}
                    onChange={(e) => handleInputChange('endpoint', e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    如不填写将使用默认端点
                  </p>
                </div>

                {/* 描述 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述 (可选)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="简单描述这个模型的特点..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* 高级配置 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      value={form.maxTokens}
                      onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
                      min="1"
                      max="32000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature
                    </label>
                    <input
                      type="number"
                      value={form.temperature}
                      onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                      min="0"
                      max="2"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 错误/成功消息 */}
              {globalErrorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2"
                >
                  <AlertCircle size={16} className="text-red-600" />
                  <span className="text-sm text-red-800">{globalErrorMessage}</span>
                </motion.div>
              )}

              {globalSuccessMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2"
                >
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm text-green-800">{globalSuccessMessage}</span>
                </motion.div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>添加中...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>添加模型</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddCustomModelModal;