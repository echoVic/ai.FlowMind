import { DiagramAnalysis } from '../types.js';

/**
 * 格式转换器
 * 负责在不同的 Mermaid 图表格式之间进行转换
 */
export class FormatConverter {
  /**
   * 转换图表格式
   */
  public convert(code: string, targetFormat: string, optimizeStructure: boolean = true): string {
    const cleanedCode = this.cleanCode(code);
    const sourceFormat = this.detectFormat(cleanedCode);
    
    if (sourceFormat === targetFormat) {
      return optimizeStructure ? this.optimizeStructure(cleanedCode, targetFormat) : cleanedCode;
    }

    // 解析源代码
    const parsed = this.parseCode(cleanedCode, sourceFormat);
    
    // 转换为目标格式
    const converted = this.convertParsedData(parsed, targetFormat);
    
    // 优化结构（如果需要）
    return optimizeStructure ? this.optimizeStructure(converted, targetFormat) : converted;
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
   * 检测图表格式
   */
  private detectFormat(code: string): string {
    const lines = code.split('\n');
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
   * 解析代码为通用数据结构
   */
  private parseCode(code: string, format: string): any {
    const lines = code.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('%%'));
    
    switch (format) {
      case 'flowchart':
      case 'graph':
        return this.parseFlowchart(lines);
      case 'sequence':
        return this.parseSequence(lines);
      case 'class':
        return this.parseClass(lines);
      case 'er':
        return this.parseER(lines);
      default:
        return this.parseGeneric(lines);
    }
  }

  /**
   * 解析流程图
   */
  private parseFlowchart(lines: string[]): any {
    const nodes = new Map<string, { id: string; label: string; shape: string }>();
    const edges = new Array<{ from: string; to: string; label?: string }>();
    
    let direction = 'TD'; // 默认方向
    
    for (const line of lines) {
      // 检查方向
      if (line.includes('flowchart')) {
        const match = line.match(/flowchart\s+(TD|LR|BT|RL)/);
        if (match) direction = match[1];
        continue;
      }
      
      // 解析节点连接
      const connectionMatch = line.match(/(\w+)(?:\[([^\]]+)\])?\s*-->\s*(\w+)(?:\[([^\]]+)\])?/);
      if (connectionMatch) {
        const [, fromId, fromLabel, toId, toLabel] = connectionMatch;
        
        if (fromLabel) {
          nodes.set(fromId, { id: fromId, label: fromLabel, shape: 'rectangle' });
        }
        if (toLabel) {
          nodes.set(toId, { id: toId, label: toLabel, shape: 'rectangle' });
        }
        
        edges.push({ from: fromId, to: toId });
        continue;
      }
      
      // 解析带标签的连接
      const labeledConnectionMatch = line.match(/(\w+)\s*-->\s*\|([^|]+)\|\s*(\w+)/);
      if (labeledConnectionMatch) {
        const [, fromId, edgeLabel, toId] = labeledConnectionMatch;
        edges.push({ from: fromId, to: toId, label: edgeLabel });
        continue;
      }
      
      // 解析单独的节点定义
      const nodeMatch = line.match(/(\w+)\[([^\]]+)\]/);
      if (nodeMatch) {
        const [, nodeId, nodeLabel] = nodeMatch;
        nodes.set(nodeId, { id: nodeId, label: nodeLabel, shape: 'rectangle' });
        continue;
      }
      
