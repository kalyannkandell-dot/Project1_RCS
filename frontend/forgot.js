document.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.querySelector("#email").value.trim();

    // TODO: send recovery email via API
    // POST /api/auth/forgot-password -> { email }
    // on success -> show confirmation message below

    console.log("Recovery requested for:", email);

    document.querySelector(".auth_box").innerHTML = "<strong>Check your email for Recovery Link</strong>";
});