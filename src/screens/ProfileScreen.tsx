import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Flame, Gamepad2, LogOut, ShieldAlert, Sparkles, Trophy } from "lucide-react-native";
import { getUserProfile, UserProfile } from "../services/profile";
import { supabase } from "../services/superbase";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [totalGamesCount, setTotalGamesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const userId = sessionData.session.user.id;

        const userProfile = await getUserProfile(userId);
        setProfile(userProfile);

        // Controllo rapido per gli obiettivi basati sui giochi
        const { count } = await supabase
          .from("user_games")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        setTotalGamesCount(count || 0);
      }
    } catch (err) {
      console.error("Errore caricamento profilo:", err);
    } finally {
      setLoading(false);
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
            <View style={[styles.progressBarFill, { width: `${progressValue}%` }]} />
          </View>
        </View>
      </View>

      {/* Sezione Statistiche Dettagliate */}
      <Text style={styles.sectionTitle}>Statistiche Generali</Text>
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
        <View style={[styles.achievementCard, totalGamesCount > 0 && styles.achUnlocked]}>
          <Trophy size={20} color={totalGamesCount > 0 ? "#FBBF24" : "#4B5563"} />
          <Text style={[styles.achTitle, totalGamesCount > 0 && { color: "#FFF" }]}>
            Primo Gioco
          </Text>
          <Text style={styles.achSub}>Aggiunto al database</Text>
        </View>
        <View style={[styles.achievementCard, totalGamesCount >= 5 && styles.achUnlocked]}>
          <Sparkles size={20} color={totalGamesCount >= 5 ? "#A855F7" : "#4B5563"} />
          <Text style={[styles.achTitle, totalGamesCount >= 5 && { color: "#FFF" }]}>
            Collezionista
          </Text>
          <Text style={styles.achSub}>5+ giochi salvati</Text>
        </View>
      </View>

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
    opacity: 0.5,
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