import { useFocusEffect, useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedBackdrop from "../components/AnimatedBackdrop";
import { supabase } from "../services/superbase";

// Interfaccia per la struttura dati della notizia
interface NewsItem {
  id: string;
  title: string;
  source: string;
  category: string;
  time: string;
  imageUrl: string;
  url: string;
}

const CATEGORIES = ["Tutti", "News", "Hardware", "Annunci", "Rumor"];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("Tutti");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("gaming-news");
      if (error) throw error;
      const items = data?.items;
      if (!Array.isArray(items))
        throw new Error("Il feed non ha restituito notizie.");

      setNews(items as NewsItem[]);
      setErrorMessage(null);
    } catch (error) {
      console.error("Errore recupero news:", error);
      setErrorMessage(
        "Le notizie non sono al momento disponibili. Riprova tra poco.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchNews();
    }, [fetchNews]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void fetchNews();
  };

  const formatNewsDate = (dateValue: string) => {
    return new Intl.DateTimeFormat("it-IT", {
      day: "numeric",
      month: "short",
    }).format(new Date(dateValue));
  };

  // Filtra le news in base alla categoria selezionata
  const filteredNews =
    selectedCategory === "Tutti"
      ? news
      : news.filter(
          (item) =>
            item.category.toLowerCase() === selectedCategory.toLowerCase(),
        );

  const hotTopic = news[0];
  const latestNews = filteredNews.filter((item) => item.id !== hotTopic?.id);

  const openNewsUrl = (url: string) => {
    if (url) {
      Linking.openURL(url).catch((err) =>
        console.error("Errore nell'apertura del link:", err),
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AnimatedBackdrop />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subHeader}>BACKLOGDECK · RADAR</Text>
          <Text style={styles.headerTitle}>Notizie gaming</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/search")}
          accessibilityRole="button"
          accessibilityLabel="Cerca giochi"
        >
          <Search size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A855F7"
          />
        }
      >
        {/* Hot Topic Card (Mostrata solo su "Tutti" o se corrisponde) */}
        {hotTopic && selectedCategory === "Tutti" && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.hotTopicCard}
            onPress={() => openNewsUrl(hotTopic.url)}
          >
            <Image
              source={{ uri: hotTopic.imageUrl }}
              style={styles.hotTopicImage}
            />
            <View style={styles.hotTopicOverlay}>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>IN EVIDENZA</Text>
              </View>
              <Text style={styles.hotTopicTitle} numberOfLines={3}>
                {hotTopic.title}
              </Text>
              <Text style={styles.hotTopicMeta}>
                {hotTopic.source} • {formatNewsDate(hotTopic.time)}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Categorie Scrollabili */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sezione Ultime Notizie */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ultime Notizie</Text>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator
            size="small"
            color="#A855F7"
            style={{ marginTop: 20 }}
          />
        ) : errorMessage && news.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Feed non disponibile</Text>
            <Text style={styles.emptyMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void fetchNews()}
            >
              <Text style={styles.retryText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        ) : (
          latestNews.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              style={styles.newsCard}
              onPress={() => openNewsUrl(item.url)}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.newsImage} />
              <View style={styles.newsContent}>
                <Text style={styles.newsCategory}>{item.category}</Text>
                <Text style={styles.newsTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.newsMeta}>
                  {item.source} • {formatNewsDate(item.time)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        {!!errorMessage && news.length > 0 && (
          <Text style={styles.inlineError}>{errorMessage}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0B14",
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  subHeader: {
    color: "#A855F7",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1D192B",
    justifyContent: "center",
    alignItems: "center",
  },
  hotTopicCard: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
    backgroundColor: "#171324",
  },
  hotTopicImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  hotTopicOverlay: {
    flex: 1,
    backgroundColor: "rgba(13, 11, 20, 0.65)",
    padding: 16,
    justifyContent: "flex-end",
  },
  badgeContainer: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  hotTopicTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 6,
  },
  hotTopicMeta: {
    color: "#D1D5DB",
    fontSize: 12,
  },
  categoriesContainer: {
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#171324",
    borderWidth: 1,
    borderColor: "#2A233D",
  },
  categoryChipSelected: {
    backgroundColor: "#A855F7",
    borderColor: "#A855F7",
  },
  categoryText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
  categoryTextSelected: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  newsCard: {
    flexDirection: "row",
    backgroundColor: "#171324",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A233D",
  },
  newsImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#2A233D",
  },
  newsContent: {
    flex: 1,
    marginLeft: 12,
  },
  newsCategory: {
    color: "#A855F7",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  newsTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 4,
  },
  newsMeta: {
    color: "#6B7280",
    fontSize: 11,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyTitle: { color: "#F3F0FF", fontSize: 17, fontWeight: "700" },
  emptyMessage: {
    color: "#A9A1B8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  inlineError: { color: "#FCA5A5", fontSize: 12, marginBottom: 14 },
});
