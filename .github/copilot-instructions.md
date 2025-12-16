## Quick orientation for AI coding agents

This repo is a small Create React App frontend with a minimal Express backend under `server/`.

- Frontend: standard CRA app at the repository root. Key files: `src/App.js`, `src/index.js`.
- Backend: lightweight Express API at `server/index.js` exposing a simple in-memory TODOs API.

## Big picture

- The frontend (CRA) serves the UI and runs on port 3000 by default (`npm start`).
- The backend is a simple Express server that listens on port 5000 and exposes REST endpoints under `/api/todos`.
- Data flow: server stores TODOs in an in-memory `todos` array (no database). POST adds, GET returns all, DELETE removes by id.

## How to run (developer workflow)

1. Frontend (development)

   - From repo root: `npm install` (if needed) and `npm start` — CRA dev server on http://localhost:3000

2. Backend (development)

   - `cd server`
   - `npm install` (add missing dependencies if needed: `cors`, `morgan`, `uuid`)
   - Note: `server/package.json` currently does not include `type: "module"` or the extra deps; you may need to add `"type": "module"` to use `import` syntax and add a `start` script like `"start": "node index.js"`.
   - Start: `npm start` (after adding script) or `node index.js`

3. Tests
   - Frontend: `npm test` (CRA tests). There are no server tests yet — consider adding `jest` + `supertest` for API coverage.

## Notable code/conventions and gotchas

- `server/index.js` uses ES module `import` syntax but `server/package.json` doesn't declare `"type": "module"` — running `node index.js` may fail unless you add it or use a transpiler. Keep this in mind when writing fixes or automation.
- The server stores `todos` in memory (array). This makes state ephemeral; tests and min repros should set up and tear down state explicitly.
- DELETE route bug: the handler reads `const id = req.params;` then compares `t.id != id` — `req.params` is an object; the intended code is `const { id } = req.params;` and compare `t.id !== id`.

## Common tasks an agent may be asked to do (and where to look)

- Add/fix API endpoints: `server/index.js` (GET /api/todos, POST /api/todos, DELETE /api/todos/:id).
- Add server tests: create `server/test` with `jest` + `supertest` to exercise endpoints (example: POST then GET returns the item; DELETE removes it).
- Make dev/run ergonomics: update `server/package.json` to include `type: "module"`, add a `start` script, and add `dev` script using `nodemon` for faster dev feedback.
- Wire frontend to backend: modify `src` to call `http://localhost:5000/api/todos` (pay attention to CORS; server already calls `cors()` middleware).

## Examples (copy/paste friendly)

- Fix for the DELETE route (server/index.js):

```js
// before
// const id = req.params;
// todos = todos.filter((t) => t.id != id);

// correct
const { id } = req.params;
todos = todos.filter((t) => t.id !== id);
```

- Starting server (example shell):

```powershell
cd server
npm install cors morgan uuid
# add "type": "module" to server/package.json and add a start script
npm start
```

## PR guidance for agents

- Add small, focused commits with tests where appropriate (e.g., fix delete route + unit tests for DELETE).
- Keep changes minimal and well-justified in commit messages (e.g., "server: fix DELETE /api/todos/:id to use req.params.id and add tests").

## Files to inspect for further work

- `server/index.js` — backend implementation (primary entry point)
- `server/package.json` — scripts and dependencies for the server (incomplete)
- `src/` — CRA frontend (UI changes and any calls to backend)
- `README.md` — notes about running the frontend (CRA defaults)

If anything here is unclear or you want the instructions to be more prescriptive (e.g., add server tests or fix the DELETE bug now), tell me which direction and I'll update this file with a suggested PR + tests. ✅
