import {
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface AffiliateLinksProps {
  gameTitle: string;
}

export default function AffiliateLinks({ gameTitle }: AffiliateLinksProps) {
  const openAffiliateLink = async (store: string) => {
    let url = "";
    const encodedTitle = encodeURIComponent(gameTitle);
    const amazonTag = process.env.EXPO_PUBLIC_AMAZON_ASSOCIATES_TAG?.trim();

    switch (store) {
      case "amazon":
        url = `https://www.amazon.it/s?k=${encodedTitle}`;
        if (amazonTag) url += `&tag=${encodeURIComponent(amazonTag)}`;
        break;
      case "instant-gaming":
        url =
          "https://www.instant-gaming.com/it/ricerca/?query=" + encodedTitle;
        break;
      case "steam":
        url = "https://store.steampowered.com/search/?term=" + encodedTitle;
        break;
      default:
        return;
    }

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.error("Impossibile aprire il link: " + url);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛒 Trova il gioco al miglior prezzo</Text>
      <Text style={styles.subtitle}>
        Confronta disponibilità e acquista dal tuo store preferito.
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.storeButton, styles.amazon]}
          onPress={() => openAffiliateLink("amazon")}
        >
          <Text style={styles.buttonText}>Amazon</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.storeButton, styles.instantGaming]}
          onPress={() => openAffiliateLink("instant-gaming")}
        >
          <Text style={styles.buttonText}>Instant Gaming</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.storeButton, styles.steam]}
          onPress={() => openAffiliateLink("steam")}
        >
          <Text style={styles.buttonText}>Steam</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1a1a1e",
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#2a2a32",
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#a1a1aa", fontSize: 12, marginBottom: 12 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  storeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  amazon: { backgroundColor: "#f59e0b" },
  instantGaming: { backgroundColor: "#6366f1" },
  steam: { backgroundColor: "#27272a" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});
