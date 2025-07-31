# 部署指南

FlowMind 是一个基于 Next.js 的纯前端应用，支持多种部署方式。本文档将详细介绍各种部署选项。

## 🚀 快速部署

### Vercel 部署 (推荐)

Vercel 是 Next.js 的官方部署平台，提供最佳的部署体验。

#### 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/echoVic/flow-ai)

#### 手动部署

1. **Fork 项目**

   ```bash
   # 在 GitHub 上 Fork 本仓库
   # 或者克隆到本地
   git clone https://github.com/echoVic/flow-ai.git
   cd flow-ai
   ```

2. **连接 Vercel**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 导入你的 GitHub 仓库
   - 选择 `apps/web` 作为根目录

3. **配置环境变量**
   在 Vercel 项目设置中添加以下环境变量：

   ```bash
   # 豆包 (火山引擎) 配置
   NEXT_PUBLIC_ARK_API_KEY=your-volcengine-api-key
   NEXT_PUBLIC_ARK_MODEL_NAME=ep-20250617131345-rshkp
   NEXT_PUBLIC_ARK_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3
   
   # OpenAI 配置 (可选)
   NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key
   NEXT_PUBLIC_OPENAI_MODEL_NAME=gpt-4
   
   # Claude 配置 (可选)
   NEXT_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-api-key
   NEXT_PUBLIC_ANTHROPIC_MODEL_NAME=claude-3-sonnet-20240229
   ```

4. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建完成
   - 获得自动生成的 HTTPS 域名

### Netlify 部署

1. **连接 Netlify**
   - 访问 [Netlify](https://netlify.com)
   - 点击 "New site from Git"
   - 连接你的 GitHub 仓库

2. **构建设置**

   ```bash
   # Build command
   cd apps/web && npm run build
   
   # Publish directory
   apps/web/.next
   
   # Base directory
   apps/web
   ```

3. **环境变量**
   在 Netlify 站点设置中添加相同的环境变量

### GitHub Pages 部署

GitHub Pages 需要静态导出，适合完全静态的部署。

1. **修改配置**
   在 `apps/web/next.config.js` 中添加：

   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'export',
     trailingSlash: true,
     images: {
       unoptimized: true
     },
     basePath: process.env.NODE_ENV === 'production' ? '/flow-ai' : '',
     assetPrefix: process.env.NODE_ENV === 'production' ? '/flow-ai/' : '',
   }
   
   module.exports = nextConfig
   ```

2. **GitHub Actions 配置**
   创建 `.github/workflows/deploy.yml`：

   ```yaml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v3
   
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'npm'
   
         - name: Install dependencies
           run: |
             cd apps/web
             npm install
   
         - name: Build
           run: |
             cd apps/web
             npm run build
           env:
             NEXT_PUBLIC_ARK_API_KEY: ${{ secrets.ARK_API_KEY }}
             NEXT_PUBLIC_ARK_MODEL_NAME: ${{ secrets.ARK_MODEL_NAME }}
             NEXT_PUBLIC_ARK_ENDPOINT: ${{ secrets.ARK_ENDPOINT }}
   
         - name: Deploy
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: apps/web/out
   ```

## 🐳 Docker 部署

### 使用 Docker Compose

1. **创建 docker-compose.yml**

   ```yaml
   version: '3.8'
   services:
     flowmind:
       build:
         context: .
         dockerfile: apps/web/Dockerfile
       ports:
         - "3000:3000"
       environment:
         - NEXT_PUBLIC_ARK_API_KEY=${ARK_API_KEY}
         - NEXT_PUBLIC_ARK_MODEL_NAME=${ARK_MODEL_NAME}
         - NEXT_PUBLIC_ARK_ENDPOINT=${ARK_ENDPOINT}
       restart: unless-stopped
   ```

2. **创建 Dockerfile**
   在 `apps/web/Dockerfile`：

   ```dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   
   COPY package.json pnpm-lock.yaml* ./
   RUN npm install -g pnpm && pnpm install --frozen-lockfile
   
   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   
   RUN npm install -g pnpm && pnpm build
   
   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app
   
   ENV NODE_ENV production
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   
   USER nextjs
   
   EXPOSE 3000
   
   ENV PORT 3000
   
   CMD ["node", "server.js"]
   ```

3. **部署**

   ```bash
   # 创建环境变量文件
   echo "ARK_API_KEY=your-api-key" > .env
   echo "ARK_MODEL_NAME=your-model-name" >> .env
   echo "ARK_ENDPOINT=your-endpoint" >> .env
   
   # 启动服务
   docker-compose up -d
   ```

## 🌐 CDN 部署

### 阿里云 OSS + CDN

1. **构建静态文件**

   ```bash
   cd apps/web
   npm run build
   npm run export
   ```

2. **上传到 OSS**

   ```bash
   # 使用阿里云 CLI 工具
   ossutil cp -r out/ oss://your-bucket-name/ --update
   ```

3. **配置 CDN**
   - 在阿里云控制台配置 CDN 加速域名
   - 设置源站为 OSS 存储桶
   - 配置缓存规则和 HTTPS

### 腾讯云 COS + CDN

类似阿里云的配置流程，使用腾讯云的对象存储和 CDN 服务。

## ⚙️ 环境变量配置

### 必需的环境变量

```bash
# AI 提供商配置 (至少配置一个)
NEXT_PUBLIC_ARK_API_KEY=your-volcengine-api-key
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key
NEXT_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 可选的环境变量

