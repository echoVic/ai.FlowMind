import { OptimizationResult, OptimizationSuggestion, OptimizeDiagramInput } from '../types.js';
import { DiagramAnalyzer } from '../analyzer.js';
import { LayoutOptimizer } from './layout.js';
import { ReadabilityOptimizer } from './readability.js';
import { FormatConverter } from './format-converter.js';

/**
 * 图表优化器主类
 * 整合所有优化功能，提供统一的优化接口
 */
export class DiagramOptimizer {
  private analyzer: DiagramAnalyzer;
  private layoutOptimizer: LayoutOptimizer;
  private readabilityOptimizer: ReadabilityOptimizer;
  private formatConverter: FormatConverter;

  constructor() {
    this.analyzer = DiagramAnalyzer.getInstance();
    this.layoutOptimizer = new LayoutOptimizer();
    this.readabilityOptimizer = new ReadabilityOptimizer();
    this.formatConverter = new FormatConverter();
  }

  /**
   * 优化图表
   */
  public optimize(input: OptimizeDiagramInput): OptimizationResult {
    const { mermaidCode, goals = ['readability'], preserveSemantics = true, maxSuggestions = 5 } = input;

    // 分析图表
    const analysis = this.analyzer.analyze(mermaidCode);
    
    // 收集所有优化建议
    let allSuggestions: OptimizationSuggestion[] = [];

    // 根据目标应用不同的优化器
    if (goals.includes('readability')) {
      allSuggestions.push(...this.readabilityOptimizer.optimize(mermaidCode));
    }

    if (goals.includes('compactness') || goals.includes('aesthetics')) {
      allSuggestions.push(...this.layoutOptimizer.optimize(mermaidCode));
    }

    if (goals.includes('accessibility')) {
      allSuggestions.push(...this.generateAccessibilityOptimizations(mermaidCode, analysis));
    }

    // 按影响程度排序并限制数量
    allSuggestions.sort((a, b) => {
      const impactOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });

    const suggestions = allSuggestions.slice(0, maxSuggestions);

    // 应用优化建议生成优化后的代码
    const optimizedCode = this.applyOptimizations(mermaidCode, suggestions, preserveSemantics);

    // 计算指标
    const metrics = this.calculateMetrics(mermaidCode, optimizedCode, analysis);

    return {
      originalCode: mermaidCode,
      optimizedCode,
      suggestions,
      metrics,
      appliedOptimizations: suggestions.map(s => s.id)
    };
  }

  /**
   * 转换图表格式
   */
  public convertFormat(mermaidCode: string, targetFormat: string = 'auto', optimizeStructure: boolean = true): OptimizationResult {
    const analysis = this.analyzer.analyze(mermaidCode);
    
    // 如果是自动选择，根据内容推荐最佳格式
    let actualTargetFormat = targetFormat;
    if (targetFormat === 'auto') {
      actualTargetFormat = this.recommendFormat(analysis);
    }

    // 执行格式转换
    const convertedCode = this.formatConverter.convert(mermaidCode, actualTargetFormat, optimizeStructure);
    
    // 生成转换建议
    const suggestions: OptimizationSuggestion[] = [{
      id: 'format-conversion',
      type: 'structure',
      title: `转换为${actualTargetFormat}格式`,
      description: `将图表转换为更适合的${actualTargetFormat}格式`,
      impact: 'high',
      beforeCode: mermaidCode,
      afterCode: convertedCode,
      reasoning: `基于图表内容分析，${actualTargetFormat}格式更适合表达当前的信息结构`
    }];

    // 计算指标
    const metrics = this.calculateMetrics(mermaidCode, convertedCode, analysis);

    return {
      originalCode: mermaidCode,
      optimizedCode: convertedCode,
      suggestions,
      metrics,
      appliedOptimizations: ['format-conversion']
    };
  }

  /**
   * 生成无障碍访问优化建议
   */
  private generateAccessibilityOptimizations(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 检查颜色使用
    if (code.includes('fill:') || code.includes('stroke:')) {
      suggestions.push({
        id: 'accessibility-colors',
        type: 'accessibility',
        title: '改善颜色对比度',
        description: '确保颜色选择符合无障碍访问标准',
        impact: 'medium',
        reasoning: '良好的颜色对比度有助于视觉障碍用户理解图表'
      });
    }

    // 检查是否有描述性文本
    if (!code.includes('title:') && !code.includes('%%')) {
      suggestions.push({
        id: 'accessibility-description',
        type: 'accessibility',
        title: '添加描述性文本',
        description: '为图表添加标题和描述，提高可访问性',
        impact: 'medium',
        reasoning: '描述性文本帮助屏幕阅读器用户理解图表内容'
      });
    }

    // 检查节点标签清晰度
    if (analysis.complexity === 'complex') {
      suggestions.push({
        id: 'accessibility-simplify',
        type: 'accessibility',
        title: '简化复杂结构',
        description: '考虑将复杂图表分解为多个简单图表',
        impact: 'high',
        reasoning: '简化的结构更容易理解和访问'
      });
    }

    return suggestions;
  }

