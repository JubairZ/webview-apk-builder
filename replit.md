# WebView APK Builder

A mobile app (Expo) that lets users configure and build WebView Android APKs using GitHub Actions — no backend required.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app (Expo Go compatible)
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `GITHUB_PERSONAL_ACCESS_TOKEN` — used to set up the template repo on GitHub

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo 54 + React Native 0.81 (expo-router)
- State: React Context + AsyncStorage (no backend)
- Build: GitHub Actions (free, using user's own GitHub token)
- Fonts: Inter (expo-google-fonts)

## Where things live

- `artifacts/mobile/` — the Expo mobile app
  - `app/(tabs)/index.tsx` — Configure tab (URL, name, logo, colors, WebView options)
  - `app/(tabs)/preview.tsx` — Preview tab (react-native-webview live preview)
  - `app/(tabs)/build.tsx` — Build tab (GitHub Actions APK builder with real-time logs)
  - `app/(tabs)/settings.tsx` — Settings tab (GitHub token, permissions, advanced options)
  - `context/BuilderContext.tsx` — Global config state, persisted via AsyncStorage
  - `services/github.ts` — GitHub REST API service (create repo, push files, poll workflow)
  - `constants/colors.ts` — Light/dark design tokens (indigo primary)

## APK Build Flow

1. User enters website URL, app name, logo, colors, permissions
2. Goes to **Build** tab → clicks **Build APK**
3. App calls GitHub API using the user's Personal Access Token to:
   - Create a new repo: `{app-name}-apk`
   - Push all 17 Android project files + `config.json` with user settings
   - GitHub Actions workflow triggers automatically
4. App polls GitHub Actions API every 8 seconds for status
5. When done: APK download link appears (valid for 30 days)

## GitHub Template Repo

`JubairZ/webview-apk-template` — The base Android WebView project that gets recreated per build.

Files pushed per build:
- `.github/workflows/build.yml` — Reads config.json, replaces placeholders, builds APK
- `app/build.gradle` — With `VERSION_CODE_PLACEHOLDER` / `VERSION_NAME_PLACEHOLDER`
- `app/src/main/AndroidManifest.xml` — With selected Android permissions
- `app/src/main/java/com/webviewapp/MainActivity.kt` — Reads config.json at runtime
- `config.json` — All user settings (URL, colors, JS, cache, etc.)
- + 12 more Android resource/layout files

## Architecture decisions

- **No backend**: All GitHub API calls made directly from the app using the user's own token
- **Per-build repos**: Each build creates a fresh repo (no conflicts, clean history)
- **Runtime config**: MainActivity.kt reads config.json from assets at startup (no code generation needed)
- **Debug APK**: Signed with Android debug keystore (installable with "Unknown sources" enabled)
- **Token in AsyncStorage**: GitHub token stored locally on device, never sent to a server

## Product

Users can:
- Enter any website URL and configure it as a native Android app
- Upload a custom logo, pick colors, set permissions
- Preview the website live in a WebView
- Build a real installable APK with one tap (via GitHub Actions)
- Download the APK when the build completes (~5-8 minutes)

## User preferences

- No backend — everything runs client-side
- GitHub token provided by the user (stored in app settings)
- APK build uses GitHub Actions free tier

## Gotchas

- GitHub token needs `repo` + `workflow` scopes
- APK artifacts expire after 30 days on GitHub Actions free tier
- `react-native-webview` version warning is cosmetic (compatible with Expo Go)
- The `${{ env.* }}` syntax in YAML template strings must be escaped as `${"$"}{{` in TypeScript template literals
