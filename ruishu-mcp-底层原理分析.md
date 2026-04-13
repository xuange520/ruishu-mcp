# ruishu-mcp 底层原理深度分析

> 本文档基于 https://github.com/xuange520/ruishu-mcp 源码分析，面向普通程序员，
> 目标是让你完全理解其原理，并能基于相同思路开发其他场景的逆向工具。

---

## 一、这个项目是什么？解决什么问题？

### 背景：瑞数（Ruishu）是什么

瑞数是国内一家做 WAF（Web 应用防火墙）的公司，其核心产品是**动态 Token 防爬虫系统**。

简单说，它的防护逻辑是这样的：

```
用户打开网站
    ↓
服务器注入一段混淆的 JS 脚本
    ↓
这段 JS 在浏览器里运行，生成一个动态 Token
（Token 每次请求都不同，有时效性，包含设备指纹）
    ↓
每次发 API 请求，必须带上这个 Token
    ↓
服务器验证 Token 合法，才返回数据
```

**问题在哪里？** 普通的 HTTP 抓包（直接 requests/curl）因为没有运行浏览器中的 JS 逻辑，
所以生成不了合法的 Token，请求会被拦截。

### 这个项目做了什么

ruishu-mcp 的方案是：**既然 Token 是在浏览器里生成的，那就直接在浏览器里"偷听"**。

核心思路：不去破解 Token 的加密算法，而是在浏览器正常发请求的时候，把请求和响应数据直接截走。

```
浏览器正常运行（Token 照常生成）
    ↓
我们在浏览器 JS 层注入"监听代码"
    ↓
每次发请求，监听代码把明文数据记录下来
    ↓
MCP 服务器（运行在 Node.js）读取这些数据
    ↓
AI Agent 拿到完整的 API 请求/响应
```

---

## 二、整体架构

项目分三层：

```
┌────────────────────────────────────────────────┐
│  第一层：MCP 服务器（index.ts）                 │
│  AI Agent 的接口，提供 3 个工具                 │
│  - init_ruishu_hook    初始化监听               │
│  - execute_page_action 执行 JS 操作             │
│  - get_intercepted_traffic 获取拦截的数据       │
└─────────────────┬──────────────────────────────┘
                  │ 通过 Chrome DevTools Protocol (CDP)
                  │
┌─────────────────▼──────────────────────────────┐
│  第二层：CDP 客户端（cdpClient.ts）             │
│  通过调试协议控制 Chrome 浏览器                 │
│  - 监听网络请求（看到加密的原始请求）           │
│  - 向页面注入 JavaScript                        │
│  - 识别瑞数保护特征                             │
└─────────────────┬──────────────────────────────┘
                  │ 注入 JS 代码到浏览器
                  │
┌─────────────────▼──────────────────────────────┐
│  第三层：浏览器 Hook（hooks.ts）                │
│  注入到网页里的 JS 代码，在 JS 执行层拦截       │
│  - 拦截 XMLHttpRequest                          │
│  - 拦截 Fetch API                               │
│  - 把明文数据存入全局队列                       │
└────────────────────────────────────────────────┘
```

### 为什么要双层拦截？

| 层级 | 看到的内容 | 局限 |
|------|-----------|------|
| CDP 网络层 | 网络传输的原始数据（可能已加密） | 如果业务数据也加密，看不懂 |
| 浏览器 JS 层 | 代码执行时的明文变量 | 看到的是加密**前**的数据 |

两层互补，确保业务数据一定能被拿到。

---

## 三、关键技术一：Chrome DevTools Protocol（CDP）

### 什么是 CDP

Chrome 浏览器自带一个调试接口，允许外部程序通过 WebSocket 控制浏览器。
你用 Chrome 的开发者工具时，开发者工具本身就是通过 CDP 和浏览器通信的。

**开启方法：** 启动 Chrome 时加参数 `--remote-debugging-port=9222`

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug
```

### 如何通过 CDP 连接

第一步：HTTP 查询有哪些可调试的标签页

```
GET http://127.0.0.1:9222/json/list

