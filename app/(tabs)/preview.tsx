import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import WebView, { WebViewNavigation } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBuilder } from "@/context/BuilderContext";

export default function PreviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config } = useBuilder();
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(config.url);
  const [navState, setNavState] = useState<WebViewNavigation | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const hasUrl = config.url.trim().length > 0;

  const validUrl = config.url.startsWith("http")
    ? config.url
    : `https://${config.url}`;

  if (!hasUrl) {
    return (
      <View
        style={[
          styles.empty,
          {
            backgroundColor: colors.background,
            paddingTop: topPad,
          },
        ]}
      >
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="monitor" size={32} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No URL set
        </Text>
        <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
          Go to Configure tab and enter{"\n"}your website URL to preview it here.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Browser bar */}
      <View
        style={[
          styles.browserBar,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: topPad + 8,
          },
        ]}
      >
        <View style={styles.navButtons}>
          <TouchableOpacity
            onPress={() => webviewRef.current?.goBack()}
            disabled={!navState?.canGoBack}
            style={styles.navBtn}
          >
            <Feather
              name="chevron-left"
              size={20}
              color={navState?.canGoBack ? colors.foreground : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => webviewRef.current?.goForward()}
            disabled={!navState?.canGoForward}
            style={styles.navBtn}
          >
            <Feather
              name="chevron-right"
              size={20}
              color={navState?.canGoForward ? colors.foreground : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.urlBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="lock" size={12} color={colors.mutedForeground} />
          <Text
            style={[styles.urlText, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {currentUrl || validUrl}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => webviewRef.current?.reload()}
          style={styles.navBtn}
        >
          <Feather name="refresh-cw" size={16} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {loading && config.showLoadingBar && (
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: config.primaryColor,
                width: `${progress * 100}%` as `${number}%`,
              },
            ]}
          />
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webviewRef}
        source={{ uri: validUrl }}
        style={styles.webview}
        javaScriptEnabled={config.enableJavaScript}
        cacheMode={config.cacheMode === "no-cache" ? "LOAD_NO_CACHE" : "LOAD_DEFAULT"}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        onNavigationStateChange={(state) => {
          setNavState(state);
          setCurrentUrl(state.url);
        }}
        renderLoading={() => (
          <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={config.primaryColor} />
          </View>
        )}
        startInLoadingState={true}
      />

      {/* App name badge */}
      <View
        style={[
          styles.badge,
          {
            backgroundColor: config.primaryColor,
            bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 90,
          },
        ]}
      >
        <Feather name="eye" size={12} color="#fff" />
        <Text style={styles.badgeText}>Preview: {config.appName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  browserBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  navButtons: {
    flexDirection: "row",
    gap: 2,
  },
  navBtn: {
    padding: 6,
  },
  urlBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  progressBg: {
    height: 3,
    width: "100%",
  },
  progressFill: {
    height: 3,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    opacity: 0.9,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
