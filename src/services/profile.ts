import { supabase } from "./superbase";

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  rankTitle: string;
  stats: {
    total: number;
    backlog: number;
    playing: number;
    completed: number;
    dropped: number;
  };
}

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    // 1. Recupera i dati base dalla tabella profiles (se esiste) o usa l'utente auth
    const { data: authUser } = await supabase.auth.getUser();
    
    // 2. Recupera la libreria dell'utente per calcolare le statistiche e il rank
    const { data: library, error } = await supabase
      .from("user_library")
      .select("status")
      .eq("user_id", userId);

    if (error) throw error;

    const stats = {
      total: library?.length || 0,
      backlog: library?.filter((item) => item.status === "backlog").length || 0,
      playing: library?.filter((item) => item.status === "playing").length || 0,
      completed: library?.filter((item) => item.status === "completed").length || 0,
      dropped: library?.filter((item) => item.status === "dropped").length || 0,
    };

    // 3. Logica per il Rank da "Accumulatore Seriale" / "Spendaccione"
    let rankTitle = "🎮 Videogiocatore Casual";
    if (stats.backlog > 15 && stats.backlog > stats.completed * 2) {
      rankTitle = "📦 Accumulatore Seriale di Backlog";
    } else if (stats.backlog > 30) {
      rankTitle = "💸 Spendaccione Cronico (Mai Giocati)";
    } else if (stats.completed > 10) {
      rankTitle = "🏆 Cacciatore di Titoli Completati";
    } else if (stats.playing > 0) {
      rankTitle = "⚡ Giocatore in Trincea";
    }

    return {
      id: userId,
      username: authUser.user?.email?.split("@")[0] || "Gamer",
      avatar_url: authUser.user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300",
      bio: "Collezionista di mondi digitali e cacciatore di sconti su Steam.",
      rankTitle,
      stats,
    };
  } catch (err) {
    console.error("Errore recupero profilo:", err);
    return null;
  }
};