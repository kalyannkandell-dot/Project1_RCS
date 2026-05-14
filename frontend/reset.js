const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
    document.querySelector('.auth_box').innerHTML = `
        <h2 class="auth_title">Invalid Link</h2>
        <p class="auth_subtitle">This reset link is invalid or has already been used.</p>
        <p class="auth_footer" style="margin-top:1.5rem;"><a href="forgot.html">Request a new link</a></p>
    `;
}

async function resetPassword(token, password) {
    // FIX: was missing API_BASE — would only work if frontend served from same origin as backend
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Reset failed.');
    }
    return await res.json();
}


document.querySelector('#reset_form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const password     = document.querySelector('#password').value;
    const passwordConf = document.querySelector('#password_conf').value;
    const btn          = document.querySelector('#auth_button');

    if (!password || !passwordConf) {
        toast('Please fill in all fields.');
        return;
    }
    if (password.length < 6) {
        toast('Password must be at least 6 characters.');
        return;
    }
    if (password !== passwordConf) {
        toast('Passwords do not match.');
        return;
    }

    btn.textContent = 'Resetting…';
    btn.disabled = true;

    try {
        await resetPassword(token, password);
        document.querySelector('.auth_box').innerHTML = `
            <h2 class="auth_title">Password Changed</h2>
            <p class="auth_subtitle">Your password has been reset successfully.</p>
            <p class="auth_footer" style="margin-top:1.5rem;"><a href="index.html">Back to Login</a></p>
        `;
    } catch (err) {
        toast(err.message || 'Reset failed.');
        btn.textContent = 'Change password';
        btn.disabled = false;
    }
});