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
import { Ionicons } from "@expo/vector-icons";
import { supabase, getUserLibrary, removeGameFromLibrary, updateGameStatus } from "../services/superbase";

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

export default function HomeScreen() {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLibrary();
    setRefreshing(false);
  };

  const handleGameOptions = (item: LibraryItem) => {
    Alert.alert(item.games?.title || "Opzioni", "Cosa vuoi fare con questo gioco?", [
      { text: "In Corso", onPress: () => changeStatus(item.id, "playing") },
      { text: "Completato", onPress: () => changeStatus(item.id, "completed") },
      { text: "In Backlog", onPress: () => changeStatus(item.id, "backlog") },
      { text: "Abbandonato", onPress: () => changeStatus(item.id, "dropped") },
      { text: "Elimina", style: "destructive", onPress: () => deleteGame(item.id, item.games?.title || "") },
      { text: "Annulla", style: "cancel" },
    ]);
  };

  const changeStatus = async (id: string, newStatus: StatusType) => {
    const success = await updateGameStatus(id, newStatus);
    if (success) fetchLibrary();
  };

  const deleteGame = async (id: string, title: string) => {
    const success = await removeGameFromLibrary(id);
    if (success) fetchLibrary();
  };

  const filteredLibrary = library.filter((item) => {
    if (selectedFilter === "all") return true;
    return item.status === selectedFilter;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brandSubtitle}>BACKLOGDECK</Text>
          <Text style={styles.headerTitle}>Il mio Backlog</Text>
        </View>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: "all", label: `Tutti (${library.length})` },
            { key: "playing", label: `In Corso (${library.filter((i) => i.status === "playing").length})` },
            { key: "backlog", label: `Backlog (${library.filter((i) => i.status === "backlog").length})` },
            { key: "completed", label: `Completati (${library.filter((i) => i.status === "completed").length})` },
            { key: "dropped", label: `Abbandonati (${library.filter((i) => i.status === "dropped").length})` },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, selectedFilter === tab.key && styles.activeFilterTab]}
              onPress={() => setSelectedFilter(tab.key)}
            >
              <Text style={[styles.filterText, selectedFilter === tab.key && styles.activeFilterText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#A855F7" style={{ marginTop: 40 }} />
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
                onPress={() => router.push({ pathname: "/game/[id]", params: { id: String(item.game_id || game.id) } })}
                onLongPress={() => handleGameOptions(item)}
              >
                {game.cover_url ? (
                  <Image source={{ uri: game.cover_url }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.placeholder]} />
                )}
                <View style={styles.infoContainer}>
                  <Text style={styles.title} numberOfLines={2}>{game.title}</Text>
                  <View style={[styles.badge, { backgroundColor: badgeColor + "22" }]}>
                    <Text style={[styles.badgeText, { color: badgeColor }]}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.moreButton} onPress={() => handleGameOptions(item)}>
                  <Ionicons name="ellipsis-vertical" size={18} color="#8E8A9F" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="game-controller-outline" size={48} color="#2A233D" />
              <Text style={styles.emptyText}>Nessun gioco presente in questa categoria.</Text>
              <Text style={styles.emptySubText}>Usa la tab Cerca in basso per aggiungere i tuoi titoli!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0B14", paddingTop: 50, paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  brandSubtitle: { color: "#A855F7", fontSize: 12, fontWeight: "bold", letterSpacing: 1 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "#F3F0FF" },
  filterWrapper: { maxHeight: 40, marginBottom: 16 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: "#171324", marginRight: 8, borderWidth: 1, borderColor: "#2A233D" },
  activeFilterTab: { backgroundColor: "#A855F7", borderColor: "#A855F7" },
  filterText: { color: "#8E8A9F", fontSize: 13, fontWeight: "600" },
  activeFilterText: { color: "#FFFFFF" },
  listContent: { paddingBottom: 30 },
  card: { flexDirection: "row", backgroundColor: "#171324", borderRadius: 16, marginBottom: 12, overflow: "hidden", alignItems: "center", borderWidth: 1, borderColor: "#2A233D" },
  cover: { width: 80, height: 100 },
  placeholder: { backgroundColor: "#1F192F" },
  infoContainer: { flex: 1, padding: 12, justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "600", color: "#F3F0FF", marginBottom: 8 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "bold" },
  moreButton: { padding: 16 },
  emptyContainer: { alignItems: "center", marginTop: 60, paddingHorizontal: 20 },
  emptyText: { color: "#F3F0FF", fontSize: 16, fontWeight: "600", textAlign: "center", marginTop: 12, marginBottom: 6 },
  emptySubText: { color: "#8E8A9F", fontSize: 13, textAlign: "center" },
});