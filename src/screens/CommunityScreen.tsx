import { useFocusEffect } from "expo-router";
import { Bell, Heart, MessageCircle, Send } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import AnimatedBackdrop from "../components/AnimatedBackdrop";
import {
    CommunityNotification,
    CommunityReview,
    getCommunityFeed,
    getUnreadNotifications,
    markUnreadNotificationsRead,
    publishReviewComment,
    setReviewLiked,
} from "../services/community";
import { supabase } from "../services/superbase";

export default function CommunityScreen() {
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<CommunityNotification[]>(
    [],
  );
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [sendingReviewId, setSendingReviewId] = useState<string | null>(null);

  const fetchCommunityReviews = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error("Accedi per visualizzare la community.");

      const [feed, notificationItems] = await Promise.all([
        getCommunityFeed(user.id),
        getUnreadNotifications(user.id),
      ]);

      setCurrentUserId(user.id);
      setReviews(feed);
      setNotifications(notificationItems);
      if (notificationItems.length > 0) setNotificationsVisible(true);
      setErrorMessage(null);
    } catch (error) {
      console.error("Errore nel recupero della community:", error);
      setErrorMessage(
        "Feed non disponibile. Controlla la connessione e riprova.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchCommunityReviews();
    }, [fetchCommunityReviews]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchCommunityReviews();
  };

  const handleToggleLike = async (review: CommunityReview) => {
    if (!currentUserId) return;

    const nextLikedState = !review.likedByCurrentUser;
    setReviews((currentReviews) =>
      currentReviews.map((currentReview) =>
        currentReview.id === review.id
          ? {
              ...currentReview,
              likedByCurrentUser: nextLikedState,
              likeCount: currentReview.likeCount + (nextLikedState ? 1 : -1),
            }
          : currentReview,
      ),
    );

    try {
      await setReviewLiked(currentUserId, review.id, nextLikedState);
    } catch (error) {
      console.error("Errore aggiornamento like:", error);
      setReviews((currentReviews) =>
        currentReviews.map((currentReview) =>
          currentReview.id === review.id
            ? {
                ...currentReview,
                likedByCurrentUser: !nextLikedState,
                likeCount: currentReview.likeCount + (nextLikedState ? -1 : 1),
              }
            : currentReview,
        ),
      );
      Alert.alert("Like non aggiornato", "Riprova tra poco.");
    }
  };

  const handleSendComment = async (reviewId: number | string) => {
    if (!currentUserId) return;
    const reviewKey = String(reviewId);
    const draft = commentDrafts[reviewKey] ?? "";
    if (!draft.trim()) return;

    setSendingReviewId(reviewKey);
    try {
      await publishReviewComment(currentUserId, reviewId, draft);
      setCommentDrafts((drafts) => ({ ...drafts, [reviewKey]: "" }));
      await fetchCommunityReviews();
    } catch (error) {
      console.error("Errore pubblicazione commento:", error);
      Alert.alert(
        "Commento non inviato",
        "Controlla la connessione e riprova.",
      );
    } finally {
      setSendingReviewId(null);
    }
  };

  const handleDismissNotifications = async () => {
    if (!currentUserId || notifications.length === 0) {
      setNotificationsVisible(false);
      return;
    }

    try {
      await markUnreadNotificationsRead(currentUserId);
      setNotifications([]);
      setNotificationsVisible(false);
    } catch (error) {
      console.error("Errore aggiornamento notifiche:", error);
      Alert.alert("Notifiche non aggiornate", "Riprova tra poco.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedBackdrop />
      <Text style={styles.title}>🌐 Community Feed</Text>
      <Text style={styles.subtitle}>
        Scopri cosa stanno giocando e recensendo gli altri utenti.
      </Text>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          notifications.length > 0 || errorMessage ? (
            <View>
              {notifications.length > 0 && (
                <TouchableOpacity
                  style={styles.notificationBanner}
                  onPress={() => setNotificationsVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Apri notifiche Community"
                >
                  <Bell size={16} color="#C084FC" />
                  <Text style={styles.notificationText}>
                    {notifications.length} nuove interazioni sui tuoi post
                  </Text>
                </TouchableOpacity>
              )}
              {!!errorMessage && reviews.length > 0 && (
                <Text style={styles.inlineError}>{errorMessage}</Text>
              )}
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.headerRow}>
              <Image
                source={{
                  uri:
                    item.profiles?.avatar_url ||
                    "https://via.placeholder.com/100",
                }}
                style={styles.avatar}
              />
              <View style={styles.userInfo}>
                <Text style={styles.username}>
                  {item.profiles?.username || "Utente Anonimo"}
                </Text>
                <Text style={styles.gameTitle}>
                  ha recensito {item.games?.title || "un gioco"}
                </Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>⭐ {item.rating}/5</Text>
              </View>
            </View>

            {item.games?.cover_url && (
              <Image
                source={{ uri: item.games.cover_url }}
                style={styles.gameCover}
              />
            )}

            <Text style={styles.content}>{item.content}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleToggleLike(item)}
                accessibilityRole="button"
                accessibilityLabel={
                  item.likedByCurrentUser ? "Rimuovi like" : "Metti like"
                }
              >
                <Heart
                  size={17}
                  color={item.likedByCurrentUser ? "#EC4899" : "#A1A1AA"}
                  fill={item.likedByCurrentUser ? "#EC4899" : "transparent"}
                />
                <Text style={styles.actionText}>{item.likeCount}</Text>
              </TouchableOpacity>
              <View style={styles.actionButton}>
                <MessageCircle size={17} color="#A1A1AA" />
                <Text style={styles.actionText}>{item.comments.length}</Text>
              </View>
            </View>

            {item.comments.map((comment) => (
              <View key={String(comment.id)} style={styles.commentRow}>
                <Text style={styles.commentAuthor}>
                  {comment.profiles?.username || "Utente"}
                </Text>
                <Text style={styles.commentText}>{comment.content}</Text>
              </View>
            ))}

            <View style={styles.commentComposer}>
              <TextInput
                value={commentDrafts[String(item.id)] ?? ""}
                onChangeText={(value) =>
                  setCommentDrafts((drafts) => ({
                    ...drafts,
                    [String(item.id)]: value,
                  }))
                }
                placeholder="Scrivi un commento..."
                placeholderTextColor="#777184"
                style={styles.commentInput}
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => handleSendComment(item.id)}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => handleSendComment(item.id)}
                disabled={sendingReviewId === String(item.id)}
                accessibilityRole="button"
                accessibilityLabel="Invia commento"
              >
                {sendingReviewId === String(item.id) ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {errorMessage
                ? "Feed non disponibile"
                : "Ancora nessuna recensione nella community."}
            </Text>
            <Text style={styles.emptySubtext}>
              {errorMessage || "Sii il primo a condividere un parere!"}
            </Text>
            {!!errorMessage && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRefresh}
              >
                <Text style={styles.retryButtonText}>Riprova</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
      <Modal
        visible={notificationsVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismissNotifications}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.notificationModal}>
            <View style={styles.modalHeader}>
              <Bell size={20} color="#C084FC" />
              <Text style={styles.modalTitle}>Nuove interazioni</Text>
            </View>
            {notifications.map((notification) => (
              <View
                key={String(notification.id)}
                style={styles.notificationRow}
              >
                {notification.type === "like" ? (
                  <Heart size={16} color="#EC4899" />
                ) : (
                  <MessageCircle size={16} color="#22D3EE" />
                )}
                <Text style={styles.notificationItemText}>
                  {notification.type === "like"
                    ? "Qualcuno ha messo like a una tua recensione."
                    : "Hai ricevuto un commento a una tua recensione."}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismissNotifications}
            >
              <Text style={styles.dismissButtonText}>Segna come lette</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121214", padding: 20 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121214",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    marginTop: 10,
  },
  subtitle: { fontSize: 14, color: "#a1a1aa", marginBottom: 20 },
  reviewCard: {
    backgroundColor: "#1a1a1e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2a2a32",
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#3f3f46",
  },
  userInfo: { flex: 1 },
  username: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  gameTitle: { color: "#a1a1aa", fontSize: 13 },
  ratingBadge: {
    backgroundColor: "#27272a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { color: "#f59e0b", fontWeight: "bold", fontSize: 12 },
  gameCover: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginBottom: 12,
    resizeMode: "cover",
  },
  content: { color: "#e4e4e7", fontSize: 14, lineHeight: 20 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  emptySubtext: { color: "#a1a1aa", fontSize: 14, textAlign: "center" },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#4f46e5",
  },
  retryButtonText: { color: "#fff", fontWeight: "700" },
  notificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: "#241B3B",
  },
  notificationText: { color: "#E5E0F5", fontSize: 13, fontWeight: "600" },
  inlineError: { color: "#FCA5A5", fontSize: 13, marginBottom: 12 },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2A2A32",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 36,
  },
  actionText: { color: "#C8C2E0", fontSize: 13, fontWeight: "600" },
  commentRow: { flexDirection: "row", gap: 7, marginTop: 10 },
  commentAuthor: { color: "#C084FC", fontSize: 12, fontWeight: "700" },
  commentText: { color: "#D4D4D8", fontSize: 12, flex: 1, lineHeight: 18 },
  commentComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#393244",
    color: "#F3F0FF",
    backgroundColor: "#141218",
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#7C3AED",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    padding: 22,
  },
  notificationModal: {
    backgroundColor: "#171324",
    borderColor: "#4C2E8C",
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 14,
  },
  modalTitle: { color: "#F3F0FF", fontSize: 17, fontWeight: "800" },
  notificationRow: {
    alignItems: "center",
    borderTopColor: "#30263D",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
  },
  notificationItemText: {
    color: "#D8D2E2",
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  dismissButton: {
    alignItems: "center",
    backgroundColor: "#7C3AED",
    borderRadius: 8,
    marginTop: 12,
    padding: 12,
  },
  dismissButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
