# @flowmind/mcp-server

A Model Context Protocol (MCP) server that provides Mermaid diagram generation and validation tools for AI assistants.

## Features

### Phase 1 (Current)
- ✅ **Hybrid Mermaid Validation**: Combines official parser with rule-based validation
  - Uses `@mermaid-js/parser` for supported diagrams (pie, gitGraph, architecture, etc.)
  - Uses intelligent rule-based validation for common diagrams (flowchart, sequence, etc.)
- ✅ **Template Library**: Access to pre-built diagram templates for different use cases
- ✅ **Error Suggestions**: Get actionable suggestions for fixing syntax errors

### Upcoming Phases
- 🔄 **Diagram Optimization**: Automatically improve diagram layouts and readability
- 🔄 **Format Conversion**: Convert between different diagram formats
- 🔄 **Advanced Templates**: More specialized templates for specific domains

## Installation

```bash
npm install @flowmind/mcp-server
```

## Usage

### As MCP Server

```bash
# Start the MCP server
npx mcp-mermaid

# Or install globally
npm install -g @flowmind/mcp-server
mcp-mermaid
```

### Available Tools

#### 1. validate_mermaid

Validates Mermaid diagram syntax using hybrid validation strategy:
- **Official Parser**: For pie, gitGraph, architecture, info, packet, radar, treemap
- **Rule-based**: For flowchart, sequence, class, er, gantt, journey diagrams

```json
{
  "name": "validate_mermaid",
  "arguments": {
    "mermaidCode": "flowchart TD\n    A[Start] --> B[End]",
    "strict": false
  }
}
```

**Response includes parser information:**
```
✅ Mermaid 语法验证通过
使用解析器: @mermaid-js/parser
图表类型: pie
```

#### 2. get_diagram_templates

Retrieves pre-built diagram templates based on criteria.

```json
{
  "name": "get_diagram_templates",
  "arguments": {
    "diagramType": "flowchart",
    "useCase": "business-process",
    "complexity": "simple"
  }
}
```

### Supported Diagram Types

- **flowchart**: Business processes, system flows
- **sequence**: Interaction diagrams, API calls
- **class**: Object-oriented design, UML
- **er**: Database entity relationships
- **gantt**: Project timelines, planning
- **pie**: Data statistics, distributions
- **journey**: User experience flows
- **gitgraph**: Version control workflows
- **mindmap**: Brainstorming, concept mapping
- **timeline**: Historical events, roadmaps

### Use Cases

- **software-architecture**: System design, component diagrams
- **business-process**: Workflow, decision trees
- **database-design**: ER diagrams, schema design
- **project-management**: Gantt charts, timelines
- **general**: Generic templates for common scenarios

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test validator.test.ts
```

## Integration Examples

### Claude Code

```bash
# Claude Code will automatically detect and use the MCP server
# when it's configured in your MCP settings
```

### Cursor

```bash
# Add to your Cursor MCP configuration
{
  "mcpServers": {
    "mermaid": {
      "command": "mcp-mermaid"
    }
  }
}
```

## Error Handling

The MCP server provides comprehensive error handling:

- **Validation Errors**: Detailed syntax error messages with line numbers
- **Suggestion System**: Actionable recommendations for fixing common issues
- **Graceful Degradation**: Fallback responses for edge cases

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Run the test suite
5. Submit a pull request

## License

MIT License - see LICENSE file for details.