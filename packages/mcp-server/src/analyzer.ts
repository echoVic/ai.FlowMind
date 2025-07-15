import { DiagramAnalysis } from './types.js';

/**
 * 图表分析器
 * 分析 Mermaid 图表结构，识别优化机会
 */
export class DiagramAnalyzer {
  private static instance: DiagramAnalyzer;

  private constructor() {}

  public static getInstance(): DiagramAnalyzer {
    if (!DiagramAnalyzer.instance) {
      DiagramAnalyzer.instance = new DiagramAnalyzer();
    }
    return DiagramAnalyzer.instance;
  }

  /**
   * 分析图表代码
   */
  public analyze(code: string): DiagramAnalysis {
    const cleanedCode = this.cleanCode(code);
    const lines = cleanedCode.split('\n').filter(line => line.trim().length > 0);
    
    const diagramType = this.detectDiagramType(lines);
    const analysis: DiagramAnalysis = {
      diagramType,
      nodeCount: 0,
      edgeCount: 0,
      complexity: 'simple',
      issues: [],
      structure: {
        maxDepth: 0,
        branchingFactor: 0,
        cyclicConnections: false
      }
    };

    // 根据图表类型进行专门分析
    switch (diagramType) {
      case 'flowchart':
      case 'graph':
        this.analyzeFlowchart(lines, analysis);
        break;
      case 'sequence':
        this.analyzeSequence(lines, analysis);
        break;
      case 'class':
        this.analyzeClass(lines, analysis);
        break;
      case 'er':
        this.analyzeER(lines, analysis);
        break;
      case 'pie':
        this.analyzePie(lines, analysis);
        break;
      default:
        this.analyzeGeneric(lines, analysis);
    }

    // 计算复杂度
    this.calculateComplexity(analysis);

    return analysis;
  }