      // 解析决策节点
      const decisionMatch = line.match(/(\w+)\{([^\}]+)\}/);
      if (decisionMatch) {
        const [, nodeId, nodeLabel] = decisionMatch;
        nodes.set(nodeId, { id: nodeId, label: nodeLabel, shape: 'diamond' });
        continue;
      }
    }
    
    return {
      type: 'flowchart',
      direction,
      nodes: Array.from(nodes.values()),
      edges
    };
  }

  /**
   * 解析序列图
   */
  private parseSequence(lines: string[]): any {
    const participants = new Map<string, { id: string; label?: string }>();
    const messages = new Array<{ from: string; to: string; label: string; type: string }>();
    
    for (const line of lines) {
      if (line.includes('sequenceDiagram')) continue;
      
      // 解析参与者
      const participantMatch = line.match(/participant\s+(\w+)(?:\s+as\s+(.+))?/);
      if (participantMatch) {
        const [, id, label] = participantMatch;
        participants.set(id, { id, label });
        continue;
      }
      
      // 解析消息
      const messageMatch = line.match(/(\w+)\s*(--?>?>?|\-\-?>?>?)\s*(\w+)\s*:\s*(.+)/);
      if (messageMatch) {
        const [, from, arrow, to, message] = messageMatch;
        
        if (!participants.has(from)) {
          participants.set(from, { id: from });
        }
        if (!participants.has(to)) {
          participants.set(to, { id: to });
        }
        
        messages.push({ from, to, label: message, type: arrow });
        continue;
      }
    }
    
    return {
      type: 'sequence',
      participants: Array.from(participants.values()),
      messages
    };
  }

  /**
   * 解析类图
   */
  private parseClass(lines: string[]): any {
    const classes = new Map<string, { id: string; attributes: string[]; methods: string[] }>();
    const relationships = new Array<{ from: string; to: string; type: string }>();
    
    for (const line of lines) {
      if (line.includes('classDiagram')) continue;
      
      // 解析类定义
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        const [, className] = classMatch;
        if (!classes.has(className)) {
          classes.set(className, { id: className, attributes: [], methods: [] });
        }
        continue;
      }
      
      // 解析关系
      const relationMatch = line.match(/(\w+)\s*([\|\<\>]+[\-\.]+[\|\<\>]+)\s*(\w+)/);
      if (relationMatch) {
        const [, from, relation, to] = relationMatch;
        relationships.push({ from, to, type: relation });
        continue;
      }
      
      // 解析属性和方法
      const memberMatch = line.match(/(\w+)\s*:\s*(.+)/);
      if (memberMatch) {
        const [, className, member] = memberMatch;
        const classObj = classes.get(className);
        if (classObj) {
          if (member.includes('()')) {
            classObj.methods.push(member);
          } else {
            classObj.attributes.push(member);
          }
        }
        continue;
      }
    }
    
    return {
      type: 'class',
      classes: Array.from(classes.values()),
      relationships
    };
  }

  /**
   * 解析ER图
   */
  private parseER(lines: string[]): any {
    const entities = new Map<string, { id: string; attributes: string[] }>();
    const relationships = new Array<{ from: string; to: string; type: string }>();
    
    for (const line of lines) {
      if (line.includes('erDiagram')) continue;
      
      // 解析实体
      const entityMatch = line.match(/(\w+)\s*\{/);
      if (entityMatch) {
        const [, entityName] = entityMatch;
        if (!entities.has(entityName)) {
          entities.set(entityName, { id: entityName, attributes: [] });
        }
        continue;
      }
      
      // 解析关系
      const relationMatch = line.match(/(\w+)\s*([\|\<\>]+[\-\.]+[\|\<\>]+)\s*(\w+)/);
      if (relationMatch) {
        const [, from, relation, to] = relationMatch;
        relationships.push({ from, to, type: relation });
        continue;
      }
    }
    
    return {
      type: 'er',
      entities: Array.from(entities.values()),
      relationships
    };
  }

  /**
   * 通用解析
   */
  private parseGeneric(lines: string[]): any {
    return {
      type: 'generic',
      lines: lines.slice(1) // 跳过第一行类型声明
    };
  }

  /**
   * 转换解析后的数据为目标格式
   */
  private convertParsedData(parsed: any, targetFormat: string): string {
    switch (targetFormat) {
      case 'flowchart':
        return this.convertToFlowchart(parsed);
      case 'sequence':
        return this.convertToSequence(parsed);
      case 'class':
        return this.convertToClass(parsed);
      case 'er':
        return this.convertToER(parsed);
      case 'mindmap':
        return this.convertToMindmap(parsed);
      default:
        return this.convertToFlowchart(parsed);
    }
  }

  /**
   * 转换为流程图
   */
  private convertToFlowchart(parsed: any): string {
    if (parsed.type === 'flowchart') {
      return this.regenerateFlowchart(parsed);
    }

    const lines = [`flowchart TD`];
    
    if (parsed.type === 'sequence') {
      // 序列图转流程图
      const participants = parsed.participants;
      const messages = parsed.messages;
      
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        lines.push(`    ${participant.id}[${participant.label || participant.id}]`);
      }
      
      for (const message of messages) {
        lines.push(`    ${message.from} --> ${message.to}`);
      }
    } else if (parsed.type === 'class') {
      // 类图转流程图
      const classes = parsed.classes;
      const relationships = parsed.relationships;
      
      for (const cls of classes) {
        lines.push(`    ${cls.id}[${cls.id}]`);
      }
      
      for (const rel of relationships) {
        lines.push(`    ${rel.from} --> ${rel.to}`);
      }
    } else if (parsed.type === 'er') {
      // ER图转流程图
      const entities = parsed.entities;
      const relationships = parsed.relationships;
      
      for (const entity of entities) {
        lines.push(`    ${entity.id}[${entity.id}]`);
      }
      
      for (const rel of relationships) {
        lines.push(`    ${rel.from} --> ${rel.to}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 转换为序列图
   */
  private convertToSequence(parsed: any): string {
    if (parsed.type === 'sequence') {
      return this.regenerateSequence(parsed);
    }

    const lines = [`sequenceDiagram`];
    
    if (parsed.type === 'flowchart') {
      // 流程图转序列图
      const nodes = parsed.nodes;
      const edges = parsed.edges;
      
      // 添加参与者
      for (const node of nodes) {
        lines.push(`    participant ${node.id} as ${node.label || node.id}`);
      }
      
      // 添加消息
      for (const edge of edges) {
        const label = edge.label || '消息';
        lines.push(`    ${edge.from} ->> ${edge.to}: ${label}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 转换为类图
   */
  private convertToClass(parsed: any): string {
    if (parsed.type === 'class') {
      return this.regenerateClass(parsed);
    }

    const lines = [`classDiagram`];
    
    if (parsed.type === 'flowchart') {
      // 流程图转类图
      const nodes = parsed.nodes;
      const edges = parsed.edges;
      
      // 添加类
      for (const node of nodes) {
        lines.push(`    class ${node.id} {`);
        lines.push(`        +${node.label || node.id}()`);
        lines.push(`    }`);
      }
      
      // 添加关系
      for (const edge of edges) {
        lines.push(`    ${edge.from} --> ${edge.to}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 转换为ER图
   */
  private convertToER(parsed: any): string {
    if (parsed.type === 'er') {
      return this.regenerateER(parsed);
    }

    const lines = [`erDiagram`];
    
    if (parsed.type === 'flowchart') {
      // 流程图转ER图
      const nodes = parsed.nodes;
      const edges = parsed.edges;
      
      // 添加实体
      for (const node of nodes) {
        lines.push(`    ${node.id} {`);
        lines.push(`        string ${node.label || 'name'}`);
        lines.push(`    }`);
      }
      
      // 添加关系
      for (const edge of edges) {
        lines.push(`    ${edge.from} ||--|| ${edge.to} : has`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 转换为思维导图
   */
  private convertToMindmap(parsed: any): string {
    const lines = [`mindmap`];
    
    if (parsed.type === 'flowchart') {
      // 流程图转思维导图
      const nodes = parsed.nodes;
      const edges = parsed.edges;
      
      // 创建层次结构
      const hierarchy = this.buildHierarchy(nodes, edges);
      
      for (const item of hierarchy) {
        lines.push(`    ${item.indent}${item.label}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 构建层次结构
   */
  private buildHierarchy(nodes: any[], edges: any[]): any[] {
    const hierarchy: any[] = [];
    const visited = new Set<string>();
    
    // 找到根节点（没有入边的节点）
    const inDegree = new Map<string, number>();
    for (const node of nodes) {
      inDegree.set(node.id, 0);
    }
    for (const edge of edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }
    
    const roots = nodes.filter(node => inDegree.get(node.id) === 0);
    
    for (const root of roots) {
      this.buildHierarchyRecursive(root, nodes, edges, hierarchy, visited, '');
    }
    
    return hierarchy;
  }

  /**
   * 递归构建层次结构
   */
  private buildHierarchyRecursive(node: any, nodes: any[], edges: any[], hierarchy: any[], visited: Set<string>, indent: string): void {
    if (visited.has(node.id)) return;
    
    visited.add(node.id);
    hierarchy.push({
      id: node.id,
      label: node.label || node.id,
      indent: indent
    });
    
    // 找到子节点
    const children = edges.filter(edge => edge.from === node.id);
    for (const child of children) {
      const childNode = nodes.find(n => n.id === child.to);
      if (childNode) {
        this.buildHierarchyRecursive(childNode, nodes, edges, hierarchy, visited, indent + '  ');
      }
    }
  }

  /**
   * 重新生成流程图
   */
  private regenerateFlowchart(parsed: any): string {
    const lines = [`flowchart ${parsed.direction || 'TD'}`];
    
    for (const node of parsed.nodes) {
      if (node.shape === 'diamond') {
        lines.push(`    ${node.id}{${node.label}}`);
      } else {
        lines.push(`    ${node.id}[${node.label}]`);
      }
    }
    
    for (const edge of parsed.edges) {
      if (edge.label) {
        lines.push(`    ${edge.from} --> |${edge.label}| ${edge.to}`);
      } else {
        lines.push(`    ${edge.from} --> ${edge.to}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 重新生成序列图
   */
  private regenerateSequence(parsed: any): string {
    const lines = [`sequenceDiagram`];
    
    for (const participant of parsed.participants) {
      if (participant.label) {
        lines.push(`    participant ${participant.id} as ${participant.label}`);
      } else {
        lines.push(`    participant ${participant.id}`);
      }
    }
    
    for (const message of parsed.messages) {
      lines.push(`    ${message.from} ${message.type} ${message.to}: ${message.label}`);
    }
    
    return lines.join('\n');
  }

  /**
   * 重新生成类图
   */
  private regenerateClass(parsed: any): string {
    const lines = [`classDiagram`];
    
    for (const cls of parsed.classes) {
      lines.push(`    class ${cls.id} {`);
      for (const attr of cls.attributes) {
        lines.push(`        ${attr}`);
      }
      for (const method of cls.methods) {
        lines.push(`        ${method}`);
      }
      lines.push(`    }`);
    }
    
    for (const rel of parsed.relationships) {
      lines.push(`    ${rel.from} ${rel.type} ${rel.to}`);
    }
    
    return lines.join('\n');
  }

  /**
   * 重新生成ER图
   */
  private regenerateER(parsed: any): string {
    const lines = [`erDiagram`];
    
    for (const entity of parsed.entities) {
      lines.push(`    ${entity.id} {`);
      for (const attr of entity.attributes) {
        lines.push(`        ${attr}`);
      }
      lines.push(`    }`);
    }
    
    for (const rel of parsed.relationships) {
      lines.push(`    ${rel.from} ${rel.type} ${rel.to}`);
    }
    
    return lines.join('\n');
  }

  /**
   * 优化结构
   */
  private optimizeStructure(code: string, format: string): string {
    let optimizedCode = code;
    
    // 通用优化
    optimizedCode = this.addProperIndentation(optimizedCode);
    optimizedCode = this.removeEmptyLines(optimizedCode);
    optimizedCode = this.standardizeSpacing(optimizedCode);
    
    // 特定格式优化
    switch (format) {
      case 'flowchart':
        optimizedCode = this.optimizeFlowchart(optimizedCode);
        break;
      case 'sequence':
        optimizedCode = this.optimizeSequence(optimizedCode);
        break;
      case 'class':
        optimizedCode = this.optimizeClass(optimizedCode);
        break;
      case 'er':
        optimizedCode = this.optimizeER(optimizedCode);
        break;
    }
    
    return optimizedCode;
  }

  /**
   * 添加适当的缩进
   */
  private addProperIndentation(code: string): string {
    const lines = code.split('\n');
    const result: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (i === 0) {
        result.push(line); // 第一行不缩进
      } else if (line) {
        result.push(`    ${line}`); // 其他行缩进4个空格
      }
    }
    
    return result.join('\n');
  }

  /**
   * 移除空行
   */
  private removeEmptyLines(code: string): string {
    return code.split('\n').filter(line => line.trim()).join('\n');
  }

  /**
   * 标准化空格
   */
  private standardizeSpacing(code: string): string {
    return code.replace(/\s+/g, ' ').replace(/\s*-->\s*/g, ' --> ');
  }

  /**
   * 优化流程图
   */
  private optimizeFlowchart(code: string): string {
    // 确保有方向声明
    if (!code.includes('TD') && !code.includes('LR') && !code.includes('BT') && !code.includes('RL')) {
      code = code.replace('flowchart', 'flowchart TD');
    }
    
    return code;
  }

  /**
   * 优化序列图
   */
  private optimizeSequence(code: string): string {
    // 确保参与者声明在消息之前
    const lines = code.split('\n');
    const participants: string[] = [];
    const messages: string[] = [];
    const others: string[] = [];
    
    for (const line of lines) {
      if (line.includes('participant')) {
        participants.push(line);
      } else if (line.includes('-->') || line.includes('->>')) {
        messages.push(line);
      } else {
        others.push(line);
      }
    }
    
    return [...others, ...participants, ...messages].join('\n');
  }

  /**
   * 优化类图
   */
  private optimizeClass(code: string): string {
    // 确保类定义完整
    return code;
  }

  /**
   * 优化ER图
   */
  private optimizeER(code: string): string {
    // 确保实体定义完整
    return code;
  }
}