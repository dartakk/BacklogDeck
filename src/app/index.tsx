import { Settings } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Interfaccia per la struttura dati della notizia
interface NewsItem {
  id: string;
  title: string;
  source: string;
  category: string;
  time: string;
  imageUrl: string;
  url: string;
  isHotTopic?: boolean;
}

// Categorie disponibili
const CATEGORIES = ["Tutti", "Hardware", "Annunci", "Rumor"];

// Dati di fallback per test immediato
const MOCK_NEWS: NewsItem[] = [
  {
    id: "1",
    title:
      "GTA VI: Rockstar aggiorna la finestra di lancio e mostra nuovi dettagli sul motore grafico",
    source: "IGN Global",
    category: "Annunci",
    time: "1 ora fa",
    imageUrl:
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1000",
    url: "https://ign.com",
    isHotTopic: true,
  },
  {
    id: "2",
    title:
      "PlayStation 5 Pro e PSSR: l'analisi tecnica sui giochi a 60 FPS e 4K nativi",
    source: "Digital Foundry",
    category: "Hardware",
    time: "3 ore fa",
    imageUrl:
      "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=600",
    url: "https://digitalfoundry.net",
  },
  {
    id: "3",
    title:
      "Nintendo Switch 2: le ultime indiscrezioni su retrocompatibilità e componenti",
    source: "Eurogamer",
    category: "Rumor",
    time: "5 ore fa",
    imageUrl:
      "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&q=80&w=600",
    url: "https://eurogamer.net",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState("Tutti");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Simulazione fetch notizie (in futuro qui chiameremo un endpoint Supabase o Feed RSS)
  const fetchNews = async () => {
    try {
      setLoading(true);
      // Simuliamo il ritardo di rete
      await new Promise((resolve) => setTimeout(resolve, 600));
      setNews(MOCK_NEWS);
    } catch (error) {
      console.error("Errore recupero news:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  // Filtra le news in base alla categoria selezionata
  const filteredNews =
    selectedCategory === "Tutti"
      ? news
      : news.filter(
          (item) =>
            item.category.toLowerCase() === selectedCategory.toLowerCase(),
        );

  const hotTopic = news.find((item) => item.isHotTopic) || news[0];
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subHeader}>WORLDWIDE GAMING</Text>
          <Text style={styles.headerTitle}>Global News</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={22} color="#FFFFFF" />
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
                <Text style={styles.badgeText}>HOT TOPIC</Text>
              </View>
              <Text style={styles.hotTopicTitle} numberOfLines={3}>
                {hotTopic.title}
              </Text>
              <Text style={styles.hotTopicMeta}>
                {hotTopic.source} • {hotTopic.time}
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
                  {item.source} • {item.time}
                </Text>
              </View>
            </TouchableOpacity>
          ))
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
});