```bash
# 模型配置
NEXT_PUBLIC_ARK_MODEL_NAME=ep-20250617131345-rshkp
NEXT_PUBLIC_OPENAI_MODEL_NAME=gpt-4
NEXT_PUBLIC_ANTHROPIC_MODEL_NAME=claude-3-sonnet-20240229

# API 端点
NEXT_PUBLIC_ARK_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3

# 默认参数
NEXT_PUBLIC_DEFAULT_TEMPERATURE=0.7
NEXT_PUBLIC_DEFAULT_MAX_TOKENS=2048
```

## 🔧 构建优化

### 生产构建

```bash
# 安装依赖
pnpm install

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

### 构建分析

```bash
# 分析构建包大小
ANALYZE=true pnpm build
```

### 性能优化

1. **启用压缩**

   ```javascript
   // next.config.js
   const nextConfig = {
     compress: true,
     poweredByHeader: false,
   }
   ```

2. **图片优化**

   ```javascript
   // next.config.js
   const nextConfig = {
     images: {
       domains: ['example.com'],
       formats: ['image/webp', 'image/avif'],
     },
   }
   ```

## 🚨 故障排除

### 常见问题

1. **构建失败**

   ```bash
   # 清理缓存
   rm -rf .next node_modules
   pnpm install
   pnpm build
   ```

2. **环境变量不生效**
   - 确保环境变量以 `NEXT_PUBLIC_` 开头
   - 重启开发服务器
   - 检查 `.env.local` 文件格式

3. **静态导出问题**
   - 确保没有使用服务端功能
   - 检查 `next.config.js` 配置
   - 使用 `next export` 命令

### 性能监控

使用 Vercel Analytics 或其他监控工具来跟踪应用性能：

```javascript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

## 🧹 维护

- **清理未使用的文件和依赖**: 定期使用 `knip` 工具检查并移除项目中未使用的文件和依赖，以保持项目结构的整洁和优化。
- **依赖版本更新**: 及时更新项目依赖到最新稳定版本，解决潜在的兼容性问题和安全漏洞。
  - `@ant-design/icons` 更新为 ^6.0.0
  - `@codemirror/view` 更新为 ^6.38.1
  - `@vitest/coverage-v8` 添加为 ^3.2.4

## 📞 技术支持

如果在部署过程中遇到问题，请：

1. 查看 [GitHub Issues](https://github.com/echoVic/flow-ai/issues)
2. 提交新的 Issue 描述你的问题
3. 加入我们的社区讨论

---

**注意**: 本应用是纯前端应用，所有 AI API 调用都在浏览器中进行。请确保你的 API 密钥安全，避免在公共环境中暴露。
