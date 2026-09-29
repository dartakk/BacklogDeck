import {
  Flame,
  Gamepad2,
  LogOut,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  Trophy,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getUserProfile, UserProfile } from "../services/profile";
import { supabase } from "../services/superbase";

interface UserGame {
  id: string;
  game_id: string;
  title: string;
  cover_url: string;
  rating: number;
  status: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedGames, setSavedGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileAndLibrary();
  }, []);

  const loadProfileAndLibrary = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const userId = sessionData.session.user.id;

        // Carica profilo e rank dinamico
        const userProfile = await getUserProfile(userId);
        setProfile(userProfile);

        // Carica la libreria giochi dell'utente
        const { data: libraryData, error } = await supabase
          .from("user_games")
          .select("*")
          .eq("user_id", userId);

        if (libraryData && !error) {
          setSavedGames(libraryData);
        }
      }
    } catch (err) {
      console.error("Errore caricamento dati profilo:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeGame = async (gameId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) return;

      const { error } = await supabase
        .from("user_games")
        .delete()
        .eq("user_id", sessionData.session.user.id)
        .eq("game_id", gameId);

      if (!error) {
        setSavedGames(savedGames.filter((g) => g.game_id !== gameId));
      }
    } catch (err) {
      console.error("Errore rimozione gioco:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  const progressValue = Number((profile as any)?.progress || 10);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Profilo & Card Stile Gamer */}
      <View style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: profile?.avatar_url }} style={styles.avatar} />
          <View style={styles.onlineDot} />
        </View>

        <Text style={styles.username}>{profile?.username}</Text>
        <Text style={styles.bio}>{profile?.bio}</Text>

        {/* Badge Rank con Effetto Neon */}
        <View style={styles.rankBadge}>
          <Sparkles size={14} color="#C084FC" />
          <Text style={styles.rankText}>{profile?.rankTitle}</Text>
        </View>

        {/* Barra di Progresso Backlog Meter */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabelText}>Backlog Meter Power</Text>
            <Text style={styles.progressPercent}>{progressValue}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progressValue}%` }]}
            />
          </View>
        </View>
      </View>

      {/* Sezione Statistiche Dettagliate */}
      <Text style={styles.sectionTitle}>Statistiche Libreria</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Gamepad2 size={18} color="#A855F7" />
          <Text style={styles.statNumber}>{profile?.stats.total || 0}</Text>
          <Text style={styles.statLabel}>Totali</Text>
        </View>
        <View style={styles.statBox}>
          <ShieldAlert size={18} color="#38bdf8" />
          <Text style={[styles.statNumber, { color: "#38bdf8" }]}>
            {profile?.stats.backlog || 0}
          </Text>
          <Text style={styles.statLabel}>Backlog</Text>
        </View>
        <View style={styles.statBox}>
          <Flame size={18} color="#facc15" />
          <Text style={[styles.statNumber, { color: "#facc15" }]}>
            {profile?.stats.playing || 0}
          </Text>
          <Text style={styles.statLabel}>In Corso</Text>
        </View>
        <View style={styles.statBox}>
          <Trophy size={18} color="#4ade80" />
          <Text style={[styles.statNumber, { color: "#4ade80" }]}>
            {profile?.stats.completed || 0}
          </Text>
          <Text style={styles.statLabel}>Completati</Text>
        </View>
      </View>

      {/* Sezione Trofei / Obiettivi sbloccabili */}
      <Text style={styles.sectionTitle}>Obiettivi Sbloccati</Text>
      <View style={styles.achievementsRow}>
        <View style={styles.achievementCard}>
          <Trophy size={20} color="#FBBF24" />
          <Text style={styles.achTitle}>Primo Gioco</Text>
          <Text style={styles.achSub}>Aggiunto al database</Text>
        </View>
        <View
          style={[
            styles.achievementCard,
            savedGames.length >= 5 && styles.achUnlocked,
          ]}
        >
          <Sparkles
            size={20}
            color={savedGames.length >= 5 ? "#A855F7" : "#4B5563"}
          />
          <Text
            style={[
              styles.achTitle,
              savedGames.length >= 5 && { color: "#FFF" },
            ]}
          >
            Collezionista
          </Text>
          <Text style={styles.achSub}>5+ giochi salvati</Text>
        </View>
      </View>

      {/* Sezione Lista Giochi Salvati nella Libreria */}
      <Text style={styles.sectionTitle}>
        La mia Libreria ({savedGames.length})
      </Text>
      {savedGames.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Gamepad2 size={36} color="#4B5563" />
          <Text style={styles.emptyText}>
            La tua libreria è vuota. Cerca un gioco nella sezione esplora per
            iniziare ad accumularli!
          </Text>
        </View>
      ) : (
        savedGames.map((item) => (
          <View key={String(item.game_id)} style={styles.gameCard}>
            <Image
              source={{
                uri:
                  item.cover_url ||
                  "https://via.placeholder.com/150x200?text=No+Cover",
              }}
              style={styles.coverImage}
            />
            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.gameStatus}>
                Stato: <Text style={styles.statusHighlight}>{item.status}</Text>
              </Text>
              {!!item.rating && item.rating > 0 && (
                <View style={styles.ratingContainer}>
                  <Star size={13} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => removeGame(item.game_id)}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Pulsante di Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => supabase.auth.signOut()}
      >
        <LogOut size={18} color="#f87171" />
        <Text style={styles.logoutText}>Esci dall'Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0B14" },
  content: { padding: 16, paddingBottom: 40, alignItems: "center" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D0B14",
  },
  headerCard: {
    width: "100%",
    backgroundColor: "#171324",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A233D",
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "#A855F7",
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4ADE80",
    borderWidth: 2,
    borderColor: "#171324",
  },
  username: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  bio: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.4)",
    marginBottom: 16,
  },
  rankText: { color: "#C084FC", fontWeight: "bold", fontSize: 12 },
  progressContainer: {
    width: "100%",
    backgroundColor: "#0D0B14",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A233D",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabelText: { color: "#9CA3AF", fontSize: 11, fontWeight: "600" },
  progressPercent: { color: "#A855F7", fontSize: 11, fontWeight: "bold" },
  progressBarBg: {
    width: "100%",
    height: 6,
    backgroundColor: "#2A233D",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#A855F7",
    borderRadius: 3,
  },
  sectionTitle: {
    width: "100%",
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    marginTop: 10,
  },
  statsGrid: { width: "100%", flexDirection: "row", gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: "#171324",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A233D",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: { fontSize: 10, color: "#9CA3AF" },
  achievementsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  achievementCard: {
    flex: 1,
    backgroundColor: "#171324",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A233D",
    alignItems: "center",
    opacity: 0.6,
  },
  achUnlocked: {
    opacity: 1,
    borderColor: "rgba(168, 85, 247, 0.4)",
  },
  achTitle: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 6,
  },
  achSub: { color: "#6B7280", fontSize: 10, marginTop: 2 },
  emptyContainer: {
    width: "100%",
    backgroundColor: "#171324",
    padding: 24,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A233D",
    marginBottom: 16,
  },
  emptyText: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  gameCard: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#171324",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A233D",
  },
  coverImage: {
    width: 50,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#2A233D",
  },
  gameInfo: {
    flex: 1,
    marginLeft: 12,
  },
  gameTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  gameStatus: {
    color: "#9CA3AF",
    fontSize: 11,
    marginBottom: 4,
  },
  statusHighlight: {
    color: "#A855F7",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    color: "#FBBF24",
    fontSize: 11,
    fontWeight: "700",
  },
  deleteButton: {
    padding: 10,
    backgroundColor: "#2A233D",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  logoutButton: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginTop: 14,
  },
  logoutText: { color: "#f87171", fontWeight: "bold", fontSize: 14 },
});