  /**
   * 清理代码
   */
  private cleanCode(code: string): string {
    return code
      .replace(/^```mermaid\s*\n?/i, '')
      .replace(/^```\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
  }

  /**
   * 检测图表类型
   */
  private detectDiagramType(lines: string[]): string {
    if (lines.length === 0) return 'unknown';
    
    const firstLine = lines[0].toLowerCase().trim();
    
    if (firstLine.includes('flowchart')) return 'flowchart';
    if (firstLine.includes('graph')) return 'graph';
    if (firstLine.includes('sequencediagram')) return 'sequence';
    if (firstLine.includes('classdiagram')) return 'class';
    if (firstLine.includes('erdiagram')) return 'er';
    if (firstLine.includes('pie')) return 'pie';
    if (firstLine.includes('gantt')) return 'gantt';
    if (firstLine.includes('journey')) return 'journey';
    if (firstLine.includes('gitgraph')) return 'gitgraph';
    
    return 'unknown';
  }

  /**
   * 分析流程图
   */
  private analyzeFlowchart(lines: string[], analysis: DiagramAnalysis): void {
    const nodes = new Set<string>();
    const edges: Array<{ from: string; to: string; label?: string }> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('%%')) continue;
      
      // 解析节点和连接
      const connectionMatch = line.match(/(\w+)(?:\[([^\]]+)\])?\s*-->\s*(\w+)(?:\[([^\]]+)\])?/);
      if (connectionMatch) {
        const [, fromId, fromLabel, toId, toLabel] = connectionMatch;
        nodes.add(fromId);
        nodes.add(toId);
        edges.push({ from: fromId, to: toId });
        continue;
      }
      
      // 解析带标签的连接
      const labeledConnectionMatch = line.match(/(\w+)(?:\[([^\]]+)\])?\s*-->\s*\|([^|]+)\|\s*(\w+)(?:\[([^\]]+)\])?/);
      if (labeledConnectionMatch) {
        const [, fromId, fromLabel, edgeLabel, toId, toLabel] = labeledConnectionMatch;
        nodes.add(fromId);
        nodes.add(toId);
        edges.push({ from: fromId, to: toId, label: edgeLabel });
        continue;
      }
      
      // 解析单独的节点定义
      const nodeMatch = line.match(/(\w+)\[([^\]]+)\]/);
      if (nodeMatch) {
        const [, nodeId, nodeLabel] = nodeMatch;
        nodes.add(nodeId);
        continue;
      }
    }

    analysis.nodeCount = nodes.size;
    analysis.edgeCount = edges.length;
    
    // 分析结构
    this.analyzeGraphStructure(nodes, edges, analysis);
    
    // 检查问题
    this.checkFlowchartIssues(lines, analysis);
  }

  /**
   * 分析序列图
   */
  private analyzeSequence(lines: string[], analysis: DiagramAnalysis): void {
    const participants = new Set<string>();
    const messages: Array<{ from: string; to: string; type: string }> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('%%')) continue;
      
      // 解析参与者
      const participantMatch = line.match(/participant\s+(\w+)(?:\s+as\s+(.+))?/);
      if (participantMatch) {
        participants.add(participantMatch[1]);
        continue;
      }
      
      // 解析消息
      const messageMatch = line.match(/(\w+)\s*(--?>?>?|\-\-?>?>?)\s*(\w+)\s*:\s*(.+)/);
      if (messageMatch) {
        const [, from, arrow, to, message] = messageMatch;
        participants.add(from);
        participants.add(to);
        messages.push({ from, to, type: arrow });
        continue;
      }
    }

    analysis.nodeCount = participants.size;
    analysis.edgeCount = messages.length;
    
    // 检查序列图问题
    this.checkSequenceIssues(lines, analysis);
  }

  /**
   * 分析类图
   */
  private analyzeClass(lines: string[], analysis: DiagramAnalysis): void {
    const classes = new Set<string>();
    const relationships: Array<{ from: string; to: string; type: string }> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('%%')) continue;
      
      // 解析类定义
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        classes.add(classMatch[1]);
        continue;
      }
      
      // 解析关系
      const relationMatch = line.match(/(\w+)\s*([\|\<\>]+[\-\.][\|\<\>]+)\s*(\w+)/);
      if (relationMatch) {
        const [, from, relation, to] = relationMatch;
        classes.add(from);
        classes.add(to);
        relationships.push({ from, to, type: relation });
        continue;
      }
    }

    analysis.nodeCount = classes.size;
    analysis.edgeCount = relationships.length;
    
    // 检查类图问题
    this.checkClassIssues(lines, analysis);
  }

  /**
   * 分析实体关系图
   */
  private analyzeER(lines: string[], analysis: DiagramAnalysis): void {
    const entities = new Set<string>();
    const relationships: Array<{ from: string; to: string; type: string }> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('%%')) continue;
      
      // 解析实体
      const entityMatch = line.match(/(\w+)\s*\{/);
      if (entityMatch) {
        entities.add(entityMatch[1]);
        continue;
      }
      
      // 解析关系
      const relationMatch = line.match(/(\w+)\s*([\|\<\>]+[\-\.][\|\<\>]+)\s*(\w+)/);
      if (relationMatch) {
        const [, from, relation, to] = relationMatch;
        entities.add(from);
        entities.add(to);
        relationships.push({ from, to, type: relation });
        continue;
      }
    }

    analysis.nodeCount = entities.size;
    analysis.edgeCount = relationships.length;
  }

  /**
   * 分析饼图
   */
  private analyzePie(lines: string[], analysis: DiagramAnalysis): void {
    let sections = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('%%')) continue;
      
      // 解析饼图部分
      const sectionMatch = line.match(/\"([^\"]+)\"\s*:\s*(\d+)/);
      if (sectionMatch) {
        sections++;
        continue;
      }
    }

    analysis.nodeCount = sections;
    analysis.edgeCount = 0;
    
    // 检查饼图问题
    this.checkPieIssues(lines, analysis);
  }

  /**
   * 通用分析
   */
  private analyzeGeneric(lines: string[], analysis: DiagramAnalysis): void {
    analysis.nodeCount = lines.length - 1; // 减去第一行图表类型声明
    analysis.edgeCount = 0;
  }

  /**
   * 分析图结构
   */
  private analyzeGraphStructure(
    nodes: Set<string>, 
    edges: Array<{ from: string; to: string; label?: string }>, 
    analysis: DiagramAnalysis
  ): void {
    const adjacencyList = new Map<string, string[]>();
    
    // 构建邻接表
    for (const node of nodes) {
      adjacencyList.set(node, []);
    }
    
    for (const edge of edges) {
      adjacencyList.get(edge.from)?.push(edge.to);
    }
    
    // 计算最大深度
    analysis.structure.maxDepth = this.calculateMaxDepth(adjacencyList);
    
    // 计算分支因子
    analysis.structure.branchingFactor = this.calculateBranchingFactor(adjacencyList);
    
    // 检查循环
    analysis.structure.cyclicConnections = this.hasCycles(adjacencyList);
  }

  /**
   * 计算最大深度
   */
  private calculateMaxDepth(adjacencyList: Map<string, string[]>): number {
    let maxDepth = 0;
    const visited = new Set<string>();
    
    for (const [node] of adjacencyList) {
      if (!visited.has(node)) {
        const depth = this.dfs(node, adjacencyList, visited, new Set());
        maxDepth = Math.max(maxDepth, depth);
      }
    }
    
    return maxDepth;
  }

  /**
   * 深度优先搜索
   */
  private dfs(node: string, adjacencyList: Map<string, string[]>, visited: Set<string>, path: Set<string>): number {
    visited.add(node);
    path.add(node);
    
    let maxDepth = 0;
    const neighbors = adjacencyList.get(node) || [];
    
    for (const neighbor of neighbors) {
      if (!path.has(neighbor)) {
        const depth = this.dfs(neighbor, adjacencyList, visited, path);
        maxDepth = Math.max(maxDepth, depth);
      }
    }
    
    path.delete(node);
    return maxDepth + 1;
  }

  /**
   * 计算分支因子
   */
  private calculateBranchingFactor(adjacencyList: Map<string, string[]>): number {
    let totalBranches = 0;
    let nodeCount = 0;
    
    for (const [, neighbors] of adjacencyList) {
      if (neighbors.length > 0) {
        totalBranches += neighbors.length;
        nodeCount++;
      }
    }
    
    return nodeCount > 0 ? totalBranches / nodeCount : 0;
  }

  /**
   * 检查是否有循环
   */
  private hasCycles(adjacencyList: Map<string, string[]>): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    for (const [node] of adjacencyList) {
      if (!visited.has(node)) {
        if (this.hasCycleDFS(node, adjacencyList, visited, recursionStack)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 使用DFS检查循环
   */
  private hasCycleDFS(node: string, adjacencyList: Map<string, string[]>, visited: Set<string>, recursionStack: Set<string>): boolean {
    visited.add(node);
    recursionStack.add(node);
    
    const neighbors = adjacencyList.get(node) || [];
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (this.hasCycleDFS(neighbor, adjacencyList, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }

  /**
   * 检查流程图问题
   */
  private checkFlowchartIssues(lines: string[], analysis: DiagramAnalysis): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 检查命名问题
      if (line.match(/\b[a-z]\b\s*-->/)) {
        analysis.issues.push({
          type: 'naming',
          severity: 'medium',
          description: '使用单字母节点ID，建议使用更具描述性的名称',
          line: i + 1
        });
      }
      
      // 检查长标签
      const labelMatch = line.match(/\[([^\]]+)\]/);
      if (labelMatch && labelMatch[1].length > 20) {
        analysis.issues.push({
          type: 'readability',
          severity: 'medium',
          description: '节点标签过长，可能影响可读性',
          line: i + 1
        });
      }
      
      // 检查箭头语法
      if (line.includes('->') && !line.includes('-->')) {
        analysis.issues.push({
          type: 'syntax',
          severity: 'high',
          description: '使用了不正确的箭头语法，应该使用 "-->"',
          line: i + 1
        });
      }
    }
  }

  /**
   * 检查序列图问题
   */
  private checkSequenceIssues(lines: string[], analysis: DiagramAnalysis): void {
    const participants = new Set<string>();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 检查参与者声明
      const participantMatch = line.match(/participant\s+(\w+)/);
      if (participantMatch) {
        participants.add(participantMatch[1]);
      }
      
      // 检查消息中的未声明参与者
      const messageMatch = line.match(/(\w+)\s*--?>?>?\s*(\w+)/);
      if (messageMatch) {
        const [, from, to] = messageMatch;
        if (!participants.has(from) && !line.includes('participant')) {
          analysis.issues.push({
            type: 'structure',
            severity: 'medium',
            description: `参与者 "${from}" 未声明`,
            line: i + 1
          });
        }
        if (!participants.has(to) && !line.includes('participant')) {
          analysis.issues.push({
            type: 'structure',
            severity: 'medium',
            description: `参与者 "${to}" 未声明`,
            line: i + 1
          });
        }
      }
    }
  }

  /**
   * 检查类图问题
   */
  private checkClassIssues(lines: string[], analysis: DiagramAnalysis): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 检查类名命名规范
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        const className = classMatch[1];
        if (className[0] !== className[0].toUpperCase()) {
          analysis.issues.push({
            type: 'naming',
            severity: 'medium',
            description: '类名应该以大写字母开头',
            line: i + 1
          });
        }
      }
    }
  }

  /**
   * 检查饼图问题
   */
  private checkPieIssues(lines: string[], analysis: DiagramAnalysis): void {
    let totalValue = 0;
    let sectionCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const sectionMatch = line.match(/\"([^\"]+)\"\s*:\s*(\d+)/);
      if (sectionMatch) {
        sectionCount++;
        totalValue += parseInt(sectionMatch[2]);
      }
    }
    
    if (sectionCount > 7) {
      analysis.issues.push({
        type: 'readability',
        severity: 'medium',
        description: '饼图部分过多，可能影响可读性'
      });
    }
    
    if (totalValue !== 100) {
      analysis.issues.push({
        type: 'data',
        severity: 'low',
        description: '饼图数值总和不为100，可能影响理解'
      });
    }
  }

  /**
   * 计算复杂度
   */
  private calculateComplexity(analysis: DiagramAnalysis): void {
    let score = 0;
    
    // 基于节点数量
    if (analysis.nodeCount > 15) score += 2;
    else if (analysis.nodeCount > 8) score += 1;
    
    // 基于边数量
    if (analysis.edgeCount > 20) score += 2;
    else if (analysis.edgeCount > 10) score += 1;
    
    // 基于结构复杂度
    if (analysis.structure.maxDepth > 6) score += 2;
    else if (analysis.structure.maxDepth > 3) score += 1;
    
    if (analysis.structure.branchingFactor > 4) score += 1;
    
    if (analysis.structure.cyclicConnections) score += 1;
    
    // 基于问题数量
    const highSeverityIssues = analysis.issues.filter(issue => issue.severity === 'high').length;
    const mediumSeverityIssues = analysis.issues.filter(issue => issue.severity === 'medium').length;
    
    score += highSeverityIssues * 2 + mediumSeverityIssues;
    
    // 确定复杂度等级
    if (score >= 6) {
      analysis.complexity = 'complex';
    } else if (score >= 3) {
      analysis.complexity = 'medium';
    } else {
      analysis.complexity = 'simple';
    }
  }
}