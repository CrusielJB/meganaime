import React, { useState, useEffect } from "react";
import { MessageSquare, EyeOff, Eye, ThumbsUp, ThumbsDown, Send, User as UserIcon, ShieldAlert, Sparkles, CornerDownRight } from "lucide-react";
import { User as UserType } from "../types";
import { safeLocalStorage } from "../utils/safeStorage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface Comment {
  id: string;
  targetId: string;
  userId: string;
  username: string;
  avatarUrl: string;
  content: string;
  createdAt: string;
  isSpoiler: boolean;
  likes: number;
  dislikes: number;
  userReaction?: "like" | "dislike" | null;
  replies?: Comment[];
}

interface CommentSectionProps {
  targetId: string; // animeId or episodeId
  title?: string;
  currentUser?: UserType | null;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  targetId,
  title = "Comentarios de la Comunidad",
  currentUser = null
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const storageKey = `megaAnime_comments_${targetId}`;

  // Load comments on mount
  useEffect(() => {
    async function loadComments() {
      // 1. Try local storage first for fast render
      const localData = safeLocalStorage.getItem(storageKey);
      if (localData) {
        try {
          setComments(JSON.parse(localData));
        } catch (e) {}
      }

      // 2. Try fetching from Firestore if configured
      if (db) {
        try {
          const docRef = doc(db, "comments", targetId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.list)) {
              setComments(data.list);
              safeLocalStorage.setItem(storageKey, JSON.stringify(data.list));
            }
          }
        } catch (e) {
          console.warn("Firestore comment fetch fallback:", e);
        }
      }
    }

