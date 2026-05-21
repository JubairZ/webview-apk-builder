import React, { useCallback } from "react";
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
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBuilder } from "@/context/BuilderContext";
import { SectionCard } from "@/components/SectionCard";
import { InputRow } from "@/components/InputRow";
import { ColorGrid } from "@/components/ColorGrid";
import { SelectRow } from "@/components/SelectRow";
import { ToggleRow } from "@/components/ToggleRow";

export default function ConfigureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config, updateConfig } = useBuilder();

  const pickLogo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to pick a logo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateConfig({ logoUri: result.assets[0].uri });
    }
  }, [updateConfig]);

  const removeLogo = useCallback(() => {
    updateConfig({ logoUri: null });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [updateConfig]);

  const generatePackageId = useCallback((name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "");
    return `com.example.${slug || "myapp"}`;
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
            <Feather name="globe" size={20} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Configure App
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Set up your WebView APK
            </Text>
          </View>
        </View>

        {/* Logo */}
        <SectionCard title="App Logo">
          <View style={styles.logoSection}>
            <TouchableOpacity
              onPress={pickLogo}
              activeOpacity={0.8}
              style={[
                styles.logoPicker,
                {
                  backgroundColor: colors.secondary,
                  borderColor: config.logoUri ? colors.primary : colors.border,
                  borderStyle: config.logoUri ? "solid" : "dashed",
                },
              ]}
            >
              {config.logoUri ? (
                <Image
                  source={{ uri: config.logoUri }}
                  style={styles.logoImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Feather name="image" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.logoHint, { color: colors.mutedForeground }]}>
                    Tap to upload
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.logoActions}>
              <TouchableOpacity
                onPress={pickLogo}
                style={[styles.logoBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Feather name="upload" size={14} color="#fff" />
                <Text style={styles.logoBtnText}>
                  {config.logoUri ? "Change" : "Upload Logo"}
                </Text>
              </TouchableOpacity>
              {config.logoUri ? (
                <TouchableOpacity
                  onPress={removeLogo}
                  style={[
                    styles.logoBtn,
                    { backgroundColor: colors.destructive + "18", borderWidth: 1, borderColor: colors.destructive + "40" },
                  ]}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[styles.logoBtnText, { color: colors.destructive }]}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </SectionCard>

        {/* App Identity */}
        <SectionCard title="App Identity">
          <InputRow
            label="Website URL"
            value={config.url}
            onChangeText={(v) => updateConfig({ url: v })}
            placeholder="https://example.com"
            keyboardType="url"
            hint="The website your app will load"
          />
          <InputRow
            label="App Name"
            value={config.appName}
            onChangeText={(v) => {
              updateConfig({ appName: v, packageId: generatePackageId(v) });
            }}
            placeholder="My Awesome App"
          />
          <InputRow
            label="Package ID"
            value={config.packageId}
            onChangeText={(v) => updateConfig({ packageId: v })}
            placeholder="com.example.myapp"
            hint="Unique identifier for your app (e.g. com.yourname.appname)"
            last
          />
        </SectionCard>

        {/* Primary Color */}
        <SectionCard title="Primary Color">
          <View style={styles.colorPreviewRow}>
            <View style={[styles.colorPreview, { backgroundColor: config.primaryColor }]} />
            <Text style={[styles.colorHex, { color: colors.foreground }]}>
              {config.primaryColor}
            </Text>
          </View>
          <ColorGrid
            selected={config.primaryColor}
            onSelect={(c) => {
              updateConfig({ primaryColor: c });
              Haptics.selectionAsync();
            }}
          />
        </SectionCard>

        {/* Theme & Display */}
        <SectionCard title="Theme & Display">
          <SelectRow
            label="Theme Mode"
            value={config.themeMode}
            options={[
              { label: "Auto (System)", value: "auto" },
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
            ]}
            onChange={(v) => updateConfig({ themeMode: v as "light" | "dark" | "auto" })}
          />
          <SelectRow
            label="Orientation"
            value={config.orientation}
            options={[
              { label: "Portrait", value: "portrait" },
              { label: "Landscape", value: "landscape" },
              { label: "Auto", value: "auto" },
            ]}
            onChange={(v) => updateConfig({ orientation: v as "portrait" | "landscape" | "auto" })}
          />
          <SelectRow
            label="Status Bar"
            value={config.statusBarStyle}
            options={[
              { label: "Auto", value: "auto" },
              { label: "Dark icons", value: "dark" },
              { label: "Light icons", value: "light" },
            ]}
            onChange={(v) => updateConfig({ statusBarStyle: v as "dark" | "light" | "auto" })}
            last
          />
        </SectionCard>

        {/* WebView Options */}
        <SectionCard title="WebView Options">
          <ToggleRow
            label="Enable JavaScript"
            description="Required for most modern websites"
            value={config.enableJavaScript}
            onValueChange={(v) => updateConfig({ enableJavaScript: v })}
          />
          <ToggleRow
            label="Show Loading Bar"
            description="Progress bar while pages load"
            value={config.showLoadingBar}
            onValueChange={(v) => updateConfig({ showLoadingBar: v })}
          />
          <ToggleRow
            label="Allow File Downloads"
            value={config.allowDownloads}
            onValueChange={(v) => updateConfig({ allowDownloads: v })}
          />
          <ToggleRow
            label="Full Screen Mode"
            description="Hide status bar for immersive experience"
            value={config.fullScreen}
            onValueChange={(v) => updateConfig({ fullScreen: v })}
            last
          />
        </SectionCard>

        {/* Splash Screen */}
        <SectionCard title="Splash Screen Color">
          <View style={styles.colorPreviewRow}>
            <View style={[styles.colorPreview, { backgroundColor: config.splashColor }]} />
            <Text style={[styles.colorHex, { color: colors.foreground }]}>
              {config.splashColor}
            </Text>
          </View>
          <ColorGrid
            selected={config.splashColor}
            onSelect={(c) => {
              updateConfig({ splashColor: c });
              Haptics.selectionAsync();
            }}
          />
        </SectionCard>
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
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
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  logoSection: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  logoPicker: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  logoPlaceholder: {
    alignItems: "center",
    gap: 4,
  },
  logoHint: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  logoActions: {
    flex: 1,
    gap: 8,
  },
  logoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  logoBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  colorPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorHex: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
