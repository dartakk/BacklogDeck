import { Check, Plus, Search, Star } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RAWGGame, searchGames } from "../services/rawg";
import { supabase, addGameToUserLibrary, removeGameFromLibrary, getUserLibrary } from "../services/superbase";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [games, setGames] = useState<RAWGGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedGameIds, setSavedGameIds] = useState<number[]>([]);
  const [libraryEntryMap, setLibraryEntryMap] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchDefaultGames();
    loadSavedGames();
  }, []);

  const loadSavedGames = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const libraryData = await getUserLibrary(user.id);
      if (libraryData) {
        const ids = libraryData.map((item: any) => item.game_id);
        setSavedGameIds(ids);
        
        // Mappa game_id -> library item id (utile per rimuoverlo correttamente)
        const map: Record<number, string> = {};
        libraryData.forEach((item: any) => {
          map[item.game_id] = item.id;
        });
        setLibraryEntryMap(map);
      }
    } catch (err) {
      console.error("Errore caricamento giochi salvati:", err);
    }
  };

  const fetchDefaultGames = async () => {
    setLoading(true);
    try {
      const results = await searchGames("");
      setGames(results);
    } catch (error) {
      console.error("Errore fetchDefaultGames:", error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      fetchDefaultGames();
      return;
    }

    setLoading(true);
    try {
      const results = await searchGames(query.trim());
      setGames(results);
    } catch (error) {
      console.error("Errore handleSearch:", error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveGame = async (game: RAWGGame) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isSaved = savedGameIds.includes(game.id);

      if (isSaved) {
        // Rimuovi dalla libreria usando l'ID della riga in user_library
        const libraryItemId = libraryEntryMap[game.id];
        if (libraryItemId) {
          const success = await removeGameFromLibrary(libraryItemId);
          if (success) {
            setSavedGameIds(savedGameIds.filter((id) => id !== game.id));
            const newMap = { ...libraryEntryMap };
            delete newMap[game.id];
            setLibraryEntryMap(newMap);
          }
        }
      } else {
        // Aggiungi alla libreria usando la funzione robusta di supabase.ts
        const result = await addGameToUserLibrary(user.id, game, "backlog");
        if (result.success && result.data && result.data[0]) {
          setSavedGameIds([...savedGameIds, game.id]);
          setLibraryEntryMap({
            ...libraryEntryMap,
            [game.id]: result.data[0].id,
          });
        }
      }
    } catch (err) {
      console.error("Errore salvataggio Supabase:", err);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.subHeader}>EXPLORE DATABASE</Text>
        <Text style={styles.headerTitle}>Giochi</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca un videogioco..."
            placeholderTextColor="#6B7280"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity style={styles.searchActionButton} onPress={handleSearch}>
          <Text style={styles.searchActionButtonText}>Cerca</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <ActivityIndicator size="large" color="#A855F7" style={{ marginVertical: 12 }} />
      )}

      <FlatList
        data={games}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              {query ? `Nessun gioco trovato per "${query}".` : "Nessun gioco trovato."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const isSaved = savedGameIds.includes(item.id);
          return (
            <View style={styles.gameCard}>
              <Image
                source={{
                  uri: item.background_image || "https://via.placeholder.com/150x200?text=No+Cover",
                }}
                style={styles.coverImage}
              />
              <View style={styles.gameInfo}>
                <Text style={styles.gameTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.gameGenre}>
                  {item.platforms?.map((p) => p.platform.name).slice(0, 2).join(", ") || "Videogioco"}
                </Text>
                {!!item.metacritic && item.metacritic > 0 && (
                  <View style={styles.ratingContainer}>
                    <Star size={13} color="#FBBF24" fill="#FBBF24" />
                    <Text style={styles.ratingText}>{item.metacritic}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.addButton, isSaved && styles.addButtonSaved]}
                onPress={() => toggleSaveGame(item)}
              >
                {isSaved ? (
                  <View style={styles.addBtnContent}>
                    <Check size={14} color="#FFFFFF" />
                    <Text style={styles.addBtnTextSaved}>SALVATO</Text>
                  </View>
                ) : (
                  <View style={styles.addBtnContent}>
                    <Plus size={14} color="#A855F7" />
                    <Text style={styles.addBtnText}>ADD</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0B14", paddingHorizontal: 16 },
  header: { marginVertical: 12 },
  subHeader: { color: "#A855F7", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  headerTitle: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  searchContainer: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#171324", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#2A233D" },
  searchInput: { flex: 1, color: "#FFFFFF", marginLeft: 8, fontSize: 14 },
  searchActionButton: { backgroundColor: "#A855F7", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  searchActionButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  listContainer: { paddingBottom: 20 },
  emptyText: { color: "#6B7280", textAlign: "center", marginTop: 40, fontSize: 14 },
  gameCard: { flexDirection: "row", backgroundColor: "#171324", borderRadius: 12, padding: 10, marginBottom: 12, alignItems: "center", borderWidth: 1, borderColor: "#2A233D" },
  coverImage: { width: 60, height: 80, borderRadius: 8, backgroundColor: "#2A233D" },
  gameInfo: { flex: 1, marginLeft: 12 },
  gameTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginBottom: 4 },
  gameGenre: { color: "#9CA3AF", fontSize: 12, marginBottom: 6 },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { color: "#FBBF24", fontSize: 12, fontWeight: "700" },
  addButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#2A233D", justifyContent: "center", alignItems: "center", marginLeft: 8, borderWidth: 1, borderColor: "#3F335A" },
  addButtonSaved: { backgroundColor: "#A855F7", borderColor: "#A855F7" },
  addBtnContent: { flexDirection: "row", alignItems: "center", gap: 4 },
  addBtnText: { color: "#A855F7", fontSize: 11, fontWeight: "800" },
  addBtnTextSaved: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});