返回：
[
  {
    "id": "abc123",
    "url": "https://example.com",
    "webSocketDebuggerUrl": "ws://127.0.0.1:9222/devtools/page/abc123"
  }
]
```

第二步：建立 WebSocket 连接

```javascript
const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/abc123')
```

第三步：启用需要的功能域，发送 JSON-RPC 命令

```javascript
// 启用网络监控
ws.send(JSON.stringify({
  id: 1,
  method: 'Network.enable',
  params: {}
}))

// 启用 JS 执行
ws.send(JSON.stringify({
  id: 2,
  method: 'Runtime.enable',
  params: {}
}))
```

### 关键 CDP 命令

| 命令 | 作用 |
|------|------|
| `Network.enable` | 开始监听所有网络请求 |
| `Network.requestWillBeSent` | 事件：即将发出请求（可看到 URL/Headers/Body） |
| `Network.responseReceived` | 事件：收到响应 |
| `Page.addScriptToEvaluateOnNewDocument` | 在页面加载前注入 JS（每次刷新都执行） |
| `Runtime.evaluate` | 在页面上下文执行 JS 代码 |
| `Page.reload` | 重新加载页面 |

### 注入 JS 的关键点

`addScriptToEvaluateOnNewDocument` 是最重要的命令，它的特点是：
- **在任何网页 JS 运行之前执行**
- 每次页面刷新/导航都会重新执行
- 拦截代码比网站的加密代码先跑，所以能 Hook 到原生方法

```javascript
// 在页面加载前就注入 Hook 代码
await cdpClient.Page.addScriptToEvaluateOnNewDocument({
  source: hookCode  // Hook 代码字符串
})

// 重新加载页面，让 Hook 生效
await cdpClient.Page.reload()
```

---

## 四、关键技术二：JavaScript Proxy Hook

### 什么是 Hook

Hook 是"钩子"的意思。原理很简单：**把原生方法替换成我们自己的方法，先做额外的事情，再调原始方法**。

### XHR（XMLHttpRequest）拦截

```javascript
// 保存原始方法
const original_open = XMLHttpRequest.prototype.open
const original_send = XMLHttpRequest.prototype.send

// 替换 open 方法
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  // 我们的额外逻辑：记录请求信息
  this._mcp_method = method
  this._mcp_url = url

  // 调用原始方法（必须！否则请求不会发出）
  return original_open.call(this, method, url, ...args)
}

// 替换 send 方法
XMLHttpRequest.prototype.send = function(body) {
  // 记录请求体（明文！加密发生在应用层代码里，但 send 的参数是已加密的）
  // 注意：这里实际上是在 Ruishu 加密之后、网络发送之前拦截
  // 真正的明文在应用代码调用 send 之前

  // 拦截响应
  const original_onreadystatechange = this.onreadystatechange
  this.onreadystatechange = function() {
    if (this.readyState === 4) {
      // 记录响应（服务器返回的明文数据）
      recordToQueue({
        type: 'response',
        url: this._mcp_url,
        status: this.status,
        body: this.responseText
      })
    }
    if (original_onreadystatechange) {
      original_onreadystatechange.call(this)
    }
  }

  return original_send.call(this, body)
}
```

### 更优雅的方式：使用 Proxy

```javascript
// 用 Proxy 包装，比直接替换更灵活
XMLHttpRequest.prototype.send = new Proxy(original_send, {
  apply(target, thisArg, args) {
    // args[0] 就是 send 的第一个参数（请求 body）
    console.log('发送请求体：', args[0])

    // 必须用 Reflect.apply 调用原始方法
    return Reflect.apply(target, thisArg, args)
  }
})
```

### Fetch API 拦截

Fetch 比 XHR 麻烦一点，因为它是基于 Promise 的：

```javascript
const original_fetch = window.fetch

window.fetch = new Proxy(original_fetch, {
  apply(target, thisArg, args) {
    const [url, options] = args

    // 记录请求
    console.log('Fetch 请求：', url, options?.body)

    // 调用原始 fetch，得到 Promise
    const result = Reflect.apply(target, thisArg, args)

    // 在 Promise 链上截获响应
    return result.then(response => {
      // 必须克隆！Response body 只能读一次
      const cloned = response.clone()

      cloned.text().then(text => {
        // 记录响应
        console.log('Fetch 响应：', text)
      })

      // 返回原始 response（不影响网站正常使用）
      return response
    })
  }
})
```

### 数据存储：全局队列

所有拦截到的数据存入全局变量，等待 MCP 服务器来读取：

```javascript
// 初始化队列
window.__mcp_intercept_queue = window.__mcp_intercept_queue || []

