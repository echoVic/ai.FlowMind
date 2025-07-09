/**
 * 架构图生成相关Hook
 * 基于 LangChain Agent 的新架构
 */
import { useAtom } from 'jotai';
import { toast } from 'react-hot-toast';
import type { DiagramGenerationRequest } from '../agents/DiagramAgent';
import { agentManager } from '../services/AgentManager';
import type { AIModelConfig, DirectCallConfig, DiagramData } from '../shared/types';
import {
  aiResponseAtom,
  availableModelsAtom,
  currentDiagramAtom,
  directCallConfigAtom,
  errorMessageAtom,
  isGeneratingAtom,
  isOptimizingAtom,
  naturalLanguageInputAtom,
  selectedModelAtom
} from '../stores/diagramStore';

export const useDiagramGenerator = () => {
  const [currentDiagram, setCurrentDiagram] = useAtom(currentDiagramAtom);
  const [naturalInput, setNaturalInput] = useAtom(naturalLanguageInputAtom);
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom);
  const [isOptimizing, setIsOptimizing] = useAtom(isOptimizingAtom);
  const [aiResponse, setAiResponse] = useAtom(aiResponseAtom);
  const [, setErrorMessage] = useAtom(errorMessageAtom);
  const [selectedModel] = useAtom(selectedModelAtom);
  const [availableModels] = useAtom(availableModelsAtom);
  const [directCallConfig] = useAtom(directCallConfigAtom);

  // 类型断言修复 TypeScript 错误
  const safeSetErrorMessage = setErrorMessage as (value: string | null) => void;
  const safeSetAiResponse = setAiResponse as (value: any) => void;

  /**
   * 注册或更新 Agent
   */
  const ensureAgentRegistered = (modelInfo: AIModelConfig, providerConfig: DirectCallConfig): string => {
    const agentKey = `${modelInfo.provider}-${modelInfo.name}`;
    
    try {
      agentManager.registerAgent(agentKey, {
        apiKey: providerConfig.apiKey,
        provider: modelInfo.provider as 'volcengine' | 'openai' | 'anthropic',
        modelName: modelInfo.model,
        temperature: modelInfo.temperature,
        maxTokens: modelInfo.maxTokens,
        enableMemory: false
      });
      console.log(`Agent 注册成功: ${agentKey}`);
      return agentKey;
    } catch (error) {
      console.error(`Agent 注册失败: ${agentKey}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Agent 注册失败: ${errorMessage}`);
    }
  };

  const generateDiagram = async (description?: string) => {
    const input = description || naturalInput;
    if (!input.trim()) {
      toast.error('请输入需求描述');
      return;
    }

    setIsGenerating(true);
    safeSetErrorMessage(null);

    try {
      console.log('=== 基于 Agent 的图表生成开始 ===');
      console.log('输入描述:', input);
      console.log('选择的模型:', selectedModel);
      console.log('可用模型数量:', availableModels.length);

      // 尝试使用默认 Agent 或查找现有 Agent
      let agentKey: string | undefined;
      
      // 如果有可用模型配置，使用传统方式
      if (availableModels.length > 0) {
        const modelInfo = availableModels.find(m => m.name === selectedModel);
        if (!modelInfo) {
          throw new Error('未找到选择的模型配置');
        }

        const providerConfig = directCallConfig[modelInfo.provider];
        if (!providerConfig?.apiKey) {
          throw new Error(`请先配置 ${modelInfo.provider} 的 API 密钥`);
        }

        agentKey = ensureAgentRegistered(modelInfo, providerConfig);
      } else {
        // 使用默认 Agent
        console.log('使用默认 Agent');
        agentKey = undefined; // 使用默认 Agent
      }

      // 构建生成请求
      const request: DiagramGenerationRequest = {
        description: input,
        diagramType: currentDiagram.diagramType,
        existingCode: currentDiagram.mermaidCode
      };

      console.log('发送给 Agent 的请求:', request);
      console.log('使用的 Agent:', agentKey || 'default');

      // 使用 Agent 生成图表
      const result = await agentManager.generateDiagram(request, agentKey);

      console.log('Agent 生成成功，结果:', result);

      // 转换 Agent 结果为前端格式
      const frontendResult = {
        mermaidCode: result.mermaidCode,
        explanation: result.explanation,
        suggestions: result.suggestions,
        diagramType: result.diagramType,
        metadata: result.metadata
      };

      safeSetAiResponse(frontendResult);
      setCurrentDiagram(prev => ({
        ...prev,
        description: input,
        mermaidCode: result.mermaidCode,
        diagramType: result.diagramType as DiagramData['diagramType']
      }));

      const providerName = result.metadata.provider || 'AI';
      toast.success(`架构图生成成功！(使用 ${providerName})`);

    } catch (error) {
      console.error('Agent 图表生成失败:', error);
      safeSetErrorMessage(error instanceof Error ? error.message : String(error));
      
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
    safeSetErrorMessage(null);

    try {
      console.log('=== 基于 Agent 的图表优化开始 ===');
      console.log('优化要求:', requirements);
      console.log('现有代码长度:', currentDiagram.mermaidCode.length);

      // 尝试使用默认 Agent 或查找现有 Agent
      let agentKey: string | undefined;
      
      // 如果有可用模型配置，使用传统方式
      if (availableModels.length > 0) {
        const modelInfo = availableModels.find(m => m.name === selectedModel);
        if (!modelInfo) {
          throw new Error('未找到选择的模型配置');
        }

        const providerConfig = directCallConfig[modelInfo.provider];
        if (!providerConfig?.apiKey) {
          throw new Error(`请先配置 ${modelInfo.provider} 的 API 密钥`);
        }

        agentKey = ensureAgentRegistered(modelInfo, providerConfig);
      } else {
        // 使用默认 Agent
        console.log('使用默认 Agent');
        agentKey = undefined;
      }

      // 使用 Agent 优化图表
      const result = await agentManager.optimizeDiagram(
        currentDiagram.mermaidCode,
        requirements,
        agentKey
      );

      console.log('Agent 优化成功，结果:', result);

      // 转换 Agent 结果为前端格式
      const frontendResult = {
        mermaidCode: result.mermaidCode,
        explanation: result.explanation,
        suggestions: result.suggestions,
        diagramType: result.diagramType,
        metadata: result.metadata
      };

      safeSetAiResponse(frontendResult);
      setCurrentDiagram(prev => ({
        ...prev,
        mermaidCode: result.mermaidCode,
        diagramType: result.diagramType as DiagramData['diagramType']
      }));

      const providerName = result.metadata.provider || 'AI';
      toast.success(`图表优化成功！(使用 ${providerName})`);

    } catch (error) {
      console.error('Agent 图表优化失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      safeSetErrorMessage(errorMessage);
      toast.error(errorMessage || '优化失败，请重试');
    } finally {
      setIsOptimizing(false);
    }
  };

  const validateConnection = async () => {
    try {
      console.log('=== Agent 连接验证开始 ===');
      
      const modelInfo = availableModels.find(m => m.name === selectedModel);
      if (!modelInfo) {
        throw new Error('未找到选择的模型配置');
      }

      const providerConfig = directCallConfig[modelInfo.provider];
      if (!providerConfig?.apiKey) {
        throw new Error(`请先配置 ${modelInfo.provider} 的 API 密钥`);
      }

      // 注册临时 Agent 进行测试
      const testAgentKey = `test-${modelInfo.provider}-${Date.now()}`;
      agentManager.registerAgent(testAgentKey, {
        apiKey: providerConfig.apiKey,
        provider: modelInfo.provider as 'volcengine' | 'openai' | 'anthropic',
        modelName: modelInfo.model,
        temperature: 0.7,
        maxTokens: 100,
        enableMemory: false
      });

      const result = await agentManager.testAgent(testAgentKey);
      
      // 清理测试 Agent
      agentManager.removeAgent(testAgentKey);

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
    console.log('- 已注册的 Agents:', agentManager.getAvailableAgents());

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
    setCurrentDiagram(prev => ({ ...prev, mermaidCode: code }));
  };

  const resetDiagram = () => {
    setCurrentDiagram({
      title: '',
      mermaidCode: '',
      description: '',
      diagramType: 'flowchart',
      tags: []
    });
    setNaturalInput('');
    safeSetAiResponse(null);
    safeSetErrorMessage(null);
    agentManager.clearAllHistory();
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