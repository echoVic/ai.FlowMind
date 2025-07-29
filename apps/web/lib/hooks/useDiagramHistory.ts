/**
 * 架构图历史记录Hook
 * 使用 Zustand 状态管理，处理保存、加载、删除历史记录（基于本地存储）
 */
import type { DiagramData } from '@/types/types';
import { useMount } from 'ahooks';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../stores/appStore';
import {
  useCurrentDiagram,
  useDiagramHistory as useDiagramHistoryState,
  useIsSaving
} from '../stores/hooks';

const STORAGE_KEY = 'diagram-history';

export const useDiagramHistory = () => {
  const currentDiagram = useCurrentDiagram();
  const diagramHistory = useDiagramHistoryState();
  const isSaving = useIsSaving();
  
  const setCurrentDiagram = useAppStore(state => state.setCurrentDiagram);
  const setDiagramHistory = useAppStore(state => state.setDiagramHistory);
  const setIsSaving = useAppStore(state => state.setIsSaving);
  const [isLoading, setIsLoading] = useState(true);

  // 从本地存储加载历史记录
  useMount(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedHistory = JSON.parse(stored);
        setDiagramHistory(parsedHistory);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  });

  // 保存历史记录到本地存储
  const saveHistoryToStorage = (history: DiagramData[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  };

  const saveDiagram = async (saveData?: Partial<DiagramData>) => {
    const dataToSave = {
      ...currentDiagram,
      ...saveData,
      id: saveData?.id || Date.now().toString(),
      createdAt: saveData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!dataToSave.title || !dataToSave.mermaidCode) {
      toast.error('请填写标题和生成架构图');
      return false;
    }

    setIsSaving(true);

    try {
      const existingIndex = diagramHistory.findIndex(d => d.id === dataToSave.id);
      let newHistory: DiagramData[];
      
      if (existingIndex >= 0) {
        // 更新existing记录
        newHistory = [...diagramHistory];
        newHistory[existingIndex] = dataToSave;
      } else {
        // 添加新记录
        newHistory = [dataToSave, ...diagramHistory];
      }

      setDiagramHistory(newHistory);
      saveHistoryToStorage(newHistory);
      
      toast.success('架构图保存成功！');
      return true;

    } catch (error) {
      console.error('保存架构图失败:', error);
      toast.error('保存失败，请重试');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const loadDiagram = (diagram: DiagramData) => {
    setCurrentDiagram(diagram);
    toast.success('架构图加载成功！');
  };

  const deleteDiagram = async (id: string) => {
    try {
      const newHistory = diagramHistory.filter(d => d.id !== id);
      setDiagramHistory(newHistory);
      saveHistoryToStorage(newHistory);
      
      toast.success('架构图删除成功！');
      return true;

    } catch (error) {
      console.error('删除架构图失败:', error);
      toast.error('删除失败，请重试');
      return false;
    }
  };

  return {
    history: diagramHistory,
    isLoading,
    error: null,
    isSaving,
    saveDiagram,
    loadDiagram,
    deleteDiagram
  };
};
