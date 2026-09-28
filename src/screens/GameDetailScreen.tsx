import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getGameDetails } from "@/services/rawg";
import {
  addGameToLibrary,
  getUserLibrary,
  removeGameFromLibrary,
  updateGameStatus,
} from "@/services/superbase";

const mockUserId = "00000000-0000-0000-0000-000000000000";

type StatusType = "backlog" | "playing" | "completed" | "dropped";

interface GameDetailProps {
  id?: string | number;
  gameId?: string | number;
}

export default function GameDetailScreen(props: GameDetailProps) {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ id: string }>();

  const rawId = props.gameId || props.id || searchParams.id;
  const gameId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [libraryItem, setLibraryItem] = useState<any>(null);

  useEffect(() => {
    console.log("ID RICEVUTO:", gameId, "TIPO:", typeof gameId);
    if (gameId) {
      loadGameData();
    } else {
      setLoading(false);
    }
  }, [gameId]);

  const loadGameData = async () => {
    try {
      setLoading(true);
      const parsedId = typeof gameId === "string" ? parseInt(gameId, 10) : gameId;

      if (!parsedId || isNaN(parsedId)) {
        console.warn("ID non valido o NaN:", gameId);
        setLoading(false);
        return;
      }

      const details = await getGameDetails(parsedId);
      setGame(details);

      const library = await getUserLibrary(mockUserId);
      if (Array.isArray(library)) {
        const existing = library.find(
          (item: any) =>
            item.game_id === parsedId ||
            item.games?.id === parsedId ||
            item.id === String(parsedId)
        );
        setLibraryItem(existing || null);
      }
    } catch (error: any) {
      console.error("Errore recupero dettaglio:", error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async (status: StatusType) => {
    if (!game) return;

    if (libraryItem) {
      const success = await updateGameStatus(libraryItem.id, status);
      if (success) {
        Alert.alert("Aggiornato", `Stato cambiato in ${status.toUpperCase()}`);
        loadGameData();
      } else {
        Alert.alert("Errore", "Impossibile aggiornare lo stato.");
      }
    } else {
      const success = await addGameToLibrary(
        mockUserId,
        game.id,
        game.name,
        game.background_image,
        game.released || "",
        status
      );
      if (success) {
        Alert.alert("Aggiunto", `"${game.name}" aggiunto come ${status.toUpperCase()}`);
        loadGameData();
      } else {
        Alert.alert("Errore", "Impossibile aggiungere il gioco.");
      }
    }
  };

  const handleRemove = async () => {
    if (!libraryItem) return;
    const success = await removeGameFromLibrary(libraryItem.id);
    if (success) {
      Alert.alert("Rimosso", "Gioco rimosso dal tuo backlog.");
      setLibraryItem(null);
    } else {
      Alert.alert("Errore", "Impossibile rimuovere il gioco.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00B4D8" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Gioco non trovato.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Torna indietro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {game.background_image ? (
        <Image source={{ uri: game.background_image }} style={styles.coverImage} />
      ) : (
        <View style={[styles.coverImage, styles.placeholder]} />
      )}

      <Text style={styles.title}>{game.name}</Text>

      {game.released && (
        <Text style={styles.releaseDate}>Uscita: {game.released}</Text>
      )}

      {game.description_raw && (
        <Text style={styles.description}>{game.description_raw}</Text>
      )}

      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Gestisci nel tuo Backlog:</Text>

        <View style={styles.buttonGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#FFB703" }]}
            onPress={() => handleAddOrUpdate("playing")}
          >
            <Text style={styles.btnText}>In Corso</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#00B4D8" }]}
            onPress={() => handleAddOrUpdate("backlog")}
          >
            <Text style={styles.btnText}>In Backlog</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#38B000" }]}
            onPress={() => handleAddOrUpdate("completed")}
          >
            <Text style={styles.btnText}>Completato</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#E63946" }]}
            onPress={() => handleAddOrUpdate("dropped")}
          >
            <Text style={styles.btnText}>Abbandonato</Text>
          </TouchableOpacity>
        </View>

        {libraryItem && (
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
            <Text style={styles.removeBtnText}>Elimina dalla Libreria</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  coverImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  placeholder: {
    backgroundColor: "#2A2A2A",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  releaseDate: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 20,
    marginBottom: 24,
  },
  actionsContainer: {
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  actionBtn: {
    width: "48%",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  removeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E63946",
    borderRadius: 8,
    alignItems: "center",
  },
  removeBtnText: {
    color: "#E63946",
    fontWeight: "bold",
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#00B4D8",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});