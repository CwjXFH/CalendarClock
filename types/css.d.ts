// 样式文件只作副作用导入（NativeWind 在构建时处理）；TypeScript 6 默认检查副作用导入，需要显式声明
declare module "*.css";
