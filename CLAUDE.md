# CLAUDE.md - Universal Rules for All Projects

Universal rules for Python and Next.js projects, using a three-step AI Dev Tasks process for structured feature development. All task implementations must strictly follow `/rules/process-rules/process-task-list.md`, with tests created, integrated, and validated before marking tasks complete.

---

## 🔄 Project Awareness & Context

- Use the three-step AI Dev Tasks process for all feature development:
  - **Step 1**: Create a PRD using `/rules/process-rules/create-prd.md`.
  - **Step 2**: Generate tasks from the PRD using `/rules/process-rules/generate-tasks.md`.
  - **Step 3**: Process tasks using `/rules/process-rules/process-task-list.md`, strictly adhering to its instructions.
- Check `TASK.md` before starting a task. If not listed, add it with a brief description and today's date (e.g., `2025-09-07`).
- Follow naming conventions, file structure, and architecture patterns from the PRD.
- Use `venv_linux` for Python commands, including unit tests.

---

## 🧱 Code Structure & Modularity

### Python
- Files must not exceed 500 lines. Split into modules if needed.
- Organize code by feature or responsibility:
  - `agent.py`: Agent definition and logic.
  - `tools.py`: Tool functions.
  - `prompts.py`: System prompts.
- Use relative imports within packages.
- Use `python_dotenv` and `load_dotenv()` for environment variables.

### Next.js
- Group by features under `src/features/`, not file types.
- Support RBAC/non-RBAC via `RBAC_ENABLED` environment variable, without mandatory `rbac/` or `non-rbac/` subfolders.
- Files must not exceed 500 lines. Split into modules.
- Use `ThemeProvider` for all components.
- Use approved UI libraries: Shadcn, OriginUI, MvpBlocks, Kibo-UI, 21stDev.
- Enable TypeScript strict mode with full type coverage.
- Consolidate shared items in `src/` (e.g., `src/hooks/`, `src/components/`, `src/api/`, `src/types/`, `src/services/`).
- Keep feature-specific items in `src/features/[feature-name]/` (e.g., hooks, components, APIs, types, services).

---

## 📂 Project Folder Structure

```
src/
├── app/                        # Next.js App Router pages and layouts
├── api/                        # Shared API calls
├── components/                 # Shared UI components
├── config/                     # Service configurations
├── db/                         # Database-related files (e.g., schemas, migrations)
├── docs/                       # Documentation markdown files
├── features/                   # Feature-based organization
│   ├── [feature-name]/
│   │   ├── components/         # Feature-specific UI components
│   │   ├── hooks/              # Feature-specific hooks
│   │   ├── services/           # Feature-specific business logic
│   │   ├── api/                # Feature-specific API calls
│   │   ├── types/              # Feature-specific types
│   │   ├── utils/              # Feature-specific utilities
│   │   └── index.ts            # Feature exports
├── hooks/                      # Shared React hooks
├── providers/                  # Context providers (ThemeProvider, RoleProvider)
├── services/                   # Shared service classes
├── types/                      # Shared TypeScript interfaces and enums
├── utils/                      # Shared utility functions
├── tests/                      # Tests organized by feature
├── middleware.ts               # Route protection and authentication
└── route.config.ts             # Route configuration and permissions
```

---

## 🧪 Testing & Reliability

- Create Pytest unit tests for Python features in `src/tests/`, mirroring app structure:
  - 1 test for expected use.
  - 1 edge case.
  - 1 failure case.
- For Next.js, test components, hooks, and services in `src/tests/` (e.g., Jest, React Testing Library).
- Cover RBAC and non-RBAC scenarios.
- Update tests after logic changes.
- Per `process-task-list.md`, create tests to validate and debug each implemented feature, ensuring full integration and testing before marking tasks complete.

---

## ✅ Task Completion

