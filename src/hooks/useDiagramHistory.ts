/**
 * 架构图历史记录Hook
 * 处理保存、加载、删除历史记录
 */
import { useAtom } from 'jotai';
import { toast } from 'react-hot-toast';
import useSWR, { mutate } from 'swr';
import {
  currentDiagramAtom,
  diagramHistoryAtom,
  isSavingAtom
} from '../stores/diagramStore';
import type { DiagramData } from '../shared/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export const useDiagramHistory = () => {
  const [currentDiagram, setCurrentDiagram] = useAtom(currentDiagramAtom);
  const [, setDiagramHistory] = useAtom(diagramHistoryAtom);
  const [isSaving, setIsSaving] = useAtom(isSavingAtom);

  // 获取历史记录
  const { data, error, isLoading } = useSWR(
    `${process.env.AIPA_API_DOMAIN}/api/diagrams/history`,
    fetcher,
    {
      onSuccess: (data) => {
        setDiagramHistory(data.diagrams || []);
      }
    }
  );

  const saveDiagram = async (saveData?: Partial<DiagramData>) => {
    const dataToSave = {
      ...currentDiagram,
      ...saveData
    };

    if (!dataToSave.title || !dataToSave.mermaidCode) {
      toast.error('请填写标题和生成架构图');
      return false;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${process.env.AIPA_API_DOMAIN}/api/diagrams/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '保存失败');
      }

      const result = await response.json();
      
      // 刷新历史记录
      mutate(`${process.env.AIPA_API_DOMAIN}/api/diagrams/history`);
      
      toast.success('架构图保存成功！');
      return true;

    } catch (error) {
      console.error('保存架构图失败:', error);
      toast.error(error.message || '保存失败，请重试');
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
      const response = await fetch(`${process.env.AIPA_API_DOMAIN}/api/diagrams/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除失败');
      }

      // 刷新历史记录
      mutate(`${process.env.AIPA_API_DOMAIN}/api/diagrams/history`);
      
      toast.success('架构图删除成功！');
      return true;

    } catch (error) {
      console.error('删除架构图失败:', error);
      toast.error(error.message || '删除失败，请重试');
      return false;
    }
  };

  return {
    history: data?.diagrams || [],
    isLoading,
    error,
    isSaving,
    saveDiagram,
    loadDiagram,
    deleteDiagram
  };
};
