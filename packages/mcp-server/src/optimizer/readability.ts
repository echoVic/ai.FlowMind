import { OptimizationSuggestion } from '../types.js';
import { DiagramAnalyzer } from '../analyzer.js';

/**
 * 可读性优化器
 * 专注于提高图表的可读性，包括标签、命名、注释等
 */
export class ReadabilityOptimizer {
  private analyzer: DiagramAnalyzer;

  constructor() {
    this.analyzer = DiagramAnalyzer.getInstance();
  }

  /**
   * 优化图表可读性
   */
  public optimize(code: string): OptimizationSuggestion[] {
    const analysis = this.analyzer.analyze(code);
    const suggestions: OptimizationSuggestion[] = [];

    // 通用可读性检查
    suggestions.push(...this.checkNaming(code, analysis));
    suggestions.push(...this.checkLabels(code, analysis));
    suggestions.push(...this.checkComments(code, analysis));
    suggestions.push(...this.checkConsistency(code, analysis));
    
    // 特定图表类型的可读性优化
    switch (analysis.diagramType) {
      case 'flowchart':
      case 'graph':
        suggestions.push(...this.optimizeFlowchartReadability(code, analysis));
        break;
      case 'sequence':
        suggestions.push(...this.optimizeSequenceReadability(code, analysis));
        break;
      case 'class':
        suggestions.push(...this.optimizeClassReadability(code, analysis));
        break;
      case 'er':
        suggestions.push(...this.optimizeERReadability(code, analysis));
        break;
    }

    return suggestions;
  }

  /**
   * 检查命名规范
   */
  private checkNaming(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = code.split('\n');

    // 检查节点ID命名
    const nodeIds = this.extractNodeIds(lines);
    const inconsistentNaming = this.checkNamingConsistency(nodeIds);
    
    if (inconsistentNaming.length > 0) {
      suggestions.push({
        id: 'improve-naming-consistency',
        type: 'readability',
        title: '改善命名一致性',
        description: '使用一致的命名约定可以提高代码可读性',
        impact: 'medium',
        reasoning: '一致的命名约定让图表更容易理解和维护',
        details: {
          inconsistentNames: inconsistentNaming
        }
      });
    }

    // 检查过短的标识符
    const shortIds = nodeIds.filter(id => id.length < 3 && !/^[A-Z]$/.test(id));
    if (shortIds.length > 0) {
      suggestions.push({
        id: 'improve-short-identifiers',
        type: 'readability',
        title: '改善短标识符',
        description: '使用更具描述性的标识符名称',
        impact: 'low',
        reasoning: '描述性的标识符名称能够更好地传达意图',
        details: {
          shortIds: shortIds
        }
      });
    }

    return suggestions;
  }

  /**
   * 检查标签质量
   */
  private checkLabels(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = code.split('\n');

    // 检查过长的标签
    const longLabels = this.findLongLabels(lines);
    if (longLabels.length > 0) {
      suggestions.push({
        id: 'optimize-long-labels',
        type: 'readability',
        title: '优化过长标签',
        description: '考虑缩短标签或使用换行符',
        impact: 'medium',
        reasoning: '过长的标签会影响图表的整体布局和可读性',
        details: {
          longLabels: longLabels
        }
      });
    }

    // 检查缺失的标签
    const unlabeledElements = this.findUnlabeledElements(lines);
    if (unlabeledElements.length > 0) {
      suggestions.push({
        id: 'add-missing-labels',
        type: 'readability',
        title: '添加缺失标签',
        description: '为未标记的元素添加描述性标签',
        impact: 'medium',
        reasoning: '清晰的标签让图表更容易理解',
        details: {
          unlabeledElements: unlabeledElements
        }
      });
    }

    // 检查标签中的技术术语
    const technicalTerms = this.findTechnicalTerms(lines);
    if (technicalTerms.length > 0) {
      suggestions.push({
        id: 'explain-technical-terms',
        type: 'readability',
        title: '解释技术术语',
        description: '考虑为技术术语添加注释或使用更通俗的表达',
        impact: 'low',
        reasoning: '清晰的术语解释能够帮助不同背景的读者理解图表',
        details: {
          technicalTerms: technicalTerms
        }
      });
    }

    return suggestions;
  }

