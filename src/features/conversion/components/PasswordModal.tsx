import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type Props = {
  visible: boolean;
  incorrect: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
};

export function PasswordModal({ visible, incorrect, onSubmit, onCancel }: Props) {
  const [password, setPassword] = useState("");
  const [visiblePassword, setVisiblePassword] = useState(false);

  function submit() {
    if (password.trim()) onSubmit(password.trim());
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="lock-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Statement password</Text>
          <Text style={styles.copy}>
            Enter the password used to open this statement. It may be your ID number or a
            password set when the statement was requested.
          </Text>
          <View style={[styles.inputRow, incorrect && styles.inputError]}>
            <TextInput
              autoFocus
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
              secureTextEntry={!visiblePassword}
              placeholder="Enter password"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              returnKeyType="done"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visiblePassword ? "Hide password" : "Show password"}
              onPress={() => setVisiblePassword((current) => !current)}
              hitSlop={10}
            >
              <MaterialCommunityIcons
                name={visiblePassword ? "eye-off-outline" : "eye-outline"}
                size={23}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
          {incorrect && <Text style={styles.error}>That password didn’t work. Please try again.</Text>}
          <AppButton label="Unlock statement" onPress={submit} disabled={!password.trim()} />
          <AppButton label="Cancel" onPress={onCancel} variant="ghost" />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 22, 14, 0.5)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.lg, gap: spacing.md },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text, fontSize: 23, fontWeight: "800" },
  copy: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  inputRow: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: 16, color: colors.text },
  error: { color: colors.danger, fontSize: 13 },
});