    loadComments();
  }, [targetId]);

  // Save comments helper
  const saveComments = async (updatedList: Comment[]) => {
    setComments(updatedList);
    safeLocalStorage.setItem(storageKey, JSON.stringify(updatedList));

    if (db) {
      try {
        const docRef = doc(db, "comments", targetId);
        await setDoc(docRef, { list: updatedList }, { merge: true });
      } catch (e) {
        console.warn("Firestore comment save fallback:", e);
      }
    }
  };

  const activeProfile = currentUser?.profiles?.find(p => p.id === currentUser.activeProfileId);
  const userAvatar = activeProfile?.avatarUrl || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop";
  const username = activeProfile?.name || currentUser?.username || "Otaku Anónimo";

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || submitting) return;

    setSubmitting(true);
    const newComment: Comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      targetId,
      userId: currentUser?.id || "guest-id",
      username,
      avatarUrl: userAvatar,
      content: newCommentText.trim(),
      createdAt: new Date().toISOString(),
      isSpoiler,
      likes: 0,
      dislikes: 0,
      replies: []
    };

    const updated = [newComment, ...comments];
    await saveComments(updated);
    setNewCommentText("");
    setIsSpoiler(false);
    setSubmitting(false);
  };

  const handlePostReply = async (commentId: string) => {
    if (!replyText.trim()) return;

    const newReply: Comment = {
      id: `reply-${Date.now()}`,
      targetId,
      userId: currentUser?.id || "guest-id",
      username,
      avatarUrl: userAvatar,
      content: replyText.trim(),
      createdAt: new Date().toISOString(),
      isSpoiler: false,
      likes: 0,
      dislikes: 0
    };

    const updated = comments.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      return c;
    });

    await saveComments(updated);
    setReplyText("");
    setReplyingToId(null);
  };

  const handleReaction = async (commentId: string, type: "like" | "dislike") => {
    const updated = comments.map(c => {
      if (c.id === commentId) {
        let likes = c.likes;
        let dislikes = c.dislikes;
        let reaction = c.userReaction;

        if (reaction === type) {
          // Toggle off
          if (type === "like") likes = Math.max(0, likes - 1);
          if (type === "dislike") dislikes = Math.max(0, dislikes - 1);
          reaction = null;
        } else {
          if (reaction === "like") likes = Math.max(0, likes - 1);
          if (reaction === "dislike") dislikes = Math.max(0, dislikes - 1);

          if (type === "like") likes += 1;
          if (type === "dislike") dislikes += 1;
          reaction = type;
        }

        return { ...c, likes, dislikes, userReaction: reaction };
      }
      return c;
    });

    await saveComments(updated);
  };

  const toggleSpoilerReveal = (commentId: string) => {
    setRevealedSpoilers(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "Hace un momento";
    }
  };

  return (
    <div className="space-y-6 bg-neutral-900/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-rose-500 rounded-full" />
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-rose-500" />
            <span>{title}</span>
            <span className="text-xs text-neutral-400 font-medium">({comments.length})</span>
          </h2>
        </div>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handlePostComment} className="space-y-4">
        <div className="flex items-start gap-3">
          <img
            src={userAvatar}
            alt={username}
            className="h-10 w-10 rounded-full object-cover border border-white/10 shrink-0"
          />
          <div className="flex-1 space-y-3">
            <textarea
              rows={3}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Escribe tu comentario o teoría sobre este episodio..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
            />

            <div className="flex items-center justify-between">
              {/* Spoiler checkbox toggle */}
              <button
                type="button"
                onClick={() => setIsSpoiler(!isSpoiler)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isSpoiler
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-neutral-800 text-neutral-400 border-white/5 hover:text-white"
                }`}
              >
                <ShieldAlert className={`h-4 w-4 ${isSpoiler ? "text-amber-400" : "text-neutral-400"}`} />
                <span>¿Contiene Spoilers?</span>
              </button>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!newCommentText.trim() || submitting}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-rose-950 disabled:text-neutral-600 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Comentar</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comment List */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        {comments.length > 0 ? (
          comments.map((comment) => {
            const isRevealed = revealedSpoilers[comment.id];
            const isReplying = replyingToId === comment.id;

            return (
              <div key={comment.id} className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-3">
                {/* Comment Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={comment.avatarUrl} alt={comment.username} className="h-8 w-8 rounded-full object-cover" />
                    <div>
                      <span className="text-xs font-bold text-white block">{comment.username}</span>
                      <span className="text-[10px] text-neutral-500">{formatDate(comment.createdAt)}</span>
                    </div>
                  </div>

                  {comment.isSpoiler && (
                    <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      SPOILER
                    </span>
                  )}
                </div>

                {/* Comment Body */}
                {comment.isSpoiler && !isRevealed ? (
                  <div
                    onClick={() => toggleSpoilerReveal(comment.id)}
                    className="bg-neutral-900 border border-amber-500/20 rounded-xl p-3.5 text-center cursor-pointer hover:bg-neutral-850 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold">
                      <EyeOff className="h-4 w-4" />
                      <span>Este comentario contiene spoilers. Haz clic para revelar.</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-300 leading-relaxed pl-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}

                {/* Comment Actions (Like, Dislike, Reply) */}
                <div className="flex items-center gap-4 pt-2 text-xs">
                  <button
                    onClick={() => handleReaction(comment.id, "like")}
                    className={`flex items-center gap-1.5 transition-colors ${
                      comment.userReaction === "like" ? "text-rose-400 font-bold" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>{comment.likes}</span>
                  </button>

                  <button
                    onClick={() => handleReaction(comment.id, "dislike")}
                    className={`flex items-center gap-1.5 transition-colors ${
                      comment.userReaction === "dislike" ? "text-rose-400 font-bold" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span>{comment.dislikes}</span>
                  </button>

                  <button
                    onClick={() => setReplyingToId(isReplying ? null : comment.id)}
                    className="text-neutral-400 hover:text-white font-medium transition-colors"
                  >
                    Responder
                  </button>
                </div>

                {/* Reply Form */}
                {isReplying && (
                  <div className="pl-6 pt-3 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Responder a ${comment.username}...`}
                      className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      onClick={() => handlePostReply(comment.id)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl text-xs"
                    >
                      Enviar
                    </button>
                  </div>
                )}

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="pl-6 pt-2 space-y-2 border-l border-white/10">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="bg-neutral-900/60 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                            <CornerDownRight className="h-3 w-3" />
                            {reply.username}
                          </span>
                          <span className="text-[10px] text-neutral-500">{formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="text-xs text-neutral-300">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-neutral-500 space-y-2">
            <MessageSquare className="h-8 w-8 mx-auto opacity-40" />
            <p className="text-xs">Sé el primero en dejar un comentario para este episodio.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
