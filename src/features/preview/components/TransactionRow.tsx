import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import type { Transaction } from "@/types/transaction";

const money = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const date = new Date(transaction.date);
  const dateText = Number.isNaN(date.getTime())
    ? transaction.date
    : date.toLocaleString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  const incoming = transaction.paidIn !== null && transaction.paidIn !== 0;
  const amount = Math.abs(
    incoming ? (transaction.paidIn ?? 0) : (transaction.withdrawn ?? 0),
  );

  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <Text style={styles.receipt}>{transaction.receiptNo}</Text>
        <Text style={[styles.amount, incoming ? styles.in : styles.out]}>
          {incoming ? "+" : "−"} KES {money.format(amount)}
        </Text>
      </View>
      <Text numberOfLines={2} style={styles.details}>{transaction.details || "M-PESA transaction"}</Text>
      <View style={styles.bottom}>
        <Text style={styles.meta}>{dateText}</Text>
        <Text style={styles.balance}>Balance: {money.format(transaction.balance)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  top: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  receipt: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  amount: { fontSize: 14, fontWeight: "900" },
  in: { color: colors.primary },
  out: { color: colors.danger },
  details: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: "600", marginTop: 8 },
  bottom: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 10 },
  meta: { color: colors.textMuted, fontSize: 11, flex: 1 },
  balance: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
});
