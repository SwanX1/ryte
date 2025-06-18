document.addEventListener('DOMContentLoaded', function () {
  const resendBtn = document.getElementById('resend-verification-btn');
  const resentMsg = document.getElementById('verification-resent-msg');
  if (resendBtn) {
    resendBtn.addEventListener('click', async function () {
      resendBtn.disabled = true;
      try {
        const res = await fetch('/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          resentMsg.classList.remove('verification-resent-msg');
          resentMsg.classList.add('verification-resent-msg-visible');
        } else {
          resentMsg.textContent = 'Failed to resend email.';
          resentMsg.classList.remove('verification-resent-msg');
          resentMsg.classList.add('verification-resent-msg-visible');
        }
      } catch (e) {
        resentMsg.textContent = 'Failed to resend email.';
        resentMsg.classList.remove('verification-resent-msg');
        resentMsg.classList.add('verification-resent-msg-visible');
      }
      setTimeout(() => {
        resendBtn.disabled = false;
        resentMsg.classList.remove('verification-resent-msg-visible');
        resentMsg.classList.add('verification-resent-msg');
        resentMsg.textContent = 'Email verification resent!';
      }, 3000);
    });
  }
}); 