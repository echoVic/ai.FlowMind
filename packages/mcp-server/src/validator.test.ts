import { describe, it, expect } from 'vitest';
import { MermaidValidator } from './validator.js';

describe('MermaidValidator', () => {
  const validator = MermaidValidator.getInstance();

  describe('validate', () => {
    it('应该验证有效的流程图代码（基于规则）', async () => {
      const code = `flowchart TD
        A[开始] --> B[结束]`;
      
      const result = await validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该验证有效的序列图代码（基于规则）', async () => {
      const code = `sequenceDiagram
        participant A
        participant B
        A->>B: 消息`;
      
      const result = await validator.validate(code);
      expect(result.valid).toBe(true);
    });

    it('应该验证有效的饼图代码（使用解析器）', async () => {
      const code = `pie title 测试饼图
        "A" : 50
        "B" : 30`;
      
      const result = await validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.metadata?.parser).toBe('@mermaid-js/parser');
      expect(result.metadata?.diagramType).toBe('pie');
    });

    it('应该拒绝空代码', async () => {
      const result = await validator.validate('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Mermaid 代码不能为空');
      expect(result.suggestions).toContain('请提供有效的 Mermaid 图表代码');
    });

    it('应该拒绝空白代码', async () => {
      const result = await validator.validate('   \n  \t  ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Mermaid 代码不能为空');
    });

    it('应该正确处理包含代码块标记的代码', async () => {
      const code = `\`\`\`mermaid
flowchart TD
    A[开始] --> B[结束]
\`\`\``;
      
      const result = await validator.validate(code);
      expect(result.valid).toBe(true);
    });

    it('应该检测语法错误', async () => {
      const code = `flowchart TD
        A[开始] -> B[结束]`; // 错误的箭头语法
      
      const result = await validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('流程图箭头语法错误');
      expect(result.line).toBe(2);
      expect(result.suggestions).toContain('在流程图中使用 "-->" 而不是 "->"');
    });

    it('应该生成有用的修复建议', async () => {
      const code = `graph TD
        A → B`; // 使用了不正确的箭头
      
      const result = await validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.suggestions).toContain('使用 "-->" 而不是 "→" 来表示箭头');
    });

    it('应该使用解析器验证错误的饼图代码', async () => {
      const code = `pie title 测试
        invalid syntax`;
      
      const result = await validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('应该处理复杂的错误情况', async () => {
      const code = `flowchart TD
        A[开始] --> B{判断
        B -->|是| C[操作1]`; // 缺少闭合括号
      
      const result = await validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('存在未闭合的括号或引号');
      expect(result.line).toBe(2);
      expect(result.suggestions).toContain('检查是否有未闭合的括号或引号');
    });
  });

  describe('singleton pattern', () => {
    it('应该返回同一个实例', () => {
      const instance1 = MermaidValidator.getInstance();
      const instance2 = MermaidValidator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});