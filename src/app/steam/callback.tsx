import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SteamCallbackScreen() {
  const router = useRouter();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const connected = status === "connected" || status === "linked";

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>BACKLOGDECK · STEAM</Text>
      <Text style={styles.title}>
        {status === "connected"
          ? "Libreria sincronizzata"
          : status === "linked"
            ? "Account collegato"
            : "Collegamento non completato"}
      </Text>
      <Text style={styles.message}>
        {status === "connected"
          ? "I giochi Steam sono disponibili nel tuo profilo."
          : status === "linked"
            ? "Controlla che il profilo Steam sia pubblico e che la chiave API sia configurata."
            : "Puoi tornare al profilo e riprovare quando vuoi."}
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/profile")}
      >
        <Text style={styles.buttonText}>
          {connected ? "Vai al profilo" : "Torna al profilo"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#07050D",
  },
  eyebrow: {
    color: "#C084FC",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: "#F3F0FF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  message: {
    color: "#B8B0C7",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 340,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#7C3AED",
    borderRadius: 8,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
