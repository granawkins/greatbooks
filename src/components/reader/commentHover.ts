/**
 * Toggle hover highlight on both text spans and margin card for a comment.
 * Pure DOM manipulation — no React state, instant response.
 */
export function setCommentHover(id: number, on: boolean) {
  // Toggle class on all text spans with this comment id
  document.querySelectorAll(`[data-comment-id="${id}"]`).forEach((el) => {
    el.classList.toggle("comment-hover", on);
  });
  // Toggle class on all word spans within the comment's underline range
  document.querySelectorAll(`[data-comment-ids~="${id}"]`).forEach((el) => {
    el.classList.toggle("comment-hover", on);
  });
  // Toggle class on the margin card
  document.querySelectorAll(`[data-margin-comment-id="${id}"]`).forEach((el) => {
    el.classList.toggle("comment-hover", on);
  });
}
