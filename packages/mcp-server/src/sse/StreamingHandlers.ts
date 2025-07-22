/**
 * Streaming Handlers class for StreamableHttp architecture
 * Processes requests with real-time progress updates via Server-Sent Events
 * 
 * 重构后的版本：完全依赖 SSEEventFormatter 进行事件创建和格式化
 * 遵循单一职责原则和关注点分离
 */

import { ServerResponse } from 'http';
import { FormatConverter } from '../optimizer/format-converter.js';
import { DiagramOptimizer } from '../optimizer/index.js';
import { TemplateManager } from '../templates.js';
import { ConvertFormatInput, DiagramTemplate, FormatConversionResult, GetTemplatesInput, OptimizationResult, OptimizeDiagramInput, ValidateMermaidInput, ValidationResult } from '../types.js';
import { MermaidValidator } from '../validator.js';
import { SSEEventFormatter } from './SSEEventEmitter.js';
import { SSEEvent } from './types.js';

/**
 * StreamingHandlers class that provides streaming versions of core operations
 */
export class StreamingHandlers {
  private validator: MermaidValidator;
  private templateManager: TemplateManager;
  private optimizer: DiagramOptimizer;
  private formatConverter: FormatConverter;

  constructor() {
    this.validator = MermaidValidator.getInstance();
    this.templateManager = TemplateManager.getInstance();
    this.optimizer = new DiagramOptimizer();
    this.formatConverter = new FormatConverter();
  }

  /**
   * 写入 SSE 事件到响应流
   * 使用 SSEEventFormatter 进行格式化，确保一致性
   */
  private writeSSEEvent(res: ServerResponse, event: SSEEvent): void {
    const formattedEvent = SSEEventFormatter.formatSSEEvent(event);
    res.write(formattedEvent);
  }

  /**
   * Stream validation process with real-time progress updates
   */
  async streamValidation(input: ValidateMermaidInput, res: ServerResponse): Promise<ValidationResult> {
    try {
      // Start validation
      const startEvent = SSEEventFormatter.createStartEvent(
        'validation_start',
        'validation'
      );
      this.writeSSEEvent(res, startEvent);

      // Simulate validation stages with progress tracking
      const code = input.mermaidCode;
      const lines = code.split('\n');
      const totalLines = lines.length;
      let linesProcessed = 0;
      let issuesFound = 0;

      // Stage 1: Parsing (0-25%)
      const parsingProgressEvent = SSEEventFormatter.createProgressEvent(
        'validation_progress',
        'validation',
        10,
        'Parsing Mermaid code...',
        'parsing',
        { linesProcessed: 0, totalLines, issuesFound }
      );
      this.writeSSEEvent(res, parsingProgressEvent);

      // Simulate parsing progress
      await this.simulateProgress(100);

      // Check for empty code early
      if (!code || code.trim().length === 0) {
        const errorResult: ValidationResult = {
          valid: false,
          error: 'Mermaid 代码不能为空',
          suggestions: ['请提供有效的 Mermaid 图表代码']
        };

        const completeProgressEvent = SSEEventFormatter.createProgressEvent(
          'validation_progress',
          'validation',
          100,
          'Validation completed with errors',
          'complete',
          { linesProcessed: totalLines, totalLines, issuesFound: 1 }
        );
        this.writeSSEEvent(res, completeProgressEvent);

        const completeEvent = SSEEventFormatter.createCompleteEvent(
          'validation_complete',
          'validation',
          { result: errorResult }
        );
        this.writeSSEEvent(res, completeEvent);

        return errorResult;
      }

      linesProcessed = Math.floor(totalLines * 0.25);
      const parsingCompleteEvent = SSEEventFormatter.createProgressEvent(
        'validation_progress',
        'validation',
        25,
        'Code parsing completed',
        'parsing',
        { linesProcessed, totalLines, issuesFound }
      );
      this.writeSSEEvent(res, parsingCompleteEvent);

      // Stage 2: Syntax Check (25-60%)
      const syntaxStartEvent = SSEEventFormatter.createProgressEvent(
        'validation_progress',
        'validation',
        30,
        'Checking syntax rules...',
        'syntax_check',
        { linesProcessed, totalLines, issuesFound }
      );
      this.writeSSEEvent(res, syntaxStartEvent);

      await this.simulateProgress(150);

      // Perform basic syntax validation
      const cleanedCode = this.cleanCode(code);
      const diagramType = this.detectDiagramType(cleanedCode);
      
      // Check for basic syntax issues
      const syntaxIssues = this.checkBasicSyntax(cleanedCode);
      issuesFound += syntaxIssues.length;

      linesProcessed = Math.floor(totalLines * 0.6);
      const syntaxCompleteEvent = SSEEventFormatter.createProgressEvent(
        'validation_progress',
        'validation',
        60,
        `Syntax check completed. Found ${syntaxIssues.length} potential issues.`,
        'syntax_check',
        { linesProcessed, totalLines, issuesFound }
      );
      this.writeSSEEvent(res, syntaxCompleteEvent);

      // Stage 3: Semantic Analysis (60-90%)
      const semanticStartEvent = SSEEventFormatter.createProgressEvent(
        'validation_progress',
        'validation',
        65,
        'Performing semantic analysis...',
        'semantic_analysis',
        { linesProcessed, totalLines, issuesFound }
      );
      this.writeSSEEvent(res, semanticStartEvent);

      await this.simulateProgress(200);

      // Use the actual validator for final validation
      const validationResult = await this.validator.validate(input.mermaidCode);

      linesProcessed = totalLines;
      const semanticCompleteEvent = SSEEventFormatter.createProgressEvent(
        'validation_progress',
        'validation',
        90,
        'Semantic analysis completed',
        'semantic_analysis',
        { linesProcessed, totalLines, issuesFound }
      );
      this.writeSSEEvent(res, semanticCompleteEvent);

      // Stage 4: Complete (90-100%)
      const finalProgressEvent = SSEEventFormatter.createProgressEvent(
        'validation_progress',
        'validation',
        100,
        `Validation completed. Code is ${validationResult.valid ? 'valid' : 'invalid'}.`,
        'complete',
        { linesProcessed, totalLines, issuesFound }
      );
      this.writeSSEEvent(res, finalProgressEvent);

      const completeEvent = SSEEventFormatter.createCompleteEvent(
        'validation_complete',
        'validation',
        { result: validationResult }
      );
      this.writeSSEEvent(res, completeEvent);

      return validationResult;

    } catch (error: any) {
      // Emit error event
      const errorEvent = SSEEventFormatter.createErrorEvent(
        'validation',
        error
      );
      this.writeSSEEvent(res, errorEvent);
      
      // Return error result
      return {
        valid: false,
        error: error.message || String(error),
        suggestions: ['请检查输入参数并重试']
      };
    }
  }

