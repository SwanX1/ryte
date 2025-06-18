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
          resentMsg.style.display = '';
        } else {
          resentMsg.textContent = 'Failed to resend email.';
          resentMsg.style.display = '';
        }
      } catch (e) {
        resentMsg.textContent = 'Failed to resend email.';
        resentMsg.style.display = '';
      }
      setTimeout(() => {
        resendBtn.disabled = false;
        resentMsg.style.display = 'none';
        resentMsg.textContent = 'Email verification resent!';
      }, 3000);
    });
  }
}); 