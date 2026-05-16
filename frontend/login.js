function toast(msg, type = 'error') {
    let el = document.getElementById('hc_toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'hc_toast';
        Object.assign(el.style, {
            position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
            padding: '0.65rem 1.1rem', borderRadius: '8px', fontSize: '0.875rem',
            fontWeight: '500', boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            transition: 'opacity 0.3s', opacity: '0', pointerEvents: 'none',
        });
        document.body.appendChild(el);
    }
    el.style.background = type === 'error' ? '#e53e3e' : '#38a169';
    el.style.color = '#fff';
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

async function loginUser(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Login failed."); }
    return await res.json();
}

document.querySelector('#form_login').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;
    const btn      = document.querySelector('#auth_button');

    if (!email || !password) {
        toast('Please fill in all fields.');
        return;
    }
    if (password.length < 6) {
        toast('Password must be at least 6 characters.');
        return;
    }

    const originalText = btn.textContent;
    btn.textContent = 'Logging in…';
    btn.disabled = true;

    try {
        const data = await loginUser(email, password);
        localStorage.setItem('hc_token', data.token);
        toast('Login successful! Redirecting…', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch (err) {
        toast(err.message || 'Login failed.');
        btn.textContent = originalText;
        btn.disabled = false;
    }
});