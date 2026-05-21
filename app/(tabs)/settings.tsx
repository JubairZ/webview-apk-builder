import React from "react";
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBuilder } from "@/context/BuilderContext";
import { SectionCard } from "@/components/SectionCard";
import { ToggleRow } from "@/components/ToggleRow";
import { SelectRow } from "@/components/SelectRow";
import { InputRow } from "@/components/InputRow";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config, updateConfig, resetConfig } = useBuilder();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleReset = () => {
    Alert.alert(
      "Reset Settings",
      "This will clear all configuration. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetConfig();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPad + 16,
            paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.accent }]}>
            <Feather name="settings" size={20} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Settings
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Advanced options
            </Text>
          </View>
        </View>

        {/* Android Permissions */}
        <SectionCard title="Android App Permissions">
          <ToggleRow
            label="Internet Access"
            description="Required for loading websites"
            value={config.permissions.internet}
            onValueChange={(v) =>
              updateConfig({ permissions: { ...config.permissions, internet: v } })
            }
          />
          <ToggleRow
            label="Camera"
            description="For camera-based web features"
            value={config.permissions.camera}
            onValueChange={(v) =>
              updateConfig({ permissions: { ...config.permissions, camera: v } })
            }
          />
          <ToggleRow
            label="Location"
            description="For GPS/location-based features"
            value={config.permissions.location}
            onValueChange={(v) =>
              updateConfig({ permissions: { ...config.permissions, location: v } })
            }
          />
          <ToggleRow
            label="Microphone"
            description="For voice/audio web features"
            value={config.permissions.microphone}
            onValueChange={(v) =>
              updateConfig({ permissions: { ...config.permissions, microphone: v } })
            }
          />
          <ToggleRow
            label="Storage Read/Write"
            description="For file downloads and uploads"
            value={config.permissions.storage}
            onValueChange={(v) =>
              updateConfig({ permissions: { ...config.permissions, storage: v } })
            }
          />
          <ToggleRow
            label="Vibration"
            value={config.permissions.vibration}
            onValueChange={(v) =>
              updateConfig({ permissions: { ...config.permissions, vibration: v } })
            }
            last
          />
        </SectionCard>

        {/* Advanced WebView */}
        <SectionCard title="Advanced WebView">
          <ToggleRow
            label="Enable DOM Storage"
            description="localStorage / sessionStorage support"
            value={config.enableDomStorage}
            onValueChange={(v) => updateConfig({ enableDomStorage: v })}
          />
          <ToggleRow
            label="Allow Zoom"
            description="Pinch to zoom on the webpage"
            value={config.allowZoom}
            onValueChange={(v) => updateConfig({ allowZoom: v })}
          />
          <ToggleRow
            label="Hide Status Bar"
            description="Immersive fullscreen experience"
            value={config.hideStatusBar}
            onValueChange={(v) => updateConfig({ hideStatusBar: v })}
          />
          <SelectRow
            label="Cache Mode"
            value={config.cacheMode}
            options={[
              { label: "Normal (Recommended)", value: "normal" },
              { label: "No Cache", value: "no-cache" },
            ]}
            onChange={(v) => updateConfig({ cacheMode: v as "normal" | "no-cache" })}
            last
          />
        </SectionCard>

        {/* Custom User Agent */}
        <SectionCard title="Custom User Agent">
          <InputRow
            label="User Agent String"
            value={config.userAgent}
            onChangeText={(v) => updateConfig({ userAgent: v })}
            placeholder="Leave empty for default"
            hint="Custom browser user agent (optional)"
            last
          />
        </SectionCard>

        {/* Danger Zone */}
        <SectionCard title="Danger Zone">
          <TouchableOpacity
            onPress={handleReset}
            style={styles.dangerBtn}
            activeOpacity={0.7}
          >
            <Feather name="rotate-ccw" size={16} color={colors.destructive} />
            <View>
              <Text style={[styles.dangerTitle, { color: colors.destructive }]}>
                Reset All Settings
              </Text>
              <Text style={[styles.dangerDesc, { color: colors.mutedForeground }]}>
                Clears all configuration
              </Text>
            </View>
          </TouchableOpacity>
        </SectionCard>

        <View style={[styles.about, { borderColor: colors.border }]}>
          <Text style={[styles.aboutTitle, { color: colors.foreground }]}>
            WebView APK Builder
          </Text>
          <Text style={[styles.aboutVersion, { color: colors.mutedForeground }]}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  dangerTitle: { fontSize: 15, fontFamily: "Inter_500Medium" },
  dangerDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  about: {
    alignItems: "center",
    paddingVertical: 24,
    borderWidth: 1,
    borderRadius: 14,
    gap: 4,
    marginTop: 4,
  },
  aboutTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  aboutVersion: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
