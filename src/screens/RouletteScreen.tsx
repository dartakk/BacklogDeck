import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { getUserLibrary } from "../services/superbase";
import { supabase } from "../services/superbase";

export default function RouletteScreen() {
  const [backlogGames, setBacklogGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(true);
  const spinAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadBacklog();
  }, []);

  const loadBacklog = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      const library = await getUserLibrary(sessionData.session.user.id);
      // Filtra solo i giochi nello stato "backlog"
      const backlog = library.filter((item: any) => item.status === "backlog");
      setBacklogGames(backlog);
    }
    setLoading(false);
  };

  const spinRoulette = () => {
    if (backlogGames.length === 0) return;

    setSpinning(true);
    
    // Animazione di rotazione/rimbalzo
    spinAnim.setValue(0);
    Animated.sequence([
      Animated.timing(spinAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ]).start(() => {
      // Estrae un gioco casuale dal backlog
      const randomIndex = Math.floor(Math.random() * backlogGames.length);
      setSelectedGame(backlogGames[randomIndex]);
      setSpinning(false);
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (backlogGames.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Il tuo backlog è vuoto!</Text>
        <Text style={styles.emptySubtext}>Aggiungi qualche gioco dalla ricerca per far girare la roulette.</Text>
      </View>
    );
  }

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎲 Backlog Roulette</Text>
      <Text style={styles.subtitle}>Non sai cosa giocare? Lascia decidere al destino.</Text>

      <View style={styles.cardContainer}>
        {selectedGame ? (
          <Animated.View style={[styles.gameCard, { transform: [{ rotate: spinInterpolate }] }]}>
            <Image
              source={{ uri: selectedGame.games?.cover_url || "https://via.placeholder.com/300" }}
              style={styles.cover}
            />
            <Text style={styles.gameTitle}>{selectedGame.games?.title}</Text>
          </Animated.View>
        ) : (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>🎮 Pronto a girare?</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.spinButton, spinning && styles.disabledButton]}
        onPress={spinRoulette}
        disabled={spinning}
      >
        <Text style={styles.spinButtonText}>
          {spinning ? "Estrazione in corso..." : "Gira la Roulette!"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121214", padding: 20, justifyContent: "center", alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121214", padding: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff", marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#a1a1aa", marginBottom: 32, textAlign: "center" },
  cardContainer: { width: "100%", height: 350, justifyContent: "center", alignItems: "center", marginBottom: 32 },
  gameCard: {
    width: "80%",
    height: "100%",
    backgroundColor: "#1a1a1e",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#6366f1",
    alignItems: "center",
    elevation: 8,
  },
  placeholderCard: {
    width: "80%",
    height: "100%",
    backgroundColor: "#1a1a1e",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a32",
    borderStyle: "dashed",
  },
  placeholderText: { color: "#71717a", fontSize: 18, fontWeight: "bold" },
  cover: { width: "100%", height: "75%" },
  gameTitle: { color: "#fff", fontSize: 16, fontWeight: "bold", textAlign: "center", padding: 12 },
  spinButton: {
    backgroundColor: "#6366f1",
    width: "100%",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  disabledButton: { backgroundColor: "#3f3f46" },
  spinButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  emptyText: { color: "#fff", fontSize: 20, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  emptySubtext: { color: "#a1a1aa", fontSize: 14, textAlign: "center" },
});