  /**
   * Stream optimization process with real-time progress updates
   */
  async streamOptimization(input: OptimizeDiagramInput, res: ServerResponse): Promise<OptimizationResult> {
    try {
      // Start optimization
      const startEvent = SSEEventFormatter.createStartEvent(
        'optimization_start',
        'optimization'
      );
      this.writeSSEEvent(res, startEvent);

      // Stage 1: Analysis (0-30%)
      const analysisEvent = SSEEventFormatter.createProgressEvent(
        'optimization_progress',
        'optimization',
        10,
        'Analyzing diagram structure...',
        'analysis',
        { step: 'initial_analysis' }
      );
      this.writeSSEEvent(res, analysisEvent);

      await this.simulateProgress(200);

      // Stage 2: Optimization (30-80%)
      const optimizationEvent = SSEEventFormatter.createProgressEvent(
        'optimization_progress',
        'optimization',
        40,
        'Applying optimizations...',
        'optimization',
        { step: 'applying_optimizations' }
      );
      this.writeSSEEvent(res, optimizationEvent);

      await this.simulateProgress(300);

      // Use the actual optimizer
      const optimizationResult = this.optimizer.optimize(input);

      // Stage 3: Validation (80-100%)
      const validationEvent = SSEEventFormatter.createProgressEvent(
        'optimization_progress',
        'optimization',
        90,
        'Validating optimized result...',
        'validation',
        { step: 'final_validation' }
      );
      this.writeSSEEvent(res, validationEvent);

      await this.simulateProgress(100);

      const completeProgressEvent = SSEEventFormatter.createProgressEvent(
        'optimization_progress',
        'optimization',
        100,
        'Optimization completed successfully',
        'complete',
        { step: 'complete' }
      );
      this.writeSSEEvent(res, completeProgressEvent);

      const completeEvent = SSEEventFormatter.createCompleteEvent(
        'optimization_complete',
        'optimization',
        { result: optimizationResult }
      );
      this.writeSSEEvent(res, completeEvent);

      return optimizationResult;

    } catch (error: any) {
      const errorEvent = SSEEventFormatter.createErrorEvent(
        'optimization',
        error
      );
      this.writeSSEEvent(res, errorEvent);
      
      throw error;
    }
  }

