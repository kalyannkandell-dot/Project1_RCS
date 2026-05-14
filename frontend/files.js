async function requestRecovery(email) {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Request failed.');
    }
    return await res.json();
}


document.querySelector('#forgot_submit').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.querySelector('#email').value.trim();
    const btn   = document.querySelector('#auth_button');

    if (!email) {
        toast('Please enter your email.');
        return;
    }

    btn.textContent = 'Sending…';
    btn.disabled = true;

    try {
        await requestRecovery(email);
        document.querySelector('.auth_box').innerHTML = `
            <h2 class="auth_title">Check your email</h2>
            <p class="auth_subtitle">A recovery link has been sent to <strong>${email}</strong></p>
            <p class="auth_footer" style="margin-top:1.5rem;"><a href="index.html">Back to Login</a></p>
        `;
    } catch (err) {
        toast(err.message || 'Something went wrong.');
        btn.textContent = 'Submit';
        btn.disabled = false;
    }
});