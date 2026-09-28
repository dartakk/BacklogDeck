import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Image } from "react-native";
import { supabase } from "../services/superbase";

export default function CommunityScreen() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunityReviews();
  }, []);

  const fetchCommunityReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews") // Tabella delle recensioni nel database
        .select(`
          id,
          rating,
          content,
          created_at,
          profiles (username, avatar_url),
          games (title, cover_url)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Errore nel recupero della community:", error.message);
      } else {
        setReviews(data || []);
      }
    } catch (err) {
      console.error("Errore imprevisto:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌐 Community Feed</Text>
      <Text style={styles.subtitle}>Scopri cosa stanno giocando e recensendo gli altri utenti.</Text>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.headerRow}>
              <Image
                source={{ uri: item.profiles?.avatar_url || "https://via.placeholder.com/100" }}
                style={styles.avatar}
              />
              <View style={styles.userInfo}>
                <Text style={styles.username}>{item.profiles?.username || "Utente Anonimo"}</Text>
                <Text style={styles.gameTitle}>ha recensito {item.games?.title || "un gioco"}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>⭐ {item.rating}/5</Text>
              </View>
            </View>

            {item.games?.cover_url && (
              <Image source={{ uri: item.games.cover_url }} style={styles.gameCover} />
            )}

            <Text style={styles.content}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Ancora nessuna recensione nella community.</Text>
            <Text style={styles.emptySubtext}>Sii il primo a condividere un parere!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121214", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121214" },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4, marginTop: 10 },
  subtitle: { fontSize: 14, color: "#a1a1aa", marginBottom: 20 },
  reviewCard: {
    backgroundColor: "#1a1a1e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2a2a32",
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: "#3f3f46" },
  userInfo: { flex: 1 },
  username: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  gameTitle: { color: "#a1a1aa", fontSize: 13 },
  ratingBadge: { backgroundColor: "#27272a", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { color: "#f59e0b", fontWeight: "bold", fontSize: 12 },
  gameCover: { width: "100%", height: 140, borderRadius: 10, marginBottom: 12, resizeMode: "cover" },
  content: { color: "#e4e4e7", fontSize: 14, lineHeight: 20 },
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyText: { color: "#fff", fontSize: 16, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
  emptySubtext: { color: "#a1a1aa", fontSize: 14, textAlign: "center" },
});