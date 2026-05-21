import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  last,
}: ToggleRowProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.textGroup}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {label}
        </Text>
        {description ? (
          <Text style={[styles.desc, { color: colors.mutedForeground }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textGroup: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
