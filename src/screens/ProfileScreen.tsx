import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { getUserProfile, UserProfile } from "../services/profile";
import { supabase } from "../services/superbase";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      const userProfile = await getUserProfile(sessionData.session.user.id);
      setProfile(userProfile);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Profilo */}
      <View style={styles.headerCard}>
        <Image source={{ uri: profile?.avatar_url }} style={styles.avatar} />
        <Text style={styles.username}>{profile?.username}</Text>
        <Text style={styles.bio}>{profile?.bio}</Text>

        {/* Badge Rank */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{profile?.rankTitle}</Text>
        </View>
      </View>

      {/* Sezione Statistiche / Backlog Meter */}
      <Text style={styles.sectionTitle}>Statistiche Libreria</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{profile?.stats.total || 0}</Text>
          <Text style={styles.statLabel}>Totali</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: "#38bdf8" }]}>{profile?.stats.backlog || 0}</Text>
          <Text style={styles.statLabel}>Backlog</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: "#facc15" }]}>{profile?.stats.playing || 0}</Text>
          <Text style={styles.statLabel}>In Corso</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: "#4ade80" }]}>{profile?.stats.completed || 0}</Text>
          <Text style={styles.statLabel}>Completati</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>Esci dall'Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121214" },
  content: { padding: 20, alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121214" },
  headerCard: {
    width: "100%",
    backgroundColor: "#1a1a1e",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a32",
    marginBottom: 24,
  },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 16, borderWidth: 2, borderColor: "#6366f1" },
  username: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 6 },
  bio: { fontSize: 14, color: "#a1a1aa", textAlign: "center", marginBottom: 16 },
  rankBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.4)",
  },
  rankText: { color: "#818cf8", fontWeight: "bold", fontSize: 13 },
  sectionTitle: { width: "100%", fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 12 },
  statsGrid: { width: "100%", flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: "#1a1a1e",
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a32",
  },
  statNumber: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  statLabel: { fontSize: 11, color: "#a1a1aa" },
  logoutButton: {
    width: "100%",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  logoutText: { color: "#f87171", fontWeight: "bold", fontSize: 16 },
});