// 写入数据（限制 500 条，防止内存溢出）
function recordToQueue(data) {
  window.__mcp_intercept_queue.push({
    ...data,
    timestamp: Date.now()
  })
  if (window.__mcp_intercept_queue.length > 500) {
    window.__mcp_intercept_queue.shift()  // 删除最老的
  }
}

// MCP 服务器读取（通过 CDP Runtime.evaluate）
const data = await cdpClient.Runtime.evaluate({
  expression: 'window.__mcp_intercept_queue'
})
```

---

## 五、关键技术三：反检测

网站可能会检测 Hook 是否存在，因此需要伪装。

### 问题：Function.prototype.toString()

网站可以用以下方式检测函数是否被替换：

```javascript
// 检测 XHR.open 是否是原生方法
console.log(XMLHttpRequest.prototype.open.toString())
// 原生：function open() { [native code] }
// Hook 后：function () { /* 我们的代码 */ ... }  ← 暴露了！
```

### 解决方案：伪装 toString

```javascript
// 保存要伪装的函数和它应该返回的字符串
const fakeToString = new Map()
fakeToString.set(
  XMLHttpRequest.prototype.open,
  'function open() { [native code] }'
)
fakeToString.set(
  XMLHttpRequest.prototype.send,
  'function send() { [native code] }'
)

// 替换全局的 Function.prototype.toString
const original_toString = Function.prototype.toString
Function.prototype.toString = function() {
  if (fakeToString.has(this)) {
    return fakeToString.get(this)
  }
  return original_toString.call(this)
}
```

这样检测代码会认为 open/send 仍然是原生方法。

### iframe 传播问题

问题：如果页面里有 `<iframe>`，iframe 里的代码会在一个独立的 window 上下文中运行，
我们的 Hook 不会自动生效。

解决方案：拦截 iframe.contentWindow 的访问：

```javascript
const original_contentWindow_getter =
  Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow').get

Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
  get() {
    const cw = original_contentWindow_getter.call(this)

    // 在 iframe 的 window 里也注入 Hook
    try {
      if (cw && !cw.__mcp_hooked) {
        injectHookInto(cw)
        cw.__mcp_hooked = true
      }
    } catch(e) {
      // 跨域 iframe 会抛异常，忽略即可
    }

    return cw
  }
})
```

---

## 六、瑞数特征识别

项目会检测当前页面是否真的有瑞数防护，通过以下 5 个信号：

```javascript
// 信号 1：瑞数注入的全局变量
const signal1 = typeof window.$_ts !== 'undefined'

// 信号 2：DOM 中的特殊标记
const signal2 = !!document.querySelector('[r="m"]')
// <meta r='m'> 或 <script r='m'> 是瑞数的特征标签

// 信号 3：特殊 Cookie 格式（5-15字符的密钥 + 30+字符的值）
const signal3 = document.cookie.split(';').some(c => {
  const [key, val] = c.trim().split('=')
  return /^[a-zA-Z0-9]{5,15}$/.test(key) && val && val.length > 30
})

// 信号 4：拦截到的请求 URL 里有瑞数格式的参数
// 格式：?XxxXxx=AABBCCDD...（5-12字符密钥 + 40+字符密文）
const signal4 = /([a-zA-Z0-9]{5,12})=([a-zA-Z0-9+/]{40,})/g.test(url)

// 信号 5：页面加载超时（瑞数的 Challenge 页面有时会延迟）
const signal5 = pageLoadTimedOut
```

满足 2 个以上信号，则认定存在瑞数防护。

---

## 七、完整工作流程

以下是从头到尾的完整流程：

```
1. 用户在 Chrome 里打开目标网站
   Chrome 启动时带了 --remote-debugging-port=9222

2. AI Agent 调用 init_ruishu_hook 工具
   参数：urlKeyword="example.com"

