import type { ExpoConfig } from "expo/config";

/**
 * 应用标识。iOS 侧载/签名时 Bundle ID 必须唯一，
 * 如与他人冲突可通过环境变量 APP_BUNDLE_ID 覆盖。
 */
const bundleId = process.env.APP_BUNDLE_ID ?? "com.cwjxfh.calendarclock";

const config: ExpoConfig = {
  name: "日历闹钟",
  slug: "calendar-clock",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "calendarclock",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: bundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleId,
    // SCHEDULE_EXACT_ALARM：Android 12+ 上让定时通知准点触发；RECEIVE_BOOT_COMPLETED：重启后恢复已排程通知
    permissions: ["POST_NOTIFICATIONS", "SCHEDULE_EXACT_ALARM", "RECEIVE_BOOT_COMPLETED"],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-notifications",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    // 运行 `npx eas init` 后会自动写入 projectId，也可以手动填写
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
};

export default config;
