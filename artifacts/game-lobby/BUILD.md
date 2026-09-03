# Building the Android APK

Everything needed to reproduce the exact same signed debug APK lives in this
repo — the web app source, the native Android project (including the debug
keystore, so every build signs with the same certificate), and the gradle
wrapper. No files outside this repo are required.

## Prerequisites

- **Node.js** (any recent LTS) and **pnpm** — this is a pnpm workspace; the
  root `package.json` actively refuses a plain `npm install` at the repo
  root (its `preinstall` script checks `npm_config_user_agent`). From the
  **repo root**, run:
  ```
  pnpm install
  ```
- **Android SDK** with build-tools installed (any recent version; this
  project has been built against build-tools 36.0.0) and a JDK. Set
  `ANDROID_HOME`/`ANDROID_SDK_ROOT` to point at it. `apksigner` (used below
  to verify the signature) ships inside `$ANDROID_HOME/build-tools/<version>/`.

## Build pipeline

Run everything from `artifacts/game-lobby/`.

```bash
# 1. Clean any stale APK copies before building — see the note below on
#    why this matters.
rm -f public/10squad-assassin.apk dist/10squad-assassin.apk release/10squad-assassin.apk
find android/app/src/main/assets -name "*.apk" -delete 2>/dev/null
rm -rf android/app/build

# 2. Build the web app.
npm run build

# 3. Sync the web build into the Android project.
npx cap sync android

# 4. Build the debug APK.
cd android && ./gradlew assembleDebug --rerun-tasks && cd ..
```

The signed APK is at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Verifying the signature

The committed `android/app/debug.keystore` means every build — on any
machine, any session — signs with the **same** certificate:

```bash
$ANDROID_HOME/build-tools/<version>/apksigner verify --print-certs \
  android/app/build/outputs/apk/debug/app-debug.apk
```

Expected output:
```
Signer #1 certificate DN: C=US, O=Android, CN=Android Debug
Signer #1 certificate SHA-256 digest: cc1f0f07bb38f52836f1637c3403e1c220330867c3df1aa0df8eb5d471c40510
```

If the DN or fingerprint differs, something is signing with a different
keystore than the one committed here.

## ⚠️ Do not put the APK in `public/` before building

The release APK is served for download from the deployed web app, but it
must **never** sit in `public/` (or `dist/`) at the time `vite build` /
`cap sync` run. `public/` gets copied wholesale into `dist/`, which is what
`cap sync` copies into the Android project's own web assets — so if the
*previous* release's APK is already sitting in `public/`, it gets bundled
as a raw asset inside the *next* APK, and its size roughly doubles every
rebuild. (This actually happened once during development — see the git log
for the fix.)

The safe pattern, once you have a freshly-built and verified APK:

```bash
# Stash the verified APK OUTSIDE public/ — release/ is gitignored and
# never touched by vite build or cap sync.
mkdir -p release
cp android/app/build/outputs/apk/debug/app-debug.apk release/10squad-assassin.apk

# Only copy it into dist/ as the very last step before deploying,
# never before another build/sync.
cp release/10squad-assassin.apk dist/10squad-assassin.apk
```

Step 1 of the build pipeline above (deleting any stale APK copies first)
guards against this even if a previous release's APK was left lying around.

## Deploying the web app (optional)

The APK is served for download from `10squad-permanent-test.vercel.app`,
deployed via `npx vercel deploy --prod` from `artifacts/game-lobby/` (needs
a Vercel token with access to that project — not committed here). This step
is unrelated to building the APK itself; skip it if you only need the
`.apk` file.
