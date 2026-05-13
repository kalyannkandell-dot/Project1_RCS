// ========== SIDEBAR ==========
document.querySelector("#hamburger").addEventListener("click", () => {
    document.querySelector("#sidebar").classList.toggle("active");
});


// ========== CREATE GROUP FORM TOGGLE ==========
document.querySelector("#create_group_btn").addEventListener("click", () => {
    const form = document.querySelector("#create_group_form");
    form.style.display = form.style.display === "none" ? "block" : "none";
});


// ========== CREATE GROUP SUBMIT ==========
document.querySelector("#new_group").addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.querySelector("#group_name").value.trim();
    const desc = document.querySelector("#group_desc").value.trim();
    const invite = document.querySelector("#invite_email").value.trim();

    // TODO: send new group to API
    // POST /api/groups -> { name, desc, inviteEmail }
    // on success -> reload groups list or redirect to group.html?id=newGroupId

    console.log("Create group:", name, desc, invite);
});


// ========== GROUPS LIST ==========
// TODO: fetch user's groups from API
// GET /api/groups -> [{ id, name, memberCount, fileCount, initials, role }]
// then dynamically render each group as a group_card


// ========== PENDING INVITES ==========
// TODO: fetch pending invites from API
// GET /api/groups/invites -> [{ id, groupName, invitedBy, memberCount }]
// then render each invite with accept/decline buttons


// ========== ACCEPT INVITE ==========
// TODO: on accept button click
// POST /api/groups/invites/:id/accept
// then remove invite from list and add group to groups list


// ========== DECLINE INVITE ==========
// TODO: on decline button click
// DELETE /api/groups/invites/:id
// then remove invite from list


// ========== SEARCH ==========
document.querySelector("#search").addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    // filter visible group cards by name client side
    document.querySelectorAll(".group_card").forEach(card => {
        const name = card.querySelector("strong").textContent.toLowerCase();
        card.parentElement.style.display = name.includes(query) ? "flex" : "none";
    });
});
document.addEventListener("click", (e) => {
    const sidebar = document.querySelector("#sidebar");
    const hamburger = document.querySelector("#hamburger");
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
        sidebar.classList.remove("active");
    }
});