  /**
   * 检查注释和文档
   */
  private checkComments(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = code.split('\n');

    // 检查是否有注释
    const hasComments = lines.some(line => line.trim().startsWith('%%'));
    if (!hasComments && analysis.complexity === 'complex') {
      suggestions.push({
        id: 'add-comments',
        type: 'readability',
        title: '添加注释',
        description: '为复杂的图表添加注释来解释关键概念',
        impact: 'medium',
        reasoning: '注释能够帮助读者更好地理解复杂的图表逻辑'
      });
    }

    // 检查是否有标题
    const hasTitle = lines.some(line => line.trim().startsWith('title:'));
    if (!hasTitle) {
      suggestions.push({
        id: 'add-title',
        type: 'readability',
        title: '添加标题',
        description: '为图表添加描述性标题',
        impact: 'low',
        beforeCode: lines[0],
        afterCode: `${lines[0]}\n    title: 图表标题`,
        reasoning: '标题能够快速传达图表的主要目的'
      });
    }

    return suggestions;
  }

  /**
   * 检查一致性
   */
  private checkConsistency(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = code.split('\n');

    // 检查连接器使用的一致性
    const connectors = this.extractConnectors(lines);
    const inconsistentConnectors = this.checkConnectorConsistency(connectors);
    
    if (inconsistentConnectors.length > 0) {
      suggestions.push({
        id: 'standardize-connectors',
        type: 'readability',
        title: '标准化连接器',
        description: '使用一致的连接器样式',
        impact: 'low',
        reasoning: '一致的连接器样式让图表看起来更专业',
        details: {
          inconsistentConnectors: inconsistentConnectors
        }
      });
    }

    return suggestions;
  }

  /**
   * 流程图可读性优化
   */
  private optimizeFlowchartReadability(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = code.split('\n');

    // 检查决策节点的标签
    const decisionNodes = this.findDecisionNodes(lines);
    const poorDecisionLabels = decisionNodes.filter(node => 
      !node.label.includes('?') && !node.label.toLowerCase().includes('if')
    );

    if (poorDecisionLabels.length > 0) {
      suggestions.push({
        id: 'improve-decision-labels',
        type: 'readability',
        title: '改善决策节点标签',
        description: '为决策节点使用疑问句或条件语句',
        impact: 'medium',
        reasoning: '清晰的决策标签能够明确表达判断条件',
        details: {
          poorDecisionLabels: poorDecisionLabels
        }
      });
    }

    // 检查边的标签
    const edges = this.extractEdges(lines);
    const unlabeledDecisionEdges = edges.filter(edge => 
      edge.from.includes('diamond') && !edge.label
    );

    if (unlabeledDecisionEdges.length > 0) {
      suggestions.push({
        id: 'label-decision-edges',
        type: 'readability',
        title: '标记决策边',
        description: '为决策节点的输出边添加"是"/"否"标签',
        impact: 'medium',
        reasoning: '决策边的标签能够清晰表达判断结果',
        details: {
          unlabeledDecisionEdges: unlabeledDecisionEdges
        }
      });
    }

    return suggestions;
  }

  /**
   * 序列图可读性优化
   */
  private optimizeSequenceReadability(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = code.split('\n');

    // 检查参与者名称
    const participants = this.extractParticipants(lines);
    const technicalParticipants = participants.filter(p => 
      p.includes('_') || p.includes('API') || p.includes('DB')
    );

    if (technicalParticipants.length > 0) {
      suggestions.push({
        id: 'humanize-participants',
        type: 'readability',
        title: '人性化参与者名称',
        description: '使用更友好的参与者名称',
        impact: 'low',
        reasoning: '友好的名称让图表更容易理解',
        details: {
          technicalParticipants: technicalParticipants
        }
      });
    }

    // 检查消息描述
    const messages = this.extractMessages(lines);
    const vagueMessages = messages.filter(msg => 
      msg.label.length < 5 || /^(do|get|set|call)$/.test(msg.label.toLowerCase())
    );

    if (vagueMessages.length > 0) {
      suggestions.push({
        id: 'improve-message-descriptions',
        type: 'readability',
        title: '改善消息描述',
        description: '使用更具描述性的消息标签',
        impact: 'medium',
        reasoning: '描述性的消息标签能够更好地传达交互意图',
        details: {
          vagueMessages: vagueMessages
        }
      });
    }

    return suggestions;
  }

