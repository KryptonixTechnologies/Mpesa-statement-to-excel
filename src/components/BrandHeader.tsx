import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";

export function BrandHeader() {
  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        <MaterialCommunityIcons name="file-excel" size={25} color={colors.white} />
      </View>
      <Text style={styles.name}>Statement to Excel Kenya</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 18, fontWeight: "800", color: colors.text },
});
