import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'FlowMind - AI 流程图生成器',
  version: '1.0.0',
  description: '使用自然语言快速生成专业的 Mermaid 流程图',
  
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'FlowMind - AI 流程图生成器',
    default_icon: {
      16: 'icons/icon-16.svg',
      32: 'icons/icon-32.svg',
      48: 'icons/icon-48.svg',
      128: 'icons/icon-128.svg'
    }
  },

  options_page: 'src/options/index.html',

  background: {
    service_worker: 'src/background.ts',
    type: 'module'
  },

  permissions: [
    'storage'
  ],

  host_permissions: [
    'https://api.openai.com/*',
    'https://api.anthropic.com/*',
    'https://dashscope.aliyuncs.com/*',
    'https://*.volcengineapi.com/*',
    'https://ark.cn-beijing.volces.com/*',
    'https://open.bigmodel.cn/*'
  ],

  icons: {
    16: 'icons/icon-16.svg',
    32: 'icons/icon-32.svg',
    48: 'icons/icon-48.svg',
    128: 'icons/icon-128.svg'
  },

  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  }
});