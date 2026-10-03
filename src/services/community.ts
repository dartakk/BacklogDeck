import { supabase } from "./superbase";

export interface CommunityProfile {
  username: string | null;
  avatar_url: string | null;
}

export interface CommunityComment {
  id: number | string;
  review_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: CommunityProfile | null;
}

export interface CommunityReview {
  id: number | string;
  user_id: string;
  game_id: string;
  rating: number;
  content: string;
  created_at: string;
  profiles: CommunityProfile | null;
  games: { title: string | null; cover_url: string | null } | null;
  likeCount: number;
  likedByCurrentUser: boolean;
  comments: CommunityComment[];
}

export interface CommunityNotification {
  id: number | string;
  type: string;
  review_id: string | null;
  actor_id: string | null;
  created_at: string;
}

type ReviewRow = Omit<
  CommunityReview,
  "likeCount" | "likedByCurrentUser" | "comments"
>;

export const getCommunityFeed = async (
  currentUserId: string,
): Promise<CommunityReview[]> => {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
        id,
        user_id,
        game_id,
        rating,
        content,
        created_at,
        profiles:profiles!reviews_user_id_fkey(username, avatar_url),
        games:user_games!reviews_game_fkey(title, cover_url)
      `,
    )
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw error;

  const reviewRows = (data ?? []) as unknown as ReviewRow[];
  if (reviewRows.length === 0) return [];

  const reviewIds = reviewRows.map((review) => String(review.id));
  const [likesResult, commentsResult] = await Promise.all([
    supabase
      .from("review_likes")
      .select("review_id, user_id")
      .in("review_id", reviewIds),
    supabase
      .from("comments")
      .select(
        `
          id,
          review_id,
          user_id,
          content,
          created_at,
          profiles:profiles!comments_user_id_fkey(username, avatar_url)
        `,
      )
      .in("review_id", reviewIds)
      .order("created_at", { ascending: true }),
  ]);

  if (likesResult.error) throw likesResult.error;
  if (commentsResult.error) throw commentsResult.error;

  const likeCounts = new Map<string, number>();
  const likedReviewIds = new Set<string>();
  for (const like of likesResult.data ?? []) {
    const reviewId = String(like.review_id);
    likeCounts.set(reviewId, (likeCounts.get(reviewId) ?? 0) + 1);
    if (like.user_id === currentUserId) likedReviewIds.add(reviewId);
  }

  const commentsByReview = new Map<string, CommunityComment[]>();
  for (const comment of (commentsResult.data ??
    []) as unknown as CommunityComment[]) {
    const comments = commentsByReview.get(comment.review_id) ?? [];
    comments.push(comment);
    commentsByReview.set(comment.review_id, comments);
  }

  return reviewRows.map((review) => {
    const reviewId = String(review.id);
    return {
      ...review,
      likeCount: likeCounts.get(reviewId) ?? 0,
      likedByCurrentUser: likedReviewIds.has(reviewId),
      comments: commentsByReview.get(reviewId) ?? [],
    };
  });
};

export const publishReview = async (
  userId: string,
  gameId: number,
  gameTitle: string,
  coverUrl: string | null,
  rating: number,
  content: string,
) => {
  const normalizedContent = content.trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Il voto deve essere compreso tra 1 e 5.");
  }
  if (!normalizedContent)
    throw new Error("Scrivi un breve parere prima di pubblicare.");

  const { data: userGame, error: userGameError } = await supabase
    .from("user_games")
    .upsert(
      {
        user_id: userId,
        rawg_id: gameId,
        title: gameTitle,
        cover_url: coverUrl,
      },
      { onConflict: "user_id,rawg_id" },
    )
    .select("id")
    .single();

  if (userGameError) throw userGameError;

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      user_id: userId,
      game_id: userGame.id,
      rating,
      content: normalizedContent,
      review_text: normalizedContent,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
};

export const publishReviewComment = async (
  userId: string,
  reviewId: number | string,
  content: string,
) => {
  const normalizedContent = content.trim();
  if (!normalizedContent) throw new Error("Il commento non può essere vuoto.");

  const { error } = await supabase.from("comments").insert({
    review_id: String(reviewId),
    user_id: userId,
    content: normalizedContent,
    comment_text: normalizedContent,
  });

  if (error) throw error;
};

export const setReviewLiked = async (
  userId: string,
  reviewId: number | string,
  liked: boolean,
) => {
  const reviewKey = String(reviewId);
  const query = supabase
    .from("review_likes")
    .delete()
    .eq("review_id", reviewKey)
    .eq("user_id", userId);

  if (liked) {
    const { error } = await query;
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("review_likes").insert({
    review_id: reviewKey,
    user_id: userId,
  });
  if (error) throw error;
};

export const getUnreadNotificationCount = async (userId: string) => {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
};

export const getUnreadNotifications = async (
  userId: string,
): Promise<CommunityNotification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, review_id, actor_id, created_at")
    .eq("user_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as CommunityNotification[];
};

export const markUnreadNotificationsRead = async (userId: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString(), is_read: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
};
