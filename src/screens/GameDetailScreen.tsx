import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/superbase";

interface GameDetailData {
  id: string;
  status: "backlog" | "playing" | "completed" | "dropped";
  rating?: number;
  notes?: string;
  games: {
    id: number;
    title: string;
    cover_url: string;
    release_date: string;
  };
}

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [item, setItem] = useState<GameDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGameDetails();
    }
  }, [id]);

  const fetchGameDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_games")
      .select("*, games(*)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Errore recupero dettaglio:", error.message);
    } else if (data) {
      setItem(data as unknown as GameDetailData);
      setRating(data.rating || 0);
      setNotes(data.notes || "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_games")
      .update({ rating, notes })
      .eq("id", item.id);

    setSaving(false);
    if (error) {
      Alert.alert("Errore", "Impossibile salvare i dettagli.");
    } else {
      Alert.alert("Salvato!", "Valutazione e note aggiornate con successo.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00B4D8" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: "#FFF" }}>Gioco non trovato.</Text>
      </View>
    );
  }

  const game = item.games;

  return (
    <ScrollView style={styles.container}>
      {/* Copertina / Banner */}
      <View style={styles.imageContainer}>
        {game.cover_url ? (
          <Image source={{ uri: game.cover_url }} style={styles.bannerImage} />
        ) : (
          <View style={[styles.bannerImage, { backgroundColor: "#333" }]} />
        )}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{game.title}</Text>
        <Text style={styles.releaseDate}>
          Data d'uscita: {game.release_date || "N/D"}
        </Text>

        <View style={styles.divider} />

        {/* Valutazione a Stelle */}
        <Text style={styles.sectionTitle}>La tua Valutazione</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={32}
                color="#FFB703"
                style={{ marginRight: 8 }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Note e Recensione */}
        <Text style={styles.sectionTitle}>Note e Recensione Personale</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Scrivi qui i tuoi pensieri, ore di gioco, trofei..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
        />

        {/* Pulsante Salva */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Salva Modifiche</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 250,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  backButton: {
    position: "absolute",
    top: 45,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 20,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  releaseDate: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#2C2C2C",
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  notesInput: {
    backgroundColor: "#1E1E1E",
    color: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 100,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#00B4D8",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});