/**
 * 侧边栏组件
 * 使用 Zustand 状态管理，显示历史记录、模板库和设置
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Bookmark, Settings, Trash2, Calendar } from 'lucide-react';
import { useSidebarOpen } from '../../../stores/hooks';
import { useDiagramHistory } from '../../../hooks/useDiagramHistory';
import { useDiagramGenerator } from '../../../hooks/useDiagramGenerator';
import type { DiagramData } from '../../../shared/types';

type TabType = 'history' | 'templates' | 'settings';

const Sidebar: React.FC = () => {
  const sidebarOpen = useSidebarOpen();
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const { history, isLoading, loadDiagram, deleteDiagram } = useDiagramHistory();
  const { currentDiagram } = useDiagramGenerator();

  const templates = [
    {
      title: '系统架构图',
      description: '微服务系统架构设计',
      code: `graph TD
    A[用户] --> B[API网关]
    B --> C[用户服务]
    B --> D[订单服务]
    B --> E[支付服务]
    C --> F[用户数据库]
    D --> G[订单数据库]
    E --> H[支付数据库]`,
      type: 'flowchart' as const
    },
    {
      title: '用户流程图',
      description: '用户注册登录流程',
      code: `graph TD
    A[开始] --> B[用户输入]
    B --> C{验证信息}
    C -->|有效| D[创建账户]
    C -->|无效| E[显示错误]
    E --> B
    D --> F[发送确认邮件]
    F --> G[完成注册]`,
      type: 'flowchart' as const
    },
    {
      title: '时序图示例',
      description: 'API调用时序图',
      code: `sequenceDiagram
    participant 客户端
    participant API网关
    participant 用户服务
    participant 数据库
    
    客户端->>API网关: 登录请求
    API网关->>用户服务: 验证用户
    用户服务->>数据库: 查询用户信息
    数据库-->>用户服务: 返回用户数据
    用户服务-->>API网关: 验证结果
    API网关-->>客户端: 返回Token`,
      type: 'sequence' as const
    }
  ];

  const handleLoadHistory = (diagram: DiagramData) => {
    loadDiagram(diagram);
  };

  const handleDeleteHistory = async (id: string) => {
    if (confirm('确定要删除这个架构图吗？')) {
      await deleteDiagram(id);
    }
  };

  const handleLoadTemplate = (template: typeof templates[0]) => {
    loadDiagram({
      title: template.title,
      description: template.description,
      mermaidCode: template.code,
      diagramType: template.type,
      tags: []
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!sidebarOpen) return null;

  return (
    <div className="w-80 h-full flex flex-col bg-white border-r border-gray-200">
      {/* 标签页 */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'history', label: '历史记录', icon: History },
          { key: 'templates', label: '模板库', icon: Bookmark },
          { key: 'settings', label: '设置', icon: Settings }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as TabType)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <h3 className="font-semibold text-gray-900 mb-4">历史记录</h3>
              
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                  <p>暂无历史记录</p>
                  <p className="text-sm mt-1">保存架构图后将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((diagram) => (
                    <motion.div
                      key={diagram.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 group"
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 min-w-0"
                          onClick={() => handleLoadHistory(diagram)}
                        >
                          <h4 className="font-medium text-gray-900 truncate">
                            {diagram.title || '未命名架构图'}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {diagram.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDate(diagram.createdAt)}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {diagram.diagramType}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHistory(diagram.id!);
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <h3 className="font-semibold text-gray-900 mb-4">模板库</h3>
              
              <div className="space-y-3">
                {templates.map((template, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleLoadTemplate(template)}
                    className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50"
                  >
                    <h4 className="font-medium text-gray-900 mb-1">
                      {template.title}
                    </h4>
                    <p className="text-sm text-gray-500 mb-2">
                      {template.description}
                    </p>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                      {template.type}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <h3 className="font-semibold text-gray-900 mb-4">设置</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    编辑器主题
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="vs-dark">深色主题</option>
                    <option value="vs-light">浅色主题</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    字体大小
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="20"
                    defaultValue="14"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    自动保存
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded" />
                    <span className="ml-2 text-sm">启用自动保存</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Sidebar;
