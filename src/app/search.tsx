import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Check, Plus, ScanLine, Search, Star } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
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
import AnimatedBackdrop from "../components/AnimatedBackdrop";
import {
    lookupGameTitleByBarcode,
    RAWGGame,
    searchGames,
} from "../services/rawg";
import {
    addGameToUserLibrary,
    getUserLibrary,
    removeGameFromLibrary,
    supabase,
} from "../services/superbase";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { barcode } = useLocalSearchParams<{ barcode?: string | string[] }>();
  const [query, setQuery] = useState("");
  const [games, setGames] = useState<RAWGGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [savedGameIds, setSavedGameIds] = useState<number[]>([]);
  const [libraryEntryMap, setLibraryEntryMap] = useState<
    Record<number, string>
  >({});
  const processedBarcode = useRef<string | null>(null);
  const initialized = useRef(false);

  const loadSavedGames = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
  }, []);

  const fetchDefaultGames = useCallback(async () => {
    setLoading(true);
    setResultMessage(null);
    try {
      const results = await searchGames("");
      setGames(results);
    } catch (error) {
      console.error("Errore fetchDefaultGames:", error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      await fetchDefaultGames();
      return;
    }

    setLoading(true);
    setResultMessage(null);
    try {
      const results = await searchGames(query.trim());
      setGames(results);
    } catch (error) {
      console.error("Errore handleSearch:", error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [fetchDefaultGames, query]);

  const handleBarcodeSearch = useCallback(async (barcode: string) => {
    setLoading(true);
    setResultMessage("Ricerca del gioco associato al codice...");
    try {
      const title = await lookupGameTitleByBarcode(barcode);
      if (!title) {
        setGames([]);
        setQuery(barcode);
        setResultMessage(
          "Nessun gioco associato al codice. Puoi cercare il titolo manualmente.",
        );
        return;
      }

      setQuery(title);
      const results = await searchGames(title);
      setGames(results);
      setResultMessage(
        results.length > 0
          ? `Risultati per ${title}`
          : `Il codice corrisponde a ${title}, ma RAWG non ha trovato una scheda.`,
      );
    } catch (error) {
      console.error("Errore ricerca barcode:", error);
      setGames([]);
      setQuery(barcode);
      setResultMessage(
        error instanceof Error
          ? error.message
          : "Ricerca barcode non disponibile. Cerca il titolo manualmente.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSavedGames();
      const scannedValue = Array.isArray(barcode) ? barcode[0] : barcode;
      if (scannedValue) {
        const normalizedBarcode = scannedValue.replace(/\D/g, "");
        if (
          normalizedBarcode &&
          processedBarcode.current !== normalizedBarcode
        ) {
          processedBarcode.current = normalizedBarcode;
          void handleBarcodeSearch(normalizedBarcode);
        }
      } else if (!initialized.current) {
        initialized.current = true;
        void fetchDefaultGames();
      }
    }, [barcode, fetchDefaultGames, handleBarcodeSearch, loadSavedGames]),
  );

  const openScanner = () => {
    processedBarcode.current = null;
    router.push("/scanner");
  };

  const toggleSaveGame = async (game: RAWGGame) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      <AnimatedBackdrop />
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

        <TouchableOpacity
          style={styles.searchActionButton}
          onPress={handleSearch}
          accessibilityRole="button"
          accessibilityLabel="Cerca giochi"
        >
          <Text style={styles.searchActionButtonText}>Cerca</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.scannerButton}
          onPress={openScanner}
          accessibilityRole="button"
          accessibilityLabel="Scansiona codice a barre"
        >
          <ScanLine size={19} color="#F3F0FF" />
        </TouchableOpacity>
      </View>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#A855F7"
          style={{ marginVertical: 12 }}
        />
      )}
      {!!resultMessage && (
        <Text style={styles.resultMessage}>{resultMessage}</Text>
      )}

      <FlatList
        data={games}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              {query
                ? `Nessun gioco trovato per "${query}".`
                : "Nessun gioco trovato."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const isSaved = savedGameIds.includes(item.id);
          return (
            <View style={styles.gameCard}>
              <Image
                source={{
                  uri:
                    item.background_image ||
                    "https://via.placeholder.com/150x200?text=No+Cover",
                }}
                style={styles.coverImage}
              />
              <TouchableOpacity
                style={styles.gameInfo}
                activeOpacity={0.75}
                onPress={() => router.push(`/game/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Apri la scheda di ${item.name}`}
              >
                <Text style={styles.gameTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.gameGenre} numberOfLines={1}>
                  {item.genres
                    ?.map((genre) => genre.name)
                    .slice(0, 2)
                    .join(" · ") ||
                    item.platforms
                      ?.map((platform) => platform.platform.name)
                      .slice(0, 2)
                      .join(" · ") ||
                    "Videogioco"}
                </Text>
                {!!item.released && (
                  <Text style={styles.gameRelease}>
                    {item.released.slice(0, 4)}
                  </Text>
                )}
                {!!item.metacritic && item.metacritic > 0 && (
                  <View style={styles.ratingContainer}>
                    <Star size={13} color="#FBBF24" fill="#FBBF24" />
                    <Text style={styles.ratingText}>{item.metacritic}/100</Text>
                  </View>
                )}
              </TouchableOpacity>

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
  subHeader: {
    color: "#A855F7",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171324",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#2A233D",
  },
  searchInput: { flex: 1, color: "#FFFFFF", marginLeft: 8, fontSize: 14 },
  searchActionButton: {
    backgroundColor: "#A855F7",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  searchActionButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  scannerButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#241B3B",
    borderWidth: 1,
    borderColor: "#4C2E8C",
    justifyContent: "center",
    alignItems: "center",
  },
  resultMessage: { color: "#C8C2E0", fontSize: 12, marginBottom: 10 },
  listContainer: { paddingBottom: 20 },
  emptyText: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  gameCard: {
    flexDirection: "row",
    backgroundColor: "#171324",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A233D",
  },
  coverImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#2A233D",
  },
  gameInfo: { flex: 1, marginLeft: 12 },
  gameTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  gameGenre: { color: "#9CA3AF", fontSize: 12, marginBottom: 6 },
  gameRelease: { color: "#777184", fontSize: 11, marginBottom: 4 },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { color: "#FBBF24", fontSize: 12, fontWeight: "700" },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2A233D",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#3F335A",
  },
  addButtonSaved: { backgroundColor: "#A855F7", borderColor: "#A855F7" },
  addBtnContent: { flexDirection: "row", alignItems: "center", gap: 4 },
  addBtnText: { color: "#A855F7", fontSize: 11, fontWeight: "800" },
  addBtnTextSaved: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});
