import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import type { StatementReconciliation } from "@/types/transaction";

const money = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const ReconciliationBanner = memo(function ReconciliationBanner({
  reconciliation,
}: {
  reconciliation: StatementReconciliation;
}) {
  if (reconciliation.status === "matched") {
    return (
      <View style={[styles.banner, styles.matched]}>
        <MaterialCommunityIcons name="shield-check" size={21} color={colors.primary} />
        <View style={styles.copy}>
          <Text style={[styles.title, styles.matchedText]}>Totals verified</Text>
          <Text style={[styles.message, styles.matchedText]}>
            Parsed money in and out match the PDF summary exactly.
          </Text>
        </View>
      </View>
    );
  }

  if (reconciliation.status === "mismatch") {
    return (
      <View style={[styles.banner, styles.mismatch]}>
        <MaterialCommunityIcons name="alert-octagon-outline" size={21} color={colors.danger} />
        <View style={styles.copy}>
          <Text style={[styles.title, styles.mismatchText]}>Export blocked: totals differ</Text>
          <Text style={[styles.message, styles.mismatchText]}>
            PDF: KES {money.format(reconciliation.declared.totalPaidIn)} in / KES{" "}
            {money.format(reconciliation.declared.totalWithdrawn)} out. Review or retry this
            statement.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.banner, styles.unavailable]}>
      <MaterialCommunityIcons name="shield-alert-outline" size={21} color={colors.warning} />
      <View style={styles.copy}>
        <Text style={[styles.title, styles.unavailableText]}>Totals could not be verified</Text>
        <Text style={[styles.message, styles.unavailableText]}>
          This statement has no recognizable summary total. Check the preview carefully before
          export.
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
  },
  copy: { flex: 1 },
  title: { fontSize: 13, fontWeight: "800" },
  message: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  matched: { backgroundColor: colors.primarySoft, borderColor: "#B7E2C7" },
  matchedText: { color: colors.primaryDark },
  mismatch: { backgroundColor: colors.dangerSoft, borderColor: "#FDA29B" },
  mismatchText: { color: colors.danger },
  unavailable: { backgroundColor: "#FFF8EB", borderColor: "#F7C97B" },
  unavailableText: { color: colors.warning },
});
