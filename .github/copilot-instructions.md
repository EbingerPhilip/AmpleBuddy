# AI Coding Agent Instructions for AmpleBuddy

## Project Overview
AmpleBuddy is a React + TypeScript project using Vite for development and build processes. The project is structured into `frontend` and `backend` directories, with the frontend leveraging modern React practices and the backend likely serving as an API or server-side logic.

### Key Components
- **Frontend**: Located in `frontend/`, built with React, TypeScript, and Vite.
  - Entry point: `frontend/src/main.tsx`
  - Main app component: `frontend/src/App.tsx`
  - Pages: `frontend/src/pages/` contains `Home.tsx`, `Login.tsx`, and `Profile.tsx`.
  - Styling: CSS files are in `frontend/src/css/`.
  - Configuration files: `vite.config.ts`, `tsconfig.json`, `eslint.config.js`.
- **Backend**: Located in `backend/`, with `server.ts` as the likely entry point.

## Developer Workflows

### Setting Up the Project
1. Ensure Node.js is up to date (tested with Node.js 24.10.1).
2. Install TypeScript globally:
   ```bash
   npm install -g typescript
   npm install -D ts-node
   ```
3. Install project dependencies:
   ```bash
   npm install
   ```

### Running the Frontend
1. Navigate to the `frontend/` directory.
2. Start the development server:
   ```bash
   npm run dev
   ```

### Building the Frontend
1. Navigate to the `frontend/` directory.
2. Build the project:
   ```bash
   npm run build
   ```

### Linting
- ESLint is configured for the frontend. Run linting with:
  ```bash
  npm run lint
  ```

## Project-Specific Conventions
- **TypeScript Configurations**: The project uses multiple `tsconfig` files:
  - `tsconfig.app.json` for the application.
  - `tsconfig.node.json` for Node.js-specific configurations.
- **ESLint Rules**: Type-aware lint rules are recommended. See `frontend/eslint.config.js` for details.
- **React Compiler**: Enabled for improved performance. Refer to [React Compiler Documentation](https://react.dev/learn/react-compiler).

## Integration Points
- **Vite Plugins**: The project uses `@vitejs/plugin-react` for React Fast Refresh.
- **External Dependencies**: Ensure all dependencies are installed via `npm install`.

## Cross-Component Communication
- Pages (`Home.tsx`, `Login.tsx`, `Profile.tsx`) are likely routed using React Router (not explicitly mentioned, but typical in such setups).
- Shared types are defined in `frontend/src/types.ts`.

## Notes for AI Agents
- Follow the existing folder structure and naming conventions.
- When adding new pages, place them in `frontend/src/pages/` and update the routing logic in `App.tsx`.
- Use TypeScript for all new code and ensure type safety.
- Adhere to the ESLint rules defined in `eslint.config.js`.
- For backend changes, ensure compatibility with the frontend API calls.

---
For further clarification, consult the `README.md` files in the root and `frontend/` directories.