import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { useConversion } from "@/features/conversion/ConversionContext";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export function ErrorScreen() {
  const router = useRouter();
  const { error, reset } = useConversion();

  function tryAgain() {
    reset();
    router.replace("/");
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.icon}>
        <MaterialCommunityIcons name="file-alert-outline" size={44} color={colors.danger} />
      </View>
      <Text style={styles.title}>We couldn’t convert this file</Text>
      <Text style={styles.copy}>
        {error ?? "The statement could not be read. Please check the file and try again."}
      </Text>
      <View style={styles.tip}>
        <Text style={styles.tipTitle}>Before trying again</Text>
        <Text style={styles.tipText}>
          Make sure this is an original text-based PDF statement, not a screenshot or scanned
          copy.
        </Text>
      </View>
      <AppButton label="Choose another statement" onPress={tryAgain} style={styles.button} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "center", alignItems: "center" },
  icon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text, fontSize: 25, fontWeight: "900", marginTop: spacing.lg, textAlign: "center" },
  copy: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: 12, textAlign: "center" },
  tip: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, marginTop: spacing.xl },
  tipTitle: { color: colors.text, fontWeight: "800", fontSize: 15 },
  tipText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 5 },
  button: { alignSelf: "stretch", marginTop: spacing.xl },
});
