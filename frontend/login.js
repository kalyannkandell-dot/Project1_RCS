// from line 1 to 15 is dummy so remove also line 50 is dummy and line 39-49 is supposed to be used with backend 
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const MOCK_USERS = [
    { email: 'user@gmail.com', password: 'password123', token: 'mock_jwt_token_abc123' }
];

const API = {
    async login(email, password) {
        await delay(500);
        const user = MOCK_USERS.find(u => u.email === email && u.password === password);
        if (!user) throw new Error('Invalid email or password.');
        return { token: user.token };
    }
};

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
    // --- swap this block for real fetch when backend is ready ---
    // const res  = await fetch('/api/auth/login', {
    //     method:  'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body:    JSON.stringify({ email, password })
    // });
    // if (!res.ok) {
    //     const err = await res.json();
    //     throw new Error(err.message || 'Login failed.');
    // }
    // return await res.json();
    return await API.login(email, password);
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

    btn.textContent = 'Logging in…';
    btn.disabled = true;

    try {
        const data = await loginUser(email, password);
        localStorage.setItem('hc_token', data.token);
        toast('Login successful! Redirecting…', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch (err) {
        toast(err.message || 'Login failed.');
        btn.textContent = 'login';
        btn.disabled = false;
    }
});