  /**
   * 类图可读性优化
   */
  private optimizeClassReadability(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = code.split('\n');

    // 检查方法名称
    const methods = this.extractMethods(lines);
    const poorMethodNames = methods.filter(method => 
      method.name.length < 3 || !/^[a-z]/.test(method.name)
    );

    if (poorMethodNames.length > 0) {
      suggestions.push({
        id: 'improve-method-names',
        type: 'readability',
        title: '改善方法名称',
        description: '使用描述性的方法名称和驼峰命名',
        impact: 'medium',
        reasoning: '清晰的方法名称能够表达功能意图',
        details: {
          poorMethodNames: poorMethodNames
        }
      });
    }

    return suggestions;
  }

  /**
   * ER图可读性优化
   */
  private optimizeERReadability(code: string, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = code.split('\n');

    // 检查实体名称
    const entities = this.extractEntities(lines);
    const poorEntityNames = entities.filter(entity => 
      entity.includes('_') || entity.toLowerCase() === entity
    );

    if (poorEntityNames.length > 0) {
      suggestions.push({
        id: 'improve-entity-names',
        type: 'readability',
        title: '改善实体名称',
        description: '使用更规范的实体命名',
        impact: 'low',
        reasoning: '规范的实体名称让图表更专业',
        details: {
          poorEntityNames: poorEntityNames
        }
      });
    }

    return suggestions;
  }

  // 辅助方法
  private extractNodeIds(lines: string[]): string[] {
    const nodeIds: string[] = [];
    const nodeRegex = /(\w+)(?:\[.*?\]|\(.*?\)|\{.*?\})/g;
    
    for (const line of lines) {
      let match;
      while ((match = nodeRegex.exec(line)) !== null) {
        nodeIds.push(match[1]);
      }
    }
    
    return [...new Set(nodeIds)];
  }

  private checkNamingConsistency(nodeIds: string[]): string[] {
    const styles = {
      camelCase: 0,
      snake_case: 0,
      PascalCase: 0,
      lowercase: 0,
      UPPERCASE: 0
    };

    for (const id of nodeIds) {
      if (/^[a-z][a-zA-Z0-9]*$/.test(id)) styles.camelCase++;
      else if (/^[a-z][a-z0-9_]*$/.test(id)) styles.snake_case++;
      else if (/^[A-Z][a-zA-Z0-9]*$/.test(id)) styles.PascalCase++;
      else if (/^[a-z]+$/.test(id)) styles.lowercase++;
      else if (/^[A-Z]+$/.test(id)) styles.UPPERCASE++;
    }

    const dominantStyle = Object.entries(styles).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const inconsistent = nodeIds.filter(id => {
      switch (dominantStyle) {
        case 'camelCase': return !/^[a-z][a-zA-Z0-9]*$/.test(id);
        case 'snake_case': return !/^[a-z][a-z0-9_]*$/.test(id);
        case 'PascalCase': return !/^[A-Z][a-zA-Z0-9]*$/.test(id);
        case 'lowercase': return !/^[a-z]+$/.test(id);
        case 'UPPERCASE': return !/^[A-Z]+$/.test(id);
        default: return false;
      }
    });

    return inconsistent;
  }

  private findLongLabels(lines: string[]): Array<{line: string, label: string}> {
    const longLabels: Array<{line: string, label: string}> = [];
    const labelRegex = /\[(.*?)\]|\((.*?)\)|\{(.*?)\}/g;

    for (const line of lines) {
      let match;
      while ((match = labelRegex.exec(line)) !== null) {
        const label = match[1] || match[2] || match[3];
        if (label && label.length > 50) {
          longLabels.push({ line, label });
        }
      }
    }

    return longLabels;
  }

