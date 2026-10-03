import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import AnimatedBackdrop from "../components/AnimatedBackdrop";
import {
    getUserLibrary,
    removeGameFromLibrary,
    supabase,
    updateGameStatus,
} from "../services/superbase";

type StatusType = "backlog" | "playing" | "completed" | "dropped";

interface LibraryItem {
  id: string;
  status: StatusType;
  game_id: number;
  games: {
    id: number;
    title: string;
    cover_url: string;
    release_date: string;
  };
}

const statusColors: Record<string, string> = {
  backlog: "#A855F7",
  playing: "#F59E0B",
  completed: "#10B981",
  dropped: "#EF4444",
};

export default function LibraryScreen() {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const data = await getUserLibrary(session.user.id);
        setLibrary((data as unknown as LibraryItem[]) || []);
      }
    } catch (error) {
      console.error("Errore fetch backlog:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLibrary();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLibrary();
    setRefreshing(false);
  };

  const handleGameOptions = (item: LibraryItem) => {
    Alert.alert(item.games?.title || "Opzioni", "Modifica lo stato del gioco", [
      { text: "In Corso", onPress: () => changeStatus(item.id, "playing") },
      { text: "Completato", onPress: () => changeStatus(item.id, "completed") },
      { text: "In Backlog", onPress: () => changeStatus(item.id, "backlog") },
      { text: "Abbandonato", onPress: () => changeStatus(item.id, "dropped") },
      {
        text: "Elimina dalla libreria",
        style: "destructive",
        onPress: () => deleteGame(item.id),
      },
      { text: "Annulla", style: "cancel" },
    ]);
  };

  const changeStatus = async (id: string, newStatus: StatusType) => {
    const success = await updateGameStatus(id, newStatus);
    if (success) fetchLibrary();
  };

  const deleteGame = async (id: string) => {
    const success = await removeGameFromLibrary(id);
    if (success) fetchLibrary();
  };

  const filteredLibrary = library.filter((item) => {
    if (selectedFilter === "all") return true;
    return item.status === selectedFilter;
  });

  return (
    <View style={styles.container}>
      <AnimatedBackdrop />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandSubtitle}>BACKLOGDECK</Text>
          <Text style={styles.headerTitle}>La mia Libreria</Text>
        </View>
        <TouchableOpacity
          style={styles.searchIconButton}
          activeOpacity={0.7}
          onPress={() => router.push("/search")}
        >
          <Ionicons name="search" size={20} color="#F3F0FF" />
        </TouchableOpacity>
      </View>

      {/* Filtri orizzontali stile pillola */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: "all", label: `Tutti (${library.length})` },
            {
              key: "playing",
              label: `In Corso (${library.filter((i) => i.status === "playing").length})`,
            },
            {
              key: "backlog",
              label: `Backlog (${library.filter((i) => i.status === "backlog").length})`,
            },
            {
              key: "completed",
              label: `Completati (${library.filter((i) => i.status === "completed").length})`,
            },
            {
              key: "dropped",
              label: `Abbandonati (${library.filter((i) => i.status === "dropped").length})`,
            },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              style={[
                styles.filterTab,
                selectedFilter === tab.key && styles.activeFilterTab,
              ]}
              onPress={() => setSelectedFilter(tab.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === tab.key && styles.activeFilterText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Contenuto Lista */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
      ) : (
        <FlatList
          data={filteredLibrary}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const game = item.games;
            if (!game) return null;
            const badgeColor = statusColors[item.status] || "#A855F7";

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => handleGameOptions(item)}
              >
                {game.cover_url ? (
                  <Image
                    source={{ uri: game.cover_url }}
                    style={styles.cover}
                  />
                ) : (
                  <View style={[styles.cover, styles.placeholder]} />
                )}
                <View style={styles.infoContainer}>
                  <Text style={styles.title} numberOfLines={2}>
                    {game.title}
                  </Text>
                  <View style={styles.cardFooter}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: badgeColor + "22",
                          borderColor: badgeColor + "44",
                        },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: badgeColor }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.moreButton}>
                  <Ionicons
                    name="ellipsis-vertical"
                    size={16}
                    color="#8E8A9F"
                  />
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#A855F7"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name="game-controller-outline"
                  size={36}
                  color="#A855F7"
                />
              </View>
              <Text style={styles.emptyText}>La tua libreria è vuota</Text>
              <Text style={styles.emptySubText}>
                Esplora il database o usa lo scanner per aggiungere il tuo primo
                titolo.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                activeOpacity={0.8}
                onPress={() => router.push("/search")}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.emptyButtonText}>Aggiungi giochi</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0B14",
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  brandSubtitle: {
    color: "#A855F7",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#F3F0FF" },
  searchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#171324",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A233D",
  },

  filterWrapper: { maxHeight: 42, marginBottom: 16 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#171324",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#2A233D",
    justifyContent: "center",
  },
  activeFilterTab: { backgroundColor: "#A855F7", borderColor: "#A855F7" },
  filterText: { color: "#8E8A9F", fontSize: 13, fontWeight: "600" },
  activeFilterText: { color: "#FFFFFF" },

  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingBottom: 40, paddingTop: 4 },

  card: {
    flexDirection: "row",
    backgroundColor: "#171324",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A233D",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  cover: { width: 72, height: 96, backgroundColor: "#1F192F" },
  placeholder: { justifyContent: "center", alignItems: "center" },
  infoContainer: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
    height: 96,
  },
  title: { fontSize: 14, fontWeight: "700", color: "#F3F0FF", lineHeight: 20 },
  cardFooter: { flexDirection: "row", alignItems: "center" },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  moreButton: { padding: 16, justifyContent: "center", alignItems: "center" },

  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 30,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#171324",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A233D",
  },
  emptyText: {
    color: "#F3F0FF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  emptySubText: {
    color: "#8E8A9F",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: "row",
    backgroundColor: "#A855F7",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
