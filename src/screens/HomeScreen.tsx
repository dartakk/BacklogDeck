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
import {
    getUserLibrary,
    removeGameFromLibrary,
    updateGameStatus,
} from "../services/superbase";

const mockUserId = "00000000-0000-0000-0000-000000000000";

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
  backlog: "#00B4D8",
  playing: "#FFB703",
  completed: "#38B000",
  dropped: "#E63946",
};

export default function HomeScreen() {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const fetchLibrary = async () => {
    setLoading(true);
    const data = await getUserLibrary(mockUserId);
    setLibrary(data as unknown as LibraryItem[]);
    setLoading(false);
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
    Alert.alert(item.games.title, "Cosa vuoi fare con questo gioco?", [
      {
        text: "In Corso (Playing)",
        onPress: () => changeStatus(item.id, "playing"),
      },
      {
        text: "Completato",
        onPress: () => changeStatus(item.id, "completed"),
      },
      {
        text: "In Backlog",
        onPress: () => changeStatus(item.id, "backlog"),
      },
      {
        text: "Abbandonato",
        onPress: () => changeStatus(item.id, "dropped"),
      },
      {
        text: "Elimina dalla Libreria",
        style: "destructive",
        onPress: () => deleteGame(item.id, item.games.title),
      },
      {
        text: "Annulla",
        style: "cancel",
      },
    ]);
  };

  const changeStatus = async (id: string, newStatus: StatusType) => {
    const success = await updateGameStatus(id, newStatus);
    if (success) {
      fetchLibrary();
    } else {
      Alert.alert("Errore", "Impossibile aggiornare lo stato.");
    }
  };

  const deleteGame = async (id: string, title: string) => {
    const success = await removeGameFromLibrary(id);
    if (success) {
      Alert.alert("Rimosso", `"${title}" è stato rimosso dal backlog.`);
      fetchLibrary();
    } else {
      Alert.alert("Errore", "Impossibile rimuovere il gioco.");
    }
  };

  const filteredLibrary = library.filter((item) => {
    if (selectedFilter === "all") return true;
    return item.status === selectedFilter;
  });

  const renderGameItem = ({ item }: { item: LibraryItem }) => {
    const game = item.games;
    if (!game) return null;

    const badgeColor = statusColors[item.status] || "#00B4D8";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/game/[id]",
            params: { id: item.id },
          })
        }
        onLongPress={() => handleGameOptions(item)}
      >
        {game.cover_url ? (
          <Image source={{ uri: game.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholder]} />
        )}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {game.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: badgeColor + "22" }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleGameOptions(item)}
        >
          <Text style={styles.moreIcon}>⋮</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Il mio Backlog</Text>

      {/* Bar Filtri con scorrimento orizzontale */}
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

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#00B4D8"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={filteredLibrary}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGameItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00B4D8"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nessun gioco presente in questa categoria.
              </Text>
              <Text style={styles.emptySubText}>
                Usa il tasto Cerca in basso per aggiungere i tuoi giochi!
              </Text>
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
    backgroundColor: "#121212",
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  filterWrapper: {
    maxHeight: 40,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1E1E1E",
    marginRight: 8,
  },
  activeFilterTab: {
    backgroundColor: "#00B4D8",
  },
  filterText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "600",
  },
  activeFilterText: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    alignItems: "center",
  },
  cover: {
    width: 80,
    height: 100,
  },
  placeholder: {
    backgroundColor: "#333",
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  moreButton: {
    padding: 16,
  },
  moreIcon: {
    color: "#888888",
    fontSize: 20,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
  },
});
