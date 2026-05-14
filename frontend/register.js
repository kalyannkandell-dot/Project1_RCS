// line 1 to 11 and line 47 are supposed to be dummys remove them and then activate 36 to 46
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const API = {
    async register(email, password) {
        await delay(500);
        // showing email is taken
        if (email === 'taken@gmail.com') throw new Error('Email already registered.');
        return { success: true };
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


async function registerUser(email, password) {
    // --- swap this block for real fetch when backend is ready ---
    // const res  = await fetch('/api/auth/register', {
    //     method:  'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body:    JSON.stringify({ email, password })
    // });
    // if (!res.ok) {
    //     const err = await res.json();
    //     throw new Error(err.message || 'Registration failed.');
    // }
    // return await res.json();
    return await API.register(email, password);
}


// taking input and validating it 
document.querySelector('#register_form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email       = document.querySelector('#email').value.trim();
    const password    = document.querySelector('#password').value;
    const passwordConf = document.querySelector('#password_conf').value;
    const btn         = document.querySelector('#auth_button');

    if (!email || !password || !passwordConf) {
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

    btn.textContent = 'Registering…';
    btn.disabled = true;

    try {
        await registerUser(email, password);
        toast('Account created! Redirecting…', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    } catch (err) {
        toast(err.message || 'Registration failed.');
        btn.textContent = 'Submit';
        btn.disabled = false;
    }
});