const RAWG_API_KEY = "5c41d609fb11446e96ce92d2bf315b8b";
const BASE_URL = "https://api.rawg.io/api";

export interface RAWGGame {
  id: number;
  name: string;
  released: string;
  background_image: string;
  metacritic: number;
  platforms: { platform: { id: number; name: string } }[];
  genres?: { id: number; name: string }[];
}

export const lookupGameTitleByBarcode = async (
  barcode: string,
): Promise<string | null> => {
  const normalizedBarcode = barcode.replace(/\D/g, "");
  if (!/^\d{8,14}$/.test(normalizedBarcode)) {
    throw new Error("Il codice scansionato non è un barcode EAN/UPC valido.");
  }

  const response = await fetch(
    `https://api.upcitemdb.com/prod/trial/lookup?upc=${normalizedBarcode}`,
  );
  if (!response.ok) {
    throw new Error("La ricerca barcode è momentaneamente non disponibile.");
  }

  const result = await response.json();
  const title = result.items?.find(
    (item: { title?: string }) => item.title,
  )?.title;
  return typeof title === "string" ? title : null;
};

export const searchGames = async (query: string): Promise<RAWGGame[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=10`,
    );

    if (!response.ok) {
      throw new Error("Errore durante il recupero dei dati da RAWG");
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("RAWG Fetch Error:", error);
    return [];
  }
};

export const getGameDetails = async (id: any) => {
  try {
    let cleanId = id;
    if (typeof id === "object" && id !== null) {
      cleanId = id.id || id.game_id;
    }

    const numericId =
      typeof cleanId === "string" ? parseInt(cleanId, 10) : cleanId;

    if (!numericId || isNaN(numericId)) {
      console.error("ID non valido passato a getGameDetails:", id);
      return null;
    }

    const url = `${BASE_URL}/games/${numericId}?key=${RAWG_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Errore HTTP RAWG: ${response.status} su ID ${numericId}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(
      "RAWG Details Fetch Error Dettagliato:",
      error?.message || error,
    );
    return null;
  }
};