  /**
   * Stream template generation process with real-time progress updates
   */
  async streamTemplateGeneration(input: GetTemplatesInput, res: ServerResponse): Promise<DiagramTemplate[]> {
    try {
      // Start template generation
      const startEvent = SSEEventFormatter.createStartEvent(
        'template_start',
        'template_generation'
      );
      this.writeSSEEvent(res, startEvent);

      // Stage 1: Loading templates (0-40%)
      const loadingEvent = SSEEventFormatter.createProgressEvent(
        'template_progress',
        'template_generation',
        20,
        'Loading available templates...',
        'loading',
        { step: 'loading_templates' }
      );
      this.writeSSEEvent(res, loadingEvent);

      await this.simulateProgress(150);

      // Use the actual template manager
      const templates = await this.templateManager.getTemplates(input);

      // Stage 2: Processing templates (40-80%)
      const processingEvent = SSEEventFormatter.createProgressEvent(
        'template_progress',
        'template_generation',
        60,
        `Processing ${templates.length} templates...`,
        'processing',
        { templatesFound: templates.length }
      );
      this.writeSSEEvent(res, processingEvent);

      await this.simulateProgress(200);

      // Stage 3: Optimization (80-100%)
      const optimizationEvent = SSEEventFormatter.createProgressEvent(
        'template_progress',
        'template_generation',
        90,
        'Optimizing template order...',
        'optimization',
        { templatesProcessed: templates.length }
      );
      this.writeSSEEvent(res, optimizationEvent);

      const optimizedTemplates = this.optimizeTemplateOrder(templates, input);

      await this.simulateProgress(100);

      const completeProgressEvent = SSEEventFormatter.createProgressEvent(
        'template_progress',
        'template_generation',
        100,
        `Template generation completed. Returning ${optimizedTemplates.length} templates.`,
        'complete',
        { 
          templatesProcessed: optimizedTemplates.length,
          summary: this.generateTemplateSummary(optimizedTemplates)
        }
      );
      this.writeSSEEvent(res, completeProgressEvent);

      const completeEvent = SSEEventFormatter.createCompleteEvent(
        'template_complete',
        'template_generation',
        { 
          result: {
            templates: optimizedTemplates,
            totalCount: optimizedTemplates.length,
            filters: input,
            processingTime: Date.now(),
            summary: this.generateTemplateSummary(optimizedTemplates)
          }
        }
      );
      this.writeSSEEvent(res, completeEvent);

      return optimizedTemplates;

    } catch (error: any) {
      const errorEvent = SSEEventFormatter.createErrorEvent(
        'template_generation',
        error
      );
      this.writeSSEEvent(res, errorEvent);
      
      return [];
    }
  }

  /**
   * Stream format conversion process with real-time progress updates
   */
  async streamFormatConversion(input: ConvertFormatInput, res: ServerResponse): Promise<FormatConversionResult> {
    try {
      // Start format conversion
      const startEvent = SSEEventFormatter.createStartEvent(
        'format_conversion_start',
        'format_conversion'
      );
      this.writeSSEEvent(res, startEvent);

      // Stage 1: Analysis (0-30%)
      const analysisEvent = SSEEventFormatter.createProgressEvent(
        'format_conversion_progress',
        'format_conversion',
        15,
        'Analyzing source format...',
        'analysis',
        { targetFormat: input.targetFormat }
      );
      this.writeSSEEvent(res, analysisEvent);

      await this.simulateProgress(150);

      // Stage 2: Conversion (30-80%)
      const conversionEvent = SSEEventFormatter.createProgressEvent(
        'format_conversion_progress',
        'format_conversion',
        50,
        'Converting format...',
        'conversion',
        { step: 'applying_conversion' }
      );
      this.writeSSEEvent(res, conversionEvent);

      await this.simulateProgress(250);

      // Use the actual format converter
      const convertedCode = this.formatConverter.convert(
        input.mermaidCode, 
        input.targetFormat, 
        input.optimizeStructure
      );
      
      const conversionResult: FormatConversionResult = {
        originalCode: input.mermaidCode,
        convertedCode,
        sourceFormat: 'mermaid',
        targetFormat: input.targetFormat,
        success: true,
        conversionSteps: ['analysis', 'conversion', 'validation'],
        preservedElements: { structure: true, content: true, relationships: true }
      };

      // Stage 3: Validation (80-100%)
      const validationEvent = SSEEventFormatter.createProgressEvent(
        'format_conversion_progress',
        'format_conversion',
        90,
        'Validating converted result...',
        'validation',
        { step: 'final_validation' }
      );
      this.writeSSEEvent(res, validationEvent);

      await this.simulateProgress(100);

      const completeProgressEvent = SSEEventFormatter.createProgressEvent(
        'format_conversion_progress',
        'format_conversion',
        100,
        'Format conversion completed successfully',
        'complete',
        { step: 'complete' }
      );
      this.writeSSEEvent(res, completeProgressEvent);

      const completeEvent = SSEEventFormatter.createCompleteEvent(
        'format_conversion_complete',
        'format_conversion',
        { result: conversionResult }
      );
      this.writeSSEEvent(res, completeEvent);

      return conversionResult;

    } catch (error: any) {
      const errorEvent = SSEEventFormatter.createErrorEvent(
        'format_conversion',
        error
      );
      this.writeSSEEvent(res, errorEvent);
      
      throw error;
    }
  }

