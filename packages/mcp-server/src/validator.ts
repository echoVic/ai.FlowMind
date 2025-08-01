import { parse, MermaidParseError } from '@mermaid-js/parser';
import { ValidationResult } from './types.js';

/**
 * Mermaid 语法验证器
 * 使用混合验证策略：
 * 1. 对于支持的图表类型，使用 @mermaid-js/parser 进行精确解析
 * 2. 对于不支持的图表类型，使用基于规则的验证
 */
export class MermaidValidator {
  private static instance: MermaidValidator;

  private constructor() {}

  public static getInstance(): MermaidValidator {
    if (!MermaidValidator.instance) {
      MermaidValidator.instance = new MermaidValidator();
    }
    return MermaidValidator.instance;
  }

  /**
   * 验证 Mermaid 语法
   */
  public async validate(code: string, strict = false): Promise<ValidationResult> {
    if (!code || code.trim().length === 0) {
      return {
        valid: false,
        error: 'Mermaid 代码不能为空',
        suggestions: ['请提供有效的 Mermaid 图表代码']
      };
    }

    try {
      // 清理代码
      const cleanedCode = this.cleanCode(code);
      
      // 检测图表类型
      const diagramType = this.detectDiagramType(cleanedCode);
      
      // 根据图表类型选择验证方法
      if (this.isParserSupported(diagramType)) {
        return await this.validateWithParser(cleanedCode, diagramType, strict);
      } else {
        return this.validateWithRules(cleanedCode, strict);
      }
    } catch (error: any) {
      return this.parseError(error, code, strict);
    }
  }

  /**
   * 检测图表类型
   */
  private detectDiagramType(code: string): string {
    const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return 'unknown';

    const firstLine = lines[0].toLowerCase();
    
    // 按优先级匹配图表类型
    if (firstLine.includes('pie')) return 'pie';
    if (firstLine.includes('info')) return 'info';
    if (firstLine.includes('packet')) return 'packet';
    if (firstLine.includes('architecture')) return 'architecture';
    if (firstLine.includes('gitgraph')) return 'gitGraph';
    if (firstLine.includes('radar')) return 'radar';
    if (firstLine.includes('treemap')) return 'treemap';
    
    // 不支持的类型
    if (firstLine.includes('flowchart') || firstLine.includes('graph')) return 'flowchart';
    if (firstLine.includes('sequencediagram')) return 'sequence';
    if (firstLine.includes('classdiagram')) return 'class';
    if (firstLine.includes('erdiagram')) return 'er';
    if (firstLine.includes('gantt')) return 'gantt';
    if (firstLine.includes('journey')) return 'journey';
    
    return 'unknown';
  }

  /**
   * 检查是否支持使用 @mermaid-js/parser 解析
   */
  private isParserSupported(diagramType: string): boolean {
    return ['pie', 'info', 'packet', 'architecture', 'gitGraph', 'radar', 'treemap'].includes(diagramType);
  }

  /**
   * 使用 @mermaid-js/parser 进行验证
   */
  private async validateWithParser(code: string, diagramType: string, strict: boolean): Promise<ValidationResult> {
    try {
      // 使用官方解析器进行验证
      const ast = await parse(diagramType as any, code);
      
      return {
        valid: true,
        // 可选：返回解析后的 AST 信息
        metadata: {
          parser: '@mermaid-js/parser',
          diagramType,
          hasAst: true
        }
      };
    } catch (error) {
      if (error instanceof MermaidParseError) {
        return {
          valid: false,
          error: error.message,
          line: this.extractLineFromParseError(error),
          suggestions: this.generateParserSuggestions(error, diagramType)
        };
      } else {
        return {
          valid: false,
          error: `解析失败: ${error.message}`,
          suggestions: ['检查图表语法是否正确']
        };
      }
    }
  }

  /**
   * 从解析错误中提取行号
   */
  private extractLineFromParseError(error: MermaidParseError): number | undefined {
    if (error.result.lexerErrors && error.result.lexerErrors.length > 0) {
      return error.result.lexerErrors[0].line;
    }
    return undefined;
  }

  /**
   * 为解析器错误生成建议
   */
  private generateParserSuggestions(error: MermaidParseError, diagramType: string): string[] {
    const suggestions: string[] = [];
    
    // 基于错误类型生成建议
    if (error.result.lexerErrors && error.result.lexerErrors.length > 0) {
      suggestions.push('检查是否有拼写错误或无效字符');
    }
    
    if (error.result.parserErrors && error.result.parserErrors.length > 0) {
      suggestions.push(`检查 ${diagramType} 图表的语法规则`);
    }
    
    // 基于图表类型的具体建议
    switch (diagramType) {
      case 'pie':
        suggestions.push('饼图格式: pie title 标题\\n    "标签" : 数值');
        break;
      case 'gitGraph':
        suggestions.push('Git图格式: gitGraph\\n    commit\\n    branch feature');
        break;
      case 'architecture':
        suggestions.push('架构图格式: architecture-beta\\n    group api\\n    service api');
        break;
      default:
        suggestions.push(`请参考 ${diagramType} 图表的官方语法文档`);
    }
    
    return suggestions;
  }

  /**
   * 基于规则的验证方法
   */
  private validateWithRules(code: string, strict: boolean): ValidationResult {
    const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return {
        valid: false,
        error: '代码不能为空',
        suggestions: ['请提供有效的 Mermaid 图表代码']
      };
    }

    const firstLine = lines[0];
    
    // 检查图表类型声明
    const diagramTypes = [
      'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'erDiagram',
      'gantt', 'pie', 'journey', 'gitGraph', 'mindmap', 'timeline'
    ];
    
