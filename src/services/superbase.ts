import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { RAWGGame } from "./rawg";

const supabaseUrl = "https://npkzojijhljgnvmopfxz.supabase.co";
const supabaseAnonKey = "sb_publishable_dw2aXvgzBPPQzLEqJUnjow_N6jHsZpl";

// Memoria di fallback temporanea per l'ambiente SSR del server
let memoryStorage: Record<string, string> = {};

const SafeStorage = {
  getItem: (key: string) => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return Promise.resolve(window.localStorage.getItem(key));
        }
      } catch (e) {}
      return Promise.resolve(memoryStorage[key] || null);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
          return Promise.resolve();
        }
      } catch (e) {}
      memoryStorage[key] = value;
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
          return Promise.resolve();
        }
      } catch (e) {}
      delete memoryStorage[key];
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

export const addGameToUserLibrary = async (
  userId: string,
  game: RAWGGame,
  status: "backlog" | "playing" | "completed" | "dropped" = "backlog"
) => {
  try {
    // 0. Assicuriamoci che esista un profilo per questo utente per evitare errori di foreign key
    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!profileCheck) {
      await supabase.from("profiles").insert({
        id: userId,
        username: "User_" + userId.slice(0, 6),
      });
    }

    // 1. Verifica e gestione della tabella games
    const { data: existingGame } = await supabase
      .from("games")
      .select("id")
      .eq("id", game.id)
      .maybeSingle();

    if (!existingGame) {
      await supabase.from("games").insert({
        id: game.id,
        title: game.name,
        cover_url: game.background_image,
        release_date: game.released,
      });
    } else {
      await supabase
        .from("games")
        .update({
          title: game.name,
          cover_url: game.background_image,
          release_date: game.released,
        })
        .eq("id", game.id);
    }

    // 2. Controlla se il gioco è già nella libreria dell'utente
    const { data: existingEntry, error: searchError } = await supabase
      .from("user_library")
      .select("id")
      .eq("user_id", userId)
      .eq("game_id", game.id)
      .maybeSingle();

    if (searchError) throw searchError;

    let libraryData;
    if (existingEntry) {
      const { data, error: updateError } = await supabase
        .from("user_library")
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq("id", existingEntry.id)
        .select();

      if (updateError) throw updateError;
      libraryData = data;
    } else {
      const { data, error: insertError } = await supabase
        .from("user_library")
        .insert({
          user_id: userId,
          game_id: game.id,
          status: status,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (insertError) throw insertError;
      libraryData = data;
    }

    return { success: true, data: libraryData };
  } catch (error) {
    console.error("Errore durante il salvataggio del gioco:", error);
    return { success: false, error };
  }
};

export const addGameToLibrary = async (
  userId: string,
  gameId: number,
  title: string,
  coverUrl: string,
  released: string,
  status: "backlog" | "playing" | "completed" | "dropped" = "backlog"
) => {
  const fakeGameObj: RAWGGame = {
    id: gameId,
    name: title,
    background_image: coverUrl,
    released: released,
    metacritic: 0,
    platforms: [],
  };

  const result = await addGameToUserLibrary(userId, fakeGameObj, status);
  return result.success;
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
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Errore nel recupero libreria:", error);
    return [];
  }

  return data || [];
};

export const updateGameStatus = async (
  libraryItemId: string,
  newStatus: "backlog" | "playing" | "completed" | "dropped"
) => {
  const { error } = await supabase
    .from("user_library")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", libraryItemId);

  if (error) {
    console.error("Errore updateGameStatus:", error.message);
    return false;
  }
  return true;
};

export const removeGameFromLibrary = async (libraryItemId: string) => {
  const { error } = await supabase
    .from("user_library")
    .delete()
    .eq("id", libraryItemId);

  if (error) {
    console.error("Errore removeGameFromLibrary:", error.message);
    return false;
  }
  return true;
};

export const updateGameDetails = async (
  id: string,
  rating: number,
  notes: string
) => {
  const { error } = await supabase
    .from("user_library")
    .update({ rating, notes })
    .eq("id", id);

  if (error) {
    console.error("Errore aggiornamento dettaglio:", error.message);
    return false;
  }
  return true;
};