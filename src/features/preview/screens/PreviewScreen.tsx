import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { useConversion } from "@/features/conversion/ConversionContext";
import { createExcelFile, shareExcelFile } from "@/features/export/services/excelExporter";
import { SummaryCard } from "@/features/preview/components/SummaryCard";
import { TransactionRow } from "@/features/preview/components/TransactionRow";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export function PreviewScreen() {
  const router = useRouter();
  const { transactions, summary, setExportedFileUri, setError } = useConversion();
  const [exporting, setExporting] = useState(false);

  if (!summary || !transactions.length) {
    router.replace("/");
    return null;
  }

  async function exportStatement() {
    setExporting(true);
    try {
      const uri = await createExcelFile(transactions, summary!);
      setExportedFileUri(uri);
      await shareExcelFile(uri);
      router.push("/success");
    } catch (error) {
      setError(error instanceof Error ? error.message : "The Excel file could not be created.");
      router.push("/error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Review transactions</Text>
            <Text style={styles.subtitle}>Check the details before exporting</Text>
          </View>
          <MaterialCommunityIcons name="check-decagram" size={30} color={colors.primary} />
        </View>
        <SummaryCard summary={summary} />
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(item, index) => `${item.receiptNo}-${index}`}
        renderItem={({ item }) => <TransactionRow transaction={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={7}
      />
      <View style={styles.footer}>
        <AppButton label="Create Excel file" onPress={exportStatement} loading={exporting} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.lg },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontSize: 25, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  list: { padding: spacing.lg, paddingBottom: 110 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
