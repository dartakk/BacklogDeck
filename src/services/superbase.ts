import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import { RAWGGame } from "./rawg";

// URL Base del progetto (Rimosso /rest/v1/ finale)
const supabaseUrl = "https://npkzojijhljgnvmopfxz.supabase.co";

// Assicurati che qui ci sia la chiave completa copiata da Supabase
const supabaseAnonKey = "sb_publishable_dw2aXvgzBPPQzLEqJUnjow_N6jHsZpl";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Salva un gioco nella tabella 'games' se non esiste già,
 * e lo aggiunge alla libreria dell'utente ('user_library').
 */
export const addGameToUserLibrary = async (
  userId: string,
  game: RAWGGame,
  status: "backlog" | "playing" | "completed" | "dropped" = "backlog",
) => {
  try {
    // 1. Inserisci o aggiorna il gioco nella tabella 'games'
    const { error: gameError } = await supabase.from("games").upsert(
      {
        id: game.id,
        title: game.name,
        cover_url: game.background_image,
        release_date: game.released,
      },
      { onConflict: "id" },
    );

    if (gameError) throw gameError;

    // 2. Aggiungi il gioco alla libreria dell'utente
    const { data: libraryData, error: libraryError } = await supabase
      .from("user_library")
      .upsert({
        user_id: userId,
        game_id: game.id,
        status: status,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (libraryError) throw libraryError;

    return { success: true, data: libraryData };
  } catch (error) {
    console.error("Errore durante il salvataggio del gioco:", error);
    return { success: false, error };
  }
};

export const getUserLibrary = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_library")
    .select(
      `
      id,
      status,
      game_id,
      games (
        id,
        title,
        cover_url,
        release_date
      )
    `,
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Errore nel recupero libreria:", error);
    return [];
  }

  return data || [];
};

// Aggiorna lo stato di un gioco nella libreria
export const updateGameStatus = async (
  libraryItemId: string,
  newStatus: "backlog" | "playing" | "completed" | "dropped",
) => {
  const { error } = await supabase
    .from("user_library")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", libraryItemId);

  return !error;
};

// Rimuove un gioco dalla libreria dell'utente
export const removeGameFromLibrary = async (libraryItemId: string) => {
  const { error } = await supabase
    .from("user_library")
    .delete()
    .eq("id", libraryItemId);

  return !error;
};

export const updateGameDetails = async (
  id: string,
  rating: number,
  notes: string
) => {
  const { error } = await supabase
    .from("user_games")
    .update({ rating, notes })
    .eq("id", id);

  if (error) {
    console.error("Errore aggiornamento dettaglio:", error.message);
    return false;
  }
  return true;
};