  private findUnlabeledElements(lines: string[]): string[] {
    const unlabeled: string[] = [];
    const nodeRegex = /(\w+)(?=\s*--?>)/g;

    for (const line of lines) {
      let match;
      while ((match = nodeRegex.exec(line)) !== null) {
        if (!line.includes(`${match[1]}[`) && !line.includes(`${match[1]}(`)) {
          unlabeled.push(match[1]);
        }
      }
    }

    return [...new Set(unlabeled)];
  }

  private findTechnicalTerms(lines: string[]): string[] {
    const technicalTerms: string[] = [];
    const techPatterns = [
      /API/g, /HTTP/g, /JSON/g, /XML/g, /SQL/g, /DB/g, /CRUD/g,
      /REST/g, /SOAP/g, /JWT/g, /OAuth/g, /SSL/g, /TLS/g
    ];

    for (const line of lines) {
      for (const pattern of techPatterns) {
        const matches = line.match(pattern);
        if (matches) {
          technicalTerms.push(...matches);
        }
      }
    }

    return [...new Set(technicalTerms)];
  }

  private extractConnectors(lines: string[]): string[] {
    const connectors: string[] = [];
    const connectorRegex = /(--?>?|===?>?|\.\.\.>?)/g;

    for (const line of lines) {
      let match;
      while ((match = connectorRegex.exec(line)) !== null) {
        connectors.push(match[1]);
      }
    }

    return connectors;
  }

  private checkConnectorConsistency(connectors: string[]): string[] {
    const counts = connectors.reduce((acc, connector) => {
      acc[connector] = (acc[connector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantConnector = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    return connectors.filter(c => c !== dominantConnector);
  }

  private findDecisionNodes(lines: string[]): Array<{id: string, label: string}> {
    const decisionNodes: Array<{id: string, label: string}> = [];
    const diamondRegex = /(\w+)\{(.*?)\}/g;

    for (const line of lines) {
      let match;
      while ((match = diamondRegex.exec(line)) !== null) {
        decisionNodes.push({ id: match[1], label: match[2] });
      }
    }

    return decisionNodes;
  }

  private extractEdges(lines: string[]): Array<{from: string, to: string, label?: string}> {
    const edges: Array<{from: string, to: string, label?: string}> = [];
    const edgeRegex = /(\w+)\s*--?>?\s*(\w+)/g;

    for (const line of lines) {
      let match;
      while ((match = edgeRegex.exec(line)) !== null) {
        edges.push({ from: match[1], to: match[2] });
      }
    }

    return edges;
  }

  private extractParticipants(lines: string[]): string[] {
    const participants: string[] = [];
    const participantRegex = /participant\s+(\w+)/g;

    for (const line of lines) {
      let match;
      while ((match = participantRegex.exec(line)) !== null) {
        participants.push(match[1]);
      }
    }

    return participants;
  }

  private extractMessages(lines: string[]): Array<{from: string, to: string, label: string}> {
    const messages: Array<{from: string, to: string, label: string}> = [];
    const messageRegex = /(\w+)\s*--?>?\s*(\w+)\s*:\s*(.*)/g;

    for (const line of lines) {
      let match;
      while ((match = messageRegex.exec(line)) !== null) {
        messages.push({ from: match[1], to: match[2], label: match[3] });
      }
    }

    return messages;
  }

  private extractMethods(lines: string[]): Array<{name: string, visibility: string}> {
    const methods: Array<{name: string, visibility: string}> = [];
    const methodRegex = /([+\-#])(\w+)\(/g;

    for (const line of lines) {
      let match;
      while ((match = methodRegex.exec(line)) !== null) {
        methods.push({ name: match[2], visibility: match[1] });
      }
    }

    return methods;
  }

  private extractEntities(lines: string[]): string[] {
    const entities: string[] = [];
    const entityRegex = /(\w+)\s*\{/g;

    for (const line of lines) {
      let match;
      while ((match = entityRegex.exec(line)) !== null) {
        entities.push(match[1]);
      }
    }

    return entities;
  }
}