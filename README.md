# Ruishu MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/)
[![Anthropic MCP](https://img.shields.io/badge/Anthropic-MCP%20Compliant-blueviolet.svg)](https://modelcontextprotocol.io)

> **⚠️ 免责声明 / Disclaimer**
> 
> 本项目仅供学习、研究与技术交流，**不得用于任何商业与违法用途**。使用者若将其用于非法业务或恶意攻击，后果由使用者自行承担，作者不承担任何连带责任。
>
> *This project is strictly for learning, research, and technical communication purposes only. **It must NOT be used for any commercial or illegal purposes.** Any consequences arising from using this tool for illegal activities or malicious attacks will be borne solely by the user. The author assumes no liability.*

---

## 📖 简介 / Introduction

**Ruishu MCP** 是一个基于 **Anthropic 官方 Model Context Protocol (MCP) 标准协议** 和 Chrome DevTools Protocol (CDP) 构建的无痕流量截获工具。专门用于协助 AI Agent (如基于 LLM 的自动化机器人) 剥离目标网站上复杂的「动态参数令牌防护」机制，自动提取、净化和获取纯净的 API 业务层明文与密文数据。

***Ruishu MCP** is a stealth traffic interception tool fully compliant with **Anthropic's official Model Context Protocol (MCP)** and built on the Chrome DevTools Protocol (CDP). It is specifically designed to assist AI Agents (such as LLM-based automation bots) in stripping complex "dynamic parameter token protection" mechanisms on target websites, automatically extracting, purifying, and fetching pure API business-layer plaintexts and ciphertexts.*

### ✨ 核心特性 / Core Features

- **底层协议截获 (CDP Interception)**：绕过大部分前端反逆向机制，直接在浏览器底层嗅探原生网络请求与响应体。
  *Bypasses most frontend anti-reverse mechanisms by directly sniffing native network requests and response bodies at the browser's lowest layer.*
- **原型链深层 Hook (Deep Prototype Hook)**：智能拦截 XMLHttpRequest 与 Fetch API，精准捕捉被前端 JS 业务层解密后的**第一手真·明文数据**。
  *Intelligently intercepts XMLHttpRequest and Fetch APIs to accurately capture the **first-hand true plaintext data** after decryption by the frontend JS business layer.*
- **动态令牌自动净化 (Dynamic Token Purification)**：通过智能正则匹配，自动剔除 URL 上的随机防刷令牌 (如 `?abcde123=xxxxxxxxxxxx`)。
  *Automatically strips random anti-bot tokens from URLs (e.g., `?abcde123=xxxxxxxxxxxx`) using intelligent regex matching.*
- **全域穿透 (Global Hooking)**：支持监控和拦截多 Tab 页、异步生成的 Iframe 内部请求。
  *Supports monitoring and intercepting requests across multiple tabs and asynchronously generated internal Iframes.*
- **实战验证 (Battle-Tested)**：已在 5+ 个受瑞数不同版本引擎防护的真实生产环境中进行打磨与严格验证，均成功实现无感知 Hook，并能 100% 稳定拦截到底层的真实原始发包与解密后的业务响应明文。
  *Refined and strictly verified in 5+ real-world production environments protected by different versions of Ruishu engines, successfully achieving imperceptible hooking and 100% stable interception of the underlying authentic original requests and decrypted business response plaintexts.*
- **AI-Agent 无缝对接 (Seamless AI Agent Integration)**：遵循 MCP 标准，零代码直接外挂到各种 LLM 驱动的自动化工具中。
  *Follows the MCP standard, directly attachable to various LLM-driven automation tools with zero code.*

---

## 🛠️ 安装与编译 / Installation & Build

### 环境要求 / Prerequisites
- [Node.js](https://nodejs.org/) >= 18
- Chrome 浏览器 (需启用调试端口运行) / *Chrome Browser (Requires running with remote debugging port)*

### 编译步骤 / Build Steps

```bash
# 1. 克隆代码库 / Clone the repository
git clone https://github.com/xuange520/ruishu-mcp.git
cd ruishu-mcp

# 2. 安装依赖 / Install dependencies
npm install

# 3. 编译 TypeScript / Build TypeScript 
npm run build
```

---

## 🚀 启动与配置 / Usage

### 第一步：启动 Chrome (开启调试端口) / Step 1: Launch Chrome (with debugging port)

你需要先让目标 Chrome 浏览器开放 CDP 调试端口（默认推荐 `9222`）。
*You need to open the CDP debugging port on your target Chrome browser (default `9222` is recommended).*

**Windows:**
```cmd
chrome.exe --remote-debugging-port=9222
```

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

### 第二步：将工具挂载为 MCP Server / Step 2: Attach as an MCP Server

在你的 AI Agent (比如 Antigravity、Claude Desktop 等) 配置文件中添加当前 MCP 服务：
*Add the current MCP service to your AI Agent's configuration file (e.g., Antigravity, Claude Desktop):*

```json
{
  "mcpServers": {
    "ruishu-cdp": {
      "command": "node",
      "args": ["/absolute/path/to/ruishu-mcp/dist/index.js"]
    }
  }
}
```

### 第三步：AI 自动调用 / Step 3: AI Agent Invocation

一旦配置成功，AI 助手将获得以下三种核心能力（Tools）：
*Once configured, your AI assistant will gain the following core tools:*

1. **`init_ruishu_hook`**: 指挥浏览器锁定目标网站，自动执行 Service Worker 绕过与原型链隐蔽注入，然后刷新页面等待特征校验。
   *Instruct the browser to lock onto the target website, automatically execute Service Worker bypass and stealth prototype injection, then refresh the page to wait for feature validation.*
   - **可选参数 / Optional Parameters**: 
     - `url_keyword`: 目标网页URL特征 / *Target URL keyword*
     - `host`: Chrome IP, 默认 / *Default* `127.0.0.1`
     - `port`: Chrome 调试端口 / *Debug port*, 默认 / *Default* `9222`
2. **`execute_page_action`**: 模拟人类交互（鼠标点击、下拉、触发特定 JS 函数），用于激活被动的发包请求。
   *Simulate human interaction (mouse clicks, scrolling, triggering specific JS functions) to activate passive request generation.*
   - **必填参数 / Required Parameters**: 
     - `js_script`: 在页面内执行的 JS 代码 / *JavaScript code to execute in the page*
3. **`get_intercepted_traffic`**: 读取净化后、包含加密明文双重对照的 HTTP 流量栈日志。
   *Read the purified HTTP traffic stack logs, which contain a dual-reference of both encrypted and plaintext data.*
   - **可选参数 / Optional Parameters**: 
     - `limit`: 限制返回的最新记录条数防爆显存 / *Number of newest records to retrieve to prevent context explosion*

---

## 🧠 技术原理 / Architecture

1. **CDP God Mode (上帝视角)**
   本工具通过 `Network.requestWillBeSent` 和 `Network.responseReceived` 记录请求最底层的原始发包，确保加密逻辑不被漏过。
   *This tool records the ultimate original network requests at the lowest layer using `Network.requestWillBeSent` and `Network.responseReceived`, ensuring no encryption logic is missed.*
2. **XHR/Fetch Hijacking (前端原理解密)**
   前端通过覆盖 `XMLHttpRequest.prototype.send` 和 `XMLHttpRequest.prototype.open`，配合双重 `readystatechange` 生命周期捕捉，当页面本身的业务 JS 解除请求加密体时，将其瞬间拦截。
   *The frontend overrides `XMLHttpRequest.prototype.send` and \`.open\`. By pairing this with dual \`readystatechange\` lifecycle captures, it instantly intercepts the data the moment the page's own business JS decrypts the request payload.*
3. **Asynchronous Memory Queue (异步内存队列)**
   由于网页前端收集明文与 Node 端 CDP 层收集密文存在时空差异，本工具通过巧妙的微任务 (Microtask) 与 `__mcp_intercept_queue` 全局双向队列，安全地将数据原子化传输回 Node 服务。
   *Due to the temporal and spatial differences between plaintext collection on the frontend and ciphertext collection at the Node CDP layer, this tool safely and atomically transfers data back to the Node service via ingenious Microtasks and a global bidirectional queue named \`__mcp_intercept_queue\`.*

---

## 📝 贡献 / Contributing
欢迎提交 Issues 与 Pull Requests。这是一个供学术与技术交流的开源仓库，请在提交代码时注意遵守免责声明。
*Issues and Pull Requests are welcome. This is an open-source repository for academic and technical communication. Please ensure compliance with the disclaimer when submitting code.*

## 📄 许可证 / License
[MIT License](LICENSE) (附加了非商业用途严格限制条款 / *With strict Non-Commercial restriction clauses attached*)
