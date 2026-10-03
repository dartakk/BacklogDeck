import { supabase } from "./superbase";

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  rankTitle: string;
  level: number;
  progress: number;
  nextRankTitle: string | null;
  reviewCount: number;
  stats: {
    total: number;
    backlog: number;
    playing: number;
    completed: number;
    dropped: number;
  };
}

const BACKLOG_LEVELS = [
  { title: "Nuovo esploratore", minimum: 0 },
  { title: "Cacciatore di mondi", minimum: 5 },
  { title: "Collezionista", minimum: 15 },
  { title: "Veterano del backlog", minimum: 30 },
  { title: "Leggenda", minimum: 60 },
];

export const getUserProfile = async (
  userId: string,
): Promise<UserProfile | null> => {
  try {
    const { data: authUser } = await supabase.auth.getUser();
    const { data: storedProfile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url, bio")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const { data: library, error } = await supabase
      .from("user_library")
      .select("status")
      .eq("user_id", userId);

    if (error) throw error;

    const stats = {
      total: library?.length || 0,
      backlog: library?.filter((item) => item.status === "backlog").length || 0,
      playing: library?.filter((item) => item.status === "playing").length || 0,
      completed:
        library?.filter((item) => item.status === "completed").length || 0,
      dropped: library?.filter((item) => item.status === "dropped").length || 0,
    };

    const { count: reviewCount, error: reviewError } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (reviewError) throw reviewError;

    let levelIndex = 0;
    for (let index = 1; index < BACKLOG_LEVELS.length; index += 1) {
      if (stats.backlog >= BACKLOG_LEVELS[index].minimum) levelIndex = index;
    }

    const currentLevel = BACKLOG_LEVELS[levelIndex];
    const nextLevel = BACKLOG_LEVELS[levelIndex + 1] ?? null;
    const progress = nextLevel
      ? Math.floor(
          ((stats.backlog - currentLevel.minimum) /
            (nextLevel.minimum - currentLevel.minimum)) *
            100,
        )
      : 100;

    return {
      id: userId,
      username:
        storedProfile?.username ||
        authUser.user?.email?.split("@")[0] ||
        "Gamer",
      avatar_url:
        storedProfile?.avatar_url ||
        authUser.user?.user_metadata?.avatar_url ||
        "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300",
      bio:
        storedProfile?.bio ||
        "Collezionista di mondi digitali e cacciatore di sconti su Steam.",
      rankTitle: currentLevel.title,
      level: levelIndex + 1,
      progress,
      nextRankTitle: nextLevel?.title ?? null,
      reviewCount: reviewCount ?? 0,
      stats,
    };
  } catch (err) {
    console.error("Errore recupero profilo:", err);
    return null;
  }
};

export const uploadProfileAvatar = async (
  userId: string,
  imageUri: string,
  mimeType?: string | null,
) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user || authData.user.id !== userId) {
    throw new Error("Non puoi modificare l'immagine di un altro profilo.");
  }

  const contentType = mimeType || "image/jpeg";
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new Error("Sono supportate immagini JPEG, PNG o WebP.");
  }

  const imageResponse = await fetch(imageUri);
  if (!imageResponse.ok)
    throw new Error("Impossibile leggere l'immagine selezionata.");
  const imageData = await imageResponse.arrayBuffer();
  if (imageData.byteLength > 2 * 1024 * 1024) {
    throw new Error("L'immagine deve essere inferiore a 2 MB.");
  }

  const { data: storedProfile, error: profileError } = await supabase
    .from("profiles")
    .select("username, bio")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(`${userId}/avatar`, imageData, { contentType, upsert: true });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage
    .from("avatars")
    .getPublicUrl(`${userId}/avatar`);
  const avatarUrl = `${publicUrl.publicUrl}?updated=${Date.now()}`;

  const { error: updateError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      username:
        storedProfile?.username ||
        authData.user.email?.split("@")[0] ||
        "Gamer",
      bio: storedProfile?.bio || "",
      avatar_url: avatarUrl,
    },
    { onConflict: "id" },
  );
  if (updateError) throw updateError;

  return avatarUrl;
};
