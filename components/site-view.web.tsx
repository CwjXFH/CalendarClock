/**
 * 内嵌网页（Web）：react-native-webview 不支持 Web，改用 iframe
 */

import React from 'react';
import { View } from 'react-native';

export interface SiteViewProps {
  url: string;
}

export function SiteView({ url }: SiteViewProps) {
  return (
    <View className="flex-1">
      {React.createElement('iframe', {
        src: url,
        title: '日历',
        // 开发服务器为 SQLite 开启了 COEP（见 metro.config.js），会拦截未声明 COEP/CORP 的跨源 iframe；
        // credentialless 让 iframe 以无凭据方式加载从而放行（Chrome/Edge 110+ 支持）
        credentialless: true,
        style: { flex: 1, width: '100%', height: '100%', border: 'none' },
      })}
    </View>
  );
}
