import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#0ea5e9", "#1d4ed8",
  "#7c3aed", "#be123c", "#065f46", "#1e3a5f",
  "#18181b", "#374151", "#6b7280", "#d1d5db",
];

interface ColorGridProps {
  selected: string;
  onSelect: (color: string) => void;
}

export function ColorGrid({ selected, onSelect }: ColorGridProps) {
  return (
    <View style={styles.grid}>
      {PRESET_COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          onPress={() => onSelect(color)}
          style={[styles.swatch, { backgroundColor: color }]}
          activeOpacity={0.8}
        >
          {selected.toLowerCase() === color.toLowerCase() && (
            <Feather name="check" size={14} color="#fff" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 16,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
