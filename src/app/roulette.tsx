import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import AnimatedBackdrop from "../components/AnimatedBackdrop";
import { getUserLibrary, supabase } from "../services/superbase";

const { width } = Dimensions.get("window");

interface GameItem {
  id: number;
  title: string;
  cover_url: string;
  genres: string[];
  status: string;
  session_minutes: number | null;
}

const MOOD_GENRES: Record<string, string[]> = {
  relax: ["casual", "puzzle", "simulation", "indie", "family"],
  story: ["adventure", "rpg", "role-playing", "narrative"],
  energy: ["action", "shooter", "racing", "sports", "fighting"],
  strategy: ["strategy", "tactical", "turn-based", "management"],
};

export default function RouletteScreen() {
  const [libraryGames, setLibraryGames] = useState<GameItem[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("backlog");
  const [selectedMood, setSelectedMood] = useState("any");
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const spinAnim = useState(new Animated.Value(0))[0];

  const fetchBacklog = useCallback(async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        setLibraryGames([]);
        setSelectedGame(null);
        return;
      }

      const library = await getUserLibrary(userId);
      const gamesList = library.flatMap((entry: any) =>
        entry.games
          ? [
              {
                id: entry.game_id,
                title: entry.games.title,
                cover_url: entry.games.cover_url,
                genres: entry.games.genres ?? [],
                status: entry.status,
                session_minutes: entry.session_minutes ?? null,
              },
            ]
          : [],
      );

      setLibraryGames(gamesList);
      setSelectedGame(
        gamesList.find((game) => game.status === "backlog") ??
          gamesList[0] ??
          null,
      );
    } catch (err) {
      console.error("Errore critico in fetchBacklog:", err);
      setLibraryGames([]);
      setSelectedGame(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchBacklog();
    }, [fetchBacklog]),
  );

  const filteredGames = libraryGames.filter((game) => {
    if (selectedStatus !== "all" && game.status !== selectedStatus)
      return false;
    if (
      timeLimit !== null &&
      (!game.session_minutes || game.session_minutes > timeLimit)
    ) {
      return false;
    }
    if (selectedMood !== "any") {
      const targetGenres = MOOD_GENRES[selectedMood] ?? [];
      if (
        !game.genres.some((genre) =>
          targetGenres.some((target) => genre.toLowerCase().includes(target)),
        )
      ) {
        return false;
      }
    }
    return true;
  });

  const displayGame =
    filteredGames.find((game) => game.id === selectedGame?.id) ??
    filteredGames[0] ??
    null;

  const spinRoulette = () => {
    if (filteredGames.length === 0) return;

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
      const randomIndex = Math.floor(Math.random() * filteredGames.length);
      setSelectedGame(filteredGames[randomIndex]);
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
      <AnimatedBackdrop />
      <View style={styles.header}>
        <Ionicons name="game-controller" size={28} color="#C084FC" />
        <Text style={styles.headerTitle}>Roulette</Text>
        <Text style={styles.subtitle}>
          Scegli il prossimo gioco in base al tuo momento.
        </Text>
      </View>

      {libraryGames.length > 0 && (
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>STATO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: "backlog", label: "Backlog" },
              { key: "playing", label: "In corso" },
              { key: "all", label: "Tutta la libreria" },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterChip,
                  selectedStatus === option.key && styles.filterChipActive,
                ]}
                onPress={() => setSelectedStatus(option.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedStatus === option.key &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>UMORE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: "any", label: "Qualsiasi" },
              { key: "relax", label: "Relax" },
              { key: "story", label: "Storia" },
              { key: "energy", label: "Energia" },
              { key: "strategy", label: "Strategia" },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterChip,
                  selectedMood === option.key && styles.filterChipActive,
                ]}
                onPress={() => setSelectedMood(option.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedMood === option.key && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>TEMPO MASSIMO</Text>
          <View style={styles.timeOptions}>
            {[
              { value: null, label: "Qualsiasi" },
              { value: 30, label: "30 min" },
              { value: 60, label: "1 ora" },
              { value: 120, label: "2 ore" },
            ].map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.filterChip,
                  timeLimit === option.value && styles.filterChipActive,
                ]}
                onPress={() => setTimeLimit(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    timeLimit === option.value && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {libraryGames.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="albums-outline" size={64} color="#555" />
          <Text style={styles.emptyTitle}>Il tuo backlog è vuoto!</Text>
          <Text style={styles.emptySubtitle}>
            Aggiungi qualche gioco dalla ricerca per far girare la roulette.
          </Text>
        </View>
      ) : filteredGames.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="options-outline" size={48} color="#A855F7" />
          <Text style={styles.emptyTitle}>
            Nessun gioco corrisponde ai filtri
          </Text>
          <Text style={styles.emptySubtitle}>
            Imposta una durata nei dettagli dei giochi o scegli altri filtri.
          </Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setSelectedStatus("backlog");
              setSelectedMood("any");
              setTimeLimit(null);
            }}
          >
            <Text style={styles.resetButtonText}>Azzera filtri</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.gameCard,
              { transform: [{ rotate: spinInterpolate }] },
            ]}
          >
            {displayGame?.cover_url ? (
              <Image
                source={{ uri: displayGame.cover_url }}
                style={styles.coverImage}
              />
            ) : (
              <View style={[styles.coverImage, styles.placeholderCover]}>
                <Ionicons name="image-outline" size={40} color="#888" />
              </View>
            )}
            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle} numberOfLines={2}>
                {displayGame?.title || "Seleziona un gioco"}
              </Text>
              {!!displayGame?.session_minutes && (
                <Text style={styles.gameDuration}>
                  Sessione stimata · {displayGame.session_minutes} min
                </Text>
              )}
            </View>
          </Animated.View>

          <TouchableOpacity
            style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
            onPress={spinRoulette}
            disabled={spinning}
          >
            <Ionicons
              name="shuffle"
              size={22}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.spinButtonText}>
              {spinning
                ? "Estrazione in corso..."
                : "Estrai il prossimo gioco!"}
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
  filters: { marginBottom: 12 },
  filterLabel: {
    color: "#9D93AF",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 8,
  },
  filterChip: {
    backgroundColor: "#171324",
    borderColor: "#352B46",
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: "#6D28D9", borderColor: "#A855F7" },
  filterChipText: { color: "#C8C2E0", fontSize: 12, fontWeight: "600" },
  filterChipTextActive: { color: "#FFFFFF" },
  timeOptions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  gameDuration: { color: "#C084FC", fontSize: 12, marginTop: 8 },
  resetButton: {
    backgroundColor: "#6D28D9",
    borderRadius: 8,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resetButtonText: { color: "#FFFFFF", fontWeight: "700" },
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
