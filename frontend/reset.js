// line 1-12 is supposed to be dummy remove upon intigration, also line 64 and revive 53 to 63

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const API = {
    async handelresetPassword(token, password) {
        await delay(500);
        if (token === 'expired') throw new Error('Reset link has expired. Please request a new one.');
        if (!token)              throw new Error('Invalid or missing reset token.');
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



const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
    document.querySelector('.auth_box').innerHTML = `
        <h2 class="auth_title">Invalid Link</h2>
        <p class="auth_subtitle">This reset link is invalid or has already been used.</p>
        <p class="auth_footer" style="margin-top:1.5rem;"><a href="forgot.html">Request a new link</a></p>
    `;
}

async function resetPassword(token, password) {
    // --- swap this block for real fetch when backend is ready ---
    // const res = await fetch('/api/auth/reset-password', {
    //     method:  'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body:    JSON.stringify({ token, password })
    // });
    // if (!res.ok) {
    //     const err = await res.json();
    //     throw new Error(err.message || 'Reset failed.');
    // }
    // return await res.json();
    return await API.handelresetPassword(token, password);
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