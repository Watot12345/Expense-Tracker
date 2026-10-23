# 🚀 PennyFlow — App Release & Deployment Guide

This guide covers how to install the release APK on Android, trigger automated releases via GitHub Actions, build standalone APKs locally, and deploy the interactive GitHub Pages web app.

---

## 📥 How to Install PennyFlow on Android

1. **Download the APK**:
   - Go to [GitHub Releases](https://github.com/Watot12345/Expense-Tracker/releases/latest) and download `PennyFlow-v1.0.0.apk`.
   - Or scan the QR code on the [PennyFlow GitHub Pages Live Demo](https://watot12345.github.io/Expense-Tracker/).
2. **Enable Unknown Sources**:
   - If prompted by your browser or Android OS, tap **Settings** and toggle **"Allow from this source"**.
3. **Verify Integrity (Optional)**:
   ```bash
   sha256sum -c PennyFlow-v1.0.0.apk.sha256
   ```
4. **Install and Launch**:
   - Tap **Install** and open PennyFlow!

---

## 🤖 Automated Releases via GitHub Actions

PennyFlow has a GitHub Actions CI/CD workflow configured in `.github/workflows/release.yml`.

### Option A: Create a Release by Pushing a Tag
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```
The workflow will automatically:
1. Set up Java 17 and Android SDK.
2. Run `npx expo prebuild -p android --no-install`.
3. Compile the production APK via `./gradlew assembleRelease`.
4. Calculate the SHA256 checksum.
5. Create a GitHub Release with download links and attach `PennyFlow-v1.0.0.apk` and its checksum.

### Option B: Trigger Manually via GitHub Web UI
1. Go to your repository's **Actions** tab.
2. Select **"Build & Publish Android Release"** workflow on the left.
3. Click **"Run workflow"**, type the version (e.g. `1.0.0`), and submit.

---

## 🛠️ Building the Android APK Locally

If you have Android SDK and JDK 17 installed locally:

```bash
# 1. Install dependencies
npm install

# 2. Generate native Android project (if not present)
npx expo prebuild -p android --no-install

# 3. Build Release APK
cd android
./gradlew assembleRelease --no-daemon

# The APK will be generated at:
# android/app/build/outputs/apk/release/app-release.apk
```

### Production Keystore Signing (Optional for Play Store)
By default, the debug keystore is used for convenience. To sign with a production keystore for Google Play Store:
1. Generate keystore:
   ```bash
   keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Place `my-release-key.keystore` in `android/app/`.
3. Configure `android/gradle.properties`:
   ```properties
   MYAPP_UPLOAD_STORE_FILE=my-release-key.keystore
   MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
   MYAPP_UPLOAD_STORE_PASSWORD=*****
   MYAPP_UPLOAD_KEY_PASSWORD=*****
   ```

---

## 🌐 GitHub Pages Deployment

The web showcase is deployed automatically to GitHub Pages via `.github/workflows/deploy-pages.yml` on every push to `main`.

### Configuring GitHub Pages in Repository Settings:
1. Navigate to **Settings** > **Pages** in your GitHub repository.
2. Under **Build and deployment**:
   - **Source**: Select **"GitHub Actions"** (Recommended for the workflow).
   - Alternatively, select **"Deploy from a branch"** -> branch: `main`, folder: `/(root)`.
3. Your live web app will be live at:
   👉 **`https://watot12345.github.io/Expense-Tracker/`**
