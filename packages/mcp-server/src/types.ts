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