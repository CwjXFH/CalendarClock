/**
 * 内嵌网页（iOS / Android）：基于 react-native-webview
 * Web 端实现见 site-view.web.tsx
 */

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useColors } from '@/hooks/use-colors';

export interface SiteViewProps {
  url: string;
}

export function SiteView({ url }: SiteViewProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="text-base text-muted">页面加载失败，请检查网络</Text>
        <Pressable
          onPress={() => {
            setFailed(false);
            setLoading(true);
          }}
        >
          <Text className="text-base text-primary">重新加载</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <WebView
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: colors.background }}
        onLoadEnd={() => setLoading(false)}
        onError={() => setFailed(true)}
        // onError 只覆盖网络层错误，HTTP 4xx/5xx 需单独处理（仅主页面，子资源出错不影响）
        onHttpError={() => setFailed(true)}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
      />
      {loading && (
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <ActivityIndicator color={colors.tint} />
        </View>
      )}
    </View>
  );
}
