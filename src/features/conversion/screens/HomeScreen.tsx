import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { BrandHeader } from "@/components/BrandHeader";
import { Screen } from "@/components/Screen";
import { useConversion } from "@/features/conversion/ConversionContext";
import { pickStatementPdf } from "@/features/conversion/services/documentPicker";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

const steps = [
  ["file-pdf-box", "Choose statement", "Select a supported statement PDF from your phone."],
  ["shield-lock-outline", "Processed privately", "Your statement stays on this device."],
  ["file-excel-outline", "Save as Excel", "Preview, export, and share your spreadsheet."],
] as const;

export function HomeScreen() {
  const router = useRouter();
  const { setDocument } = useConversion();
  const [message, setMessage] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  async function chooseDocument() {
    if (Platform.OS === "web") {
      setMessage(
        "PDF conversion runs in the Android app. Open this project on your Android emulator instead of the web browser.",
      );
      return;
    }
    setPicking(true);
    setMessage(null);
    try {
      const result = await pickStatementPdf();
      if (result.status === "selected") {
        setDocument(result.file);
        router.push("/processing");
      } else if (result.status === "invalid") {
        setMessage(result.message);
      }
    } catch {
      setMessage("We couldn’t open the file picker. Please try again.");
    } finally {
      setPicking(false);
    }
  }

  return (
    <Screen scroll style={styles.screen}>
      <BrandHeader />
      <View style={styles.hero}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="shield-check-outline" size={17} color={colors.primary} />
          <Text style={styles.badgeText}>100% private and offline</Text>
        </View>
        <Text style={styles.title}>Turn your statement into Excel</Text>
        <Text style={styles.subtitle}>
          Privately convert M-PESA statements today. Kenyan bank support is coming next.
        </Text>
        <AppButton
          label="Choose statement PDF"
          onPress={chooseDocument}
          loading={picking}
          style={styles.primaryButton}
        />
        <Text style={styles.fileHint}>PDF only · Maximum 20 MB</Text>
        {message && <Text style={styles.error}>{message}</Text>}
      </View>

      <View style={styles.support}>
        <Text style={styles.sectionTitle}>Provider support</Text>
        <View style={styles.providerRow}>
          {["M-PESA", "Absa", "Co-op"].map((provider) => (
            <View key={provider} style={styles.supportedPill}>
              <Text style={styles.supportedText}>{provider} · Available</Text>
            </View>
          ))}
          {["KCB", "NCBA", "Equity"].map((provider) => (
            <View key={provider} style={styles.comingPill}>
              <Text style={styles.comingText}>{provider} · Coming soon</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How it works</Text>
        {steps.map(([icon, title, description], index) => (
          <View key={title} style={styles.step}>
            <View style={styles.stepIcon}>
              <MaterialCommunityIcons name={icon} size={23} color={colors.primary} />
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>{index + 1}. {title}</Text>
              <Text style={styles.stepDescription}>{description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.privacy}>
        <MaterialCommunityIcons name="lock-check-outline" size={24} color={colors.primary} />
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Your financial data remains yours</Text>
          <Text style={styles.privacyText}>
            No account, uploads, tracking, or cloud storage. Processing happens entirely on your
            phone.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  hero: { paddingTop: spacing.xl, alignItems: "center" },
  badge: {
    flexDirection: "row",
    gap: 7,
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  badgeText: { color: colors.primaryDark, fontWeight: "700", fontSize: 13 },
  title: {
    marginTop: spacing.lg,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
  },
  primaryButton: { alignSelf: "stretch", marginTop: spacing.xl },
  fileHint: { marginTop: 10, color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger, marginTop: 10, textAlign: "center" },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  support: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  supportedPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  supportedText: { color: colors.primaryDark, fontSize: 12, fontWeight: "700" },
  comingPill: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  comingText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  step: { flexDirection: "row", gap: 14 },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCopy: { flex: 1 },
  stepTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  stepDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 3 },
  privacy: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: spacing.md,
  },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: colors.primaryDark, fontWeight: "800", fontSize: 15 },
  privacyText: { color: colors.primaryDark, fontSize: 13, lineHeight: 19, marginTop: 4 },
});
