import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface AndroidPermissions {
  internet: boolean;
  camera: boolean;
  location: boolean;
  microphone: boolean;
  storage: boolean;
  notifications: boolean;
  vibration: boolean;
}

export interface BuilderConfig {
  url: string;
  appName: string;
  packageId: string;
  versionName: string;
  versionCode: number;
  primaryColor: string;
  backgroundColor: string;
  themeMode: "light" | "dark" | "auto";
  orientation: "portrait" | "landscape" | "auto";
  fullScreen: boolean;
  hideStatusBar: boolean;
  statusBarStyle: "dark" | "light" | "auto";
  splashColor: string;
  logoUri: string | null;
  enableJavaScript: boolean;
  allowDownloads: boolean;
  showLoadingBar: boolean;
  cacheMode: "normal" | "no-cache";
  allowZoom: boolean;
  enableDomStorage: boolean;
  userAgent: string;
  permissions: AndroidPermissions;
  githubToken: string;
  githubOwner: string;
  lastBuiltRepo: string | null;
  lastBuildRunId: number | null;
}

const AUTO_TOKEN = process.env.EXPO_PUBLIC_GH_TOKEN ?? "";
const AUTO_OWNER = process.env.EXPO_PUBLIC_GH_OWNER ?? "";

const DEFAULT_CONFIG: BuilderConfig = {
  url: "",
  appName: "My App",
  packageId: "com.example.myapp",
  versionName: "1.0.0",
  versionCode: 1,
  primaryColor: "#6366f1",
  backgroundColor: "#ffffff",
  themeMode: "auto",
  orientation: "portrait",
  fullScreen: false,
  hideStatusBar: false,
  statusBarStyle: "auto",
  splashColor: "#6366f1",
  logoUri: null,
  enableJavaScript: true,
  allowDownloads: false,
  showLoadingBar: true,
  cacheMode: "normal",
  allowZoom: false,
  enableDomStorage: true,
  userAgent: "",
  permissions: {
    internet: true,
    camera: false,
    location: false,
    microphone: false,
    storage: false,
    notifications: false,
    vibration: true,
  },
  githubToken: AUTO_TOKEN,
  githubOwner: AUTO_OWNER,
  lastBuiltRepo: null,
  lastBuildRunId: null,
};

const STORAGE_KEY = "@webview_builder_config_v2";

interface BuilderContextType {
  config: BuilderConfig;
  updateConfig: (partial: Partial<BuilderConfig>) => void;
  resetConfig: () => void;
  isLoaded: boolean;
}

const BuilderContext = createContext<BuilderContextType>({
  config: DEFAULT_CONFIG,
  updateConfig: () => {},
  resetConfig: () => {},
  isLoaded: false,
});

export function BuilderProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<BuilderConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<BuilderConfig>;
          setConfig({
            ...DEFAULT_CONFIG,
            ...parsed,
            permissions: { ...DEFAULT_CONFIG.permissions, ...(parsed.permissions ?? {}) },
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const updateConfig = useCallback((partial: Partial<BuilderConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig((prev) => ({
      ...DEFAULT_CONFIG,
      githubToken: prev.githubToken,
      githubOwner: prev.githubOwner,
    }));
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<BuilderConfig>;
          const keep = {
            ...DEFAULT_CONFIG,
            githubToken: parsed.githubToken ?? "",
            githubOwner: parsed.githubOwner ?? "",
          };
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(keep)).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  return (
    <BuilderContext.Provider value={{ config, updateConfig, resetConfig, isLoaded }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  return useContext(BuilderContext);
}