3. MCP 服务器（Node.js）执行：
   3.1 HTTP GET http://127.0.0.1:9222/json/list
       找到 URL 包含 "example.com" 的标签页

   3.2 WebSocket 连接到该标签页

   3.3 启用 Network / Page / Runtime 域

   3.4 注册网络事件监听
       Network.requestWillBeSent → 记录请求
       Network.responseReceived → 记录响应

   3.5 注入 Hook JS 代码（在页面加载前执行）
       XHR.open / XHR.send / window.fetch 被替换
       Function.toString() 被伪装
       iframe.contentWindow 被拦截

   3.6 重新加载页面
       Hook 代码开始生效

   3.7 等待页面加载完成

   3.8 检测 5 个信号，确认瑞数保护存在

   3.9 返回成功

4. 用户在页面上正常操作（或 AI 调用 execute_page_action 模拟操作）
   例如：点击按钮、填写搜索框、滚动页面

5. 页面 JS 自然运行，生成 Token，发出请求
   ↓ 请求经过 Hook
   Hook 记录请求和响应到 window.__mcp_intercept_queue

6. AI Agent 调用 get_intercepted_traffic

   MCP 服务器执行：
   const data = Runtime.evaluate('window.__mcp_intercept_queue')
   合并 CDP 层的记录 + JS 层的记录
   按时间排序，返回给 AI

7. AI 拿到完整的 API 请求/响应数据
   可以分析接口结构、字段含义、业务逻辑
```

---

## 八、为什么这种方式可行？根本原因

### 核心矛盾

瑞数防护面临一个无法解决的矛盾：

```
【矛盾】
- 要让 Token 动态生成，加密逻辑必须在浏览器（客户端）运行
- 在浏览器里运行，就意味着运行在 JavaScript 环境中
- JavaScript 没有"真正的私有方法"——所有方法都可以被 Hook
- 所以加密逻辑运行的环境本身就是可以被操控的
```

### 为什么 Hook 方法无法被察觉

想象以下场景：

```javascript
// 网站检测代码
function checkIfHooked() {
  const result = XMLHttpRequest.prototype.open.toString()
  if (result !== 'function open() { [native code] }') {
    // 发现被 Hook！
    throw new Error('已检测到异常')
  }
}

checkIfHooked()  // 这行代码会怎样？
```

答案：`toString()` 本身也被我们 Hook 了！
所以 `checkIfHooked()` 会"正常通过"，检测失败。

这就是反检测的精妙之处：检测代码所依赖的基础设施（`toString`）本身已经是虚假的了。

### Hook 在加密前还是加密后？

一个常见的疑问：如果在 `send()` 时拦截，数据已经是加密后的了，有什么用？

```
应用代码：
const encryptedBody = ruishu.encrypt(myData)  ← 加密发生在这里
xhr.send(encryptedBody)  ← Hook 在这里拦截，拿到加密数据
```

**关键点**：拦截加密后的 `body` 不重要，重要的是拦截**响应**！

```
服务器返回的响应数据 → 是明文的（服务器解密后返回给前端的）
前端 JS 处理响应时 → Hook 拦截 onreadystatechange 或 .then()
→ 此时数据是明文的
```

另外，项目同时在 CDP 层监听，可以看到网络层流量，结合 JS 层，覆盖所有可能的数据格式。

---

## 九、如何基于相同原理开发其他场景的工具

以下是通用的开发框架，你可以替换"瑞数"为任何其他保护系统：

### 第一步：搞清楚目标保护系统的特征

针对任何 WAF/反爬系统，先分析：
1. 它注入了什么 JS？（在 Chrome 开发者工具 → Sources 里查看）
2. 它的 Token/签名放在哪里？（Headers 还是 URL 参数还是请求体？）
3. 有什么特征可以识别它的存在？（全局变量？特殊 Cookie？特殊 DOM？）

### 第二步：确定 Hook 点

根据目标系统的工作方式，选择拦截位置：

```
目标是拿到请求数据？
  → Hook XHR.open / XHR.send / window.fetch

目标是拿到响应数据？
  → Hook XHR.onreadystatechange / fetch().then()

目标是拿到 Token 生成逻辑？
  → Hook WebCrypto API、window.btoa、自定义加密函数

目标是拿到 WebSocket 数据？
  → Hook WebSocket.constructor / WebSocket.prototype.send / onmessage
