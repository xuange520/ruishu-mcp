# GitHub 发布与版本管理规范 (Agent Rule)

## 📌 核心原则 (Core Directives)
1. **绝对禁止自动提交**：AI Agent 严禁在修改代码后自行执行 `git commit` 或 `git push`。
2. **命令驱动**：所有的提交和发布流程，**必须且只能**在用户明确下达指令（如：“提交代码”、“发布新版”）后才能触发。
3. **日志先行**：在执行任何 `git commit` 之前，必须先编写或更新更新日志（Changelog）。

## 🎓 学术与合规要求 (Academic & Compliance)
1. **敏感词过滤**：必须严格审查提交记录和更新日志，**绝对禁止**使用“破解”、“绕过”、“黑客”、“攻击”、“窃取”等黑灰产敏感词汇。
2. **学术化表达**：所有行为必须包装为防御性安全研究。应替换为中性/学术词汇，例如：“解除耦合(Decoupling)”、“逆向重构(Reverse Engine)”、“环境探针(Telemetry Probe)”、“协议分析(Protocol Analysis)”、“动态加密剖析(Dynamic Encryption Profiling)”。
3. **留学申请导向**：牢记此项目用于**英国留学申请（如 CS/网络安全方向）**。代码注释和更新日志需凸显“底层架构设计能力”、“网络协议级洞察”、“高并发/容错工程能力”及“前沿的安全机制逆向研究”。

4. **版本命名强制规范**：在 GitHub 发布中生成的 Release 名称，必须精确采用前缀拼装：`Ruishu MCP v*.*.*`格式。绝不能带有冗长花哨的修饰词做大标题。

## 📝 更新日志规范 (Changelog Rules)
每次发布前，AI 需要收集本次的所有更改，并按照语义化风格进行分类汇总，展示给用户：
*   🚀 **Features (新增)**: 新功能或新特性的添加。
*   🐛 **Bug Fixes (修复)**: 代码错误或漏洞的修复。
*   🔨 **Refactor (重构)**: 不涉及新功能或修复的内部代码重构。
*   ⚡️ **Performance (性能)**: 性能优化。
*   🛡️ **Security (安全)**: 安全漏洞修复或防护升级。

## 🏷️ 版本号管理 (Versioning)
遵循语义化版本控制 (Semantic Versioning - SemVer) `MAJOR.MINOR.PATCH`：
*   **MAJOR (主版本号)**: 发生了不兼容的 API 修改或重大架构重构（如引入三明治挂钩架构）。
*   **MINOR (次版本号)**: 向下兼容的新功能添加。
*   **PATCH (修订号)**: 向下兼容的 Bug 修复（如修复 try-catch 缺失缺陷）。

## ⚙️ 标准发布流程 (Standard Release Workflow)

当收到用户的“发布/提交”指令后，AI 必须严格按以下步骤依次执行：

### Step 1: 制定发布提案 
*   分析 `git status` 和 `git diff`，总结本次变更。
*   拟定合适的版本号升级策略（Patch/Minor/Major）。
*   生成本次版本的 Changelog 草稿。
*   **暂停执行**：向用户展示上述提案，等待用户确认或修改。

### Step 2: 固化文档
*   在获得用户批准后，将确定的更新日志写入项目的 `CHANGELOG.md` 中。
*   如果有版本号升级，修改 `package.json` 等文件中的版本号字段。
*   运行构建命令（如 `npm run build`）确保代码无编译错误。

### Step 3: Git 提交与推送
*   执行 `git add .` 将更改加入暂存区。
*   使用符合 Conventional Commits 规范的格式进行提交，例如：`feat(hook): 实现基于 defineProperty 的上帝视角明文拦截机制`。
*   （可选）打上对应的 Git 版本 Tag：`git tag -a v1.2.0 -m "Release v1.2.0"`。
*   执行 `git push` 和 `git push --tags` 将代码和分支推送到远程仓库。
*   向用户报告发布完成。
