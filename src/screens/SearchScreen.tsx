import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { RAWGGame, searchGames } from "../services/rawg";
import { addGameToUserLibrary } from "../services/superbase";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [games, setGames] = useState<RAWGGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const results = await searchGames(query);
    setGames(results);
    setLoading(false);
  };

  const handleAddGame = async (game: RAWGGame) => {
    setAddingId(game.id);
    // User ID temporaneo per il test (sostituiremo con l'Auth reale nella prossima fase)
    const mockUserId = "00000000-0000-0000-0000-000000000000";

    const result = await addGameToUserLibrary(mockUserId, game, "backlog");
    setAddingId(null);

    if (result.success) {
      Alert.alert(
        "Successo!",
        `"${game.name}" è stato aggiunto al tuo Backlog!`,
      );
    } else {
      Alert.alert("Errore", "Impossibile salvare il gioco. Riprova più tardi.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BacklogDeck Search</Text>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Cerca un gioco..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Cerca</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#00ffcc"
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.background_image ? (
                <Image
                  source={{ uri: item.background_image }}
                  style={styles.cover}
                />
              ) : (
                <View style={[styles.cover, styles.noImage]} />
              )}
              <View style={styles.info}>
                <Text style={styles.gameTitle}>{item.name}</Text>
                <Text style={styles.gameSub}>
                  Uscita: {item.released || "N/D"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddGame(item)}
                disabled={addingId === item.id}
              >
                {addingId === item.id ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.addButtonText}>+ Add</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: "row",
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: "#1C1C1E",
    color: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
  },
  button: {
    backgroundColor: "#00ffcc",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  buttonText: {
    color: "#000000",
    fontWeight: "bold",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#121212",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
    alignItems: "center",
  },
  cover: {
    width: 70,
    height: 90,
  },
  noImage: {
    backgroundColor: "#2C2C2E",
  },
  info: {
    flex: 1,
    padding: 12,
  },
  gameTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  gameSub: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: "#00ffcc",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 12,
  },
  addButtonText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 12,
  },
});
