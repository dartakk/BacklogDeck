import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { supabase } from "./superbase";

export interface SteamConnection {
  steam_id: string;
  profile_url: string | null;
  linked_at: string;
  synced_at: string | null;
}

export const getSteamConnection = async (): Promise<SteamConnection | null> => {
  const { data, error } = await supabase
    .from("steam_connections")
    .select("steam_id, profile_url, linked_at, synced_at")
    .maybeSingle();

  if (error) throw error;
  return data as SteamConnection | null;
};

export const connectSteam = async (): Promise<
  "connected" | "linked" | null
> => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error("Accedi prima di collegare Steam.");

  const redirectUrl =
    Platform.OS === "web"
      ? `${window.location.origin}/steam/callback`
      : Linking.createURL("steam/callback", { scheme: "backlogdeck" });

  const { data, error } = await supabase.functions.invoke("steam-connect", {
    body: { action: "start", redirectUrl },
  });
  if (error) throw error;
  if (!data?.authUrl)
    throw new Error("Steam non ha restituito l'URL di accesso.");

  const result = await WebBrowser.openAuthSessionAsync(
    data.authUrl,
    redirectUrl,
  );
  if (result.type !== "success" || !result.url) return null;

  const callbackParams = Linking.parse(result.url).queryParams ?? {};
  const status = callbackParams.status;
  if (status === "connected" || status === "linked") return status;
  throw new Error("Steam non ha completato il collegamento. Riprova.");
};

export const syncSteamLibrary = async () => {
  const { data, error } = await supabase.functions.invoke("steam-connect", {
    body: { action: "sync" },
  });
  if (error) throw error;
  return Number(data?.syncedCount ?? 0);
};

export const disconnectSteam = async () => {
  const { error } = await supabase.functions.invoke("steam-connect", {
    body: { action: "disconnect" },
  });
  if (error) throw error;
};
