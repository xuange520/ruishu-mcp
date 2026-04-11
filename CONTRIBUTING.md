# 贡献指南 / Contributing Guidelines

感谢您对 Ruishu MCP 项目的关注与贡献！ / Thank you for your interest and contribution to the Ruishu MCP project!

为保证项目的国际化视野与专业黑客水准，本仓库制定了极其严格的文档开发规范，请所有协作者、代码贡献者（包括 AI Agents）严格知悉并绝对遵守：
To ensure the international vision and professional hacker standards of this project, this repository has established exceedingly strict documentation development standards. All collaborators, code contributors (including AI Agents) must acknowledge and strictly adhere to them:

---

## 🌐 核心铁律：严格中英双语对照 / Core Ironclad Rule: Strict Bilingual Alignment

**【强制要求 / Mandatory Requirement】**
**项目内的所有文档呈现（包括 `README.md`、`Release Notes`、代码注释及本文档等）的所有非代码文字内容，必须保证中英双语逐句或逐段对照。**
**All non-code textual content across the project's documentation (including `README.md`, `Release Notes`, code comments, and this document) MUST strictly maintain a sentence-by-sentence or paragraph-by-paragraph bilingual alignment in Chinese and English.**

### 🖋️ 排版规范 / Formatting Standards

1. **结构层级 (Structural Hierarchy)**: 
   为提升文档结构的层次感与呼吸感，短语或标题可以使用 ` / ` 直接分隔（如 `简介 / Introduction`）。
   **对于句子和长段落，请务必先写中文，然后在下一行附带与其对应的英文，并且英文段落必须使用 `*italic*` 斜体呈现。**
   For short phrases or headers, use ` / ` as a direct separator. For sentences and long paragraphs, place the Chinese text first, followed by the corresponding English text on a new line, and the English text MUST be formatted in `*italic*`.

2. **列表与参数 (Lists and Parameters)**: 
   在列举参数清单时，每一个参数的解释必须按双语排版，建议使用子列表层级展示，避免拥挤。
   When enumerating parameters, their explanations must be bilingual, preferably displayed using sub-list hierarchies to prevent clutter.

3. **代码注释 (Code Comments)**: 
   核心业务逻辑源码（如 `hooks.ts`, `cdpClient.ts`）的注释同样属于此管辖范围。必须使用全英文，或者标准的中英双语。**绝对禁止提交仅有中文说明的单语代码块。**
   Comments covering core business logic (e.g., `hooks.ts`, `cdpClient.ts`) fall under this jurisdiction as well. They must be written in pure English or standard bilingual format. **Committing monolingual code blocks containing solely Chinese explanations is strictly prohibited.**

4. **专有名词 (Proper Nouns)**:
   对于专有技术名词（如 `Hook`, `CDP`, `Service Worker`, `Token`），中英文描述中必须保持原始英文字符一致。
   For proprietary technical terms (e.g., `Hook`, `CDP`, `Service Worker`, `Token`), the original English characters must be consistently retained in both Chinese and English descriptions.

---

遵守上述规则将极大地加快您的代码被合并（Merge）的速度。 / Adhering to the above rules will greatly accelerate the merging speed of your code.
