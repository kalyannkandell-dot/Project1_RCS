document.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelector(".auth_box").innerHTML = "<strong>Check your email for Recovery Link</strong>"
});