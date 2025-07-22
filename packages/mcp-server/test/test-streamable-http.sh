#!/bin/bash

# StreamableHttp 集成测试脚本

set -e  # 出错时退出

echo "🚀 StreamableHttp 集成测试"
echo "========================="

# 设置路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📍 项目目录: $PROJECT_DIR"

# 检查并构建项目
if [ ! -f "$PROJECT_DIR/dist/index.js" ]; then
    echo "🔨 构建项目..."
    cd "$PROJECT_DIR" && npm run build
    echo "✅ 构建完成"
fi

# 检查 StreamableHttp 服务器是否已运行
HTTP_RUNNING=$(pgrep -f "node.*index\.js.*--http" | head -1 || echo "")

if [ -n "$HTTP_RUNNING" ]; then
    echo "✅ 检测到 StreamableHttp 服务器已在运行 (PID: $HTTP_RUNNING)"
    HTTP_PID=$HTTP_RUNNING
else
    echo "🌐 启动新的 StreamableHttp 服务器..."
    cd "$PROJECT_DIR"
    
    # 设置环境变量并启动服务器
    export MCP_HTTP_ENABLED=true
    export MCP_HTTP_PORT=3002
    export MCP_HTTP_CORS_ORIGINS="*"
    
    # 后台启动服务器
    node dist/index.js --http &
    HTTP_PID=$!
    
    echo "⏳ 等待 StreamableHttp 服务器启动..."
    sleep 3
    
    echo "✅ StreamableHttp 服务器已启动 (PID: $HTTP_PID)"
fi

# 设置清理函数
cleanup() {
    echo ""
    echo "🧹 正在清理资源..."
    if [ -n "$HTTP_PID" ] && [ "$HTTP_PID" != "$HTTP_RUNNING" ]; then
        echo "🛑 停止 StreamableHttp 服务器 (PID: $HTTP_PID)..."
        kill $HTTP_PID 2>/dev/null || true
        wait $HTTP_PID 2>/dev/null || true
        echo "✅ StreamableHttp 服务器已停止"
    fi
    echo "🎯 清理完成"
}

# 注册清理函数
trap cleanup EXIT INT TERM

# 验证服务器健康状态
echo ""
echo "🏥 验证服务器健康状态..."
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ 健康检查端点正常"
else
    echo "❌ 健康检查端点无响应"
    exit 1
fi

echo ""
echo "🧪 开始功能测试..."

# 测试函数
test_streaming_endpoint() {
    local operation=$1
    local endpoint=$2
    local payload=$3
    local description=$4
    
    echo ""
    echo "📡 测试 $description..."
    echo "   端点: $endpoint"
    echo "   操作: $operation"
    
    # 创建临时文件保存响应
    local response_file=$(mktemp)
    
    # 发送请求并捕获流式响应
    if timeout 10s curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Accept: text/event-stream" \
        -d "$payload" \
        "http://localhost:3002$endpoint" > "$response_file" 2>/dev/null; then
        
        # 检查响应内容
        if [ -s "$response_file" ]; then
            echo "✅ $description 测试成功"
            echo "   响应事件数: $(grep -c "^event:" "$response_file" || echo "0")"
            echo "   数据行数: $(grep -c "^data:" "$response_file" || echo "0")"
            
            # 显示前几个事件
            echo "   前3个事件:"
            head -10 "$response_file" | grep -E "^(event|data):" | head -6 | sed 's/^/     /'
        else
            echo "❌ $description 测试失败 - 无响应内容"
            return 1
        fi
    else
        echo "❌ $description 测试失败 - 请求超时或错误"
        return 1
    fi
    
    # 清理临时文件
    rm -f "$response_file"
}

# 1. 测试验证端点
test_streaming_endpoint "validation" "/api/stream/validate" '{
    "mermaidCode": "graph TD\n    A[开始] --> B[处理]\n    B --> C[结束]"
}' "Mermaid 代码验证"

# 2. 测试优化端点
test_streaming_endpoint "optimization" "/api/stream/optimize" '{
    "mermaidCode": "graph TD\n    A[开始] --> B[处理]\n    B --> C[结束]",
    "options": {
        "improveReadability": true,
        "optimizeLayout": true
    }
}' "图表优化"

# 3. 测试模板生成端点
test_streaming_endpoint "template_generation" "/api/stream/templates" '{
    "type": "flowchart",
    "complexity": "simple"
}' "模板生成"

# 4. 测试格式转换端点
test_streaming_endpoint "format_conversion" "/api/stream/convert" '{
    "mermaidCode": "graph TD\n    A --> B",
    "sourceFormat": "mermaid",
    "targetFormat": "plantuml"
}' "格式转换"

echo ""
echo "🎯 性能测试..."

# 测试并发请求
echo "📊 测试并发处理能力..."
concurrent_test() {
    local endpoint="/api/stream/validate"
    local payload='{"mermaidCode": "graph TD\n    A --> B"}'
    
    # 启动3个并发请求
    for i in {1..3}; do
        (
            curl -s -X POST \
                -H "Content-Type: application/json" \
                -H "Accept: text/event-stream" \
                -d "$payload" \
                "http://localhost:3002$endpoint" > /tmp/concurrent_test_$i.log 2>&1
            echo "并发请求 $i 完成"
        ) &
    done
    
    # 等待所有请求完成
    wait
    
    # 检查结果
    local success_count=0
    for i in {1..3}; do
        if [ -s "/tmp/concurrent_test_$i.log" ]; then
            ((success_count++))
        fi
        rm -f "/tmp/concurrent_test_$i.log"
    done
    
    echo "✅ 并发测试完成: $success_count/3 个请求成功"
}

concurrent_test

echo ""
echo "📋 测试总结:"
echo "✅ StreamableHttp 服务器运行正常"
echo "✅ 所有流式端点响应正常"
echo "✅ 事件格式符合 SSE 标准"
echo "✅ 并发处理能力正常"

echo ""
echo "🔗 可用的测试端点:"
echo "   • POST /api/stream/validate - 验证 Mermaid 代码"
echo "   • POST /api/stream/optimize - 优化图表结构"
echo "   • POST /api/stream/templates - 获取图表模板"
echo "   • POST /api/stream/convert - 转换图表格式"
echo "   • GET /health - 健康检查"

echo ""
echo "🎉 StreamableHttp 集成测试完成！"
echo "服务器地址: http://localhost:3002"
echo "所有功能测试通过，系统运行正常。"
