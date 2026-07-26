import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { useConversion } from "@/features/conversion/ConversionContext";
import { createExcelFile, shareExcelFile } from "@/features/export/services/excelExporter";
import { SummaryCard } from "@/features/preview/components/SummaryCard";
import { ReconciliationBanner } from "@/features/preview/components/ReconciliationBanner";
import { TransactionRow } from "@/features/preview/components/TransactionRow";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import type { Transaction } from "@/types/transaction";

const transactionKey = (item: Transaction, index: number) => `${item.receiptNo}-${index}`;

function yieldToInterface() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function PreviewScreen() {
  const router = useRouter();
  const {
    transactions,
    summary,
    reconciliation,
    provider,
    setExportedFileUri,
    setError,
  } = useConversion();
  const [exporting, setExporting] = useState(false);

  if (!summary || !transactions.length) {
    router.replace("/");
    return null;
  }

  async function exportStatement() {
    if (!provider || !reconciliation || reconciliation.status === "mismatch") return;
    setExporting(true);
    try {
      // Let React commit the loading indicator before SheetJS begins its
      // synchronous workbook construction.
      await yieldToInterface();
      const uri = await createExcelFile(transactions, summary!, provider);
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

  const renderTransaction = useCallback(
    ({ item }: { item: Transaction }) => <TransactionRow transaction={item} />,
    [],
  );

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Review transactions</Text>
            <Text style={styles.subtitle}>
              {provider
                ? `${provider.displayName} · Check the details before exporting`
                : "Check the details before exporting"}
            </Text>
          </View>
          <MaterialCommunityIcons name="check-decagram" size={30} color={colors.primary} />
        </View>
        <SummaryCard summary={summary} />
        {reconciliation && reconciliation.status !== "matched" && (
          <ReconciliationBanner reconciliation={reconciliation} />
        )}
      </View>
      <FlatList
        data={transactions}
        keyExtractor={transactionKey}
        renderItem={renderTransaction}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews
      />
      <View style={styles.footer}>
        <AppButton
          label={
            reconciliation?.status === "mismatch"
              ? "Export blocked — totals differ"
              : "Create Excel file"
          }
          onPress={exportStatement}
          loading={exporting}
          disabled={!provider || !reconciliation || reconciliation.status === "mismatch"}
        />
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
