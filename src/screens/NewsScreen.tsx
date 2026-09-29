import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface NewsItem {
  id: string;
  title: string;
  category: string;
  source: string;
  time: string;
  image: string;
  url: string;
  isHot?: boolean;
}

// News globali di fallback/mock in attesa dell'API live
const MOCK_GLOBAL_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "GTA VI: Rockstar aggiorna la finestra di lancio e mostra nuovi dettagli sul motore grafico",
    category: "Annunci",
    source: "IGN Global",
    time: "1 ora fa",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop",
    url: "https://ign.com",
    isHot: true,
  },
  {
    id: "2",
    title: "PlayStation 5 Pro e PSSR: l'analisi tecnica sui giochi a 60 FPS e 4K nativi",
    category: "Hardware",
    source: "Digital Foundry",
    time: "3 ore fa",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=600&auto=format&fit=crop",
    url: "https://eurogamer.net",
  },
  {
    id: "3",
    title: "Nintendo Switch 2: le ultime indiscrezioni su retrocompatibilità e schermo OLED",
    category: "Rumor",
    source: "Eurogamer",
    time: "5 ore fa",
    image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?q=80&w=600&auto=format&fit=crop",
    url: "https://eurogamer.net",
  },
  {
    id: "4",
    title: "Xbox Game Pass: annunciati i 6 nuovi titoli in arrivo questa settimana",
    category: "Servizi",
    source: "GameSpot",
    time: "8 ore fa",
    image: "https://images.unsplash.com/photo-1621252179027-94459d278660?q=80&w=600&auto=format&fit=crop",
    url: "https://gamespot.com",
  },
];

const CATEGORIES = ["Tutti", "Hardware", "Annunci", "Rumor", "Servizi"];

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Tutti");

  const fetchNews = async () => {
    setLoading(true);
    // In futuro qui collegheremo la chiamata RSS/API
    setTimeout(() => {
      setNews(MOCK_GLOBAL_NEWS);
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };

  const filteredNews = news.filter((item) => {
    if (selectedCategory === "Tutti") return true;
    return item.category === selectedCategory;
  });

  const hotArticle = news.find((item) => item.isHot) || news[0];

  const openArticle = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandSubtitle}>WORLDWIDE GAMING</Text>
          <Text style={styles.headerTitle}>Global News</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="sparkles" size={20} color="#A855F7" />
        </TouchableOpacity>
      </View>

      {/* Featured / Hot Article */}
      {hotArticle && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.featuredCard}
          onPress={() => openArticle(hotArticle.url)}
        >
          <Image source={{ uri: hotArticle.image }} style={styles.featuredImage} />
          <LinearGradient
            colors={["transparent", "rgba(13, 11, 20, 0.95)"]}
            style={styles.gradientOverlay}
          >
            <View style={styles.hotBadge}>
              <Ionicons name="flame" size={12} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.hotBadgeText}>HOT TOPIC</Text>
            </View>
            <Text style={styles.featuredTitle}>{hotArticle.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.sourceText}>{hotArticle.source}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.timeText}>{hotArticle.time}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Filtri Categoria */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterWrapper}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterChip,
              selectedCategory === cat && styles.activeFilterChip,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === cat && styles.activeFilterText,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista Notizie */}
      <Text style={styles.sectionTitle}>Ultime Notizie</Text>
      {filteredNews
        .filter((item) => item.id !== hotArticle?.id)
        .map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.newsCard}
            activeOpacity={0.8}
            onPress={() => openArticle(item.url)}
          >
            <Image source={{ uri: item.image }} style={styles.newsImage} />
            <View style={styles.newsContent}>
              <Text style={styles.categoryTag}>{item.category}</Text>
              <Text style={styles.newsTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.sourceText}>{item.source}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0B14", paddingTop: 50, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, backgroundColor: "#0D0B14", justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  brandSubtitle: { color: "#A855F7", fontSize: 12, fontWeight: "bold", letterSpacing: 1 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "#F3F0FF" },
  iconBtn: { backgroundColor: "#171324", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#2A233D" },
  featuredCard: { height: 220, borderRadius: 20, overflow: "hidden", marginBottom: 20, borderWidth: 1, borderColor: "#2A233D" },
  featuredImage: { width: "100%", height: "100%" },
  gradientOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, justifyContent: "flex-end" },
  hotBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#EF4444", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start", marginBottom: 8 },
  hotBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  featuredTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold", marginBottom: 6, lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  sourceText: { color: "#A855F7", fontSize: 12, fontWeight: "600" },
  dot: { color: "#8E8A9F", marginHorizontal: 6 },
  timeText: { color: "#8E8A9F", fontSize: 12 },
  filterWrapper: { maxHeight: 40, marginBottom: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: "#171324", marginRight: 8, borderWidth: 1, borderColor: "#2A233D" },
  activeFilterChip: { backgroundColor: "#A855F7", borderColor: "#A855F7" },
  filterText: { color: "#8E8A9F", fontSize: 13, fontWeight: "600" },
  activeFilterText: { color: "#FFF" },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#F3F0FF", marginBottom: 14 },
  newsCard: { flexDirection: "row", backgroundColor: "#171324", borderRadius: 16, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#2A233D", alignItems: "center" },
  newsImage: { width: 85, height: 85, borderRadius: 12, marginRight: 12 },
  newsContent: { flex: 1 },
  categoryTag: { color: "#A855F7", fontSize: 11, fontWeight: "bold", marginBottom: 4 },
  newsTitle: { color: "#F3F0FF", fontSize: 14, fontWeight: "600", marginBottom: 6, lineHeight: 18 },
});