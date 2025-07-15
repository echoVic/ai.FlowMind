import { OptimizationSuggestion } from '../types.js';
import { DiagramAnalyzer } from '../analyzer.js';

/**
 * 布局优化器
 * 优化图表布局，提高图表的视觉效果和可读性
 */
export class LayoutOptimizer {
  private analyzer: DiagramAnalyzer;

  constructor() {
    this.analyzer = DiagramAnalyzer.getInstance();
  }

  /**
   * 优化图表布局
   */
  public optimize(code: string): OptimizationSuggestion[] {
    const analysis = this.analyzer.analyze(code);
    const suggestions: OptimizationSuggestion[] = [];

    // 根据图表类型进行不同的布局优化
    switch (analysis.diagramType) {
      case 'flowchart':
      case 'graph':
        suggestions.push(...this.optimizeFlowchartLayout(code, analysis));
        break;
      case 'sequence':
        suggestions.push(...this.optimizeSequenceLayout(code, analysis));
        break;
      case 'class':
        suggestions.push(...this.optimizeClassLayout(code, analysis));
        break;
      case 'er':
        suggestions.push(...this.optimizeERLayout(code, analysis));
        break;
      default:
        suggestions.push(...this.optimizeGenericLayout(code, analysis));
    }

    return suggestions;
  }

  /**
   * 优化流程图布局
   */
  private optimizeFlowchartLayout(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = code.split('\n');

    // 建议添加方向声明
    if (!this.hasDirectionDeclaration(lines)) {
      suggestions.push({
        id: 'add-direction',
        type: 'layout',
        title: '添加方向声明',
        description: '明确指定图表方向可以提高布局的可预测性',
        impact: 'medium',
        beforeCode: lines[0],
        afterCode: lines[0].includes('flowchart') ? 
          lines[0].replace('flowchart', 'flowchart TD') : 
          lines[0] + ' TD',
        reasoning: '明确的方向声明让图表布局更加清晰和可预测'
      });
    }

    // 建议重新排列复杂节点
    if (analysis.complexity === 'complex') {
      suggestions.push({
        id: 'restructure-complex',
        type: 'layout',
        title: '重构复杂布局',
        description: '将复杂的图表分解为多个子图或使用子图功能',
        impact: 'high',
        reasoning: '复杂的图表可以通过分层或分组来提高可读性'
      });
    }

    // 建议优化长链式连接
    if (analysis.structure.maxDepth > 6) {
      suggestions.push({
        id: 'optimize-chain',
        type: 'layout',
        title: '优化长链式连接',
        description: '考虑使用水平布局或分组来减少垂直深度',
        impact: 'medium',
        reasoning: '过长的垂直链式连接会影响图表的整体可读性'
      });
    }

    // 建议优化高分支因子
    if (analysis.structure.branchingFactor > 4) {
      suggestions.push({
        id: 'optimize-branching',
        type: 'layout',
        title: '优化高分支因子',
        description: '考虑使用子图或重新组织节点层次结构',
        impact: 'medium',
        reasoning: '高分支因子会导致图表显得混乱，可以通过分组来改善'
      });
    }

    return suggestions;
  }

  /**
   * 优化序列图布局
   */
  private optimizeSequenceLayout(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = code.split('\n');

    // 建议添加参与者声明
    const participantDeclarations = this.getParticipantDeclarations(lines);
    const implicitParticipants = this.getImplicitParticipants(lines);
    
    if (implicitParticipants.length > 0) {
      const declarationLines = implicitParticipants.map(p => `    participant ${p}`).join('\n');
      suggestions.push({
        id: 'add-participant-declarations',
        type: 'layout',
        title: '添加参与者声明',
        description: '明确声明所有参与者可以改善图表布局',
        impact: 'medium',
        beforeCode: lines[0],
        afterCode: `${lines[0]}\n${declarationLines}`,
        reasoning: '显式的参与者声明可以控制参与者的显示顺序和位置'
      });
    }

    // 建议优化长序列
    if (analysis.edgeCount > 20) {
      suggestions.push({
        id: 'optimize-long-sequence',
        type: 'layout',
        title: '优化长序列',
        description: '考虑使用激活框或分组来组织复杂的交互',
        impact: 'medium',
        reasoning: '长序列图可以通过激活框和分组来提高可读性'
      });
    }

    return suggestions;
  }

  /**
   * 优化类图布局
   */
  private optimizeClassLayout(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 建议对类进行分组
    if (analysis.nodeCount > 8) {
      suggestions.push({
        id: 'group-classes',
        type: 'layout',
        title: '对类进行分组',
        description: '将相关的类组织到命名空间或包中',
        impact: 'high',
        reasoning: '类的分组可以提高大型类图的可读性和组织性'
      });
    }

    // 建议优化继承层次
    if (analysis.structure.maxDepth > 5) {
      suggestions.push({
        id: 'optimize-inheritance',
        type: 'layout',
        title: '优化继承层次',
        description: '考虑重新组织继承结构或使用接口',
        impact: 'medium',
        reasoning: '过深的继承层次会影响图表的可读性'
      });
    }

    return suggestions;
  }

  /**
   * 优化实体关系图布局
   */
  private optimizeERLayout(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 建议优化实体数量
    if (analysis.nodeCount > 10) {
      suggestions.push({
        id: 'optimize-entity-count',
        type: 'layout',
        title: '优化实体数量',
        description: '考虑将相关实体分组或创建多个相关图表',
        impact: 'medium',
        reasoning: '过多的实体会让图表变得复杂难读'
      });
    }

    // 建议优化关系连接
    if (analysis.edgeCount > 15) {
      suggestions.push({
        id: 'optimize-relationships',
        type: 'layout',
        title: '优化关系连接',
        description: '考虑简化关系或使用中间实体',
        impact: 'medium',
        reasoning: '过多的关系连接会让图表显得混乱'
      });
    }

    return suggestions;
  }

  /**
   * 通用布局优化
   */
  private optimizeGenericLayout(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 基本的布局建议
    if (analysis.nodeCount > 20) {
      suggestions.push({
        id: 'reduce-complexity',
        type: 'layout',
        title: '降低图表复杂度',
        description: '考虑将大型图表分解为多个较小的图表',
        impact: 'high',
        reasoning: '过于复杂的图表难以理解和维护'
      });
    }

    return suggestions;
  }

  /**
   * 检查是否有方向声明
   */
  private hasDirectionDeclaration(lines: string[]): boolean {
    if (lines.length === 0) return false;
    const firstLine = lines[0].toLowerCase();
    return firstLine.includes('td') || firstLine.includes('lr') || 
           firstLine.includes('bt') || firstLine.includes('rl');
  }

  /**
   * 获取参与者声明
   */
  private getParticipantDeclarations(lines: string[]): string[] {
    const participants: string[] = [];
    for (const line of lines) {
      const match = line.match(/participant\s+(\w+)/);
      if (match) {
        participants.push(match[1]);
      }
    }
    return participants;
  }

  /**
   * 获取隐式参与者
   */
  private getImplicitParticipants(lines: string[]): string[] {
    const explicit = new Set(this.getParticipantDeclarations(lines));
    const implicit = new Set<string>();

    for (const line of lines) {
      const match = line.match(/(\w+)\s*--?>?>?\s*(\w+)/);
      if (match) {
        const [, from, to] = match;
        if (!explicit.has(from)) implicit.add(from);
        if (!explicit.has(to)) implicit.add(to);
      }
    }

    return Array.from(implicit);
  }
}