- Strictly follow `/rules/process-rules/process-task-list.md` for all task implementations.
- Create tests to validate and debug features as part of each task.
- Ensure features are fully integrated and tested before marking tasks complete in `TASK.md`.
- Add new sub-tasks or TODOs to `TASK.md` under “Discovered During Work”.

---

## 📎 Style & Conventions

### Python
- Use Python for backend logic.
- Follow PEP8, use type hints, format with `black`.
- Use `pydantic` for data validation.
- Use `FastAPI` for APIs, `SQLAlchemy` or `SQLModel` for ORM.
- Write Google-style docstrings:
  ```python
  def example(param1: str) -> bool:
      """
      Brief summary.

      Args:
          param1 (str): Description.

      Returns:
          bool: Description.
      """
  ```

### Next.js
- **File Naming**:
  - Components: PascalCase (e.g., `PaymentForm.tsx`).
  - Services: camelCase with `Service` suffix (e.g., `billingService.ts`).
  - Hooks: camelCase with `use` prefix (e.g., `useUserRole.ts`).
- **TypeScript**:
  - Strict mode, full type coverage.
  - PascalCase for interfaces, SCREAMING_SNAKE_CASE for enums.
  - Avoid `any` type.
  - Make role properties optional for non-RBAC.
- **Error Handling**:
  - Use try-catch for async operations.
  - Use error boundaries for components.
  - Provide clear error messages.
- **Performance**:
  - Use dynamic imports for code splitting.
  - Use React Query for API caching.
  - Optimize database queries with indexes and pagination.
- **Security**:
  - Require server-side validation.
  - Sanitize inputs.
  - Use validated environment variables.
  - Implement session management and token refresh.

---

## 🧠 AI Behavior Rules

- Ask for clarification if context is missing.
- Use only verified Python packages or approved Next.js libraries (Shadcn, OriginUI, MvpBlocks, Kibo-UI, 21stDev).
- Confirm file paths and module names before use.
- Never delete or overwrite code unless instructed or part of `TASK.md`.
- Ensure Next.js components use `ThemeProvider` and approved UI libraries.
- Adhere strictly to `/rules/process-rules/process-task-list.md` for task implementations.

---

## 🚀 AI Dev Tasks

Use the three-step process for feature development:
- `/rules/process-rules/create-prd.md`: Create a PRD.
- `/rules/process-rules/generate-tasks.md`: Generate tasks from the PRD.
- `/rules/process-rules/process-task-list.md`: Process tasks one at a time, including tests and integration.

### Workflow
1. Create a PRD: `Use @create-prd.md for [feature description].`
2. Generate tasks: `Take @MyFeature-PRD.md and use @generate-tasks.md.`
3. Process tasks: `Start on task 1.1 using @process-task-list.md.`

### Claude Code Integration
Include:
```
# AI Dev Tasks
Use for structured feature development:
/rules/process-rules/create-prd.md
/rules/process-rules/generate-tasks.md
/rules/process-rules/process-task-list.md
```

Create custom commands in `.claude/commands/`:
- `create-prd.md`:
  ```
  Use /rules/process-rules/create-prd.md to create a PRD for a new feature.
  ```
- `generate-tasks.md`:
  ```
  Generate tasks from the PRD using /rules/process-rules/generate-tasks.md
  If no PRD is specified, list PRDs under `/tasks` (starting with `prd-`, e.g., `prd-[name].md`) without a task list (e.g., `tasks-prd-[name].md`). Always confirm the PRD file name with numbered options.
  ```
- `process-task-list.md`:
  ```
  Process the task list using /rules/process-rules/process-task-list.md
  ```

Restart Claude Code after adding commands (`/exit`).

---

## 🌟 Benefits
- Consistent Python and Next.js project structures.
- Modular, maintainable code with consolidated shared and feature-specific items.
- Reliable applications through rigorous testing and integration.
- Scalable feature development with the AI Dev Tasks process.
- Clear code with inline `# Reason:` comments.

---