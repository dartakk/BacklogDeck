import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../services/superbase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animazioni per il flusso viola e il logo
  const flowAnim1 = useRef(new Animated.Value(0)).current;
  const flowAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Movimento oscillante fluido per il primo alone viola (Flusso 1)
    Animated.loop(
      Animated.sequence([
        Animated.timing(flowAnim1, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flowAnim1, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 2. Movimento oscillante opposto per il secondo alone viola (Flusso 2)
    Animated.loop(
      Animated.sequence([
        Animated.timing(flowAnim2, {
          toValue: 1,
          duration: 5500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flowAnim2, {
          toValue: 0,
          duration: 5500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 3. Effetto respiro discreto sull'icona del pad
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [flowAnim1, flowAnim2, pulseAnim]);

  // Trasformazioni di traslazione e opacità per simulare il flusso fluido
  const translateY1 = flowAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 40],
  });
  const translateX1 = flowAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 30],
  });

  const translateY2 = flowAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [30, -40],
  });
  const translateX2 = flowAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -30],
  });

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Attenzione",
        "Inserisci sia l'email che la password per proseguire.",
      );
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // REGISTRAZIONE UTENTE
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          Alert.alert("Errore Registrazione", error.message);
        } else if (data.user && data.session) {
          Alert.alert("Registrazione Completata!", "Benvenuto su BacklogDeck!");
        } else {
          Alert.alert(
            "Registrazione completata!",
            "Se la conferma email è attiva su Supabase, controlla la tua casella di posta, altrimenti prova ad accedere.",
          );
        }
      } else {
        // ACCESSO UTENTE
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          Alert.alert("Errore di Accesso", error.message);
        }
      }
    } catch (err: any) {
      Alert.alert(
        "Errore imprevisto",
        err.message || "Si è verificato un errore.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* FLUSSO VIOLA ANIMATO 1 (Alto Sinistra) */}
      <Animated.View
        style={[
          styles.purpleGlow1,
          {
            transform: [
              { translateY: translateY1 },
              { translateX: translateX1 },
            ],
          },
        ]}
      />

      {/* FLUSSO VIOLA ANIMATO 2 (Basso Destra) */}
      <Animated.View
        style={[
          styles.purpleGlow2,
          {
            transform: [
              { translateY: translateY2 },
              { translateX: translateX2 },
            ],
          },
        ]}
      />

      <View style={styles.card}>
        <View style={styles.header}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="game-controller" size={52} color="#A855F7" />
          </Animated.View>
          <Text style={styles.title}>BacklogDeck</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? "Crea il tuo Profilo Gamer" : "Accedi al tuo Backlog"}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#8E8A9F"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8E8A9F"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#8E8A9F"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8E8A9F"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAuth}
            disabled={loading}
          >
            <LinearGradient
              colors={["#A855F7", "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? "Registrati Subito" : "Accedi"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? "Hai già un account? Accedi"
                : "Non hai un account? Registrati qui"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0B14",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  purpleGlow1: {
    position: "absolute",
    top: "15%",
    left: "10%",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#8B5CF6",
    opacity: 0.35,
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 60,
    elevation: 20,
  },
  purpleGlow2: {
    position: "absolute",
    bottom: "15%",
    right: "10%",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#6D28D9",
    opacity: 0.3,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 70,
    elevation: 20,
  },
  card: {
    backgroundColor: "#171324",
    borderRadius: 24,
    padding: 26,
    borderWidth: 1,
    borderColor: "#2A233D",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#F3F0FF",
    marginTop: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#8E8A9F",
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F192F",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A233D",
    paddingHorizontal: 14,
    height: 52,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#F3F0FF",
    fontSize: 15,
  },
  button: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  switchBtn: {
    alignItems: "center",
    marginTop: 12,
  },
  switchText: {
    color: "#A855F7",
    fontSize: 14,
    fontWeight: "500",
  },
});
