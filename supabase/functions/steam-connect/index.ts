import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const steamOpenIdUrl = "https://steamcommunity.com/openid/login";
const steamOwnedGamesUrl =
  "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/";
const encoder = new TextEncoder();

interface SteamState {
  userId: string;
  redirectUrl: string;
  expiresAt: number;
}

interface SteamOwnedGame {
  appid: number;
  name: string;
  playtime_forever?: number;
  rtime_last_played?: number;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function encodeBase64Url(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function hmacKey() {
  const secret = Deno.env.get("STEAM_STATE_SECRET");
  if (!secret) throw new Error("STEAM_STATE_SECRET non configurato.");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createSignedState(userId: string, redirectUrl: string) {
  const payload: SteamState = {
    userId,
    redirectUrl,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  const encodedPayload = encodeBase64Url(
    encoder.encode(JSON.stringify(payload)),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    encoder.encode(encodedPayload),
  );
  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

async function readSignedState(state: string): Promise<SteamState> {
  const [encodedPayload, encodedSignature] = state.split(".");
  if (!encodedPayload || !encodedSignature)
    throw new Error("Stato Steam non valido.");

  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(),
    decodeBase64Url(encodedSignature),
    encoder.encode(encodedPayload),
  );
  if (!valid) throw new Error("Firma dello stato Steam non valida.");

  const payload = JSON.parse(
    new TextDecoder().decode(decodeBase64Url(encodedPayload)),
  ) as SteamState;
  if (payload.expiresAt < Date.now())
    throw new Error("Sessione Steam scaduta.");
  return payload;
}

function isAllowedRedirect(redirectUrl: string) {
  let candidate: URL;
  try {
    candidate = new URL(redirectUrl);
  } catch {
    return false;
  }

  if (
    candidate.protocol === "backlogdeck:" &&
    candidate.hostname === "steam" &&
    candidate.pathname === "/callback"
  ) {
    return true;
  }

  const allowedOrigins = (Deno.env.get("STEAM_WEB_REDIRECT_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return (
    candidate.protocol === "https:" && allowedOrigins.includes(candidate.origin)
  );
}

function makeAdminClient() {
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY non configurato.",
    );
  }

  return createClient(projectUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getFunctionUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  url.search = "";
  url.hash = "";
  return url;
}

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.replace(/^Bearer\s+/i, "");
  if (!accessToken) throw new Error("Sessione non autenticata.");

  const { data, error } = await makeAdminClient().auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Sessione non valida.");
  return data.user;
}

async function syncOwnedGames(userId: string, steamId: string) {
  const apiKey = Deno.env.get("STEAM_API_KEY");
  if (!apiKey) throw new Error("STEAM_API_KEY non configurata.");

  const ownedGamesUrl = new URL(steamOwnedGamesUrl);
  ownedGamesUrl.searchParams.set("key", apiKey);
  ownedGamesUrl.searchParams.set("steamid", steamId);
  ownedGamesUrl.searchParams.set("include_appinfo", "1");
  ownedGamesUrl.searchParams.set("include_played_free_games", "1");

  const response = await fetch(ownedGamesUrl);
  if (!response.ok)
    throw new Error(`Steam API ha risposto ${response.status}.`);

  const payload = await response.json();
  const ownedGames = payload.response?.games as SteamOwnedGame[] | undefined;
  if (!ownedGames) {
    throw new Error(
      "La libreria Steam è privata o non è disponibile per la sincronizzazione.",
    );
  }

  const admin = makeAdminClient();
  const syncedAt = new Date().toISOString();
  const chunkSize = 400;
  let syncedCount = 0;

  for (let offset = 0; offset < ownedGames.length; offset += chunkSize) {
    const chunk = ownedGames.slice(offset, offset + chunkSize);
    const catalogRows = chunk.map((game) => ({
      id: 10_000_000_000 + game.appid,
      external_id: `steam:${game.appid}`,
      title: game.name || `Steam App ${game.appid}`,
      cover_url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appid}/header.jpg`,
      platforms: ["steam"],
    }));

    const { data: savedGames, error: catalogError } = await admin
      .from("games")
      .upsert(catalogRows, { onConflict: "external_id" })
      .select("id, external_id");
    if (catalogError) throw catalogError;

    const gameIds = new Map(
      (savedGames ?? []).map((game) => [game.external_id, game.id]),
    );
    const userGameRows = chunk.map((game) => {
      const externalId = `steam:${game.appid}`;
      const gameId = gameIds.get(externalId);
      if (!gameId)
        throw new Error(`Gioco Steam ${game.appid} non salvato nel catalogo.`);

      return {
        user_id: userId,
        rawg_id: -game.appid,
        game_id: gameId,
        steam_app_id: game.appid,
        title: game.name || `Steam App ${game.appid}`,
        cover_url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appid}/header.jpg`,
        playtime_minutes: game.playtime_forever ?? 0,
        last_played_at: game.rtime_last_played
          ? new Date(game.rtime_last_played * 1000).toISOString()
          : null,
      };
    });

    const { error: ownershipError } = await admin
      .from("user_games")
      .upsert(userGameRows, { onConflict: "user_id,steam_app_id" });
    if (ownershipError) throw ownershipError;
    syncedCount += chunk.length;
  }

  const { error: connectionError } = await admin
    .from("steam_connections")
    .update({ synced_at: syncedAt })
    .eq("user_id", userId);
  if (connectionError) throw connectionError;

  return syncedCount;
}

async function handleStart(request: Request, body: Record<string, unknown>) {
  const user = await getAuthenticatedUser(request);
  const redirectUrl = String(body.redirectUrl ?? "");
  if (!isAllowedRedirect(redirectUrl))
    throw new Error("Callback app non autorizzato.");

  const state = await createSignedState(user.id, redirectUrl);
  const callbackUrl = getFunctionUrl(request.url);
  callbackUrl.searchParams.set("action", "callback");
  callbackUrl.searchParams.set("state", state);

  const realm = `${new URL(Deno.env.get("SUPABASE_URL")!).origin}/`;
  const parameters = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": callbackUrl.toString(),
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return jsonResponse({
    authUrl: `${steamOpenIdUrl}?${parameters.toString()}`,
  });
}

function redirectToApp(redirectUrl: string, status: string) {
  const destination = new URL(redirectUrl);
  destination.searchParams.set("status", status);
  return Response.redirect(destination.toString(), 302);
}

async function handleCallback(request: Request) {
  const callbackUrl = new URL(request.url);
  const stateToken = callbackUrl.searchParams.get("state");
  if (!stateToken) throw new Error("Stato Steam mancante.");

  const state = await readSignedState(stateToken);
  if (!isAllowedRedirect(state.redirectUrl))
    throw new Error("Callback app non autorizzato.");

  const expectedReturnTo = getFunctionUrl(request.url);
  expectedReturnTo.searchParams.set("action", "callback");
  expectedReturnTo.searchParams.set("state", stateToken);
  if (
    callbackUrl.searchParams.get("openid.return_to") !==
    expectedReturnTo.toString()
  ) {
    return redirectToApp(state.redirectUrl, "failed");
  }

  const claimedId = callbackUrl.searchParams.get("openid.claimed_id") ?? "";
  const steamIdMatch = claimedId.match(
    /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/,
  );
  if (
    !steamIdMatch ||
    callbackUrl.searchParams.get("openid.identity") !== claimedId
  ) {
    return redirectToApp(state.redirectUrl, "failed");
  }

  const verificationParameters = new URLSearchParams();
  for (const [key, value] of callbackUrl.searchParams.entries()) {
    if (key.startsWith("openid.")) verificationParameters.set(key, value);
  }
  verificationParameters.set("openid.mode", "check_authentication");

  const verificationResponse = await fetch(steamOpenIdUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verificationParameters,
  });
  const verificationText = await verificationResponse.text();
  if (!verificationResponse.ok || !verificationText.includes("is_valid:true")) {
    return redirectToApp(state.redirectUrl, "failed");
  }

  const steamId = steamIdMatch[1];
  const admin = makeAdminClient();
  const { error } = await admin.from("steam_connections").upsert(
    {
      user_id: state.userId,
      steam_id: steamId,
      profile_url: `https://steamcommunity.com/profiles/${steamId}`,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;

  try {
    await syncOwnedGames(state.userId, steamId);
    return redirectToApp(state.redirectUrl, "connected");
  } catch (syncError) {
    console.error("Steam collegato ma sincronizzazione fallita:", syncError);
    return redirectToApp(state.redirectUrl, "linked");
  }
}

async function handleAuthenticatedAction(request: Request, action: string) {
  const user = await getAuthenticatedUser(request);
  const admin = makeAdminClient();

  if (action === "sync") {
    const { data: connection, error } = await admin
      .from("steam_connections")
      .select("steam_id")
      .eq("user_id", user.id)
      .single();
    if (error) throw error;

    const syncedCount = await syncOwnedGames(user.id, connection.steam_id);
    return jsonResponse({ syncedCount });
  }

  if (action === "disconnect") {
    const { error: gamesError } = await admin
      .from("user_games")
      .delete()
      .eq("user_id", user.id)
      .not("steam_app_id", "is", null);
    if (gamesError) throw gamesError;

    const { error } = await admin
      .from("steam_connections")
      .delete()
      .eq("user_id", user.id);
    if (error) throw error;
    return jsonResponse({ disconnected: true });
  }

  throw new Error("Azione Steam non riconosciuta.");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    let body: Record<string, unknown> = {};
    if (request.method === "POST") {
      body = await request.json().catch(() => ({}));
    }
    const action = url.searchParams.get("action") ?? String(body.action ?? "");

    if (action === "callback" && request.method === "GET") {
      return await handleCallback(request);
    }
    if (action === "start") return await handleStart(request, body);
    if (action === "sync" || action === "disconnect") {
      return await handleAuthenticatedAction(request, action);
    }

    return jsonResponse({ error: "Azione non riconosciuta." }, 404);
  } catch (error) {
    console.error("Errore Steam Edge Function:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Errore Steam." },
      400,
    );
  }
});
