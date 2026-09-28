const RAWG_API_KEY = "5c41d609fb11446e96ce92d2bf315b8b";
const BASE_URL = "https://api.rawg.io/api";

export interface RAWGGame {
  id: number;
  name: string;
  released: string;
  background_image: string;
  metacritic: number;
  platforms: { platform: { id: number; name: string } }[];
}

/**
 * Cerca giochi per titolo tramite RAWG API
 */
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
