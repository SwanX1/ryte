// Handles like/unlike button clicks for posts

document.addEventListener('DOMContentLoaded', function () {
  document.body.addEventListener('click', async function (e) {
    if (e.target.classList.contains('like-btn')) {
      const btn = e.target;
      const postId = btn.getAttribute('data-post-id');
      const liked = btn.getAttribute('data-liked') === 'true';
      const likeCountSpan = document.querySelector(`.like-count[data-post-id='${postId}']`);
      btn.disabled = true;
      try {
        if (!liked) {
          // Like
          const res = await fetch(`/api/like/${postId}`, { method: 'POST', credentials: 'include' });
          if (res.ok) {
            btn.textContent = 'Unlike';
            btn.setAttribute('data-liked', 'true');
            if (likeCountSpan) likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + 1;
          }
        } else {
          // Unlike
          const res = await fetch(`/api/like/${postId}`, { method: 'DELETE', credentials: 'include' });
          if (res.ok) {
            btn.textContent = 'Like';
            btn.setAttribute('data-liked', 'false');
            if (likeCountSpan) likeCountSpan.textContent = Math.max(0, parseInt(likeCountSpan.textContent) - 1);
          }
        }
      } finally {
        btn.disabled = false;
      }
    }
  });
}); 