  /**
   * 应用优化建议
   */
  private applyOptimizations(code: string, suggestions: OptimizationSuggestion[], preserveSemantics: boolean): string {
    let optimizedCode = code;

    for (const suggestion of suggestions) {
      if (suggestion.afterCode && suggestion.beforeCode) {
        optimizedCode = optimizedCode.replace(suggestion.beforeCode, suggestion.afterCode);
      }
    }

    // 如果需要保持语义不变，进行额外检查
    if (preserveSemantics) {
      const originalAnalysis = this.analyzer.analyze(code);
      const optimizedAnalysis = this.analyzer.analyze(optimizedCode);
      
      // 检查关键结构是否保持一致
      if (originalAnalysis.diagramType !== optimizedAnalysis.diagramType) {
        return code; // 如果图表类型改变，返回原始代码
      }
    }

    return optimizedCode;
  }

  /**
   * 计算优化指标
   */
  private calculateMetrics(originalCode: string, optimizedCode: string, analysis: any) {
    return {
      readabilityScore: this.calculateReadabilityScore(optimizedCode, analysis),
      compactnessScore: this.calculateCompactnessScore(optimizedCode, analysis),
      aestheticsScore: this.calculateAestheticsScore(optimizedCode, analysis),
      accessibilityScore: this.calculateAccessibilityScore(optimizedCode, analysis)
    };
  }

  /**
   * 计算可读性得分
   */
  private calculateReadabilityScore(code: string, analysis: any): number {
    let score = 100;
    
    // 根据复杂度调整得分
    if (analysis.complexity === 'complex') score -= 30;
    else if (analysis.complexity === 'medium') score -= 15;
    
    // 根据问题数量调整得分
    const issueCount = analysis.issues.length;
    score -= issueCount * 5;
    
    // 根据节点数量调整得分
    if (analysis.nodeCount > 20) score -= 20;
    else if (analysis.nodeCount > 10) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算紧凑性得分
   */
  private calculateCompactnessScore(code: string, analysis: any): number {
    let score = 100;
    
    // 根据代码行数调整得分
    const lineCount = code.split('\n').length;
    if (lineCount > 50) score -= 30;
    else if (lineCount > 30) score -= 15;
    
    // 根据节点密度调整得分
    const density = analysis.edgeCount / (analysis.nodeCount || 1);
    if (density > 3) score -= 20;
    else if (density > 2) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算美观性得分
   */
  private calculateAestheticsScore(code: string, analysis: any): number {
    let score = 100;
    
    // 检查是否有样式定义
    if (!code.includes('classDef') && !code.includes('style')) {
      score -= 20;
    }
    
    // 检查布局方向
    if (!code.includes('TD') && !code.includes('LR') && !code.includes('BT') && !code.includes('RL')) {
      score -= 10;
    }
    
    // 根据结构复杂度调整得分
    if (analysis.structure.branchingFactor > 4) score -= 15;
    if (analysis.structure.cyclicConnections) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算可访问性得分
   */
  private calculateAccessibilityScore(code: string, analysis: any): number {
    let score = 100;
    
    // 检查是否有标题
    if (!code.includes('title:')) score -= 20;
    
    // 检查是否有注释
    if (!code.includes('%%')) score -= 15;
    
    // 检查复杂度
    if (analysis.complexity === 'complex') score -= 25;
    
    // 检查标签长度
    const longLabels = code.match(/\[[^\]]{30,}\]/g);
    if (longLabels && longLabels.length > 0) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 推荐最佳格式
   */
  private recommendFormat(analysis: any): string {
    if (analysis.diagramType !== 'unknown') {
      return analysis.diagramType;
    }

    // 基于内容特征推荐格式
    if (analysis.nodeCount > 15 && analysis.edgeCount > 20) {
      return 'class'; // 复杂关系适合类图
    }
    
    if (analysis.structure.maxDepth > 6) {
      return 'sequence'; // 深层次结构适合序列图
    }
    
    if (analysis.structure.branchingFactor > 4) {
      return 'mindmap'; // 高分支适合思维导图
    }

    return 'flowchart'; // 默认推荐流程图
  }
}