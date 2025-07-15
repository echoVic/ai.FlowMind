import { z } from 'zod';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  line?: number;
  column?: number;
  suggestions?: string[];
  metadata?: {
    parser?: string;
    diagramType?: string;
    hasAst?: boolean;
  };
}

/**
 * 支持的图表类型
 */
export const DiagramTypeSchema = z.enum([
  'flowchart',
  'sequence', 
  'class',
  'er',
  'gantt',
  'pie',
  'journey',
  'gitgraph',
  'mindmap',
  'timeline'
]);

export type DiagramType = z.infer<typeof DiagramTypeSchema>;

/**
 * 验证 Mermaid 工具的输入参数
 */
export const ValidateMermaidInputSchema = z.object({
  mermaidCode: z.string().min(1, 'Mermaid 代码不能为空'),
  strict: z.boolean().default(false).optional()
});

export type ValidateMermaidInput = z.infer<typeof ValidateMermaidInputSchema>;

/**
 * 获取模板工具的输入参数
 */
export const GetTemplatesInputSchema = z.object({
  diagramType: DiagramTypeSchema.optional(),
  useCase: z.enum(['software-architecture', 'business-process', 'database-design', 'project-management', 'general']).optional(),
  complexity: z.enum(['simple', 'medium', 'complex']).optional()
});

export type GetTemplatesInput = z.infer<typeof GetTemplatesInputSchema>;

/**
 * 优化图表工具的输入参数
 */
export const OptimizeDiagramInputSchema = z.object({
  mermaidCode: z.string().min(1, 'Mermaid 代码不能为空'),
  goals: z.array(z.enum(['readability', 'compactness', 'aesthetics', 'accessibility'])).default(['readability']),
  preserveSemantics: z.boolean().default(true).optional(),
  maxSuggestions: z.number().min(1).max(10).default(5).optional()
});

export type OptimizeDiagramInput = z.infer<typeof OptimizeDiagramInputSchema>;

/**
 * 优化建议
 */
export interface OptimizationSuggestion {
  id: string;
  type: 'layout' | 'naming' | 'styling' | 'structure' | 'accessibility';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  beforeCode?: string;
  afterCode?: string;
  reasoning: string;
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  originalCode: string;
  optimizedCode: string;
  suggestions: OptimizationSuggestion[];
  metrics: {
    readabilityScore: number;
    compactnessScore: number;
    aestheticsScore: number;
    accessibilityScore: number;
  };
  appliedOptimizations: string[];
}

/**
 * 图表分析结果
 */
export interface DiagramAnalysis {
  diagramType: string;
  nodeCount: number;
  edgeCount: number;
  complexity: 'simple' | 'medium' | 'complex';
  issues: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    line?: number;
  }[];
  structure: {
    maxDepth: number;
    branchingFactor: number;
    cyclicConnections: boolean;
  };
}

/**
 * 图表模板
 */
export interface DiagramTemplate {
  name: string;
  description: string;
  type: DiagramType;
  useCase: string;
  complexity: 'simple' | 'medium' | 'complex';
  code: string;
  tags: string[];
}