import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import type { StatementSummary } from "@/types/transaction";

const money = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function shortDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function SummaryCard({ summary }: { summary: StatementSummary }) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View>
          <Text style={styles.label}>Transactions</Text>
          <Text style={styles.count}>{summary.transactionCount}</Text>
        </View>
        <View style={styles.dateBox}>
          <Text style={styles.label}>Statement period</Text>
          <Text style={styles.date}>{shortDate(summary.startDate)} – {shortDate(summary.endDate)}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.moneyRow}>
        <View style={styles.moneyCell}>
          <Text style={styles.label}>Money in</Text>
          <Text style={styles.in}>KES {money.format(summary.totalPaidIn)}</Text>
        </View>
        <View style={styles.moneyCell}>
          <Text style={styles.label}>Money out</Text>
          <Text style={styles.out}>KES {money.format(summary.totalWithdrawn)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  count: { color: colors.text, fontSize: 26, fontWeight: "900", marginTop: 2 },
  dateBox: { alignItems: "flex-end" },
  date: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 5 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  moneyRow: { flexDirection: "row" },
  moneyCell: { flex: 1 },
  in: { color: colors.primary, fontSize: 16, fontWeight: "800", marginTop: 4 },
  out: { color: colors.danger, fontSize: 16, fontWeight: "800", marginTop: 4 },
});
