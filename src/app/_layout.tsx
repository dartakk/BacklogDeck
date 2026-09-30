import { Tabs } from "expo-router";
import { Dices, Library, Newspaper, Search, User, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthScreen from "../screens/AuthScreen";
import { supabase } from "../services/superbase";

export default function Layout() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Errore Auth Supabase:", err);
        if (mounted) setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (mounted) {
          setSession(currentSession);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#171324",
          borderTopColor: "#2A233D",
          borderTopWidth: 1,
          height: 70 + (insets.bottom > 0 ? insets.bottom : 0),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "News",
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <Newspaper size={22} color={focused ? "#A855F7" : "#FFFFFF"} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? "#A855F7" : "#A3A3A3" },
                ]}
              >
                News
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Cerca",
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <Search size={22} color={focused ? "#A855F7" : "#FFFFFF"} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? "#A855F7" : "#A3A3A3" },
                ]}
              >
                Cerca
              </Text>
            </View>
          ),
        }}
      />
      {/* Aggiunta della Tab Libreria */}
      <Tabs.Screen
        name="library"
        options={{
          title: "Libreria",
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <Library size={22} color={focused ? "#A855F7" : "#FFFFFF"} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? "#A855F7" : "#A3A3A3" },
                ]}
              >
                Libreria
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profilo",
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <User size={22} color={focused ? "#A855F7" : "#FFFFFF"} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? "#A855F7" : "#A3A3A3" },
                ]}
              >
                Profilo
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="roulette"
        options={{
          title: "Roulette",
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <Dices size={22} color={focused ? "#A855F7" : "#FFFFFF"} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? "#A855F7" : "#A3A3A3" },
                ]}
              >
                Roulette
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <Users size={22} color={focused ? "#A855F7" : "#FFFFFF"} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? "#A855F7" : "#A3A3A3" },
                ]}
              >
                Community
              </Text>
            </View>
          ),
        }}
      />

      {/* Tab Nascoste */}
      <Tabs.Screen
        name="scanner"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="game/[id]"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0D0B14",
    justifyContent: "center",
    alignItems: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },
});