/**
 * 架构图全局状态管理
 * 修正模型选择的默认值，确保与服务端一致
 */
import { atom } from 'jotai';
import type { AIModelConfig, AIResponse, DiagramData, DirectCallConfig } from '../shared/types';

// 当前架构图数据
export const currentDiagramAtom = atom<DiagramData>({
  title: '',
  description: '',
  mermaidCode: `graph TD
    A[开始] --> B[输入需求]
    B --> C[AI生成代码]
    C --> D[实时预览]
    D --> E[优化调整]
    E --> F[保存分享]`,
  diagramType: 'flowchart',
  tags: []
});

// 自然语言输入
export const naturalLanguageInputAtom = atom<string>('');

// 加载状态
export const isGeneratingAtom = atom<boolean>(false);
export const isOptimizingAtom = atom<boolean>(false);
export const isSavingAtom = atom<boolean>(false);

// AI响应数据
export const aiResponseAtom = atom<AIResponse | null>(null);

// AI模型相关状态 - 修正默认值
export const availableModelsAtom = atom<AIModelConfig[]>([]);
export const selectedModelAtom = atom<string>('ep-20250617131345-rshkp'); // 豆包默认端点，与 Agent 配置一致
export const isLoadingModelsAtom = atom<boolean>(false);

// 直接调用配置（暂时不使用，但保留接口）
export const useDirectCallAtom = atom<boolean>(false);
export const directCallConfigAtom = atom<Record<string, DirectCallConfig>>({});

// 模型选择面板状态
export const modelSelectorOpenAtom = atom<boolean>(false);

// 编辑器配置
export const editorConfigAtom = atom({
  theme: 'vs-dark' as const,
  fontSize: 14,
  wordWrap: 'on' as const,
  minimap: { enabled: false }
});

// 历史记录
export const diagramHistoryAtom = atom<DiagramData[]>([]);

// 预览配置
export const previewConfigAtom = atom({
  theme: 'default' as const,
  scale: 1,
  panZoom: true
});

// 侧边栏状态
export const sidebarOpenAtom = atom<boolean>(false);

// 错误状态
export const errorMessageAtom = atom<string | null>(null);

// 成功消息
export const successMessageAtom = atom<string | null>(null);