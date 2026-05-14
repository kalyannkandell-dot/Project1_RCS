async function registerUser(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
    });

    // FIX: was calling res.json() twice — body stream can only be read once
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
    }
    return data;
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