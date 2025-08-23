# AGENTS Instructions for vialty-blog

## Repository Overview
- Node.js project deployed on Vercel.
- Serverless API functions live in the `api/` directory.
- Static pages and assets are stored under `public/` and in the project root.

## Coding Style
- Use **ES modules** (`import`/`export`).
- **Indent with 2 spaces**; no tabs.
- Use **single quotes** for strings unless interpolation is required.
- **Terminate statements with semicolons**.
- Prefer `const`/`let` over `var` and keep lines under roughly 100 characters.
- Handle asynchronous code with `async/await` wrapped in `try/catch` for error handling.

## Development Workflow
1. Run `npm install` in the project root (and in `api/` if new dependencies are added there).
2. Execute `npm run build` before committing to ensure the project builds (there is no test suite).
3. When adding API handlers:
   - Export a default async function `(req, res)`.
   - Include necessary CORS headers.
   - Validate and sanitize inputs.
4. Update `vercel.json` when routes or functions change.

## Documentation & Commit Guidelines
- Update `README.md` or relevant docs when behavior changes.
- Use descriptive commit messages in the imperative mood.
- Do **not** commit secrets or credentials.