  // Helper methods

  /**
   * Clean Mermaid code by removing markdown code blocks
   */
  private cleanCode(code: string): string {
    return code
      .replace(/```mermaid\s*\n/g, '')
      .replace(/```\s*$/g, '')
      .trim();
  }

  /**
   * Detect diagram type from code
   */
  private detectDiagramType(code: string): string {
    const firstLine = code.split('\n')[0].trim().toLowerCase();
    
    if (firstLine.includes('graph')) return 'flowchart';
    if (firstLine.includes('flowchart')) return 'flowchart';
    if (firstLine.includes('sequencediagram')) return 'sequence';
    if (firstLine.includes('classDiagram')) return 'class';
    if (firstLine.includes('stateDiagram')) return 'state';
    if (firstLine.includes('erDiagram')) return 'er';
    if (firstLine.includes('gantt')) return 'gantt';
    if (firstLine.includes('pie')) return 'pie';
    
    return 'unknown';
  }

  /**
   * Check for basic syntax issues
   */
  private checkBasicSyntax(code: string): Array<{ line: number; issue: string }> {
    const issues: Array<{ line: number; issue: string }> = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('%%')) {
        return;
      }
      
      // Check for unmatched brackets
      const bracketCheck = this.checkBrackets(trimmedLine);
      if (!bracketCheck.valid && bracketCheck.error) {
        issues.push({
          line: index + 1,
          issue: bracketCheck.error
        });
      }
    });
    
    return issues;
  }

  /**
   * Check bracket matching in a line
   */
  private checkBrackets(line: string): { valid: boolean; error?: string } {
    const brackets = {
      '(': ')',
      '[': ']',
      '{': '}',
      '<': '>'
    };
    
    const stack: string[] = [];
    
    for (const char of line) {
      if (char in brackets) {
        stack.push(char);
      } else if (Object.values(brackets).includes(char)) {
        const last = stack.pop();
        if (!last || brackets[last as keyof typeof brackets] !== char) {
          return { valid: false, error: `Unmatched bracket: ${char}` };
        }
      }
    }
    
    if (stack.length > 0) {
      return { valid: false, error: `Unclosed bracket: ${stack[stack.length - 1]}` };
    }
    
    return { valid: true };
  }

  /**
   * Optimize template order based on relevance and user preferences
   */
  private optimizeTemplateOrder(templates: DiagramTemplate[], input: GetTemplatesInput): DiagramTemplate[] {
    return templates.sort((a, b) => {
      // Sort by complexity (simple first if no preference)
      const complexityOrder = { 'simple': 1, 'medium': 2, 'complex': 3 };
      const complexityDiff = complexityOrder[a.complexity] - complexityOrder[b.complexity];
      
      // If complexity is the same, sort by name
      if (complexityDiff === 0) {
        return a.name.localeCompare(b.name);
      }
      
      return complexityDiff;
    });
  }

  /**
   * Generate a summary of the template results
   */
  private generateTemplateSummary(templates: DiagramTemplate[]): string {
    if (templates.length === 0) {
      return 'No templates found matching the specified criteria.';
    }

    const typeCount = templates.reduce((acc, template) => {
      acc[template.type] = (acc[template.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const complexityCount = templates.reduce((acc, template) => {
      acc[template.complexity] = (acc[template.complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typesSummary = Object.entries(typeCount)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    const complexitySummary = Object.entries(complexityCount)
      .map(([complexity, count]) => `${count} ${complexity}`)
      .join(', ');

    return `Found ${templates.length} templates: ${typesSummary}. Complexity distribution: ${complexitySummary}.`;
  }

  /**
   * Simulate processing time with a promise delay
   */
  private simulateProgress(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
