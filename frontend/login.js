// ========== LOGIN FORM ==========
document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;

    // basic validation
    if (!email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    // TODO: send login request to API
    // POST /api/auth/login -> { email, password }
    // on success -> store JWT token, redirect to dashboard.html
    // on fail -> show error message

    console.log("Login attempt:", email);

    // temp redirect until backend is ready
    window.location.href = "dashboard.html";
});