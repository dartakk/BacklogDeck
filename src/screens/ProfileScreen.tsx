import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import {
    Camera,
    Flame,
    Gamepad2,
    LogOut,
    ShieldAlert,
    Sparkles,
    Trophy,
} from "lucide-react-native";
import { useCallback, useState } from "react";
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
import AnimatedBackdrop from "../components/AnimatedBackdrop";
import {
    getUserProfile,
    uploadProfileAvatar,
    UserProfile,
} from "../services/profile";
import {
    connectSteam,
    disconnectSteam,
    getSteamConnection,
    syncSteamLibrary,
    type SteamConnection,
} from "../services/steam";
import { supabase } from "../services/superbase";

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [steamConnection, setSteamConnection] =
    useState<SteamConnection | null>(null);
  const [steamBusy, setSteamBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const loadProfileData = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const userId = sessionData.session.user.id;

        const userProfile = await getUserProfile(userId);
        setProfile(userProfile);
        try {
          setSteamConnection(await getSteamConnection());
        } catch (steamError) {
          console.error("Errore recupero collegamento Steam:", steamError);
        }
      }
    } catch (err) {
      console.error("Errore caricamento profilo:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfileData();
    }, [loadProfileData]),
  );

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error("Accedi per modificare l'immagine profilo.");

      setAvatarBusy(true);
      const avatarUrl = await uploadProfileAvatar(
        user.id,
        result.assets[0].uri,
        result.assets[0].mimeType,
      );
      setProfile((currentProfile) =>
        currentProfile
          ? { ...currentProfile, avatar_url: avatarUrl }
          : currentProfile,
      );
    } catch (error) {
      console.error("Errore aggiornamento avatar:", error);
      Alert.alert(
        "Immagine non aggiornata",
        error instanceof Error ? error.message : "Riprova tra poco.",
      );
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleConnectSteam = async () => {
    setSteamBusy(true);
    try {
      const status = await connectSteam();
      if (!status) return;
      setSteamConnection(await getSteamConnection());
      Alert.alert(
        status === "connected" ? "Steam sincronizzato" : "Steam collegato",
        status === "connected"
          ? "I giochi posseduti sono stati sincronizzati."
          : "Il profilo è collegato; controlla che la libreria Steam sia pubblica e che la chiave API sia configurata.",
      );
    } catch (error) {
      console.error("Errore collegamento Steam:", error);
      Alert.alert(
        "Collegamento non riuscito",
        error instanceof Error ? error.message : "Riprova tra poco.",
      );
    } finally {
      setSteamBusy(false);
    }
  };

  const handleSyncSteam = async () => {
    setSteamBusy(true);
    try {
      const syncedCount = await syncSteamLibrary();
      setSteamConnection(await getSteamConnection());
      Alert.alert(
        "Sincronizzazione completata",
        `${syncedCount} giochi aggiornati.`,
      );
    } catch (error) {
      Alert.alert(
        "Sincronizzazione non riuscita",
        error instanceof Error ? error.message : "Riprova tra poco.",
      );
    } finally {
      setSteamBusy(false);
    }
  };

  const handleDisconnectSteam = () => {
    Alert.alert(
      "Disconnettere Steam?",
      "I giochi importati resteranno nella libreria.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Disconnetti",
          style: "destructive",
          onPress: async () => {
            setSteamBusy(true);
            try {
              await disconnectSteam();
              setSteamConnection(null);
            } catch (error) {
              Alert.alert(
                "Disconnessione non riuscita",
                error instanceof Error ? error.message : "Riprova tra poco.",
              );
            } finally {
              setSteamBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  const totalGamesCount = profile?.stats.total ?? 0;
  const progressValue = profile?.progress ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AnimatedBackdrop />
      {/* Header Profilo & Card Stile Gamer */}
      <View style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            onPress={handlePickAvatar}
            disabled={avatarBusy}
            accessibilityRole="button"
            accessibilityLabel="Cambia immagine profilo"
          >
            <Image
              source={{ uri: profile?.avatar_url }}
              style={styles.avatar}
            />
            <View style={styles.avatarEditBadge}>
              {avatarBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Camera size={14} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
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
            <Text style={styles.progressPercent}>
              Livello {profile?.level ?? 1} · {progressValue}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progressValue}%` }]}
            />
          </View>
        </View>
      </View>

      <View style={styles.steamPanel}>
        <View style={styles.steamHeader}>
          <Gamepad2 size={20} color="#C084FC" />
          <View style={styles.steamInfo}>
            <Text style={styles.steamTitle}>Steam</Text>
            <Text style={styles.steamSubtitle}>
              {steamConnection
                ? `Collegato · ${steamConnection.steam_id}`
                : "Collega il profilo per sincronizzare i giochi posseduti"}
            </Text>
          </View>
        </View>
        {steamConnection ? (
          <View style={styles.steamActions}>
            <TouchableOpacity
              style={styles.steamButton}
              onPress={handleSyncSteam}
              disabled={steamBusy}
            >
              <Text style={styles.steamButtonText}>
                {steamBusy ? "Attendi..." : "Sincronizza"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.steamDisconnectButton}
              onPress={handleDisconnectSteam}
              disabled={steamBusy}
            >
              <Text style={styles.steamDisconnectText}>Disconnetti</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.steamButton}
            onPress={handleConnectSteam}
            disabled={steamBusy}
          >
            <Text style={styles.steamButtonText}>
              {steamBusy ? "Connessione..." : "Collega Steam"}
            </Text>
          </TouchableOpacity>
        )}
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

      <View style={styles.reviewStats}>
        <Text style={styles.reviewStatsLabel}>Recensioni pubblicate</Text>
        <Text style={styles.reviewStatsCount}>{profile?.reviewCount ?? 0}</Text>
      </View>

      <TouchableOpacity
        style={styles.libraryButton}
        onPress={() => router.push("/library")}
        accessibilityRole="button"
      >
        <Gamepad2 size={18} color="#C084FC" />
        <Text style={styles.libraryButtonText}>
          Apri la libreria · {profile?.stats.total ?? 0} giochi
        </Text>
      </TouchableOpacity>

      <Text style={styles.nextLevelText}>
        {profile?.nextRankTitle
          ? `Prossimo livello: ${profile.nextRankTitle}`
          : "Hai raggiunto il livello massimo"}
      </Text>

      {/* Sezione Trofei / Obiettivi sbloccabili */}
      <Text style={styles.sectionTitle}>Obiettivi Sbloccati</Text>
      <View style={styles.achievementsRow}>
        <View
          style={[
            styles.achievementCard,
            totalGamesCount > 0 && styles.achUnlocked,
          ]}
        >
          <Trophy
            size={20}
            color={totalGamesCount > 0 ? "#FBBF24" : "#4B5563"}
          />
          <Text
            style={[styles.achTitle, totalGamesCount > 0 && { color: "#FFF" }]}
          >
            Primo Gioco
          </Text>
          <Text style={styles.achSub}>Aggiunto al database</Text>
        </View>
        <View
          style={[
            styles.achievementCard,
            totalGamesCount >= 5 && styles.achUnlocked,
          ]}
        >
          <Sparkles
            size={20}
            color={totalGamesCount >= 5 ? "#A855F7" : "#4B5563"}
          />
          <Text
            style={[styles.achTitle, totalGamesCount >= 5 && { color: "#FFF" }]}
          >
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
        <Text style={styles.logoutText}>Esci dall&apos;account</Text>
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
  avatarEditBadge: {
    alignItems: "center",
    backgroundColor: "#7C3AED",
    borderColor: "#171324",
    borderRadius: 12,
    borderWidth: 2,
    bottom: 0,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 26,
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
  steamPanel: {
    width: "100%",
    backgroundColor: "#171324",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A233D",
    padding: 14,
    marginBottom: 10,
  },
  steamHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  steamInfo: { flex: 1 },
  steamTitle: { color: "#F3F0FF", fontSize: 15, fontWeight: "700" },
  steamSubtitle: { color: "#A9A1B8", fontSize: 12, marginTop: 2 },
  steamActions: { flexDirection: "row", gap: 8 },
  steamButton: {
    alignItems: "center",
    backgroundColor: "#7C3AED",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  steamButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  steamDisconnectButton: {
    alignItems: "center",
    borderColor: "#51435E",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  steamDisconnectText: { color: "#C8C2E0", fontSize: 13, fontWeight: "600" },
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
  nextLevelText: {
    alignSelf: "flex-start",
    color: "#A9A1B8",
    fontSize: 12,
    marginTop: -10,
    marginBottom: 12,
  },
  reviewStats: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#171324",
    borderColor: "#2A233D",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  reviewStatsLabel: { color: "#C8C2E0", fontSize: 13, fontWeight: "600" },
  reviewStatsCount: { color: "#C084FC", fontSize: 18, fontWeight: "800" },
  libraryButton: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#241B3B",
    borderColor: "#4C2E8C",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginBottom: 14,
    padding: 13,
  },
  libraryButtonText: { color: "#E5E0F5", fontSize: 13, fontWeight: "700" },
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
