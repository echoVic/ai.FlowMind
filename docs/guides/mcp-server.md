# @flowmind/mcp-server

A Model Context Protocol (MCP) server that provides Mermaid diagram generation, validation, and optimization tools for AI assistants.

## Features

✅ **Mermaid Validation** - Hybrid validation using official parser + rule-based checks  
✅ **Diagram Optimization** - Auto-improve layout, readability, and accessibility  
✅ **Format Conversion** - Convert between flowchart, sequence, class, ER, and other formats  
✅ **Template Library** - 20+ professional templates for various use cases  
✅ **Error Suggestions** - Actionable recommendations for syntax fixes

## Quick Start

### Installation

```bash
npm install -g @flowmind/mcp-server
```

### MCP Configuration

**Claude Code** (`~/.config/claude-code/mcp_servers.json`):

```json
{
  "mcpServers": {
    "flowmind-mcp": {
      "command": "npx",
      "args": ["@flowmind/mcp-server"],
      "description": "Mermaid diagram tools"
    }
  }
}
```

**Cursor** (settings):

```json
{
  "mcp": {
    "servers": {
      "flowmind-mcp": {
        "command": "npx",
        "args": ["@flowmind/mcp-server"]
      }
    }
  }
}
```

## Available Tools

### 1. validate_mermaid

Validates Mermaid syntax and provides fixes.

```json
{
  "name": "validate_mermaid",
  "arguments": {
    "mermaidCode": "flowchart TD\n    A[Start] --> B[End]",
    "strict": false
  }
}
```

### 2. get_diagram_templates

Get pre-built templates by type, use case, and complexity.

```json
{
  "name": "get_diagram_templates",
  "arguments": {
    "diagramType": "flowchart",
    "useCase": "software-architecture", 
    "complexity": "medium"
  }
}
```

### 3. optimize_diagram ✨

Optimize diagram layout, readability, and accessibility.

```json
{
  "name": "optimize_diagram",
  "arguments": {
    "mermaidCode": "flowchart TD\n    a --> b --> c",
    "goals": ["readability", "accessibility"],
    "maxSuggestions": 5
  }
}
```

**Optimization Goals:**

- `readability` - Improve naming, labels, structure
- `compactness` - Reduce redundancy, optimize layout  
- `aesthetics` - Visual styling suggestions
- `accessibility` - Color contrast, descriptions

### 4. convert_diagram_format ✨

Convert between diagram formats with structure optimization.

```json
{
  "name": "convert_diagram_format",
  "arguments": {
    "mermaidCode": "flowchart TD\n    A --> B",
    "targetFormat": "sequence",
    "optimizeStructure": true
  }
}
```

**Supported Formats:** `flowchart`, `sequence`, `class`, `er`, `gantt`, `pie`, `journey`, `gitgraph`, `mindmap`, `auto`

## Usage Examples

### AI Workflow Example

```
User: "Create an optimized e-commerce system architecture diagram"

AI Process:
1. get_diagram_templates → Find architecture templates
2. validate_mermaid → Check generated syntax  
3. optimize_diagram → Improve readability
4. Result: Professional, optimized diagram with quality metrics
```

### Template Exploration

```
User: "Show me microservices templates"

AI: Uses get_diagram_templates with:
- diagramType: "flowchart"
- useCase: "software-architecture" 
- complexity: "complex"

Returns: Microservices, CI/CD, distributed systems templates
```

### Format Conversion

```
User: "Convert this flowchart to a sequence diagram"

AI: Uses convert_diagram_format to transform structure
while preserving semantic meaning
```

## Diagram Types & Use Cases

| Type | Best For |
|------|----------|
| `flowchart` | Business processes, system flows |
| `sequence` | API interactions, user flows |
| `class` | Object-oriented design, UML |
| `er` | Database schema, entity relationships |
| `gantt` | Project timelines, planning |
| `journey` | User experience mapping |

## Template Categories

- **Software Architecture** - Microservices, CI/CD, distributed systems
- **Business Process** - Workflows, decision trees, user journeys  
- **Database Design** - ER diagrams, schema design
- **Project Management** - Gantt charts, timelines

## AI Prompt Examples

**Effective prompts for AI assistants:**

```
🎯 "Create a [type] diagram for [use case], validate and optimize for [goals]"

🔧 "Review this diagram and suggest accessibility improvements"

📊 "Find templates for microservices architecture and customize for e-commerce"

🔄 "Convert my flowchart to sequence diagram and optimize readability"
```

## Development

```bash
# Setup
npm install
npm run build

# Testing  
npm test
npm run test:watch

# Development
npm run dev
```

### 维护

- **清理未使用的文件和依赖**: 定期使用 `knip` 工具检查并移除项目中未使用的文件和依赖，以保持项目结构的整洁和优化。
- **依赖版本更新**: 及时更新项目依赖到最新稳定版本，解决潜在的兼容性问题和安全漏洞。
  - `@vitest/coverage-v8` 添加为 ^3.2.4

## Troubleshooting

**MCP Server Not Found:**

```bash
# Verify installation
npm list -g @flowmind/mcp-server

# Use full path if needed
{
  "command": "node",
  "args": ["/full/path/to/@flowmind/mcp-server/dist/index.js"]
}
```

**Tools Not Available:**

```bash
# Check MCP server logs
npx @flowmind/mcp-server --verbose

# Verify JSON syntax
cat ~/.config/claude-code/mcp_servers.json | jq .
```

## License

MIT License - see LICENSE file for details.
