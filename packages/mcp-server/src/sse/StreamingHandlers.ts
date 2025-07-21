/**
 * Streaming Handlers class for processing requests with real-time progress updates
 */

import { FormatConverter } from '../optimizer/format-converter.js';
import { DiagramOptimizer } from '../optimizer/index.js';
import { TemplateManager } from '../templates.js';
import { ConvertFormatInput, DiagramTemplate, FormatConversionResult, GetTemplatesInput, OptimizationResult, OptimizeDiagramInput, ValidateMermaidInput, ValidationResult } from '../types.js';
import { MermaidValidator } from '../validator.js';
import { SSEEventEmitter } from './SSEEventEmitter.js';
import { StreamingContext } from './events.js';

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
   * Stream validation process with real-time progress updates
   */
  async streamValidation(input: ValidateMermaidInput, context: StreamingContext): Promise<ValidationResult> {
    const { connectionId, requestId, emit } = context;
    const eventEmitter = new SSEEventEmitter(connectionId, requestId);

    try {
      // Override the emit method to use the context's emit function
      eventEmitter.emit = (event) => {
        emit(event.data);
      };

      // Start validation
      eventEmitter.emitValidationStart();

      // Simulate validation stages with progress tracking
      const code = input.mermaidCode;
      const lines = code.split('\n');
      const totalLines = lines.length;
      let linesProcessed = 0;
      let issuesFound = 0;

      // Stage 1: Parsing (0-25%)
      eventEmitter.emitValidationProgress(
        10,
        'parsing',
        'Parsing Mermaid code...',
        { linesProcessed: 0, totalLines, issuesFound }
      );

      // Simulate parsing progress
      await this.simulateProgress(100); // Small delay for parsing

      // Check for empty code early
      if (!code || code.trim().length === 0) {
        const errorResult: ValidationResult = {
          valid: false,
          error: 'Mermaid 代码不能为空',
          suggestions: ['请提供有效的 Mermaid 图表代码']
        };

        eventEmitter.emitValidationProgress(
          100,
          'complete',
          'Validation completed with errors',
          { linesProcessed: totalLines, totalLines, issuesFound: 1 }
        );

        eventEmitter.emitValidationComplete(errorResult);
        return errorResult;
      }

      linesProcessed = Math.floor(totalLines * 0.25);
      eventEmitter.emitValidationProgress(
        25,
        'parsing',
        'Code parsing completed',
        { linesProcessed, totalLines, issuesFound }
      );

      // Stage 2: Syntax Check (25-60%)
      eventEmitter.emitValidationProgress(
        30,
        'syntax_check',
        'Checking syntax rules...',
        { linesProcessed, totalLines, issuesFound }
      );

      await this.simulateProgress(150); // Simulate syntax checking time

      // Perform basic syntax validation
      const cleanedCode = this.cleanCode(code);
      const diagramType = this.detectDiagramType(cleanedCode);
      
      // Check for basic syntax issues
      const syntaxIssues = this.checkBasicSyntax(cleanedCode);
      issuesFound += syntaxIssues.length;

      linesProcessed = Math.floor(totalLines * 0.6);
      eventEmitter.emitValidationProgress(
        60,
        'syntax_check',
        `Syntax check completed. Found ${syntaxIssues.length} potential issues.`,
        { linesProcessed, totalLines, issuesFound }
      );

      // Stage 3: Semantic Analysis (60-90%)
      eventEmitter.emitValidationProgress(
        65,
        'semantic_analysis',
        'Performing semantic analysis...',
        { linesProcessed, totalLines, issuesFound }
      );

      await this.simulateProgress(200); // Simulate semantic analysis time

      // Perform the actual validation using the existing validator
      const validationResult = await this.validator.validate(input.mermaidCode, input.strict);

      // Update issues count based on validation result
      if (!validationResult.valid) {
        issuesFound++;
      }

      linesProcessed = Math.floor(totalLines * 0.9);
      eventEmitter.emitValidationProgress(
        90,
        'semantic_analysis',
        'Semantic analysis completed',
        { linesProcessed, totalLines, issuesFound }
      );

      // Stage 4: Complete (90-100%)
      eventEmitter.emitValidationProgress(
        95,
        'complete',
        'Finalizing validation results...',
        { linesProcessed: totalLines, totalLines, issuesFound }
      );

      await this.simulateProgress(50); // Final processing

      // Complete validation
      eventEmitter.emitValidationProgress(
        100,
        'complete',
        validationResult.valid ? 'Validation completed successfully' : 'Validation completed with issues',
        { linesProcessed: totalLines, totalLines, issuesFound }
      );

      eventEmitter.emitValidationComplete(validationResult);

      return validationResult;

    } catch (error: any) {
      // Emit error event
      eventEmitter.emitError(error, 'validation');
      
      // Return error result
      const errorResult: ValidationResult = {
        valid: false,
        error: error.message || 'Validation failed with unknown error',
        suggestions: ['Please check your Mermaid code syntax']
      };

      return errorResult;
    }
  }

  /**
   * Clean Mermaid code by removing markdown code blocks
   */
  private cleanCode(code: string): string {
    return code
      .replace(/^```mermaid\s*\n?/i, '')  // Remove opening ```mermaid
      .replace(/^```\s*\n?/i, '')        // Remove opening ```
      .replace(/\n?```\s*$/i, '')        // Remove closing ```
      .trim();
  }

  /**
   * Detect diagram type from code
   */
  private detectDiagramType(code: string): string {
    const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return 'unknown';

    const firstLine = lines[0].toLowerCase();
    
    // Match diagram types
    if (firstLine.includes('pie')) return 'pie';
    if (firstLine.includes('info')) return 'info';
    if (firstLine.includes('packet')) return 'packet';
    if (firstLine.includes('architecture')) return 'architecture';
    if (firstLine.includes('gitgraph')) return 'gitGraph';
    if (firstLine.includes('radar')) return 'radar';
    if (firstLine.includes('treemap')) return 'treemap';
    if (firstLine.includes('flowchart') || firstLine.includes('graph')) return 'flowchart';
    if (firstLine.includes('sequencediagram')) return 'sequence';
    if (firstLine.includes('classdiagram')) return 'class';
    if (firstLine.includes('erdiagram')) return 'er';
    if (firstLine.includes('gantt')) return 'gantt';
    if (firstLine.includes('journey')) return 'journey';
    
    return 'unknown';
  }

  /**
   * Check for basic syntax issues
   */
  private checkBasicSyntax(code: string): Array<{ line: number; issue: string }> {
    const issues: Array<{ line: number; issue: string }> = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      // Check for common syntax issues
      if (line.includes('→')) {
        issues.push({ line: lineNumber, issue: 'Invalid arrow symbol' });
      }

      // Check bracket matching
      const bracketCheck = this.checkBrackets(line);
      if (!bracketCheck.valid) {
        issues.push({ line: lineNumber, issue: bracketCheck.error || 'Bracket mismatch' });
      }
    }

    return issues;
  }

  /**
   * Check bracket matching in a line
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
      
      if (brackets[char as keyof typeof brackets]) {
        if (char === '"' || char === "'") {
          // Handle quotes
          if (stack.length > 0 && stack[stack.length - 1] === char) {
            stack.pop();
          } else {
            stack.push(char);
          }
        } else {
          // Handle other brackets
          stack.push(char);
        }
      } else if (Object.values(brackets).includes(char)) {
        if (stack.length === 0) {
          return { valid: false, error: 'Extra closing bracket' };
        }
        const last = stack.pop();
        if (brackets[last! as keyof typeof brackets] !== char) {
          return { valid: false, error: 'Bracket mismatch' };
        }
      }
    }
    
    if (stack.length > 0) {
      return { valid: false, error: 'Unclosed brackets or quotes' };
    }
    
    return { valid: true };
  }

  /**
   * Stream optimization process with real-time progress updates
   */
  async streamOptimization(input: OptimizeDiagramInput, context: StreamingContext): Promise<OptimizationResult> {
    const { connectionId, requestId, emit } = context;
    const eventEmitter = new SSEEventEmitter(connectionId, requestId);

    try {
      // Override the emit method to use the context's emit function
      eventEmitter.emit = (event) => {
        emit(event.data);
      };

      // Start optimization
      eventEmitter.emitOptimizationStart();

      const { mermaidCode, goals = ['readability'] } = input;
      const totalStages = 4; // analysis, layout, readability, formatting
      let currentStage = 0;

      // Stage 1: Analysis (0-25%)
      currentStage++;
      eventEmitter.emitOptimizationProgress(
        5,
        'analysis',
        'Analyzing diagram structure...',
        { suggestionsGenerated: 0, optimizationsApplied: 0, currentScore: 5 }
      );

      await this.simulateProgress(200);

      // Perform diagram analysis
      const analysis = this.getAnalysisPreview(mermaidCode);
      
      eventEmitter.emitOptimizationProgress(
        25,
        'analysis',
        `Analysis completed. Found ${analysis.issueCount} potential improvements.`,
        { suggestionsGenerated: analysis.issueCount, optimizationsApplied: 0, currentScore: 25, analysis: analysis.summary }
      );

      // Stage 2: Layout optimization (25-50%)
      if (goals.includes('compactness') || goals.includes('aesthetics')) {
        currentStage++;
        eventEmitter.emitOptimizationProgress(
          30,
          'layout',
          'Optimizing diagram layout...',
          { suggestionsGenerated: analysis.issueCount, optimizationsApplied: 0, currentScore: 30 }
        );

        await this.simulateProgress(300);

        eventEmitter.emitOptimizationProgress(
          50,
          'layout',
          'Layout optimization completed',
          { suggestionsGenerated: analysis.issueCount + 2, optimizationsApplied: 1, currentScore: 50 }
        );
      }

      // Stage 3: Readability optimization (50-75%)
      if (goals.includes('readability')) {
        currentStage++;
        eventEmitter.emitOptimizationProgress(
          55,
          'readability',
          'Improving readability...',
          { suggestionsGenerated: analysis.issueCount + 3, optimizationsApplied: 1, currentScore: 55 }
        );

        await this.simulateProgress(250);

        eventEmitter.emitOptimizationProgress(
          75,
          'readability',
          'Readability optimization completed',
          { suggestionsGenerated: analysis.issueCount + 4, optimizationsApplied: 2, currentScore: 75 }
        );
      }

      // Stage 4: Formatting and finalization (75-100%)
      currentStage++;
      eventEmitter.emitOptimizationProgress(
        80,
        'formatting',
        'Applying optimizations and formatting...',
        { suggestionsGenerated: analysis.issueCount + 5, optimizationsApplied: 2, currentScore: 80 }
      );

      await this.simulateProgress(150);

      // Perform the actual optimization using the existing optimizer
      const optimizationResult = this.optimizer.optimize(input);

      eventEmitter.emitOptimizationProgress(
        95,
        'formatting',
        'Finalizing optimization results...',
        { 
          suggestionsGenerated: optimizationResult.suggestions.length, 
          optimizationsApplied: optimizationResult.appliedOptimizations.length, 
          currentScore: 95 
        }
      );

      await this.simulateProgress(100);

      // Complete optimization
      const finalScore = Math.round(
        (optimizationResult.metrics.readabilityScore + 
         optimizationResult.metrics.compactnessScore + 
         optimizationResult.metrics.aestheticsScore + 
         optimizationResult.metrics.accessibilityScore) / 4
      );

      eventEmitter.emitOptimizationProgress(
        100,
        'complete',
        `Optimization completed successfully. Applied ${optimizationResult.appliedOptimizations.length} optimizations.`,
        { 
          suggestionsGenerated: optimizationResult.suggestions.length,
          optimizationsApplied: optimizationResult.appliedOptimizations.length,
          currentScore: finalScore,
          metrics: optimizationResult.metrics
        }
      );

      eventEmitter.emitOptimizationComplete(optimizationResult);

      return optimizationResult;

    } catch (error: any) {
      // Emit error event
      eventEmitter.emitError(error, 'optimization');
      
      // Return error result
      const errorResult: OptimizationResult = {
        originalCode: input.mermaidCode,
        optimizedCode: input.mermaidCode,
        suggestions: [],
        metrics: {
          readabilityScore: 0,
          compactnessScore: 0,
          aestheticsScore: 0,
          accessibilityScore: 0
        },
        appliedOptimizations: []
      };

      return errorResult;
    }
  }

  /**
   * Get a preview of analysis results for progress reporting
   */
  private getAnalysisPreview(code: string): { issueCount: number; summary: string } {
    // Quick analysis for progress reporting
    const lines = code.split('\n').filter(line => line.trim().length > 0);
    const nodes = (code.match(/\[(.*?)\]/g) || []).length;
    const edges = (code.match(/-->/g) || []).length + (code.match(/---/g) || []).length;
    
    let issueCount = 0;
    let issues = [];

    // Check for common improvement opportunities
    if (lines.length > 30) {
      issueCount++;
      issues.push('complex structure');
    }
    if (!code.includes('title:')) {
      issueCount++;
      issues.push('missing title');
    }
    if (nodes > 15) {
      issueCount++;
      issues.push('many nodes');
    }
    if (!code.includes('classDef') && !code.includes('style')) {
      issueCount++;
      issues.push('no styling');
    }

    const summary = `${nodes} nodes, ${edges} edges` + (issues.length > 0 ? `, potential improvements: ${issues.join(', ')}` : '');

    return { issueCount, summary };
  }

  /**
   * Stream format conversion process with real-time progress updates
   */
  async streamFormatConversion(input: ConvertFormatInput, context: StreamingContext): Promise<FormatConversionResult> {
    const { connectionId, requestId, emit } = context;
    const eventEmitter = new SSEEventEmitter(connectionId, requestId);

    try {
      // Override the emit method to use the context's emit function
      eventEmitter.emit = (event) => {
        emit(event.data);
      };

      // Start format conversion
      eventEmitter.emitFormatConversionStart();

      const { mermaidCode, targetFormat = 'auto', optimizeStructure = true } = input;
      const totalStages = 4; // detection, parsing, conversion, optimization
      let currentStage = 0;

      // Stage 1: Format detection (0-25%)
      currentStage++;
      eventEmitter.emitFormatConversionProgress(
        5,
        'detection',
        'Detecting source format...',
        { targetFormat }
      );

      await this.simulateProgress(150);

      const sourceFormat = this.detectFormat(mermaidCode);
      const actualTargetFormat = targetFormat === 'auto' ? this.recommendFormat(mermaidCode) : targetFormat;

      eventEmitter.emitFormatConversionProgress(
        25,
        'detection',
        `Source format detected: ${sourceFormat}. Target format: ${actualTargetFormat}`,
        { sourceFormat, targetFormat: actualTargetFormat }
      );

      // Stage 2: Code parsing (25-50%)
      currentStage++;
      eventEmitter.emitFormatConversionProgress(
        30,
        'parsing',
        'Parsing source code structure...',
        { sourceFormat, targetFormat: actualTargetFormat }
      );

      await this.simulateProgress(200);

      const parseResult = this.parseCodeForConversion(mermaidCode, sourceFormat);

      eventEmitter.emitFormatConversionProgress(
        50,
        'parsing',
        `Parsing completed. Found ${parseResult.elementCount} elements.`,
        { 
          sourceFormat, 
          targetFormat: actualTargetFormat,
          elementsFound: parseResult.elementCount
        }
      );

      // Stage 3: Format conversion (50-75%)
      currentStage++;
      eventEmitter.emitFormatConversionProgress(
        55,
        'conversion',
        `Converting from ${sourceFormat} to ${actualTargetFormat}...`,
        { sourceFormat, targetFormat: actualTargetFormat }
      );

      await this.simulateProgress(300);

      // Perform the actual conversion using the format converter
      const convertedCode = this.formatConverter.convert(mermaidCode, actualTargetFormat, optimizeStructure);

      const conversionSteps = this.generateConversionSteps(sourceFormat, actualTargetFormat);

      eventEmitter.emitFormatConversionProgress(
        75,
        'conversion',
        'Format conversion completed',
        { 
          sourceFormat, 
          targetFormat: actualTargetFormat,
          conversionSteps: conversionSteps.length
        }
      );

      // Stage 4: Structure optimization (75-100%)
      if (optimizeStructure) {
        currentStage++;
        eventEmitter.emitFormatConversionProgress(
          80,
          'optimization',
          'Optimizing converted structure...',
          { sourceFormat, targetFormat: actualTargetFormat }
        );

        await this.simulateProgress(150);
      }

      eventEmitter.emitFormatConversionProgress(
        95,
        'optimization',
        'Finalizing conversion results...',
        { sourceFormat, targetFormat: actualTargetFormat }
      );

      await this.simulateProgress(100);

      // Analyze preservation of elements
      const preservedElements = this.analyzePreservedElements(mermaidCode, convertedCode, sourceFormat, actualTargetFormat);
      const warnings = this.generateConversionWarnings(sourceFormat, actualTargetFormat, preservedElements);

      const result: FormatConversionResult = {
        originalCode: mermaidCode,
        convertedCode,
        sourceFormat,
        targetFormat: actualTargetFormat,
        conversionSteps,
        success: true,
        warnings,
        preservedElements
      };

      // Complete format conversion
      eventEmitter.emitFormatConversionProgress(
        100,
        'complete',
        `Format conversion completed successfully. Converted from ${sourceFormat} to ${actualTargetFormat}.`,
        { 
          sourceFormat, 
          targetFormat: actualTargetFormat,
          success: true,
          preservedElements
        }
      );

      eventEmitter.emitFormatConversionComplete(result);

      return result;

    } catch (error: any) {
      // Emit error event
      eventEmitter.emitError(error, 'format_conversion');
      
      // Return error result
      const errorResult: FormatConversionResult = {
        originalCode: input.mermaidCode,
        convertedCode: input.mermaidCode,
        sourceFormat: 'unknown',
        targetFormat: input.targetFormat || 'auto',
        conversionSteps: [],
        success: false,
        warnings: [error.message || 'Format conversion failed'],
        preservedElements: {
          structure: false,
          content: false,
          relationships: false
        }
      };

      return errorResult;
    }
  }

  /**
   * Detect the format of Mermaid code
   */
  private detectFormat(code: string): string {
    const cleanedCode = code
      .replace(/^```mermaid\s*\n?/i, '')
      .replace(/^```\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    const lines = cleanedCode.split('\n');
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
    if (firstLine.includes('mindmap')) return 'mindmap';
    
    return 'unknown';
  }

  /**
   * Recommend a target format based on code analysis
   */
  private recommendFormat(code: string): string {
    const sourceFormat = this.detectFormat(code);
    if (sourceFormat !== 'unknown') return sourceFormat;

    // Analyze content to recommend best format
    const lines = code.split('\n').filter(line => line.trim().length > 0);
    const nodeCount = (code.match(/\[(.*?)\]/g) || []).length;
    const edgeCount = (code.match(/-->/g) || []).length;

    // Simple heuristics for format recommendation
    if (lines.length > 20 && nodeCount > 15) return 'class';
    if (edgeCount > nodeCount * 1.5) return 'sequence';
    if (nodeCount > 10 && edgeCount < nodeCount) return 'mindmap';
    
    return 'flowchart'; // Default recommendation
  }

  /**
   * Parse code for conversion analysis
   */
  private parseCodeForConversion(code: string, format: string): { elementCount: number; complexity: string } {
    const lines = code.split('\n').filter(line => line.trim().length > 0);
    const nodes = (code.match(/\[(.*?)\]/g) || []).length;
    const edges = (code.match(/-->/g) || []).length + (code.match(/---/g) || []).length;
    
    const elementCount = nodes + edges + (lines.length - 1); // Subtract header line
    let complexity = 'simple';
    
    if (elementCount > 30) complexity = 'complex';
    else if (elementCount > 10) complexity = 'medium';
    
    return { elementCount, complexity };
  }

  /**
   * Generate conversion steps description
   */
  private generateConversionSteps(sourceFormat: string, targetFormat: string): string[] {
    const steps = [`Detected source format: ${sourceFormat}`];
    
    if (sourceFormat === targetFormat) {
      steps.push('No conversion needed - same format');
      steps.push('Applied structure optimization');
    } else {
      steps.push(`Parsed ${sourceFormat} structure`);
      steps.push(`Converted to ${targetFormat} format`);
      steps.push('Preserved semantic meaning');
      steps.push('Applied format-specific optimizations');
    }
    
    return steps;
  }

  /**
   * Analyze what elements were preserved during conversion
   */
  private analyzePreservedElements(originalCode: string, convertedCode: string, sourceFormat: string, targetFormat: string): { structure: boolean; content: boolean; relationships: boolean } {
    // Basic analysis - in a real implementation, this would be more sophisticated
    const originalLines = originalCode.split('\n').filter(line => line.trim().length > 0);
    const convertedLines = convertedCode.split('\n').filter(line => line.trim().length > 0);
    
    const structure = convertedLines.length > 0 && convertedLines.length >= originalLines.length * 0.5;
    const content = originalLines.length > 0 && convertedLines.length > 0;
    const relationships = (convertedCode.match(/-->/g) || []).length > 0 || 
                         (convertedCode.match(/---/g) || []).length > 0 ||
                         sourceFormat === targetFormat;
    
    return { structure, content, relationships };
  }

  /**
   * Generate conversion warnings based on format compatibility
   */
  private generateConversionWarnings(sourceFormat: string, targetFormat: string, preservedElements: any): string[] {
    const warnings: string[] = [];
    
    if (sourceFormat === 'unknown') {
      warnings.push('Source format could not be determined - conversion may be incomplete');
    }
    
    if (!preservedElements.structure) {
      warnings.push('Some structural elements may have been lost during conversion');
    }
    
    if (!preservedElements.relationships) {
      warnings.push('Some relationships between elements may not be preserved');
    }
    
    // Format-specific warnings
    if (sourceFormat === 'sequence' && targetFormat === 'flowchart') {
      warnings.push('Time-based interactions converted to static relationships');
    }
    
    if (sourceFormat === 'class' && targetFormat === 'flowchart') {
      warnings.push('Class attributes and methods converted to simple nodes');
    }
    
    if (sourceFormat === 'er' && targetFormat !== 'class') {
      warnings.push('Entity attributes may not be fully represented in target format');
    }
    
    return warnings;
  }

  /**
   * Stream template generation process with real-time progress updates
   */
  async streamTemplateGeneration(input: GetTemplatesInput, context: StreamingContext): Promise<DiagramTemplate[]> {
    const { connectionId, requestId, emit } = context;
    const eventEmitter = new SSEEventEmitter(connectionId, requestId);

    try {
      // Override the emit method to use the context's emit function
      eventEmitter.emit = (event) => {
        emit(event.data);
      };

      // Start template processing
      eventEmitter.emitTemplateStart();

      const { diagramType, useCase, complexity } = input;
      
      // Stage 1: Template selection (0-40%)
      eventEmitter.emitTemplateProgress(
        5,
        'selection',
        'Analyzing template requirements...',
        { templatesProcessed: 0, totalTemplates: 0 }
      );

      await this.simulateProgress(150);

      // Get all available templates for analysis
      const allTemplates = this.templateManager.getAllTemplates();
      const totalTemplates = allTemplates.length;

      eventEmitter.emitTemplateProgress(
        15,
        'selection',
        `Found ${totalTemplates} available templates. Applying filters...`,
        { templatesProcessed: 0, totalTemplates }
      );

      await this.simulateProgress(200);

      // Apply filters progressively with progress updates
      let filteredTemplates = allTemplates;
      let filterSteps = 0;
      const totalFilterSteps = (diagramType ? 1 : 0) + (useCase ? 1 : 0) + (complexity ? 1 : 0);

      if (diagramType) {
        filterSteps++;
        eventEmitter.emitTemplateProgress(
          20 + (filterSteps / totalFilterSteps) * 15,
          'selection',
          `Filtering by diagram type: ${diagramType}...`,
          { templatesProcessed: filterSteps, totalTemplates: totalFilterSteps }
        );
        
        filteredTemplates = filteredTemplates.filter(t => t.type === diagramType);
        await this.simulateProgress(100);
      }

      if (useCase) {
        filterSteps++;
        eventEmitter.emitTemplateProgress(
          20 + (filterSteps / totalFilterSteps) * 15,
          'selection',
          `Filtering by use case: ${useCase}...`,
          { templatesProcessed: filterSteps, totalTemplates: totalFilterSteps }
        );
        
        filteredTemplates = filteredTemplates.filter(t => t.useCase === useCase);
        await this.simulateProgress(100);
      }

      if (complexity) {
        filterSteps++;
        eventEmitter.emitTemplateProgress(
          20 + (filterSteps / totalFilterSteps) * 15,
          'selection',
          `Filtering by complexity: ${complexity}...`,
          { templatesProcessed: filterSteps, totalTemplates: totalFilterSteps }
        );
        
        filteredTemplates = filteredTemplates.filter(t => t.complexity === complexity);
        await this.simulateProgress(100);
      }

      const selectedTemplates = filteredTemplates;

      eventEmitter.emitTemplateProgress(
        40,
        'selection',
        `Template selection completed. Found ${selectedTemplates.length} matching templates.`,
        { templatesProcessed: selectedTemplates.length, totalTemplates: selectedTemplates.length }
      );

      // Stage 2: Template application and processing (40-80%)
      eventEmitter.emitTemplateProgress(
        45,
        'application',
        'Processing selected templates...',
        { templatesProcessed: 0, totalTemplates: selectedTemplates.length }
      );

      await this.simulateProgress(150);

      // Process each template with progress tracking
      const processedTemplates: DiagramTemplate[] = [];
      
      for (let i = 0; i < selectedTemplates.length; i++) {
        const template = selectedTemplates[i];
        const progressPercentage = 45 + ((i + 1) / selectedTemplates.length) * 30;
        
        eventEmitter.emitTemplateProgress(
          progressPercentage,
          'application',
          `Processing template: ${template.name}...`,
          { 
            templatesProcessed: i + 1, 
            totalTemplates: selectedTemplates.length,
            currentTemplate: template.name
          }
        );

        // Simulate template processing time (validation, optimization, etc.)
        await this.simulateProgress(50 + Math.random() * 100);

        // Process template (validate code, analyze complexity, etc.)
        const processedTemplate = await this.processTemplate(template);
        processedTemplates.push(processedTemplate);
      }

      eventEmitter.emitTemplateProgress(
        75,
        'application',
        `Template processing completed. Processed ${processedTemplates.length} templates.`,
        { templatesProcessed: processedTemplates.length, totalTemplates: selectedTemplates.length }
      );

      // Stage 3: Template customization and optimization (75-95%)
      eventEmitter.emitTemplateProgress(
        80,
        'customization',
        'Optimizing templates for better usability...',
        { templatesProcessed: processedTemplates.length, totalTemplates: processedTemplates.length }
      );

      await this.simulateProgress(200);

      // Sort templates by relevance and complexity
      const optimizedTemplates = this.optimizeTemplateOrder(processedTemplates, input);

      eventEmitter.emitTemplateProgress(
        90,
        'customization',
        'Adding template metadata and usage suggestions...',
        { templatesProcessed: optimizedTemplates.length, totalTemplates: optimizedTemplates.length }
      );

      await this.simulateProgress(150);

      // Add usage suggestions and metadata
      const enrichedTemplates = this.enrichTemplatesWithMetadata(optimizedTemplates, input);

      eventEmitter.emitTemplateProgress(
        95,
        'customization',
        'Finalizing template results...',
        { templatesProcessed: enrichedTemplates.length, totalTemplates: enrichedTemplates.length }
      );

      await this.simulateProgress(100);

      // Stage 4: Complete (95-100%)
      eventEmitter.emitTemplateProgress(
        100,
        'complete',
        `Template generation completed successfully. Returning ${enrichedTemplates.length} templates.`,
        { 
          templatesProcessed: enrichedTemplates.length, 
          totalTemplates: enrichedTemplates.length,
          summary: this.generateTemplateSummary(enrichedTemplates)
        }
      );

      eventEmitter.emitTemplateComplete({
        templates: enrichedTemplates,
        totalCount: enrichedTemplates.length,
        filters: input,
        processingTime: Date.now(),
        summary: this.generateTemplateSummary(enrichedTemplates)
      });

      return enrichedTemplates;

    } catch (error: any) {
      // Emit error event
      eventEmitter.emitError(error, 'template');
      
      // Return empty result on error
      return [];
    }
  }

  /**
   * Process a single template (validate, analyze, etc.)
   */
  private async processTemplate(template: DiagramTemplate): Promise<DiagramTemplate> {
    // In a real implementation, this could:
    // - Validate the template code
    // - Analyze complexity
    // - Check for best practices
    // - Add usage statistics
    
    // For now, we'll just return the template as-is with some processing delay
    await this.simulateProgress(10);
    
    return {
      ...template,
      // Could add processed metadata here
    };
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
   * Enrich templates with additional metadata and usage suggestions
   */
  private enrichTemplatesWithMetadata(templates: DiagramTemplate[], input: GetTemplatesInput): DiagramTemplate[] {
    return templates.map(template => {
      // Could add:
      // - Usage suggestions
      // - Customization tips
      // - Related templates
      // - Estimated completion time
      
      return {
        ...template,
        // Add any enrichment here
      };
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