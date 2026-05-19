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

async function registerUser(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Registration failed."); }
    return await res.json();
}

document.querySelector('#register_form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email        = document.querySelector('#email').value.trim();
    const password     = document.querySelector('#password').value;
    const passwordConf = document.querySelector('#password_conf').value;
    const btn          = document.querySelector('#auth_button');

    if (!email || !password || !passwordConf) {
    toast('Please fill in all fields.');
    return;
}
if (!isEmail(email)) {
    toast('Enter an actual Email');
    return;
}
if (!passwordRegex.test(password)) {
    toast('Password must be at least 8 characters, include one uppercase letter and one number.');
    return;
}
if (password !== passwordConf) {
    toast('Passwords do not match.');
    return;
}

    const originalText = btn.textContent;
    btn.textContent = 'Registering…';
    btn.disabled = true;

    try {
        await registerUser(email, password);
        toast('Account created! Redirecting…', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    } catch (err) {
        toast(err.message || 'Registration failed.');
        btn.textContent = originalText;
        btn.disabled = false;
    }
});