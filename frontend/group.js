// ========== SIDEBAR ==========
document.querySelector("#hamburger").addEventListener("click", () => {
    document.querySelector("#sidebar").classList.toggle("active");
});


// ========== INVITE FORM TOGGLE ==========
document.querySelector("#invite_btn").addEventListener("click", () => {
    const form = document.querySelector("#invite_form");
    form.style.display = form.style.display === "none" ? "block" : "none";
});


// ========== INVITE SUBMIT ==========
document.querySelector("#invite_submit").addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.querySelector("#invite_email").value.trim();

    // TODO: send invite via API
    // POST /api/groups/:id/invite -> { email }
    // on success -> show confirmation, close form

    console.log("Invite sent to:", email);
    document.querySelector("#invite_form").style.display = "none";
    document.querySelector("#invite_email").value = "";
});


// ========== UPLOAD GROUP FILE ==========
document.querySelector("#upload_group_btn").addEventListener("click", () => {
    document.querySelector("#group_file_input").click();
});

document.querySelector("#group_file_input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // TODO: upload file to group via API
    // POST /api/groups/:id/files with FormData containing the file
    // on success -> re-render group file list with new file at top

    console.log("Group file selected:", file.name, file.size);
});


// ========== GROUP INFO ==========
// TODO: fetch group details from API
// GET /api/groups/:id -> { name, initials, memberCount, fileCount, createdBy }
// then update group header


// ========== MEMBERS LIST ==========
// TODO: fetch members from API
// GET /api/groups/:id/members -> [{ id, name, email, role }]
// then dynamically render member rows


// ========== REMOVE MEMBER ==========
// TODO: on remove button click
// DELETE /api/groups/:id/members/:memberId
// then remove that member row from the list


// ========== GROUP FILES ==========
// TODO: fetch group files from API
// GET /api/groups/:id/files -> [{ id, name, size, uploadedAt, uploadedBy }]
// then dynamically render file rows


// ========== LEAVE GROUP ==========
document.querySelector(".btn_danger").addEventListener("click", () => {
    if (confirm("Are you sure you want to leave this group?")) {
        // TODO: leave group via API
        // DELETE /api/groups/:id/members/me
        // on success -> redirect to bonds.html
        window.location.href = "bonds.html";
    }
});


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