```

### 第三步：基础代码模板

```typescript
// cdpClient.ts - CDP 连接（可直接复用）
import CDP from 'chrome-remote-interface'

class MyCdpClient {
  private client: any
  private queue: any[] = []

  async connect(urlKeyword: string, port = 9222) {
    // 获取目标标签页
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json())
    const target = targets.find((t: any) => t.url.includes(urlKeyword))

    // 建立 CDP 连接
    this.client = await CDP({ target: target.id, port })
    const { Network, Page, Runtime } = this.client

    // 启用功能域
    await Network.enable()
    await Page.enable()
    await Runtime.enable()

    // 注入你的 Hook 代码
    await Page.addScriptToEvaluateOnNewDocument({
      source: this.getHookCode()
    })

    // 监听网络事件（可选）
    Network.requestWillBeSent(({ request }: any) => {
      if (this.isTargetRequest(request.url)) {
        this.queue.push({ type: 'request', ...request })
      }
    })

    // 重新加载页面
    await Page.reload()
  }

  private getHookCode(): string {
    return `
      // 在这里写你的 Hook 代码
      ${myHookCode}
    `
  }

  async getInterceptedData() {
    const { result } = await this.client.Runtime.evaluate({
      expression: 'JSON.stringify(window.__my_queue || [])',
      returnByValue: true
    })
    return JSON.parse(result.value)
  }

  private isTargetRequest(url: string): boolean {
    // 根据你的目标系统定义过滤规则
    return url.includes('/api/')
  }
}
```

```javascript
// hooks.js - 注入到浏览器的 Hook 代码模板
(function() {
  'use strict'

  // 防止重复注入
  if (window.__my_hook_installed) return
  window.__my_hook_installed = true

  // 初始化队列
  window.__my_queue = []

  function record(data) {
    window.__my_queue.push({ ...data, timestamp: Date.now() })
    if (window.__my_queue.length > 500) window.__my_queue.shift()
  }

  // ==========================================
  // Hook XHR
  // ==========================================
  const origOpen = XMLHttpRequest.prototype.open
  const origSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = new Proxy(origOpen, {
    apply(target, thisArg, args) {
      thisArg._hook_method = args[0]
      thisArg._hook_url = args[1]
      return Reflect.apply(target, thisArg, args)
    }
  })

  XMLHttpRequest.prototype.send = new Proxy(origSend, {
    apply(target, thisArg, args) {
      // 记录请求
      record({ type: 'xhr_request', url: thisArg._hook_url, body: args[0] })

      // 拦截响应
      const origOnRS = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'onreadystatechange')
      thisArg.addEventListener('readystatechange', function() {
        if (this.readyState === 4) {
          record({ type: 'xhr_response', url: this._hook_url, status: this.status, body: this.responseText })
        }
      })

      return Reflect.apply(target, thisArg, args)
    }
  })

  // ==========================================
  // Hook Fetch
  // ==========================================
  const origFetch = window.fetch
  window.fetch = new Proxy(origFetch, {
    apply(target, thisArg, args) {
      const [url, options] = args
      record({ type: 'fetch_request', url, body: options?.body })

      return Reflect.apply(target, thisArg, args).then(response => {
        const clone = response.clone()
        clone.text().then(text => {
          record({ type: 'fetch_response', url, status: response.status, body: text })
        })
        return response
      })
    }
  })

  // ==========================================
  // 反检测：伪装 toString
  // ==========================================
  const fakeNatives = new Map([
    [XMLHttpRequest.prototype.open, 'function open() { [native code] }'],
    [XMLHttpRequest.prototype.send, 'function send() { [native code] }'],
    [window.fetch, 'function fetch() { [native code] }'],
  ])

  const origToString = Function.prototype.toString
  Function.prototype.toString = function() {
    return fakeNatives.get(this) || origToString.call(this)
  }

  console.log('[Hook] 已安装')
})()
```

```typescript
// index.ts - MCP 工具定义模板
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new Server({ name: 'my-mcp', version: '1.0.0' }, {
  capabilities: { tools: {} }
})

// 工具列表
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'init_hook',
      description: '初始化监听',
      inputSchema: {
        type: 'object',
        properties: {
          urlKeyword: { type: 'string', description: '目标页面 URL 关键词' }
        },
        required: ['urlKeyword']
      }
    },
    {
      name: 'get_data',
      description: '获取拦截的数据',
      inputSchema: { type: 'object', properties: {} }
    }
  ]
}))

