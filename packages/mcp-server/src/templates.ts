import { DiagramTemplate, DiagramType } from './types.js';

/**
 * 模板管理器
 */
export class TemplateManager {
  private static instance: TemplateManager;
  private templates: DiagramTemplate[] = [];

  private constructor() {
    this.initializeTemplates();
  }

  public static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * 初始化预置模板
   */
  private initializeTemplates(): void {
    this.templates = [
      // 流程图模板
      {
        name: '简单流程图',
        description: '基础的流程图模板，适用于简单的业务流程',
        type: 'flowchart',
        useCase: 'business-process',
        complexity: 'simple',
        code: `flowchart TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作]
    B -->|否| D[其他操作]
    C --> E[结束]
    D --> E`,
        tags: ['流程', '决策', '基础']
      },
      {
        name: '软件架构图',
        description: '展示软件系统架构的流程图',
        type: 'flowchart',
        useCase: 'software-architecture',
        complexity: 'medium',
        code: `flowchart TB
    subgraph "前端层"
        A[Web应用] --> B[移动应用]
    end
    
    subgraph "API层"
        C[API网关] --> D[认证服务]
        C --> E[业务服务]
    end
    
    subgraph "数据层"
        F[数据库] --> G[缓存]
    end
    
    A --> C
    B --> C
    E --> F
    E --> G`,
        tags: ['架构', '系统设计', '分层']
      },
      {
        name: '用户注册流程',
        description: '用户注册的完整流程图',
        type: 'flowchart',
        useCase: 'business-process',
        complexity: 'medium',
        code: `flowchart TD
    A[用户访问注册页面] --> B[填写注册信息]
    B --> C{验证信息}
    C -->|验证失败| D[显示错误信息]
    D --> B
    C -->|验证成功| E[发送验证邮件]
    E --> F[用户点击邮件链接]
    F --> G{激活账户}
    G -->|成功| H[注册完成]
    G -->|失败| I[显示错误页面]`,
        tags: ['用户流程', '注册', '验证']
      },

      // 序列图模板
      {
        name: '简单序列图',
        description: '基础的序列图模板',
        type: 'sequence',
        useCase: 'software-architecture',
        complexity: 'simple',
        code: `sequenceDiagram
    participant A as 用户
    participant B as 系统
    
    A->>B: 发送请求
    B-->>A: 返回响应`,
        tags: ['序列', '交互', '基础']
      },
      {
        name: 'API调用序列图',
        description: '展示API调用过程的序列图',
        type: 'sequence',
        useCase: 'software-architecture',
        complexity: 'medium',
        code: `sequenceDiagram
    participant C as 客户端
    participant G as API网关
    participant A as 认证服务
    participant S as 业务服务
    participant D as 数据库
    
    C->>G: 发送请求
    G->>A: 验证Token
    A-->>G: 验证结果
    G->>S: 转发请求
    S->>D: 查询数据
    D-->>S: 返回数据
    S-->>G: 处理结果
    G-->>C: 返回响应`,
        tags: ['API', '认证', '微服务']
      },

      // 类图模板
      {
        name: '基础类图',
        description: '面向对象设计的类图模板',
        type: 'class',
        useCase: 'software-architecture',
        complexity: 'simple',
        code: `classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    
    class Order {
        +String id
        +Date createdAt
        +calculate()
    }
    
    User ||--o{ Order : "has"`,
        tags: ['类图', '面向对象', '设计']
      },

      // ER图模板
      {
        name: '基础ER图',
        description: '数据库实体关系图模板',
        type: 'er',
        useCase: 'database-design',
        complexity: 'simple',
        code: `erDiagram
    USER {
        int id PK
        string name
        string email UK
        datetime created_at
    }
    
    ORDER {
        int id PK
        int user_id FK
        decimal amount
        datetime created_at
    }
    
    USER ||--o{ ORDER : "places"`,
        tags: ['数据库', '实体关系', '设计']
      },

      // 甘特图模板
      {
        name: '项目计划甘特图',
        description: '项目管理甘特图模板',
        type: 'gantt',
        useCase: 'project-management',
        complexity: 'medium',
        code: `gantt
    title 项目开发计划
    dateFormat YYYY-MM-DD
    section 需求分析
    需求收集    :done, req1, 2024-01-01, 2024-01-15
    需求分析    :done, req2, after req1, 15d
    section 设计阶段
    架构设计    :active, design1, 2024-02-01, 30d
    UI设计      :design2, after design1, 20d
    section 开发阶段
    后端开发    :dev1, 2024-03-01, 45d
    前端开发    :dev2, after dev1, 30d`,
        tags: ['项目管理', '计划', '时间线']
      }
    ];
  }

  /**
   * 获取所有模板
   */
  public getAllTemplates(): DiagramTemplate[] {
    return [...this.templates];
  }

  /**
   * 根据条件筛选模板
   */
  public getTemplates(filters: {
    diagramType?: DiagramType;
    useCase?: string;
    complexity?: string;
  }): DiagramTemplate[] {
    let filtered = this.templates;

    if (filters.diagramType) {
      filtered = filtered.filter(t => t.type === filters.diagramType);
    }

    if (filters.useCase) {
      filtered = filtered.filter(t => t.useCase === filters.useCase);
    }

    if (filters.complexity) {
      filtered = filtered.filter(t => t.complexity === filters.complexity);
    }

    return filtered;
  }

  /**
   * 根据类型获取模板
   */
  public getTemplatesByType(type: DiagramType): DiagramTemplate[] {
    return this.templates.filter(t => t.type === type);
  }

  /**
   * 获取模板统计信息
   */
  public getTemplateStats(): {
    total: number;
    byType: Record<DiagramType, number>;
    byUseCase: Record<string, number>;
    byComplexity: Record<string, number>;
  } {
    const stats = {
      total: this.templates.length,
      byType: {} as Record<DiagramType, number>,
      byUseCase: {} as Record<string, number>,
      byComplexity: {} as Record<string, number>
    };

    this.templates.forEach(template => {
      // 按类型统计
      stats.byType[template.type] = (stats.byType[template.type] || 0) + 1;
      
      // 按用例统计
      stats.byUseCase[template.useCase] = (stats.byUseCase[template.useCase] || 0) + 1;
      
      // 按复杂度统计
      stats.byComplexity[template.complexity] = (stats.byComplexity[template.complexity] || 0) + 1;
    });

    return stats;
  }
}