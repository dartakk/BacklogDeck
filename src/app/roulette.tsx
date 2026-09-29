import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/superbase";

const { width } = Dimensions.get("window");

interface GameItem {
  id: string;
  title: string;
  cover_url: string;
}

export default function RouletteScreen() {
  const [backlogGames, setBacklogGames] = useState<GameItem[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const spinAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    fetchBacklog();
  }, []);

  const fetchBacklog = async () => {
    try {
      setLoading(true);
      console.log("Recupero giochi dal database...");

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      // Query sicura senza la colonna genres
      let query = supabase.from("user_library").select(`
          status,
          games:game_id (
            id,
            title,
            cover_url
          )
        `);

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Errore Supabase:", error);
        throw error;
      }

      if (data && data.length > 0) {
        const gamesList = data
          .map((item: any) => item.games)
          .filter((g: any) => g !== null && g !== undefined);

        setBacklogGames(gamesList);
        if (gamesList.length > 0) {
          setSelectedGame(gamesList[0]);
        }
      } else {
        setBacklogGames([]);
      }
    } catch (err) {
      console.error("Errore critico in fetchBacklog:", err);
    } finally {
      setLoading(false);
    }
  };

  const spinRoulette = () => {
    if (backlogGames.length === 0) return;

    setSpinning(true);

    Animated.sequence([
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(spinAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const randomIndex = Math.floor(Math.random() * backlogGames.length);
      setSelectedGame(backlogGames[randomIndex]);
      setSpinning(false);
    });
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00B4D8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="game-controller" size={28} color="#00B4D8" />
        <Text style={styles.headerTitle}>Backlog Roulette</Text>
        <Text style={styles.subtitle}>Non sai cosa giocare? Fai girare la ruota!</Text>
      </View>

      {backlogGames.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="albums-outline" size={64} color="#555" />
          <Text style={styles.emptyTitle}>Il tuo backlog è vuoto!</Text>
          <Text style={styles.emptySubtitle}>
            Aggiungi qualche gioco dalla ricerca per far girare la roulette.
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.gameCard,
              { transform: [{ rotate: spinInterpolate }] },
            ]}
          >
            {selectedGame?.cover_url ? (
              <Image
                source={{ uri: selectedGame.cover_url }}
                style={styles.coverImage}
              />
            ) : (
              <View style={[styles.coverImage, styles.placeholderCover]}>
                <Ionicons name="image-outline" size={40} color="#888" />
              </View>
            )}
            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle} numberOfLines={2}>
                {selectedGame?.title || "Seleziona un gioco"}
              </Text>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
            onPress={spinRoulette}
            disabled={spinning}
          >
            <Ionicons name="shuffle" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.spinButtonText}>
              {spinning ? "Estrazione in corso..." : "Estrai il prossimo gioco!"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  gameCard: {
    width: width - 80,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00B4D8",
    overflow: "hidden",
    alignItems: "center",
    shadowColor: "#00B4D8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 40,
  },
  coverImage: {
    width: "100%",
    height: 320,
    resizeMode: "cover",
  },
  placeholderCover: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222",
  },
  gameInfo: {
    padding: 20,
    width: "100%",
    alignItems: "center",
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  spinButton: {
    flexDirection: "row",
    backgroundColor: "#00B4D8",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#00B4D8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
  spinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});