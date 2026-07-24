import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { useConversion } from "@/features/conversion/ConversionContext";
import { shareExcelFile } from "@/features/export/services/excelExporter";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export function SuccessScreen() {
  const router = useRouter();
  const { exportedFileUri, reset } = useConversion();
  const [sharing, setSharing] = useState(false);

  async function shareAgain() {
    if (!exportedFileUri) return;
    setSharing(true);
    try {
      await shareExcelFile(exportedFileUri);
    } finally {
      setSharing(false);
    }
  }

  function convertAnother() {
    reset();
    router.replace("/");
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.check}>
        <MaterialCommunityIcons name="check-bold" size={48} color={colors.white} />
      </View>
      <Text style={styles.title}>Your Excel file is ready</Text>
      <Text style={styles.copy}>
        Your transactions have been organized into a spreadsheet and saved privately on your
        device.
      </Text>
      <View style={styles.card}>
        <MaterialCommunityIcons name="file-excel" size={32} color={colors.primary} />
        <View style={styles.fileCopy}>
          <Text style={styles.fileTitle}>M-PESA Excel statement</Text>
          <Text style={styles.fileSubtitle}>Excel workbook · .xlsx</Text>
        </View>
      </View>
      <AppButton
        label="Share or save again"
        onPress={shareAgain}
        loading={sharing}
        disabled={!exportedFileUri}
        style={styles.primary}
      />
      <AppButton label="Convert another statement" onPress={convertAnother} variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "center", alignItems: "center" },
  check: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", marginTop: spacing.lg, textAlign: "center" },
  copy: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: 10, textAlign: "center" },
  card: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing.xl,
  },
  fileCopy: { flex: 1 },
  fileTitle: { color: colors.text, fontWeight: "800", fontSize: 15 },
  fileSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  primary: { alignSelf: "stretch", marginTop: spacing.xl },
});
