import { getGameDetails } from "@/services/rawg";
import {
    addGameToLibrary,
    getUserLibrary,
    removeGameFromLibrary,
    supabase,
    updateGameDetails,
    updateGameStatus,
} from "@/services/superbase";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Share2, Star } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import AffiliateLinks from "../components/AffiliateLinks";
import AnimatedBackdrop from "../components/AnimatedBackdrop";
import { publishReview } from "../services/community";

type StatusType = "backlog" | "playing" | "completed" | "dropped";

interface GameDetailProps {
  id?: string | number;
  gameId?: string | number;
}

export default function GameDetailScreen(props: GameDetailProps) {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ id: string }>();

  const rawId = props.gameId || props.id || searchParams.id;
  const gameId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(gameId));
  const [libraryItem, setLibraryItem] = useState<any>(null);
  const [personalRating, setPersonalRating] = useState(0);
  const [personalNotes, setPersonalNotes] = useState("");
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [sharePreviewVisible, setSharePreviewVisible] = useState(false);
  const shareCardRef = useRef<View | null>(null);

  const loadGameData = useCallback(async () => {
    try {
      setLoading(true);
      const parsedId =
        typeof gameId === "string" ? parseInt(gameId, 10) : gameId;

      if (!parsedId || isNaN(parsedId)) {
        console.warn("ID non valido o NaN:", gameId);
        setLoading(false);
        return;
      }

      const details = await getGameDetails(parsedId);
      setGame(details);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const library = await getUserLibrary(user.id);
        const existing = library.find(
          (item: any) =>
            item.game_id === parsedId || item.games?.id === parsedId,
        );
        setLibraryItem(existing || null);
        setPersonalRating(existing?.rating ?? 0);
        setPersonalNotes(existing?.notes ?? "");
        setSessionMinutes(existing?.session_minutes ?? null);
      } else {
        setLibraryItem(null);
        setPersonalRating(0);
        setPersonalNotes("");
        setSessionMinutes(null);
      }
    } catch (error: any) {
      console.error("Errore recupero dettaglio:", error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useFocusEffect(
    useCallback(() => {
      if (gameId) {
        void loadGameData();
      }
    }, [gameId, loadGameData]),
  );

  const handleAddOrUpdate = async (status: StatusType) => {
    if (!game) return;

    if (libraryItem) {
      const success = await updateGameStatus(libraryItem.id, status);
      if (success) {
        Alert.alert("Aggiornato", `Stato cambiato in ${status.toUpperCase()}`);
        loadGameData();
      } else {
        Alert.alert("Errore", "Impossibile aggiornare lo stato.");
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(
          "Accesso richiesto",
          "Accedi per aggiungere giochi alla libreria.",
        );
        return;
      }

      const success = await addGameToLibrary(
        user.id,
        game.id,
        game.name,
        game.background_image,
        game.released || "",
        status,
      );
      if (success) {
        Alert.alert(
          "Aggiunto",
          `"${game.name}" aggiunto come ${status.toUpperCase()}`,
        );
        loadGameData();
      } else {
        Alert.alert("Errore", "Impossibile aggiungere il gioco.");
      }
    }
  };

  const handleRemove = async () => {
    if (!libraryItem) return;
    const success = await removeGameFromLibrary(libraryItem.id);
    if (success) {
      Alert.alert("Rimosso", "Gioco rimosso dal tuo backlog.");
      setLibraryItem(null);
    } else {
      Alert.alert("Errore", "Impossibile rimuovere il gioco.");
    }
  };

  const handleSavePersonalDetails = async () => {
    if (!libraryItem) {
      Alert.alert(
        "Aggiungi il gioco",
        "Salva il gioco in libreria prima di annotarlo.",
      );
      return;
    }

    const saved = await updateGameDetails(
      libraryItem.id,
      personalRating || null,
      personalNotes,
      sessionMinutes,
    );
    if (saved) {
      Alert.alert("Salvato", "Voto e note personali sono stati aggiornati.");
    } else {
      Alert.alert("Errore", "Non è stato possibile salvare i dettagli.");
    }
  };

  const handlePublishReview = async () => {
    if (!libraryItem) {
      Alert.alert(
        "Aggiungi il gioco",
        "Per recensirlo, aggiungilo prima alla libreria.",
      );
      return;
    }

    setSavingReview(true);
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error("Accedi per pubblicare una recensione.");

      await publishReview(
        user.id,
        Number(game.id),
        game.name,
        game.background_image ?? null,
        reviewRating,
        reviewContent,
      );
      setReviewContent("");
      Alert.alert("Recensione pubblicata", "La trovi nel feed Community.");
    } catch (error) {
      console.error("Errore pubblicazione recensione:", error);
      Alert.alert("Recensione non pubblicata", "Controlla il testo e riprova.");
    } finally {
      setSavingReview(false);
    }
  };

  const handleShareResult = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Condivisione immagine",
        "Esporta la card da un dispositivo iOS o Android per condividerla su Instagram.",
      );
      return;
    }

    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error(
          "La condivisione non è disponibile su questo dispositivo.",
        );
      }
      if (!shareCardRef.current) throw new Error("Anteprima non pronta.");

      const imageUri = await captureRef(shareCardRef.current, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      await Sharing.shareAsync(imageUri, {
        dialogTitle: "Condividi il risultato",
        mimeType: "image/png",
        UTI: "public.png",
      });
      setSharePreviewVisible(false);
    } catch (error) {
      console.error("Errore condivisione risultato:", error);
      Alert.alert(
        "Condivisione non riuscita",
        error instanceof Error ? error.message : "Riprova tra poco.",
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00B4D8" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Gioco non trovato.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Torna indietro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <AnimatedBackdrop />
        {game.background_image ? (
          <Image
            source={{ uri: game.background_image }}
            style={styles.coverImage}
          />
        ) : (
          <View style={[styles.coverImage, styles.placeholder]} />
        )}

        <Text style={styles.title}>{game.name}</Text>

        {game.released && (
          <Text style={styles.releaseDate}>Uscita: {game.released}</Text>
        )}

        {game.description_raw && (
          <Text style={styles.description}>{game.description_raw}</Text>
        )}

        <View style={styles.detailsPanel}>
          <Text style={styles.sectionTitle}>Il tuo voto e le tue note</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() =>
                  setPersonalRating(value === personalRating ? 0 : value)
                }
                accessibilityRole="button"
                accessibilityLabel={`Voto personale ${value} su 5`}
              >
                <Star
                  size={26}
                  color={value <= personalRating ? "#FBBF24" : "#6B6475"}
                  fill={value <= personalRating ? "#FBBF24" : "transparent"}
                />
              </TouchableOpacity>
            ))}
            <Text style={styles.ratingCaption}>
              {personalRating ? `${personalRating}/5` : "Non valutato"}
            </Text>
          </View>
          <Text style={styles.detailsLabel}>Durata stimata della sessione</Text>
          <View style={styles.durationOptions}>
            {[
              { value: null, label: "Non impostata" },
              { value: 30, label: "30 min" },
              { value: 60, label: "1 ora" },
              { value: 120, label: "2 ore" },
            ].map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.durationOption,
                  sessionMinutes === option.value &&
                    styles.durationOptionActive,
                ]}
                onPress={() => setSessionMinutes(option.value)}
              >
                <Text
                  style={[
                    styles.durationOptionText,
                    sessionMinutes === option.value &&
                      styles.durationOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={personalNotes}
            onChangeText={setPersonalNotes}
            placeholder="Note personali..."
            placeholderTextColor="#8B82A8"
            multiline
            maxLength={2000}
            style={styles.notesInput}
          />
          <TouchableOpacity
            style={styles.saveDetailsButton}
            onPress={handleSavePersonalDetails}
          >
            <Text style={styles.saveDetailsText}>Salva dettagli</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsPanel}>
          <Text style={styles.sectionTitle}>Condividi una recensione</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setReviewRating(value)}
                accessibilityRole="button"
                accessibilityLabel={`Voto recensione ${value} su 5`}
              >
                <Star
                  size={24}
                  color={value <= reviewRating ? "#FBBF24" : "#6B6475"}
                  fill={value <= reviewRating ? "#FBBF24" : "transparent"}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={reviewContent}
            onChangeText={setReviewContent}
            placeholder="Cosa ne pensi del gioco?"
            placeholderTextColor="#8B82A8"
            multiline
            maxLength={2000}
            style={styles.notesInput}
          />
          <TouchableOpacity
            style={[
              styles.saveDetailsButton,
              savingReview && styles.disabledButton,
            ]}
            onPress={handlePublishReview}
            disabled={savingReview}
          >
            <Text style={styles.saveDetailsText}>
              {savingReview ? "Pubblicazione..." : "Pubblica nel feed"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => setSharePreviewVisible(true)}
          >
            <Share2 size={17} color="#E5E0F5" />
            <Text style={styles.shareButtonText}>Condividi risultato</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Gestisci nel tuo Backlog:</Text>

          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#FFB703" }]}
              onPress={() => handleAddOrUpdate("playing")}
            >
              <Text style={styles.btnText}>In Corso</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#00B4D8" }]}
              onPress={() => handleAddOrUpdate("backlog")}
            >
              <Text style={styles.btnText}>In Backlog</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#38B000" }]}
              onPress={() => handleAddOrUpdate("completed")}
            >
              <Text style={styles.btnText}>Completato</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#E63946" }]}
              onPress={() => handleAddOrUpdate("dropped")}
            >
              <Text style={styles.btnText}>Abbandonato</Text>
            </TouchableOpacity>
          </View>

          {libraryItem && (
            <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
              <Text style={styles.removeBtnText}>Elimina dalla Libreria</Text>
            </TouchableOpacity>
          )}
        </View>

        <AffiliateLinks gameTitle={game.name} />
      </ScrollView>
      <Modal
        visible={sharePreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSharePreviewVisible(false)}
      >
        <View style={styles.shareModalBackdrop}>
          <View ref={shareCardRef} collapsable={false} style={styles.shareCard}>
            {game.background_image ? (
              <Image
                source={{ uri: game.background_image }}
                style={styles.shareCardImage}
              />
            ) : null}
            <View style={styles.shareCardScrim} />
            <View style={styles.shareCardContent}>
              <Text style={styles.shareBrand}>BACKLOGDECK</Text>
              <View>
                <Text style={styles.shareStatus}>
                  {libraryItem?.status === "completed"
                    ? "COMPLETATO"
                    : "NON COMPLETATO"}
                </Text>
                <Text style={styles.shareGameTitle}>{game.name}</Text>
                <View style={styles.shareRatingRow}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      size={21}
                      color={value <= personalRating ? "#FBBF24" : "#81798D"}
                      fill={value <= personalRating ? "#FBBF24" : "transparent"}
                    />
                  ))}
                </View>
                <Text style={styles.shareRatingText}>
                  {personalRating ? `${personalRating}/5` : "NESSUN VOTO"}
                </Text>
              </View>
              <Text style={styles.shareFooter}>LA MIA PROSSIMA AVVENTURA</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.shareExportButton}
            onPress={handleShareResult}
          >
            <Share2 size={17} color="#FFFFFF" />
            <Text style={styles.shareExportText}>Esporta e condividi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareCancelButton}
            onPress={() => setSharePreviewVisible(false)}
          >
            <Text style={styles.shareCancelText}>Annulla</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  coverImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  placeholder: {
    backgroundColor: "#2A2A2A",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  releaseDate: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 20,
    marginBottom: 24,
  },
  detailsPanel: {
    backgroundColor: "#171324",
    borderColor: "#2A233D",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  ratingCaption: { color: "#C8C2E0", fontSize: 12, marginLeft: 4 },
  detailsLabel: {
    color: "#C8C2E0",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  durationOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 12,
  },
  durationOption: {
    backgroundColor: "#0D0B14",
    borderColor: "#393244",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  durationOptionActive: { backgroundColor: "#6D28D9", borderColor: "#A855F7" },
  durationOptionText: { color: "#C8C2E0", fontSize: 11, fontWeight: "600" },
  durationOptionTextActive: { color: "#FFFFFF" },
  notesInput: {
    backgroundColor: "#0D0B14",
    borderColor: "#393244",
    borderRadius: 8,
    borderWidth: 1,
    color: "#F3F0FF",
    minHeight: 84,
    padding: 12,
    textAlignVertical: "top",
  },
  saveDetailsButton: {
    alignItems: "center",
    backgroundColor: "#7C3AED",
    borderRadius: 8,
    marginTop: 10,
    padding: 12,
  },
  saveDetailsText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  disabledButton: { opacity: 0.6 },
  shareButton: {
    alignItems: "center",
    backgroundColor: "#241B3B",
    borderColor: "#4C2E8C",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 10,
    padding: 12,
  },
  shareButtonText: { color: "#E5E0F5", fontSize: 13, fontWeight: "700" },
  shareModalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  shareCard: {
    backgroundColor: "#07050D",
    borderColor: "#6D28D9",
    borderRadius: 16,
    borderWidth: 1,
    height: 512,
    overflow: "hidden",
    width: 288,
  },
  shareCardImage: { height: "100%", position: "absolute", width: "100%" },
  shareCardScrim: {
    backgroundColor: "rgba(7, 5, 13, 0.62)",
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  shareCardContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 22,
  },
  shareBrand: { color: "#C084FC", fontSize: 12, fontWeight: "800" },
  shareStatus: { color: "#22D3EE", fontSize: 11, fontWeight: "800" },
  shareGameTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 8,
  },
  shareRatingRow: { flexDirection: "row", gap: 5, marginTop: 14 },
  shareRatingText: {
    color: "#F3F0FF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 7,
  },
  shareFooter: { color: "#D8D2E2", fontSize: 10, fontWeight: "700" },
  shareExportButton: {
    alignItems: "center",
    backgroundColor: "#7C3AED",
    borderRadius: 9,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    width: 288,
  },
  shareExportText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  shareCancelButton: { marginTop: 12, padding: 8 },
  shareCancelText: { color: "#C8C2E0", fontSize: 13, fontWeight: "600" },
  actionsContainer: {
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  actionBtn: {
    width: "48%",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  removeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E63946",
    borderRadius: 8,
    alignItems: "center",
  },
  removeBtnText: {
    color: "#E63946",
    fontWeight: "bold",
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#00B4D8",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
