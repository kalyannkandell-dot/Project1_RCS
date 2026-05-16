
if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

function apiFetchGroups() {
    return fetch(`${API_BASE}/api/groups`, { headers: getAuthHeaders() }).then(r => r.json());
}
function apiFetchInvites() {
    return fetch(`${API_BASE}/api/groups/invites`, { headers: getAuthHeaders() }).then(r => r.json());
}
function apiCreateGroup(name, desc, inviteEmail) {
    return fetch(`${API_BASE}/api/groups`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ name, desc, inviteEmail }) }).then(r => r.json());
}
function apiAcceptInvite(inviteId) {
    return fetch(`${API_BASE}/api/groups/invites/${inviteId}/accept`, { method: "POST", headers: getAuthHeaders() }).then(r => r.json());
}
function apiDeclineInvite(inviteId) {
    return fetch(`${API_BASE}/api/groups/invites/${inviteId}`, { method: "DELETE", headers: getAuthHeaders() }).then(r => r.json());
}


// render groups
async function loadGroups() {
    const container = document.querySelector("#groups_list");
    try {
        const groups = await apiFetchGroups();

        if (groups.length === 0) {
            container.innerHTML = "<p>You are not in any groups yet.</p>";
            return;
        }

        container.innerHTML = groups.map(group => `
            <a href="group.html?id=${group.id}" class="dash_card group_card floting_item">
                <div class="group_avatar">${group.initials}</div>
                <div class="file_meta">
                    <strong>${group.name}</strong>
                    <small>${group.memberCount} members · ${group.fileCount} files</small>
                </div>
                <span class="group_badge">${group.role}</span>
            </a>
        `).join("");

    } catch (err) {
        console.error("Groups fetch failed:", err);
        container.innerHTML = "<p>Could not load groups.</p>";
    }
}


// render invites
async function loadInvites() {
    const container = document.querySelector("#invites_list");
    try {
        const invites = await apiFetchInvites();

        if (invites.length === 0) {
            container.innerHTML = "<p>No pending invites.</p>";
            return;
        }

        container.innerHTML = invites.map(invite => `
            <div class="dash_card group_card" id="invite_${invite.id}">
                <div class="group_avatar">${invite.initials}</div>
                <div class="file_meta">
                    <strong>${invite.groupName}</strong>
                    <small>Invited by ${invite.invitedBy} · ${invite.memberCount} members</small>
                </div>
                <div class="file_btns">
                    <button class="btn" onclick="acceptInvite('${invite.id}')">Accept</button>
                    <button class="btn btn_danger" onclick="declineInvite('${invite.id}')">Decline</button>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Invites fetch failed:", err);
        container.innerHTML = "<p>Could not load invites.</p>";
    }
}


// accept invite
async function acceptInvite(inviteId) {
    try {
        await apiAcceptInvite(inviteId);
        document.querySelector(`#invite_${inviteId}`)?.remove();
        toast("Invite accepted!", "success");
        loadGroups();
    } catch (err) {
        console.error("Accept failed:", err);
        toast("Could not accept invite.");
    }
}


// decline invite
async function declineInvite(inviteId) {
    try {
        await apiDeclineInvite(inviteId);
        document.querySelector(`#invite_${inviteId}`)?.remove();
        toast("Invite declined.", "success");
    } catch (err) {
        console.error("Decline failed:", err);
        toast("Could not decline invite.");
    }
}


// create group form toggle
document.querySelector("#create_group_btn").addEventListener("click", () => {
    const form = document.querySelector("#create_group_form");
    form.style.display = form.style.display === "none" ? "block" : "none";
});

document.querySelector("#new_group").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name   = document.querySelector("#group_name").value.trim();
    const desc   = document.querySelector("#group_desc").value.trim();
    const invite = document.querySelector("#invite_email").value.trim();
    const msg    = document.querySelector("#create_group_msg");

    if (!name) {
        msg.textContent = "Group name is required.";
        msg.style.color = "#cc0000";
        return;
    }

    try {
        await apiCreateGroup(name, desc, invite);
        msg.textContent = "Group created!";
        msg.style.color = "green";
        toast("Group created!", "success");
        document.querySelector("#new_group").reset();
        await loadGroups();
        setTimeout(() => {
            document.querySelector("#create_group_form").style.display = "none";
            msg.textContent = "";
        }, 1500);
    } catch (err) {
        console.error("Create group failed:", err);
        toast("Could not create group.");
    }
});


// init for this page
async function init() {
    initSidebar();
    initSearch();
    await Promise.all([
        loadUserHeader(),
        loadGroups(),
        loadInvites()
    ]);
}

init();