// 工具实现
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params

  if (name === 'init_hook') {
    await cdpClient.connect(args.urlKeyword)
    return { content: [{ type: 'text', text: 'Hook 已安装' }] }
  }

  if (name === 'get_data') {
    const data = await cdpClient.getInterceptedData()
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
})

// 启动服务
const transport = new StdioServerTransport()
await server.connect(transport)
```

### 第四步：配置 MCP 服务器（给 AI IDE 用）

在 `~/.cursor/mcp.json` 或 Claude Desktop 的配置里添加：

```json
{
  "mcpServers": {
    "my-mcp": {
      "command": "node",
      "args": ["/path/to/my-mcp/dist/index.js"]
    }
  }
}
```

---

## 十、其他可以用相同思路逆向的场景

### 场景 1：Cloudflare Turnstile / hCaptcha 分析

**目标**：了解 Challenge 的参数结构和验证流程

**Hook 点**：
```javascript
// 拦截 Cloudflare 的初始化
window.turnstile = new Proxy(window.turnstile || {}, { ... })

// 或者拦截 iframe 通信
window.postMessage = new Proxy(window.postMessage, { ... })
```

### 场景 2：微信小程序 API 抓包

**目标**：分析小程序的接口结构

**Hook 点**：
```javascript
// 微信基础库的网络请求
wx.request = new Proxy(wx.request, {
  apply(target, thisArg, args) {
    record(args[0])  // args[0] 就是请求配置 { url, data, header... }
    return Reflect.apply(target, thisArg, args)
  }
})
```

### 场景 3：WebSocket 数据分析

**目标**：分析 WebSocket 通信协议

**Hook 点**：
```javascript
const OrigWS = window.WebSocket
window.WebSocket = function(url, protocols) {
  const ws = new OrigWS(url, protocols)

  const origSend = ws.send.bind(ws)
  ws.send = function(data) {
    record({ type: 'ws_send', url, data })
    return origSend(data)
  }

  ws.addEventListener('message', (event) => {
    record({ type: 'ws_recv', url, data: event.data })
  })

  return ws
}
```

### 场景 4：GraphQL 请求解析

**目标**：从混淆的 GraphQL 请求中提取业务逻辑

**Hook 点**：
```javascript
// 拦截 fetch，过滤 /graphql 路径
window.fetch = new Proxy(origFetch, {
  apply(target, thisArg, args) {
    const [url, options] = args
    if (url.includes('/graphql')) {
      const body = JSON.parse(options?.body || '{}')
      record({ query: body.query, variables: body.variables })
    }
    return Reflect.apply(target, thisArg, args)
  }
})
```

---

## 十一、技术栈与依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@modelcontextprotocol/sdk` | ^1.29.0 | MCP 协议框架，AI 工具接口 |
| `chrome-remote-interface` | ^0.34.0 | CDP 连接封装 |
| TypeScript | ^6.0.2 | 开发语言 |
| Node.js | 18+ | 运行环境 |

---

## 十二、安全与法律说明

**本文档仅供学习和研究使用。**

使用此类技术时，请注意：
1. 只在你有权限的系统上使用
2. 不得用于商业目的（ruishu-mcp 的 MIT 许可证有非商业限制）
3. 遵守目标网站的服务条款
4. 不得用于非法获取他人数据

---

## 总结

ruishu-mcp 的核心思路可以一句话概括：

> **Token 在哪里生成，就在哪里的旁边偷听。**

具体实现依赖三个关键技术点：
1. **CDP** 控制 Chrome 浏览器，注入代码，监听网络
2. **Proxy + addScriptToEvaluateOnNewDocument** 在应用代码之前 Hook 原生方法
3. **Function.toString() 伪装** 让 Hook 看起来像原生代码，绕过检测

这套方法之所以对所有基于 JS 的动态 Token 防护有效，是因为"在客户端运行的 JS 必然可以被 Hook"——这是 JavaScript 语言本身的特性决定的，不是某个系统的漏洞。

---

*文档生成时间：2026-04-12*
*源码分析版本：xuange520/ruishu-mcp@main*
