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
      },

      // 高级模板 - 复杂的软件架构
      {
        name: '微服务架构图',
        description: '展示微服务架构的复杂流程图',
        type: 'flowchart',
        useCase: 'software-architecture',
        complexity: 'complex',
        code: `flowchart TB
    subgraph "客户端层"
        Web[Web应用]
        Mobile[移动应用]
        Desktop[桌面应用]
    end
    
    subgraph "网关层"
        Gateway[API网关]
        LB[负载均衡器]
    end
    
    subgraph "服务层"
        Auth[认证服务]
        User[用户服务]
        Order[订单服务]
        Payment[支付服务]
        Notification[通知服务]
    end
    
    subgraph "数据层"
        UserDB[(用户数据库)]
        OrderDB[(订单数据库)]
        PaymentDB[(支付数据库)]
        Redis[(缓存)]
        MQ[消息队列]
    end
    
    Web --> LB
    Mobile --> LB
    Desktop --> LB
    LB --> Gateway
    Gateway --> Auth
    Gateway --> User
    Gateway --> Order
    Gateway --> Payment
    
    User --> UserDB
    Order --> OrderDB
    Payment --> PaymentDB
    Auth --> Redis
    Order --> MQ
    Payment --> MQ
    MQ --> Notification`,
        tags: ['微服务', '架构', '分布式', '高级']
      },

      // DevOps 流程图
      {
        name: 'CI/CD流程图',
        description: '持续集成和持续部署的流程图',
        type: 'flowchart',
        useCase: 'project-management',
        complexity: 'complex',
        code: `flowchart TD
    A[开发者提交代码] --> B[Git仓库]
    B --> C{触发构建}
    C --> D[单元测试]
    D --> E{测试通过?}
    E -->|否| F[通知开发者]
    F --> A
    E -->|是| G[代码质量检查]
    G --> H{质量检查通过?}
    H -->|否| F
    H -->|是| I[构建Docker镜像]
    I --> J[推送到镜像仓库]
    J --> K[部署到测试环境]
    K --> L[自动化测试]
    L --> M{测试通过?}
    M -->|否| N[回滚]
    M -->|是| O[部署到生产环境]
    O --> P[监控和日志]
    P --> Q[完成]
    N --> Q`,
        tags: ['CI/CD', 'DevOps', '自动化', '部署']
      },

      // 复杂序列图
      {
        name: '分布式事务序列图',
        description: '展示分布式事务处理的复杂序列图',
        type: 'sequence',
        useCase: 'software-architecture',
        complexity: 'complex',
        code: `sequenceDiagram
    participant Client as 客户端
    participant Gateway as API网关
    participant Order as 订单服务
    participant Payment as 支付服务
    participant Inventory as 库存服务
    participant TM as 事务管理器
    
    Client->>Gateway: 创建订单请求
    Gateway->>TM: 开始分布式事务
    TM->>Order: 预创建订单
    Order-->>TM: 订单预创建成功
    TM->>Inventory: 预扣减库存
    Inventory-->>TM: 库存预扣减成功
    TM->>Payment: 预扣减余额
    Payment-->>TM: 余额预扣减成功
    
    TM->>Order: 确认订单
    Order-->>TM: 订单确认成功
    TM->>Inventory: 确认库存扣减
    Inventory-->>TM: 库存扣减确认
    TM->>Payment: 确认支付
    Payment-->>TM: 支付确认成功
    
    TM->>Gateway: 事务提交成功
    Gateway-->>Client: 订单创建成功
    
    Note over TM: 如果任何步骤失败，<br/>执行回滚操作`,
        tags: ['分布式', '事务', '微服务', '复杂']
      },

      // 电商系统类图
      {
        name: '电商系统类图',
        description: '完整的电商系统面向对象设计',
        type: 'class',
        useCase: 'software-architecture',
        complexity: 'complex',
        code: `classDiagram
    class User {
        +String id
        +String username
        +String email
        +String password
        +Date createdAt
        +login()
        +logout()
        +updateProfile()
    }
    
    class Product {
        +String id
        +String name
        +String description
        +Decimal price
        +Integer stock
        +Category category
        +addToCart()
        +updateStock()
    }
    
    class Order {
        +String id
        +User user
        +Date orderDate
        +OrderStatus status
        +Decimal totalAmount
        +List~OrderItem~ items
        +calculateTotal()
        +updateStatus()
        +cancel()
    }
    
    class OrderItem {
        +String id
        +Product product
        +Integer quantity
        +Decimal price
        +calculateSubtotal()
    }
    
    class Payment {
        +String id
        +Order order
        +PaymentMethod method
        +PaymentStatus status
        +Decimal amount
        +Date paidAt
        +process()
        +refund()
    }
    
    User ||--o{ Order : "places"
    Order ||--o{ OrderItem : "contains"
    OrderItem }o--|| Product : "references"
    Order ||--o{ Payment : "paid by"`,
        tags: ['电商', '复杂', '面向对象', '系统设计']
      },

      // 复杂ER图
      {
        name: '企业级数据库设计',
        description: '企业级应用的数据库ER图',
        type: 'er',
        useCase: 'database-design',
        complexity: 'complex',
        code: `erDiagram
    USERS {
        string user_id PK
        string username
        string email
        string password_hash
        datetime created_at
        datetime updated_at
        boolean is_active
        string role
    }
    
    DEPARTMENTS {
        string dept_id PK
        string dept_name
        string description
        string manager_id FK
        datetime created_at
    }
    
    EMPLOYEES {
        string employee_id PK
        string user_id FK
        string dept_id FK
        string first_name
        string last_name
        string position
        decimal salary
        date hire_date
        string manager_id FK
    }
    
    PROJECTS {
        string project_id PK
        string project_name
        string description
        string status
        date start_date
        date end_date
        string project_manager_id FK
        decimal budget
    }
    
    PROJECT_ASSIGNMENTS {
        string assignment_id PK
        string project_id FK
        string employee_id FK
        date assigned_date
        date start_date
        date end_date
        string role
        decimal hourly_rate
    }
    
    TASKS {
        string task_id PK
        string project_id FK
        string assigned_to FK
        string title
        string description
        string priority
        string status
        date due_date
        datetime created_at
        datetime updated_at
    }
    
    USERS ||--o{ EMPLOYEES : "has profile"
    DEPARTMENTS ||--o{ EMPLOYEES : "employs"
    EMPLOYEES ||--o{ EMPLOYEES : "manages"
    EMPLOYEES ||--o{ PROJECTS : "manages"
    PROJECTS ||--o{ PROJECT_ASSIGNMENTS : "has"
    EMPLOYEES ||--o{ PROJECT_ASSIGNMENTS : "assigned to"
    PROJECTS ||--o{ TASKS : "contains"
    EMPLOYEES ||--o{ TASKS : "assigned"
    DEPARTMENTS ||--|| EMPLOYEES : "managed by"`,
        tags: ['企业级', '数据库', '复杂', 'ERP']
      },

      // 项目管理甘特图
      {
        name: '软件开发项目甘特图',
        description: '软件开发项目的甘特图模板',
        type: 'gantt',
        useCase: 'project-management',
        complexity: 'complex',
        code: `gantt
    title 软件开发项目计划
    dateFormat  YYYY-MM-DD
    section 需求分析
    需求调研    :done, des1, 2024-01-01, 2024-01-15
    需求分析    :done, des2, after des1, 10d
    需求评审    :done, des3, after des2, 3d
    
    section 设计阶段
    架构设计    :active, arch1, 2024-02-01, 15d
    UI设计      :ui1, after arch1, 10d
    数据库设计  :db1, after arch1, 8d
    
    section 开发阶段
    前端开发    :fe1, after ui1, 30d
    后端开发    :be1, after db1, 35d
    接口联调    :api1, after fe1, 10d
    
    section 测试阶段
    单元测试    :test1, after be1, 15d
    集成测试    :test2, after api1, 10d
    系统测试    :test3, after test2, 15d
    
    section 部署上线
    预发布     :pre1, after test3, 5d
    生产部署   :prod1, after pre1, 3d
    监控优化   :monitor1, after prod1, 10d`,
        tags: ['项目管理', '甘特图', '开发', '时间线']
      },

      // 用户体验旅程图
      {
        name: '用户购物体验旅程',
        description: '用户在电商平台的完整购物体验旅程',
        type: 'journey',
        useCase: 'business-process',
        complexity: 'medium',
        code: `journey
    title 用户购物体验旅程
    section 发现阶段
      搜索商品     : 5: 用户
      浏览商品     : 4: 用户
      比较价格     : 3: 用户
      查看评价     : 4: 用户
    section 考虑阶段
      加入购物车   : 4: 用户
      查看商品详情 : 5: 用户
      咨询客服     : 3: 用户
      计算总价     : 4: 用户
    section 购买阶段
      填写订单信息 : 3: 用户
      选择支付方式 : 4: 用户
      确认支付     : 2: 用户
      等待发货     : 3: 用户
    section 收货阶段
      物流跟踪     : 4: 用户
      确认收货     : 5: 用户
      商品评价     : 3: 用户
      分享推荐     : 4: 用户`,
        tags: ['用户体验', '购物', '旅程', '电商']
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