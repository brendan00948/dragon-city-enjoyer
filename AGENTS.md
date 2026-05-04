# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Dragon City Enjoyer is a single-page static community web app (`index.html`) for Dragon City fans. It uses Firebase (Auth, Firestore, Realtime Database) as its backend — there is no server-side code, no build system, and no package manager.

### Running the dev server

Serve `index.html` with any static HTTP server:

```
python3 -m http.server 8080 --directory /workspace
```

Then open `http://localhost:8080` in Chrome.

### Key caveats

- **No lint, test, or build steps exist.** There are no `package.json`, test frameworks, or linters configured in the repo. Validation is manual (load the page, exercise UI features).
- **All dependencies are loaded via CDN** (Firebase SDK 9.22.1, Font Awesome 6.4.0). Internet access is required.
- **Firebase project config is hardcoded** in `index.html`. The Firebase project `dragon-city-enjoyer` must be reachable for auth, posts, shop, and order features to work.
- The entire app lives in a single `index.html` file (~5,000 lines of inline HTML/CSS/JS).
