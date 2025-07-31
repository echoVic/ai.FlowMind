/**
 * 架构图生成相关Hook
 * 使用 Zustand 状态管理，基于 LangChain Agent 的新架构
 */
import type { AIModelConfig, DiagramData, DirectCallConfig } from '@/types/types';
import { toast } from 'react-hot-toast';
import type { DiagramGenerationRequest } from '../agents/DiagramAgent';
import { agentManager } from '../services/AgentManager';
import { useAppStore } from '../stores/appStore';
import {
    useAiResponse,
    useAvailableModels,
    useCurrentDiagram,
    useDirectCallConfig,
    useIsGenerating,
    useIsOptimizing,
    useNaturalLanguageInput,
    useSelectedModel
} from '../stores/hooks';
import { extendSession, getCurrentSessionId } from '../utils/sessionUtils';

/**
 * 根据模型名称推断提供商类型
 */
const getProviderFromModel = (modelName: string): string => {
  if (modelName.startsWith('ep-') || modelName.includes('doubao') || modelName.includes('volcengine')) {
    return 'volcengine';
  }
  if (modelName.startsWith('gpt-') || modelName.includes('openai')) {
    return 'openai';
  }
  if (modelName.startsWith('claude-') || modelName.includes('anthropic')) {
    return 'anthropic';
  }
  if (modelName.includes('qwen') || modelName.includes('dashscope')) {
    return 'qwen';
  }
  
  // 默认返回 volcengine (因为大多数模型是火山引擎的)
  return 'volcengine';
};

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
    setErrorMessage(null);

    try {
      console.log('=== 基于 Agent 的图表生成开始 ===');
      console.log('输入描述:', input);
      console.log('选择的模型:', selectedModel);
      console.log('可用模型数量:', availableModels.length);

      // 尝试使用默认 Agent 或查找现有 Agent
      let agentKey: string | undefined;
      
      // 如果有可用模型配置，使用传统方式
      if (availableModels.length > 0) {
        // 优先按 model 字段匹配，其次按 name 字段匹配
        const modelInfo = availableModels.find(m => m.model === selectedModel) || 
                         availableModels.find(m => m.name === selectedModel);
        if (!modelInfo) {
          console.warn(`未找到选择的模型配置: ${selectedModel}，可用模型:`, availableModels.map(m => ({ name: m.name, model: m.model })));
          throw new Error(`未找到选择的模型配置: ${selectedModel}`);
        }

        const providerConfig = directCallConfig[modelInfo.provider];
        if (!providerConfig?.apiKey) {
          throw new Error(`请先配置 ${modelInfo.provider} 的 API 密钥`);
        }

        agentKey = ensureAgentRegistered(modelInfo, providerConfig);
      } else {
        // 如果没有可用模型但有选择的模型，尝试从环境变量获取对应的 Agent
        if (selectedModel) {
          // 根据选择的模型来判断应该使用哪个默认 Agent
          const providerType = getProviderFromModel(selectedModel);
          const defaultAgentKey = `${providerType}-default`;
          
          // 检查是否有对应的默认 Agent
          const availableAgents = agentManager.getAvailableAgents();
          if (availableAgents.includes(defaultAgentKey)) {
            // 如果选择的模型和默认 Agent 的模型不同，需要创建新的 Agent
            const currentDefaultAgent = agentManager.getAgent(defaultAgentKey);
            if (currentDefaultAgent && (currentDefaultAgent as any).modelName !== selectedModel) {
              // 创建专门针对选择模型的 Agent
              const specificAgentKey = `${providerType}-${selectedModel}`;
              if (!availableAgents.includes(specificAgentKey)) {
                // 获取对应提供商的API密钥
                let apiKey = '';
                switch (providerType) {
                  case 'volcengine':
                    apiKey = process.env.NEXT_PUBLIC_ARK_API_KEY || '';
                    break;
                  case 'openai':
                    apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
                    break;
                  case 'anthropic':
                    apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '';
                    break;
                  case 'qwen':
                    apiKey = process.env.NEXT_PUBLIC_QWEN_API_KEY || '';
                    break;
                }
                
                // 如果没有API密钥，抛出明确的错误
                if (!apiKey) {
                  throw new Error(`请先配置 ${providerType} 的 API 密钥`);
                }
                
                agentManager.registerAgent(specificAgentKey, {
                  apiKey,
                  provider: providerType as 'volcengine' | 'openai' | 'anthropic' | 'qwen',
                  modelName: selectedModel,
                  temperature: 0.7,
                  maxTokens: 2048,
                  enableMemory: false
                });
              }
              agentKey = specificAgentKey;
              console.log(`使用专门的 Agent: ${specificAgentKey} (模型: ${selectedModel})`);
            } else {
              agentKey = defaultAgentKey;
              console.log(`使用默认 Agent: ${defaultAgentKey}`);
            }
          } else {
            console.log('未找到对应的默认 Agent，使用全局默认 Agent');
            agentKey = undefined;
          }
        } else {
          // 使用全局默认 Agent
          console.log('使用全局默认 Agent');
          agentKey = undefined;
        }
      }

      // 构建生成请求
      const request: DiagramGenerationRequest = {
        description: input,
        diagramType: currentDiagram.diagramType,
        existingCode: currentDiagram.mermaidCode
      };

      console.log('发送给 Agent 的请求:', request);
      console.log('使用的 Agent:', agentKey || 'default');

      // 获取当前会话ID
      const sessionId = getCurrentSessionId();
      console.log('使用会话ID:', sessionId);
      
      // 使用 Agent 生成图表（带会话隔离）
      const result = await agentManager.generateDiagram(request, agentKey, sessionId);
      
      // 延长会话有效期
      extendSession();

      console.log('Agent 生成成功，结果:', result);

      // 转换 Agent 结果为前端格式
      const frontendResult = {
        mermaidCode: result.mermaidCode,
        explanation: result.explanation,
        suggestions: result.suggestions,
        diagramType: result.diagramType as DiagramData['diagramType'],
        metadata: result.metadata
      };

      setAiResponse(frontendResult);
      setCurrentDiagram({
        ...currentDiagram,
        description: input,
        mermaidCode: result.mermaidCode,
        diagramType: result.diagramType as DiagramData['diagramType']
      });

      const providerName = result.metadata.provider || 'AI';
      toast.success(`架构图生成成功！(使用 ${providerName})`);

    } catch (error) {
      console.error('Agent 图表生成失败:', error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      
      // 提供具体的错误建议
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('API') || errorMessage.includes('密钥')) {
        toast.error('API 密钥问题，请检查配置');
      } else if (errorMessage.includes('Agent not found')) {
        toast.error('Agent 未找到，请检查是否已配置 API 密钥');
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
      console.log('=== 基于 Agent 的图表优化开始 ===');
      console.log('优化要求:', requirements);
      console.log('现有代码长度:', currentDiagram.mermaidCode.length);

      // 尝试使用默认 Agent 或查找现有 Agent
      let agentKey: string | undefined;
      
      // 如果有可用模型配置，使用传统方式
      if (availableModels.length > 0) {
        // 优先按 model 字段匹配，其次按 name 字段匹配
        const modelInfo = availableModels.find(m => m.model === selectedModel) || 
                         availableModels.find(m => m.name === selectedModel);
        if (!modelInfo) {
          console.warn(`未找到选择的模型配置: ${selectedModel}，可用模型:`, availableModels.map(m => ({ name: m.name, model: m.model })));
          throw new Error(`未找到选择的模型配置: ${selectedModel}`);
        }

        const providerConfig = directCallConfig[modelInfo.provider];
        if (!providerConfig?.apiKey) {
          throw new Error(`请先配置 ${modelInfo.provider} 的 API 密钥`);
        }

        agentKey = ensureAgentRegistered(modelInfo, providerConfig);
      } else {
        // 如果没有可用模型但有选择的模型，尝试从环境变量获取对应的 Agent
        if (selectedModel) {
          // 根据选择的模型来判断应该使用哪个默认 Agent
          const providerType = getProviderFromModel(selectedModel);
          const defaultAgentKey = `${providerType}-default`;
          
          // 检查是否有对应的默认 Agent
          const availableAgents = agentManager.getAvailableAgents();
          if (availableAgents.includes(defaultAgentKey)) {
            // 如果选择的模型和默认 Agent 的模型不同，需要创建新的 Agent
            const currentDefaultAgent = agentManager.getAgent(defaultAgentKey);
            if (currentDefaultAgent && (currentDefaultAgent as any).modelName !== selectedModel) {
              // 创建专门针对选择模型的 Agent
              const specificAgentKey = `${providerType}-${selectedModel}`;
              if (!availableAgents.includes(specificAgentKey)) {
                agentManager.registerAgent(specificAgentKey, {
                  apiKey: process.env.NEXT_PUBLIC_ARK_API_KEY || '',
                  provider: providerType as 'volcengine' | 'openai' | 'anthropic' | 'qwen',
                  modelName: selectedModel,
                  temperature: 0.7,
                  maxTokens: 2048,
                  enableMemory: false
                });
              }
              agentKey = specificAgentKey;
              console.log(`使用专门的 Agent: ${specificAgentKey} (模型: ${selectedModel})`);
            } else {
              agentKey = defaultAgentKey;
              console.log(`使用默认 Agent: ${defaultAgentKey}`);
            }
          } else {
            console.log('未找到对应的默认 Agent，使用全局默认 Agent');
            agentKey = undefined;
          }
        } else {
          // 使用全局默认 Agent
          console.log('使用全局默认 Agent');
          agentKey = undefined;
        }
      }

      // 获取当前会话ID
      const sessionId = getCurrentSessionId();
      console.log('使用会话ID:', sessionId);
      
      // 使用 Agent 优化图表（带会话隔离）
      const result = await agentManager.optimizeDiagram(
        currentDiagram.mermaidCode,
        requirements,
        agentKey,
        sessionId
      );
      
      // 延长会话有效期
      extendSession();

      console.log('Agent 优化成功，结果:', result);

      // 转换 Agent 结果为前端格式
      const frontendResult = {
        mermaidCode: result.mermaidCode,
        explanation: result.explanation,
        suggestions: result.suggestions,
        diagramType: result.diagramType as DiagramData['diagramType'],
        metadata: result.metadata
      };

      setAiResponse(frontendResult);
      setCurrentDiagram({
        ...currentDiagram,
        mermaidCode: result.mermaidCode,
        diagramType: result.diagramType as DiagramData['diagramType']
      });

      const providerName = result.metadata.provider || 'AI';
      toast.success(`图表优化成功！(使用 ${providerName})`);

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
      console.log('=== Agent 连接验证开始 ===');
      
      // 优先按 model 字段匹配，其次按 name 字段匹配
      const modelInfo = availableModels.find(m => m.model === selectedModel) || 
                       availableModels.find(m => m.name === selectedModel);
      if (!modelInfo) {
        console.warn(`未找到选择的模型配置: ${selectedModel}，可用模型:`, availableModels.map(m => ({ name: m.name, model: m.model })));
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

      // 获取当前会话ID进行测试
      const sessionId = getCurrentSessionId();
      const result = await agentManager.testAgent(testAgentKey, sessionId);
      
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
    
    // 优先按 model 字段匹配，其次按 name 字段匹配
    const modelInfo = availableModels.find(m => m.model === selectedModel) || 
                     availableModels.find(m => m.name === selectedModel);
    if (!modelInfo) {
      console.log('诊断结果: 未找到选择的模型配置');
      console.log('当前选择的模型:', selectedModel);
      console.log('可用模型:', availableModels.map(m => ({ name: m.name, model: m.model })));
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
    setCurrentDiagram({ ...currentDiagram, mermaidCode: code });
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
    setAiResponse(null);
    setErrorMessage(null);
    
    // 清空当前会话的历史
    const sessionId = getCurrentSessionId();
    agentManager.clearSessionHistory(sessionId);
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