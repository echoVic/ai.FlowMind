# 组件目录结构重构

## 重构目标

简化过深的组件目录嵌套，提高代码的可维护性和可读性。

## 重构前的结构

```
apps/web/components/
└── diagram/
    └── generator/
        ├── FloatWindow.tsx
        ├── Header.tsx
        ├── InputPanel.tsx
        ├── index.tsx
        ├── AddCustomModelModal/
        ├── AIAssistant/
        ├── CodeEditor/
        ├── ConversationalDiagramPanel/
        ├── DiagnosticPanel/
        ├── DiagramPreview/
        ├── Header/
        ├── Sidebar/
        └── ValidationPanel/
```

## 重构后的结构

```
apps/web/components/
├── ui/                    # 通用UI组件
│   └── FloatWindow.tsx
├── diagram/               # 图表相关组件
│   ├── DiagramGenerator.tsx      # 主生成器组件 (原 index.tsx)
│   ├── Header.tsx
│   ├── InputPanel.tsx
│   ├── CodeEditor/
│   ├── DiagramPreview/
│   ├── DiagnosticPanel/
│   ├── Sidebar/
│   └── ValidationPanel/
├── chat/                  # 聊天相关组件
│   ├── AIAssistant/
│   └── ConversationalDiagramPanel/
└── modals/               # 模态框组件
    ├── AddCustomModelModal/
    └── SaveModal/
```

## 重构内容

### 1. 目录重组

- **ui/**: 通用UI组件，如 FloatWindow
- **diagram/**: 图表生成相关的核心组件
- **chat/**: 聊天和AI交互相关组件
- **modals/**: 各种模态框组件

### 2. 文件移动

| 原路径 | 新路径 | 说明 |
|--------|--------|------|
| `diagram/generator/index.tsx` | `diagram/DiagramGenerator.tsx` | 主组件重命名 |
| `diagram/generator/FloatWindow.tsx` | `ui/FloatWindow.tsx` | 通用UI组件 |
| `diagram/generator/ConversationalDiagramPanel/` | `chat/ConversationalDiagramPanel/` | 聊天相关 |
| `diagram/generator/AIAssistant/` | `chat/AIAssistant/` | AI交互相关 |
| `diagram/generator/AddCustomModelModal/` | `modals/AddCustomModelModal/` | 模态框组件 |
| `diagram/generator/Header/` | `modals/Header/` | 保存模态框 |

### 3. 导入路径更新

#### 页面组件更新

```typescript
// apps/web/app/page.tsx & apps/web/app/diagram/page.tsx
// 修改前
import DiagramGenerator from '@/components/diagram/generator';

// 修改后
import DiagramGenerator from '@/components/diagram/DiagramGenerator';
```

#### 主组件导入更新

```typescript
// apps/web/components/diagram/DiagramGenerator.tsx
// 修改前
import ConversationalDiagramPanel from './ConversationalDiagramPanel';
import FloatWindow from './FloatWindow';

// 修改后
import ConversationalDiagramPanel from '../chat/ConversationalDiagramPanel';
import FloatWindow from '../ui/FloatWindow';
```

#### 其他组件导入更新

```typescript
// apps/web/components/diagram/Header.tsx
// 修改前
import SaveModal from './Header/SaveModal';

// 修改后
import SaveModal from '../modals/Header/SaveModal';
```

### 4. 客户端组件标记

为 `DiagramGenerator.tsx` 添加了 `'use client';` 指令，因为它使用了 React Hooks。

## 重构优势

### 1. 结构清晰

- 按功能分类组织组件
- 减少了不必要的嵌套层级
- 更容易找到相关组件

### 2. 可维护性提升

- 相关功能的组件聚集在一起
- 通用组件独立管理
- 模态框组件统一管理

### 3. 扩展性更好

- 新增组件时有明确的分类规则
- 便于添加新的功能模块
- 支持组件的复用

### 4. 开发体验改善

- 导入路径更加直观
- IDE 自动补全更准确
- 减少了路径错误的可能性

## 验证结果

- ✅ 构建成功：`pnpm build` 通过
- ✅ 所有导入路径正确更新
- ✅ 组件功能保持不变
- ✅ 类型检查通过

## 注意事项

1. **导入路径**: 所有相关的导入路径都已更新
2. **组件功能**: 重构过程中保持了所有组件的原有功能
3. **构建兼容**: 确保构建过程正常，无破坏性变更
4. **客户端组件**: 为使用 Hooks 的组件添加了必要的 `'use client'` 指令

## 后续建议

1. **持续优化**: 随着项目发展，继续优化组件结构
2. **组件复用**: 识别更多可复用的通用组件
3. **文档更新**: 更新相关的开发文档和组件说明
4. **团队规范**: 建立组件分类和命名的团队规范

---

*重构完成时间：2025年1月*
