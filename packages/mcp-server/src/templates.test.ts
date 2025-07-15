import { describe, it, expect } from 'vitest';
import { TemplateManager } from './templates.js';

describe('TemplateManager', () => {
  const templateManager = TemplateManager.getInstance();

  describe('getAllTemplates', () => {
    it('应该返回所有模板', () => {
      const templates = templateManager.getAllTemplates();
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      
      // 验证模板结构
      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('useCase');
        expect(template).toHaveProperty('complexity');
        expect(template).toHaveProperty('code');
        expect(template).toHaveProperty('tags');
        expect(Array.isArray(template.tags)).toBe(true);
      });
    });
  });

  describe('getTemplatesByType', () => {
    it('应该返回指定类型的模板', () => {
      const flowchartTemplates = templateManager.getTemplatesByType('flowchart');
      expect(flowchartTemplates.length).toBeGreaterThan(0);
      
      flowchartTemplates.forEach(template => {
        expect(template.type).toBe('flowchart');
      });
    });

    it('应该返回序列图模板', () => {
      const sequenceTemplates = templateManager.getTemplatesByType('sequence');
      expect(sequenceTemplates.length).toBeGreaterThan(0);
      
      sequenceTemplates.forEach(template => {
        expect(template.type).toBe('sequence');
      });
    });
  });

  describe('getTemplates with filters', () => {
    it('应该根据复杂度筛选模板', () => {
      const simpleTemplates = templateManager.getTemplates({ complexity: 'simple' });
      expect(simpleTemplates.length).toBeGreaterThan(0);
      
      simpleTemplates.forEach(template => {
        expect(template.complexity).toBe('simple');
      });
    });

    it('应该根据使用场景筛选模板', () => {
      const businessTemplates = templateManager.getTemplates({ useCase: 'business-process' });
      expect(businessTemplates.length).toBeGreaterThan(0);
      
      businessTemplates.forEach(template => {
        expect(template.useCase).toBe('business-process');
      });
    });

    it('应该支持多条件筛选', () => {
      const filtered = templateManager.getTemplates({
        diagramType: 'flowchart',
        complexity: 'simple'
      });
      
      filtered.forEach(template => {
        expect(template.type).toBe('flowchart');
        expect(template.complexity).toBe('simple');
      });
    });

    it('应该在没有匹配项时返回空数组', () => {
      const filtered = templateManager.getTemplates({
        diagramType: 'flowchart',
        useCase: 'non-existent'
      });
      
      expect(filtered).toEqual([]);
    });
  });

  describe('getTemplateStats', () => {
    it('应该返回正确的统计信息', () => {
      const stats = templateManager.getTemplateStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('byUseCase');
      expect(stats).toHaveProperty('byComplexity');
      
      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.byType).toBe('object');
      expect(typeof stats.byUseCase).toBe('object');
      expect(typeof stats.byComplexity).toBe('object');
    });

    it('统计数据应该正确', () => {
      const stats = templateManager.getTemplateStats();
      const allTemplates = templateManager.getAllTemplates();
      
      // 验证总数
      expect(stats.total).toBe(allTemplates.length);
      
      // 验证类型统计
      const typeCount = allTemplates.reduce((acc, template) => {
        acc[template.type] = (acc[template.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(stats.byType).toEqual(typeCount);
    });
  });

  describe('singleton pattern', () => {
    it('应该返回同一个实例', () => {
      const instance1 = TemplateManager.getInstance();
      const instance2 = TemplateManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('template validation', () => {
    it('所有模板都应该有有效的代码', () => {
      const templates = templateManager.getAllTemplates();
      
      templates.forEach(template => {
        expect(template.code).toBeDefined();
        expect(template.code.trim().length).toBeGreaterThan(0);
        expect(typeof template.code).toBe('string');
      });
    });

    it('所有模板都应该有描述性的名称', () => {
      const templates = templateManager.getAllTemplates();
      
      templates.forEach(template => {
        expect(template.name).toBeDefined();
        expect(template.name.trim().length).toBeGreaterThan(0);
        expect(template.description).toBeDefined();
        expect(template.description.trim().length).toBeGreaterThan(0);
      });
    });
  });
});