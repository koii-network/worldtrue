"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  Reply,
  ChevronDown,
  ChevronUp,
  Loader2,
  User,
} from "lucide-react";

interface Comment {
  id: string;
  eventId: string;
  parentId: string | null;
  authorName: string;
  content: string;
  upvotes: number;
  downvotes: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  replies: Comment[];
}

interface CommentsSectionProps {
  eventId: string;
  eventTitle?: string;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function CommentItem({
  comment,
  eventId,
  onReply,
  onVote,
  depth = 0,
}: {
  comment: Comment;
  eventId: string;
  onReply: (parentId: string) => void;
  onVote: (commentId: string, vote: "up" | "down") => void;
  depth?: number;
}) {
  const [showReplies, setShowReplies] = useState(depth < 2);

  return (
    <div className={`${depth > 0 ? "ml-4 pl-3 border-l border-gray-700" : ""}`}>
      <div className="py-2">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-200">
                {comment.authorName}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimeAgo(comment.createdAt)}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-gray-500">(edited)</span>
              )}
            </div>
            <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => onVote(comment.id, "up")}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-400 transition-colors"
              >
                <ThumbsUp className="w-3 h-3" />
                {comment.upvotes > 0 && <span>{comment.upvotes}</span>}
              </button>
              <button
                onClick={() => onVote(comment.id, "down")}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
              >
                <ThumbsDown className="w-3 h-3" />
                {comment.downvotes > 0 && <span>{comment.downvotes}</span>}
              </button>
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-1">
          {comment.replies.length > 0 && depth >= 2 && !showReplies && (
            <button
              onClick={() => setShowReplies(true)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 ml-9 mb-2"
            >
              <ChevronDown className="w-3 h-3" />
              Show {comment.replies.length} repl
              {comment.replies.length === 1 ? "y" : "ies"}
            </button>
          )}
          {showReplies && (
            <>
              {depth >= 2 && (
                <button
                  onClick={() => setShowReplies(false)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 ml-9 mb-2"
                >
                  <ChevronUp className="w-3 h-3" />
                  Hide replies
                </button>
              )}
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  eventId={eventId}
                  onReply={onReply}
                  onVote={onVote}
                  depth={depth + 1}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommentsSection({
  eventId,
  eventTitle,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("commentAuthorName") || "";
    }
    return "";
  });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/comments?eventId=${eventId}`);
      if (!response.ok) throw new Error("Failed to fetch comments");

      const data = await response.json();
      setComments(data.comments);
      setTotalComments(data.total);
    } catch (err) {
      setError("Failed to load comments");
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() || !authorName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          authorName: authorName.trim(),
          content: newComment.trim(),
          parentId: replyingTo,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit comment");

      // Save author name for future comments
      localStorage.setItem("commentAuthorName", authorName.trim());

      // Refresh comments
      await fetchComments();

      // Reset form
      setNewComment("");
      setReplyingTo(null);
    } catch (err) {
      setError("Failed to submit comment");
      console.error("Error submitting comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (commentId: string, vote: "up" | "down") => {
    try {
      await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commentId, vote }),
      });

      // Optimistically update the UI
      const updateVotes = (comments: Comment[]): Comment[] => {
        return comments.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              upvotes: vote === "up" ? c.upvotes + 1 : c.upvotes,
              downvotes: vote === "down" ? c.downvotes + 1 : c.downvotes,
            };
          }
          return { ...c, replies: updateVotes(c.replies) };
        });
      };

      setComments(updateVotes(comments));
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    setExpanded(true);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Find the parent comment name for reply indicator
  const findCommentAuthor = (
    comments: Comment[],
    id: string
  ): string | null => {
    for (const c of comments) {
      if (c.id === id) return c.authorName;
      const found = findCommentAuthor(c.replies, id);
      if (found) return found;
    }
    return null;
  };

  const replyingToAuthor = replyingTo
    ? findCommentAuthor(comments, replyingTo)
    : null;

  return (
    <div className="border-t border-gray-700">
      {/* Header - collapsible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-200">
            Comments
            {totalComments > 0 && (
              <span className="text-gray-400 ml-1">({totalComments})</span>
            )}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-3 pb-3">
          {/* Comment form */}
          <form onSubmit={handleSubmit} className="mb-4">
            {!authorName && (
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-2"
                required
              />
            )}

            {replyingTo && replyingToAuthor && (
              <div className="flex items-center justify-between mb-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
                <span>Replying to {replyingToAuthor}</span>
                <button
                  type="button"
                  onClick={cancelReply}
                  className="hover:text-blue-300"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  replyingTo ? "Write a reply..." : "Add a comment..."
                }
                rows={2}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                required
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim() || !authorName.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-white transition-colors self-end"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {authorName && (
              <p className="text-xs text-gray-500 mt-1">
                Posting as{" "}
                <button
                  type="button"
                  onClick={() => setAuthorName("")}
                  className="text-blue-400 hover:underline"
                >
                  {authorName}
                </button>
              </p>
            )}
          </form>

          {/* Error message */}
          {error && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Comments list */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              <div className="space-y-1 divide-y divide-gray-800">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    eventId={eventId}
                    onReply={handleReply}
                    onVote={handleVote}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
