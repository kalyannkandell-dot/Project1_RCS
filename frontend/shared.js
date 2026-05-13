// ========== SIDEBAR ==========
document.querySelector("#hamburger").addEventListener("click", () => {
    document.querySelector("#sidebar").classList.toggle("active");
});


// ========== TABS ==========
const tabs = document.querySelectorAll(".tab_btn");
tabs.forEach(btn => {
    btn.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll(".dash_section").forEach(s => s.style.display = "none");
        document.querySelector("#" + btn.dataset.tab).style.display = "flex";
    });
});


// ========== NEW LINK FORM TOGGLE ==========
document.querySelector("#new_link_btn").addEventListener("click", () => {
    const form = document.querySelector("#new_link_form");
    form.style.display = form.style.display === "none" ? "block" : "none";
});


// ========== NEW LINK SUBMIT ==========
document.querySelector("#link_form").addEventListener("submit", (e) => {
    e.preventDefault();

    const file = document.querySelector("#link_file").value.trim();
    const expiry = document.querySelector("#link_expiry").value;
    const password = document.querySelector("#link_pass").value;

    // TODO: create share link via API
    // POST /api/files/share -> { fileName, expiry, password }
    // on success -> render new link row in links section, close form

    console.log("New link:", file, expiry, password ? "password protected" : "no password");
    document.querySelector("#new_link_form").style.display = "none";
});


// ========== SHARED WITH ME ==========
// TODO: fetch files shared with you from API
// GET /api/shared/with-me -> [{ id, name, size, sharedBy, sharedAt }]
// then dynamically render file rows in #shared_with_me section


// ========== SHARED BY ME ==========
// TODO: fetch files you shared from API
// GET /api/shared/by-me -> [{ id, name, size, sharedWith, sharedAt }]
// then dynamically render file rows in #shared_by_me section


// ========== REVOKE SHARE ==========
// TODO: on revoke button click
// DELETE /api/shared/:id
// then remove that file row from the list


// ========== MY LINKS ==========
// TODO: fetch active share links from API
// GET /api/files/links -> [{ id, fileName, expiry, passwordProtected }]
// then dynamically render link rows in #links section


// ========== COPY LINK ==========
// TODO: on copy link button click
// copy the share URL to clipboard
// navigator.clipboard.writeText(shareUrl);


// ========== REVOKE LINK ==========
// TODO: on revoke link button click
// DELETE /api/files/links/:id
// then remove that link row from the list


// ========== SEARCH ==========
document.querySelector("#search").addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    document.querySelectorAll(".file_row").forEach(row => {
        const name = row.querySelector("strong").textContent.toLowerCase();
        row.style.display = name.includes(query) ? "flex" : "none";
    });
});

document.addEventListener("click", (e) => {
    const sidebar = document.querySelector("#sidebar");
    const hamburger = document.querySelector("#hamburger");
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
        sidebar.classList.remove("active");
    }
});