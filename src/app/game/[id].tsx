import { useLocalSearchParams } from "expo-router";
import GameDetailScreen from "@/screens/GameDetailScreen";

export default function GameDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameId = Array.isArray(id) ? id[0] : id;

  // @ts-ignore
  return <GameDetailScreen id={gameId} gameId={gameId} />;
}