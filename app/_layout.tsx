import { Stack } from "expo-router";
import type { ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { ConversionProvider } from "@/features/conversion/ConversionContext";
import { colors } from "@/theme/colors";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>
        {error.message || "The app encountered an unexpected problem."}
      </Text>
      <AppButton label="Try again" onPress={retry} style={styles.retryButton} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ConversionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      />
    </ConversionProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  errorMessage: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 12,
  },
  retryButton: { marginTop: 28 },
});
