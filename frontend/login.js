// login.js

async function loginUser(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login failed.");
    }
    return await res.json();
}

document.querySelector("#form_login").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const btn      = document.querySelector("#auth_button");

    if (!email || !password) {
        toast("Please fill in all fields.");
        return;
    }
    if (password.length < 6) {
        toast("Password must be at least 6 characters.");
        return;
    }

    btn.textContent = "Logging in…";
    btn.disabled    = true;

    try {
        const data = await loginUser(email, password);
        localStorage.setItem("hc_token", data.token);
        toast("Login successful! Redirecting…", "success");
        setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);
    } catch (err) {
        toast(err.message || "Login failed.");
        btn.textContent = "Login";
        btn.disabled    = false;
    }
});