// ========== REGISTER FORM ==========
document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const passwordConf = document.querySelector("#password_conf").value;

    // basic validation
    if (!email || !password || !passwordConf) {
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

    // TODO: send register request to API
    // POST /api/auth/register -> { email, password }
    // on success -> redirect to dashboard.html or login.html
    // on fail (email already exists) -> show error message

    console.log("Register attempt:", email);

    // temp redirect until backend is ready
    window.location.href = "dashboard.html";
});