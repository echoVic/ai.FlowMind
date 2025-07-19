/**
 * 架构图生成相关Hook
 * 使用 Zustand 状态管理，基于 LangChain Agent 的新架构
 * 使用 WebAgentManager 提供环境变量支持和默认Agent初始化
 */
import { toast } from 'react-hot-toast';
import { webAgentManager } from '../services/WebAgentManager';
import {
  useCurrentDiagram,
  useNaturalLanguageInput,
  useIsGenerating,
  useIsOptimizing,
  useAiResponse,
  useSelectedModel,
  useAvailableModels,
  useDirectCallConfig
} from '../stores/hooks';
import { useAppStore } from '../stores/appStore';

export const useDiagramGenerator = () => {
  // 使用 Zustand hooks
  const currentDiagram = useCurrentDiagram();
  const naturalInput = useNaturalLanguageInput();
  const isGenerating = useIsGenerating();
  const isOptimizing = useIsOptimizing();
  const aiResponse = useAiResponse();
  const selectedModel = useSelectedModel();
  const availableModels = useAvailableModels();
  const directCallConfig = useDirectCallConfig();
  
  // 使用 Zustand actions
  const setCurrentDiagram = useAppStore(state => state.setCurrentDiagram);
  const setNaturalInput = useAppStore(state => state.setNaturalLanguageInput);
  const setIsGenerating = useAppStore(state => state.setIsGenerating);
  const setIsOptimizing = useAppStore(state => state.setIsOptimizing);
  const setAiResponse = useAppStore(state => state.setAiResponse);
  const setErrorMessage = useAppStore(state => state.setErrorMessage);

  const generateDiagram = async (description?: string) => {
    const input = description || naturalInput;
    if (!input.trim()) {
      toast.error('请输入需求描述');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // 获取当前选择的模型配置
      const modelInfo = availableModels.find(m => m.name === selectedModel);
      if (!modelInfo) {
        throw new Error('请先选择一个AI模型');
      }

      // 获取提供商配置
      const providerConfig = directCallConfig[modelInfo.provider];
      if (!providerConfig || !providerConfig.apiKey) {
        throw new Error(`请先配置 ${modelInfo.provider} 的API密钥`);
      }

      // 构建模型配置
      const modelConfig = {
        provider: modelInfo.provider as 'openai' | 'anthropic' | 'qwen' | 'volcengine',
        model: modelInfo.model,
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.endpoint,
        temperature: modelInfo.temperature ?? 0.7,
        maxTokens: modelInfo.maxTokens ?? 2048,
      };

      // 使用 WebAgentManager 生成图表
      const result = await webAgentManager.generateDiagram({
        prompt: input,
        diagramType: 'flowchart',
        modelConfig
      });

      if (result.success && result.data) {
        // 更新状态 - 使用web应用期望的AIResponse格式
        setAiResponse({
          explanation: result.data.description,
          suggestions: [],
          mermaidCode: result.data.mermaidCode,
          diagramType: 'flowchart',
          metadata: {
            provider: 'AI',
            model: selectedModel,
            timestamp: new Date().toISOString()
          }
        } as any);

        setCurrentDiagram({
          ...currentDiagram,
          description: input,
          content: result.data.mermaidCode,
          mermaidCode: result.data.mermaidCode,
          type: 'flowchart',
          diagramType: 'flowchart',
          title: result.data.title
        });

        toast.success(`架构图生成成功！`);
      } else {
        throw new Error(result.error || '生成失败');
      }

    } catch (error) {
      console.error('Agent 图表生成失败:', error);
      setErrorMessage(error instanceof Error ? error.message : String(error));

      // 提供具体的错误建议
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('API') || errorMessage.includes('密钥')) {
        toast.error('API 密钥问题，请检查配置');
      } else if (errorMessage.includes('Agent')) {
        toast.error('Agent 初始化失败，请检查配置');
      } else {
        toast.error(errorMessage || '生成失败，请重试');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const optimizeDiagram = async (requirements: string) => {
    if (!requirements.trim()) {
      toast.error('请输入优化要求');
      return;
    }

    if (!currentDiagram.mermaidCode) {
      toast.error('没有可优化的图表代码');
      return;
    }

    setIsOptimizing(true);
    setErrorMessage(null);

    try {
      // 获取当前选择的模型配置
      const modelInfo = availableModels.find(m => m.name === selectedModel);
      if (!modelInfo) {
        throw new Error('请先选择一个AI模型');
      }

      // 获取提供商配置
      const providerConfig = directCallConfig[modelInfo.provider];
      if (!providerConfig || !providerConfig.apiKey) {
        throw new Error(`请先配置 ${modelInfo.provider} 的API密钥`);
      }

      // 构建模型配置
      const modelConfig = {
        provider: modelInfo.provider as 'openai' | 'anthropic' | 'qwen' | 'volcengine',
        model: modelInfo.model,
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.endpoint,
        temperature: modelInfo.temperature ?? 0.7,
        maxTokens: modelInfo.maxTokens ?? 2048,
      };

      // 使用 WebAgentManager 优化图表
      const result = await webAgentManager.optimizeDiagram({
        prompt: requirements,
        diagramType: 'flowchart',
        modelConfig,
        existingCode: currentDiagram.mermaidCode
      });

      if (result.success && result.data) {
        // 更新状态 - 使用web应用期望的AIResponse格式
        setAiResponse({
          explanation: result.data.description,
          suggestions: [],
          mermaidCode: result.data.mermaidCode,
          diagramType: 'flowchart',
          metadata: {
            provider: 'AI',
            model: selectedModel,
            timestamp: new Date().toISOString()
          }
        } as any);

        setCurrentDiagram({
          ...currentDiagram,
          content: result.data.mermaidCode,
          mermaidCode: result.data.mermaidCode,
          type: 'flowchart',
          diagramType: 'flowchart',
          title: result.data.title
        });

        toast.success(`图表优化成功！`);
      } else {
        throw new Error(result.error || '优化失败');
      }

    } catch (error) {
      console.error('Agent 图表优化失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setErrorMessage(errorMessage);
      toast.error(errorMessage || '优化失败，请重试');
    } finally {
      setIsOptimizing(false);
    }
  };

  const validateConnection = async () => {
    try {
      // 使用 WebAgentManager 测试默认Agent
      const defaultAgentId = webAgentManager.getDefaultAgentId();
      if (!defaultAgentId) {
        const result = {
          success: false,
          message: '没有可用的Agent，请先配置API密钥'
        };
        toast.error(result.message);
        return result;
      }

      const result = await webAgentManager.testAgent(defaultAgentId);

      if (result.success) {
        toast.success(result.message);
        console.log('验证详情:', result.details);
      } else {
        toast.error(result.message);
        console.error('验证失败:', result.details);
      }

      return result;

    } catch (error) {
      console.error('连接验证异常:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || '验证失败');
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const diagnoseConnection = async () => {
    console.log('=== Agent 连接诊断开始 ===');
    
    const modelInfo = availableModels.find(m => m.name === selectedModel);
    if (!modelInfo) {
      console.log('诊断结果: 未选择模型');
      return;
    }

    const providerConfig = directCallConfig[modelInfo.provider];
    console.log('诊断信息:');
    console.log('- 提供商:', modelInfo.provider);
    console.log('- 模型:', modelInfo.model);
    console.log('- API密钥状态:', providerConfig?.apiKey ? '已配置' : '未配置');
    console.log('- 已注册的 Agents:', webAgentManager.getAvailableAgents());

    if (providerConfig?.apiKey) {
      console.log('- API密钥预览:', `${providerConfig.apiKey.substring(0, 8)}...`);
      
      try {
        const validation = await validateConnection();
        console.log('- 连接测试结果:', validation.success ? '成功' : '失败');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('- 连接测试异常:', errorMessage);
      }
    }
  };

  const updateMermaidCode = (code: string) => {
    setCurrentDiagram({ ...currentDiagram, mermaidCode: code });
  };

  const resetDiagram = () => {
    setCurrentDiagram({
      title: '',
      content: '',
      mermaidCode: '',
      description: '',
      type: 'flowchart',
      diagramType: 'flowchart',
      tags: []
    });
    setNaturalInput('');
    setAiResponse(null);
    setErrorMessage(null);
    // WebAgentManager 不需要清除历史，因为它是无状态的
  };

  return {
    // 状态
    currentDiagram,
    naturalInput,
    isGenerating,
    isOptimizing,
    aiResponse,
    
    // 操作
    generateDiagram,
    optimizeDiagram,
    updateMermaidCode,
    resetDiagram,
    setNaturalInput,
    
    // 工具
    validateConnection,
    diagnoseConnection
  };
};
