/**
 * 保存模态框组件
 * 使用 Zustand 状态管理，提供架构图保存功能
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Tag } from 'lucide-react';
import { useCurrentDiagram } from '@/lib/stores/hooks';
import { useAppStore } from '@/lib/stores/appStore';
import { useDiagramHistory } from '@/lib/hooks/useDiagramHistory';

interface SaveModalProps {
  onClose: () => void;
}

const SaveModal: React.FC<SaveModalProps> = ({ onClose }) => {
  const currentDiagram = useCurrentDiagram();
  const setCurrentDiagram = useAppStore(state => state.setCurrentDiagram);
  const { saveDiagram, isSaving } = useDiagramHistory();
  
  const [title, setTitle] = useState(currentDiagram.title || '');
  const [description, setDescription] = useState(currentDiagram.description || '');
  const [tags, setTags] = useState<string[]>(currentDiagram.tags || []);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setTitle(currentDiagram.title || '');
    setDescription(currentDiagram.description || '');
    setTags(currentDiagram.tags || []);
  }, [currentDiagram]);

  const handleSave = async () => {
    const success = await saveDiagram({
      title,
      description,
      tags
    });
    
    if (success) {
      // 更新当前图表数据
      setCurrentDiagram({
        ...currentDiagram,
        title,
        description,
        tags
      });
      onClose();
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const predefinedTags = ['流程图', '架构设计', '系统设计', '业务流程', '技术方案', '需求分析'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Save className="text-blue-600" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">保存架构图</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* 内容 */}
          <div className="p-6 space-y-4">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标题 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入架构图标题"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述架构图的用途和特点"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag size={16} className="inline mr-1" />
                标签
              </label>
              
              {/* 已选择的标签 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <motion.span
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X size={12} />
                      </button>
                    </motion.span>
                  ))}
                </div>
              )}
              
              {/* 标签输入 */}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleAddTag}
                placeholder="输入标签后按回车添加"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {/* 预设标签 */}
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-2">快速添加：</p>
                <div className="flex flex-wrap gap-1">
                  {predefinedTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (!tags.includes(tag)) {
                          setTags([...tags, tag]);
                        }
                      }}
                      disabled={tags.includes(tag)}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 底部 */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isSaving}
            >
              取消
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>保存</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SaveModal;