    const hasDiagramType = diagramTypes.some(type => 
      firstLine.includes(type) || firstLine.startsWith(type)
    );
    
    if (!hasDiagramType) {
      return {
        valid: false,
        error: '缺少图表类型声明',
        line: 1,
        suggestions: [
          '图表必须以类型声明开始',
          '例如: flowchart TD, graph LR, sequenceDiagram 等',
          '检查第一行是否包含有效的图表类型'
        ]
      };
    }

    // 检查常见的语法错误
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // 检查括号匹配
      const bracketCheck = this.checkBrackets(line);
      if (!bracketCheck.valid) {
        return {
          valid: false,
          error: bracketCheck.error,
          line: lineNumber,
          suggestions: ['检查是否有未闭合的括号或引号']
        };
      }
      
      // 检查箭头语法
      if (line.includes('→')) {
        return {
          valid: false,
          error: '使用了不正确的箭头符号',
          line: lineNumber,
          suggestions: ['使用 "-->" 而不是 "→" 来表示箭头']
        };
      }
      
      // 检查流程图语法
      if (firstLine.includes('flowchart') || firstLine.includes('graph')) {
        if (line.includes('->') && !line.includes('-->')) {
          return {
            valid: false,
            error: '流程图箭头语法错误',
            line: lineNumber,
            suggestions: ['在流程图中使用 "-->" 而不是 "->"']
          };
        }
      }
      
      // 检查序列图语法
      if (firstLine.includes('sequenceDiagram')) {
        if (line.includes('>>') && !line.includes('->>')) {
          return {
            valid: false,
            error: '序列图箭头语法错误',
            line: lineNumber,
            suggestions: ['在序列图中使用 "->>" 或 "-->>" 表示消息']
          };
        }
      }
    }

    return {
      valid: true
    };
  }

  /**
   * 检查括号匹配
   */
  private checkBrackets(line: string): { valid: boolean; error?: string } {
    const brackets = {
      '[': ']',
      '(': ')',
      '{': '}',
      '"': '"',
      "'": "'"
    };
    
    const stack: string[] = [];
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (brackets[char]) {
        if (char === '"' || char === "'") {
          // 处理引号
          if (stack.length > 0 && stack[stack.length - 1] === char) {
            stack.pop();
          } else {
            stack.push(char);
          }
        } else {
          // 处理其他括号
          stack.push(char);
        }
      } else if (Object.values(brackets).includes(char)) {
        if (stack.length === 0) {
          return { valid: false, error: '多余的闭合括号' };
        }
        const last = stack.pop();
        if (brackets[last!] !== char) {
          return { valid: false, error: '括号不匹配' };
        }
      }
    }
    
    if (stack.length > 0) {
      return { valid: false, error: '存在未闭合的括号或引号' };
    }
    
    return { valid: true };
  }

  /**
   * 清理 Mermaid 代码
   */
  private cleanCode(code: string): string {
    return code
      .replace(/^```mermaid\s*\n?/i, '')  // 移除开头的 ```mermaid
      .replace(/^```\s*\n?/i, '')        // 移除开头的 ```
      .replace(/\n?```\s*$/i, '')        // 移除结尾的 ```
      .trim();
  }

  /**
   * 解析错误信息
   */
  private parseError(error: any, originalCode: string, strict: boolean): ValidationResult {
    const errorMessage = error?.message || error?.toString() || '未知错误';
    const result: ValidationResult = {
      valid: false,
      error: errorMessage,
      suggestions: []
    };

    // 尝试提取行号和列号
    const lineMatch = /line (\d+)/i.exec(errorMessage);
    const positionMatch = /(\d+):(\d+)/.exec(errorMessage);
    
    if (lineMatch) {
      result.line = parseInt(lineMatch[1], 10);
    }
    if (positionMatch) {
      result.line = parseInt(positionMatch[1], 10);
      result.column = parseInt(positionMatch[2], 10);
    }

    // 生成修复建议
    result.suggestions = this.generateSuggestions(errorMessage, originalCode, strict);

    return result;
  }

  /**
   * 生成修复建议
   */
  private generateSuggestions(errorMessage: string, code: string, strict: boolean): string[] {
    const suggestions: string[] = [];
    const lowerError = errorMessage.toLowerCase();

    // 常见错误的修复建议
    if (lowerError.includes('parse error') || lowerError.includes('syntax error')) {
      suggestions.push('检查图表语法是否正确');
      suggestions.push('确保节点ID和连接语法符合 Mermaid 规范');
    }

    if (lowerError.includes('unexpected token')) {
      suggestions.push('检查是否有未闭合的括号或引号');
      suggestions.push('确保特殊字符被正确转义');
    }

    if (lowerError.includes('graph') || lowerError.includes('flowchart')) {
      suggestions.push('流程图应以 "graph" 或 "flowchart" 开头');
      suggestions.push('检查节点连接语法，如: A --> B');
    }

    if (lowerError.includes('sequence')) {
      suggestions.push('序列图应以 "sequenceDiagram" 开头');
      suggestions.push('检查参与者和消息语法');
    }

    // 检查代码中的常见问题
    if (code.includes('-->>') && !code.includes('sequenceDiagram')) {
      suggestions.push('箭头 "-->" 可能应该是 "-->>"（序列图）或 "-->"（流程图）');
    }

    if (code.includes('→')) {
      suggestions.push('使用 "-->" 而不是 "→" 来表示箭头');
    }

    // 如果没有特定建议，提供通用建议
    if (suggestions.length === 0) {
      suggestions.push('检查 Mermaid 官方文档以获取正确的语法');
      suggestions.push('确保图表类型声明正确');
      suggestions.push('检查节点ID是否符合命名规范');
    }

    return suggestions;
  }
}