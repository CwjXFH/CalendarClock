// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // TypeScript 已检查命名空间成员；该规则无法识别部分库编译产物中的导出（如 expo-notifications 的枚举），产生误报
      "import/namespace": "off",
    },
  },
]);
