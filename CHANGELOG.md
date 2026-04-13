# Changelog

All notable changes to this project will be documented in this file.

## [1.1.2] - 2026-04-13
### 🚀 Features | 核心体系演进
* **Sandwich Hook Architecture (夹心探针架构)**: Refactored the interception strategy to use global `Object.defineProperty` monitoring. When protective engines attempt to override native hooks, the agent automatically captures and wraps their functions, establishing a clean "Native API -> Plaintext Probe -> Encryption Engine -> Ciphertext Probe -> Network Stack" topology.
  *(弃用原始的定时器轮询策略，重构为全局级别的 Object.defineProperty 代理，利用“上帝视角”当场劫持第三方环境注入并实施反封装。构建了从业务真实明文到网络真实密文的完整验证拓扑。)*
* **Plaintext Extractor (明文重塑链路)**: Perfectly resolves dynamic interference, enabling complete reconstruction of native API request headers, unencrypted payloads, and clean URIs. Provides absolute pristine human-level data for subsequent LLM processing.
  *(完全穿透了复杂的加密干扰，完美拦截并重现 API 原生调用的请求头、原始 Payload 和绝对干净的 URL 路径，使后续大语言模型能获取绝对纯净的业务数据。)*
* **Header Telemetry (请求状态嗅探)**: Introduced `XMLHttpRequest.prototype.setRequestHeader` interception to track native state assignments, preventing secondary pollution by runtime execution environments.
  *(新增了请求头的拦截环境监听，确保原生业务调度（如 Axios/Fetch）写入的关键状态可追踪，不受远端动态脚本二次污染。)*

### 🐛 Bug Fixes | 系统稳定性修复
* **AST Barrier Consolidation (抽象语法树屏障修复)**: Fixed a rare but critical structural escape vulnerability in `hooks.ts`. Repaired an unclosed `try-catch` scope in the legacy iframe isolation logic, preventing phase 2 telemetry probes from being permanently locked out during DOM exceptions.
  *(修复了潜伏在核心探针中的异常域锁死级 Bug。重新梳理 AST，补充了对 IFrame 沙盒跳脱过程中抛出的异常闭环，确保高并发网络下的探针存活率。)*

## [v1.0.0] - Advanced Data Pipeline Architecture Release
*本版本构建了高级数据遥测网关，使大语言模型（LLM）能够无缝解耦复杂动态网络环境，稳定提取高保真业务数据流。*

### ✨ Features | 核心功能

*   **CDP Telemetry Protocol (底层协议遥测)**: Isolates from standard frontend environment detections via underlying protocol control, establishing a pure data extraction channel.
    *(CDP 底层协议级控制，隔离常规前端环境检测，建立纯净的大模型交互通道。)*
*   **Cross-Layer Data Reconstruction (跨层数据重构)**: Implements high-concurrency atomic memory archiving of dynamic data states without interfering with native JavaScript logic.
    *(极具容错性的高并发动态状态内存级归档，无侵入式解耦原生前端业务逻辑。)*
*   **MCP Auto-Orchestration (大模型标准调度)**: Fully compliant with the Anthropic Model Context Protocol, providing zero-friction data ingestion for AI-driven automation workflows.
    *(完全遵循 Anthropic MCP 协议标准，为大模型自动化工具链提供零壁垒的高质量数据摄入。)*
*   **Academic Bilingual Standardization (学术级双语规范)**: Enforces strict bilingual standards for all documentation and architecture designs, ensuring rigorous academic and engineering presentation.
    *(全系统级别执行双语强制规范，呈现严谨的学术及生产级工程架构展示体验。)*

### 📦 Quick Start | 快速体验

Please refer to the `README.md` for telemetry node setup and installation guides.
*具体数据节点环境配置指令详见项目主页 README，支持直接克隆后使用 npm 启动。*
