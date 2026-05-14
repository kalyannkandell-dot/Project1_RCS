// line 1-10 is supposed to be removed with line 48 and line 37-47 are supposed to be revived in order for intigration 
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const API = {
    async forgotPassword(email) {
        await delay(500);
        if (email === 'notfound@gmail.com') throw new Error('No account found with that email.');
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



async function requestRecovery(email) {
    // --- swap this block for real fetch when backend is ready ---
    // const res = await fetch('/api/auth/forgot-password', {
    //     method:  'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body:    JSON.stringify({ email })
    // });
    // if (!res.ok) {
    //     const err = await res.json();
    //     throw new Error(err.message || 'Request failed.');
    // }
    // return await res.json();
    return await API.forgotPassword(email);
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
        btn.textContent = 'submit';
        btn.disabled = false;
    }
});