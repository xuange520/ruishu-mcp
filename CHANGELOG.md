# Changelog

All notable changes to this project will be documented in this file.

## [v1.1.0]

🚀 Release v1.1.0: Layered Telemetry Architecture (分层遥测架构)

This major infrastructure upgrade achieves dual-track data telemetry across complex dynamic encryption environments. By implementing a highly-privileged prototype redefinition mechanism, it safely crosses front-end execution boundaries to establish concurrent streams of pre-obfuscation and post-obfuscation data states.
*本版本实现了基础架构的重大升级。针对动态加密机制，通过基于原型链重定义的高权限代理拦截框架，安全跨越了前端隔离边界，实现了原始调用状态与混淆流状态的并发数据遥测。*

✨ Features | 核心特性演进

* **Sandwich Hook Architecture (夹心探针架构)**: Refactored the interception strategy to use global `Object.defineProperty` monitoring. It dynamically manages execution behaviors from third-party environments by encapsulating external logic injections.
  *(重构为全局基于 Object.defineProperty 的代理设计模式，利用高权限上下文动态接管第三方环境的注入行为，并实施逻辑层面的反向封装。)*
* **Plaintext Extractor (状态重塑链路)**: Effectively separates dynamic obfuscation interference, enabling complete reconstruction of native API request headers, original payloads, and clean URIs for downstream intelligent analysis.
  *(有效分离动态混淆导致的协议干扰，完整重构 API 原生调用时的请求头、原始载荷以及清晰的 URL 路径，为下游的大模型提供规范的数据清洗管道。)*
* **Header Telemetry (协议层状态记录)**: Introduced `XMLHttpRequest.prototype.setRequestHeader` tracking to preserve native procedural state assignments.
  *(引入针对请求首部结构的环境监听系统，确保源发业务进程写入的关键协议状态可被独立追溯，降低外部动态脚本引发的状态漂移风险。)*

🐛 Bug Fixes | 稳定性增强

* **AST Barrier Consolidation (抽象语法树结构闭环)**: Repaired an unclosed exception-handling scope in the legacy iframe isolation logic, preventing race conditions from halting concurrent telemetry probes.
  *(修补了隔离沙盒跨域调用时的异常处理域缺失现象，保障了高并发网络状态下遥测探针群的持续存活能力与系统可用性。)*

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
