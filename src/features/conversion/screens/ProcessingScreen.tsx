import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";
import { Screen } from "@/components/Screen";
import { PasswordModal } from "@/features/conversion/components/PasswordModal";
import { useConversion } from "@/features/conversion/ConversionContext";
import {
  PdfWebView,
  type PdfWebViewHandle,
} from "@/features/conversion/pdf/PdfWebView";
import { parseMpesaStatement } from "@/features/conversion/services/mpesaParser";
import { colors } from "@/theme/colors";
import type { PdfBridgeMessage } from "@/types/pdf";

export function ProcessingScreen() {
  const router = useRouter();
  const { document, setTransactions, setError } = useConversion();
  const pdfRef = useRef<PdfWebViewHandle>(null);
  const base64Ref = useRef("");
  const [fileReady, setFileReady] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [incorrectPassword, setIncorrectPassword] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [label, setLabel] = useState("Preparing your statement…");

  useEffect(() => {
    if (!document) {
      router.replace("/");
      return;
    }

    let active = true;
    readAsStringAsync(document.uri, { encoding: EncodingType.Base64 })
      .then((value) => {
        if (active) {
          base64Ref.current = value;
          setFileReady(true);
        }
      })
      .catch(() => fail("We couldn’t read the selected PDF."));

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [document]);

  useEffect(() => {
    if (bridgeReady && fileReady && base64Ref.current) {
      setLabel("Opening your PDF securely…");
      pdfRef.current?.open(base64Ref.current);
    }
  }, [bridgeReady, fileReady]);

  useEffect(() => {
    if (!bridgeReady || !fileReady || passwordVisible || progress.current > 0) return;

    const timeout = setTimeout(() => {
      fail(
        "The PDF reader did not respond in time. Please return and try opening the statement again.",
      );
    }, 20_000);

    return () => clearTimeout(timeout);
  }, [bridgeReady, fileReady, passwordVisible, progress.current]);

  function fail(message: string) {
    setError(message);
    router.replace("/error");
  }

  function handleMessage(message: PdfBridgeMessage) {
    switch (message.type) {
      case "READY":
        setBridgeReady(true);
        break;
      case "PASSWORD_REQUIRED":
        setIncorrectPassword(false);
        setPasswordVisible(true);
        break;
      case "PASSWORD_INCORRECT":
        setIncorrectPassword(true);
        setPasswordVisible(true);
        break;
      case "PROGRESS":
        setProgress({ current: message.current, total: message.total });
        setLabel(`Reading page ${message.current} of ${message.total}…`);
        break;
      case "EXTRACTED": {
        const itemCount = message.pages.reduce((total, page) => total + page.length, 0);
        if (!itemCount) {
          fail("This PDF has no readable text. It may be a scanned or image-based statement.");
          return;
        }
        setLabel("Organizing your transactions…");
        const parsed = parseMpesaStatement(message.pages);
        if (!parsed.length) {
          fail("We couldn’t find M-PESA transactions in this PDF. Check that it is a valid statement.");
          return;
        }
        setTransactions(parsed);
        router.replace("/preview");
        break;
      }
      case "ERROR":
        fail(message.message || "The statement could not be processed.");
        break;
    }
  }

  function submitPassword(password: string) {
    setPasswordVisible(false);
    setIncorrectPassword(false);
    setLabel("Unlocking your statement…");
    pdfRef.current?.open(base64Ref.current, password);
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.center}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="file-search-outline" size={46} color={colors.primary} />
        </View>
        <Text style={styles.title}>Processing statement</Text>
        <Text style={styles.label}>{label}</Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        {progress.total > 0 && (
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${(progress.current / progress.total) * 100}%` }]}
            />
          </View>
        )}
        <View style={styles.privacy}>
          <MaterialCommunityIcons name="shield-lock-outline" size={19} color={colors.primary} />
          <Text style={styles.privacyText}>Everything is happening privately on your device</Text>
        </View>
      </View>
      <PdfWebView ref={pdfRef} onMessage={handleMessage} />
      <PasswordModal
        visible={passwordVisible}
        incorrect={incorrectPassword}
        onSubmit={submitPassword}
        onCancel={() => router.replace("/")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "center" },
  center: { alignItems: "center" },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text, fontSize: 25, fontWeight: "900", marginTop: 24 },
  label: { color: colors.textMuted, fontSize: 15, marginTop: 10, textAlign: "center" },
  spinner: { marginTop: 28 },
  progressTrack: {
    width: "80%",
    height: 7,
    backgroundColor: colors.border,
    borderRadius: 7,
    marginTop: 24,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 7 },
  privacy: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 40 },
  privacyText: { color: colors.primaryDark, fontSize: 13 },
});
