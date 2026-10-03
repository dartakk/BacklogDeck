import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../services/superbase";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Onde digitali fluide sullo sfondo
  const [waveAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const waveLoop = Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: true,
      }),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    waveLoop.start();
    pulseLoop.start();
    return () => {
      waveLoop.stop();
      pulseLoop.stop();
    };
  }, [pulseAnim, waveAnim]);

  const handleAuthEmail = async () => {
    if (!email || !password) {
      Alert.alert("Attenzione", "Inserisci email e password.");
      return;
    }

    setLoading(true);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) Alert.alert("Errore Accesso", error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert("Errore Registrazione", error.message);
      } else {
        Alert.alert(
          "Registrazione completata",
          "Controlla la tua email per confermare l'account.",
        );
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      // Se siamo su Web, usiamo direttamente l'origine corrente (es. http://localhost:8081)
      const redirectTo =
        Platform.OS === "web"
          ? window.location.origin
          : AuthSession.makeRedirectUri({
              scheme: "backlogdeck",
              path: "auth/callback",
            });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS === "web" ? false : true,
        },
      });

      if (error) throw error;

      // Gestione specifica per mobile con WebBrowser
      if (Platform.OS !== "web" && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
        );

        if (result.type === "success" && result.url) {
          const urlParams = new URLSearchParams(
            result.url.includes("#")
              ? result.url.split("#")[1]
              : result.url.split("?")[1],
          );
          const accessToken = urlParams.get("access_token");
          const refreshToken = urlParams.get("refresh_token");

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (error: any) {
      Alert.alert(
        "Errore Google",
        error.message || "Impossibile completare l'accesso con Google.",
      );
    } finally {
      setLoading(false);
    }
  };

  const translateXWave = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient
        colors={["#020205", "#0A0612", "#020205"]}
        style={styles.backgroundGradient}
      >
        {/* Linee di flusso stile live stream */}
        <Animated.View
          style={[
            styles.waveLineTop,
            { transform: [{ translateX: translateXWave }] },
          ]}
        />
        <Animated.View
          style={[
            styles.waveLineBottom,
            {
              transform: [
                { translateX: Animated.multiply(translateXWave, -1) },
              ],
            },
          ]}
        />

        <View style={styles.contentContainer}>
          {/* Logo Geometrico Tagliente */}
          <Animated.View
            style={[
              styles.logoContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.logoOuterFrame}>
              <LinearGradient
                colors={["#A855F7", "#581C87"]}
                style={styles.logoInnerCore}
              >
                <Ionicons name="game-controller" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={styles.logoGlowBar} />
          </Animated.View>

          <Text style={styles.appName}>
            BACKLOG<Text style={styles.appNameAccent}>DECK</Text>
          </Text>

          {/* Card Principale Tagliente */}
          <View style={styles.formCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerSlash} />
              <Text style={styles.cardTitle}>
                {isLogin ? "ACCEDI AL TUO ACCOUNT" : "REGISTRA NUOVO ACCOUNT"}
              </Text>
              <View style={styles.headerSlash} />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Indirizzo Email"
              placeholderTextColor="#4B5563"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#4B5563"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <View style={styles.settingsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.9}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    rememberMe && styles.checkboxActive,
                  ]}
                />
                <Text style={styles.checkboxLabel}>Ricordami</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.forgotText}>Password dimenticata?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAuthEmail}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#9333EA", "#6B21A8"]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isLogin ? "Accedi" : "Registrati"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>oppure</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Pulsante Google */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons
                name="logo-google"
                size={16}
                color="#E2E8F0"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.googleButtonText}>Continua con Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isLogin ? "Non hai un account? " : "Hai già un account? "}
                <Text style={styles.switchTextBold}>
                  {isLogin ? "Registrati" : "Accedi"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020205",
  },
  backgroundGradient: {
    flex: 1,
    width: width,
    height: height,
    justifyContent: "center",
    alignItems: "center",
  },
  waveLineTop: {
    position: "absolute",
    top: 80,
    width: width * 2,
    height: 1,
    backgroundColor: "rgba(168, 85, 247, 0.25)",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  waveLineBottom: {
    position: "absolute",
    bottom: 80,
    width: width * 2,
    height: 1,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
  },
  contentContainer: {
    width: "92%",
    maxWidth: 420,
    alignItems: "center",
    zIndex: 2,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  logoOuterFrame: {
    width: 68,
    height: 68,
    transform: [{ rotate: "45deg" }],
    backgroundColor: "#171026",
    borderWidth: 1.5,
    borderColor: "#C084FC",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  logoInnerCore: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-45deg" }],
  },
  logoGlowBar: {
    width: 50,
    height: 2,
    backgroundColor: "#C084FC",
    marginTop: 16,
    shadowColor: "#C084FC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 3.5,
    marginBottom: 28,
  },
  appNameAccent: {
    color: "#C084FC",
  },
  formCard: {
    width: "100%",
    backgroundColor: "#07050D",
    borderRadius: 4,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.4)",
    shadowColor: "#581C87",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  headerSlash: {
    width: 12,
    height: 2,
    backgroundColor: "#C084FC",
    marginHorizontal: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#E2E8F0",
    letterSpacing: 1.5,
  },
  input: {
    width: "100%",
    height: 46,
    backgroundColor: "#030206",
    borderRadius: 2,
    paddingHorizontal: 14,
    color: "#F1F5F9",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.25)",
    marginBottom: 12,
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 2,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxBox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: "#A855F7",
    backgroundColor: "#030206",
    marginRight: 8,
    borderRadius: 1,
  },
  checkboxActive: {
    backgroundColor: "#A855F7",
  },
  checkboxLabel: {
    color: "#9CA3AF",
    fontSize: 11,
  },
  forgotText: {
    color: "#C084FC",
    fontSize: 11,
    fontWeight: "600",
  },
  primaryButton: {
    width: "100%",
    height: 46,
    borderRadius: 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#C084FC",
  },
  buttonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
  },
  dividerText: {
    color: "#4B5563",
    paddingHorizontal: 8,
    fontSize: 11,
  },
  googleButton: {
    width: "100%",
    height: 46,
    backgroundColor: "#0B0714",
    borderRadius: 2,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.35)",
  },
  googleButtonText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  switchButton: {
    marginTop: 16,
    alignItems: "center",
  },
  switchText: {
    color: "#6B7280",
    fontSize: 11,
  },
  switchTextBold: {
    color: "#C084FC",
    fontWeight: "900",
  },
});
