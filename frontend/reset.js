// ========== RESET PASSWORD FORM ==========
document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();

    const password = document.querySelector("#password").value;
    const passwordConf = document.querySelector("#password_conf").value;

    // basic validation
    if (!password || !passwordConf) {
        alert("Please fill in all fields.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    if (password !== passwordConf) {
        alert("Passwords do not match.");
        return;
    }

    // TODO: send new password to API
    // POST /api/auth/reset-password -> { password, token }
    // token comes from the URL e.g. reset.html?token=abc123
    // const token = new URLSearchParams(window.location.search).get("token");
    // on success -> redirect to login.html
    // on fail (invalid/expired token) -> show error message

    console.log("Password reset submitted");

    // temp redirect until backend is ready
    window.location.href = "login.html";
});