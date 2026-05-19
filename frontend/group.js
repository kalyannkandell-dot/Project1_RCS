if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

const params  = new URLSearchParams(window.location.search);
const groupId = params.get("id");

if (!groupId) {
    window.location.href = "bonds.html";
}

let currentUserRole = null; // set after members load

function apiFetchGroup() {
    return fetch(`${API_BASE}/api/groups/${groupId}`, { headers: getAuthHeaders() })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed."); return d; });
}
function apiFetchMembers() {
    return fetch(`${API_BASE}/api/groups/${groupId}/members`, { headers: getAuthHeaders() })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed."); return d; });
}
function apiFetchGroupFiles() {
    return fetch(`${API_BASE}/api/groups/${groupId}/files`, { headers: getAuthHeaders() })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed."); return d; });
}
function apiInviteMember(email) {
    return fetch(`${API_BASE}/api/groups/${groupId}/invite`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ email }) })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed."); return d; });
}
function apiRemoveMember(memberId) {
    return fetch(`${API_BASE}/api/groups/${groupId}/members/${memberId}`, { method: "DELETE", headers: getAuthHeaders() })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed."); return d; });
}
function apiUploadGroupFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/groups/${groupId}/files`, { method: "POST", headers: getAuthHeadersNoContent(), body: formData })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Upload failed."); return d; });
}
function apiDeleteGroupFile(fileId) {
    return fetch(`${API_BASE}/api/groups/${groupId}/files/${fileId}`, { method: "DELETE", headers: getAuthHeaders() })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed."); return d; });
}
function apiLeaveGroup() {
    return fetch(`${API_BASE}/api/groups/${groupId}/members/me`, { method: "DELETE", headers: getAuthHeaders() })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed."); return d; });
}
function apiDeleteGroup() {
    return fetch(`${API_BASE}/api/groups/${groupId}`, { method: "DELETE", headers: getAuthHeaders() })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed."); return d; });
}

function getCurrentUserId() {
    try {
        const token   = localStorage.getItem("hc_token");
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.id;
    } catch { return null; }
}
async function downloadFile(id, name) {
    const res = await fetch(`${API_BASE}/api/files/${id}/download`, { headers: getAuthHeaders() })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
}

// ── LOAD GROUP INFO ───────────────────────────────────────────────────────────

async function loadGroupInfo() {
    try {
        const group    = await apiFetchGroup();
        const initials = group.name.slice(0, 2).toUpperCase();

        document.querySelector("#group_initials").textContent = initials;
        document.querySelector("#group_name").textContent     = group.name;

        const memberCount = group.memberCount ?? "—";
        const fileCount   = group.fileCount   ?? "—";
        document.querySelector("#group_meta").textContent =
            `${memberCount} members · ${fileCount} files`;

        document.title = `Hamro Cloud - ${group.name}`;
    } catch (err) {
        console.error("Failed to load group:", err);
        toast("Could not load group info.");
    }
}

// ── LOAD MEMBERS ──────────────────────────────────────────────────────────────

async function loadMembers() {
    const container     = document.querySelector("#members_list");
    const currentUserId = getCurrentUserId();

    try {
        const members = await apiFetchMembers();

        // figure out current user's role from members list
        const me = members.find(m => m.id === currentUserId);
        currentUserRole = me?.role || "Member";

        // show invite button only to Admin
        const inviteBtn = document.querySelector("#invite_btn");
        if (inviteBtn) inviteBtn.style.display = currentUserRole === "Admin" ? "inline-block" : "none";

        // swap leave/delete button label based on role
        const leaveBtn = document.querySelector("#leave_btn");
        if (leaveBtn) {
            leaveBtn.textContent = currentUserRole === "Admin" ? "Delete Group" : "Leave Group";
        }

        if (members.length === 0) {
            container.innerHTML = "<p>No members found.</p>";
            return;
        }

        container.innerHTML = members.map(m => {
            const displayName = m.fullName || m.email;
            const initials    = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            const isMe        = m.id === currentUserId;
            const isAdmin     = m.role === "Admin";

            return `
                <div class="dash_card file_row floting_item">
                    <div class="group_avatar">${initials}</div>
                    <div class="file_meta">
                        <strong>${displayName}</strong>
                        <small>${m.email} · ${m.role}</small>
                    </div>
                    ${isAdmin ? `<span class="group_badge">Admin</span>` : ""}
                    ${isMe
                        ? `<span class="group_badge">You</span>`
                        : currentUserRole === "Admin"
                            ? `<button class="btn btn_danger" onclick="removeMember('${m.id}')">Remove</button>`
                            : ""
                    }
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Failed to load members:", err);
        container.innerHTML = "<p>Could not load members.</p>";
    }
}

// ── REMOVE MEMBER ─────────────────────────────────────────────────────────────

async function removeMember(memberId) {
    if (!confirm("Remove this member?")) return;
    try {
        await apiRemoveMember(memberId);
        toast("Member removed.", "success");
        loadMembers();
    } catch (err) {
        console.error("Remove failed:", err);
        toast(err.message || "Could not remove member.");
    }
}

// ── LOAD GROUP FILES ──────────────────────────────────────────────────────────

async function loadGroupFiles() {
    const container     = document.querySelector("#group_files_list");
    const currentUserId = getCurrentUserId();

    try {
        const files = await apiFetchGroupFiles();

        if (files.length === 0) {
            container.innerHTML = "<p>No files yet.</p>";
            return;
        }

        container.innerHTML = files.map(f => {
            const uploadedBy = f.addedByName || f.addedByEmail;
            const isOwner    = f.userId === currentUserId;
            const canDelete  = isOwner || currentUserRole === "Admin";

            return `
                <div class="dash_card file_row floting_item">
                    <span class="file_icon">${getFileIcon(f.name)}</span>
                    <div class="file_meta">
                        <strong>${f.name}</strong>
                        <small>${formatSize(f.size)} · Uploaded by ${uploadedBy} · ${timeAgo(f.addedAt)}</small>
                    </div>
                    <div class="file_btns">
                        <button class="btn btn_download" data-id="${f.id}" data-name="${f.name}">Download</button>
                        ${canDelete ? `<button class="btn btn_danger" onclick="deleteGroupFile('${f.id}')">Delete</button>` : ""}
                    </div>
                </div>
            `;
        }).join("");

        container.querySelectorAll(".btn_download").forEach(btn => {
            btn.addEventListener("click", () => downloadFile(btn.dataset.id, btn.dataset.name));
        });

    } catch (err) {
        console.error("Failed to load group files:", err);
        container.innerHTML = "<p>Could not load files.</p>";
    }
}

// ── DELETE GROUP FILE ─────────────────────────────────────────────────────────

async function deleteGroupFile(fileId) {
    if (!confirm("Delete this file?")) return;
    try {
        await apiDeleteGroupFile(fileId);
        toast("File deleted.", "success");
        loadGroupFiles();
    } catch (err) {
        console.error("Delete failed:", err);
        toast(err.message || "Could not delete file.");
    }
}

// ── UPLOAD ────────────────────────────────────────────────────────────────────

document.querySelector("#upload_group_btn").addEventListener("click", () => {
    document.querySelector("#group_file_input").click();
});

document.querySelector("#group_file_input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast(`Uploading ${file.name}…`);
    try {
        await apiUploadGroupFile(file);
        toast(`${file.name} uploaded!`, "success");
        await loadGroupFiles();
    } catch (err) {
        console.error("Upload failed:", err);
        toast(err.message || "Upload failed.");
    }
    e.target.value = "";
});

// ── INVITE MEMBER ─────────────────────────────────────────────────────────────

document.querySelector("#invite_btn").addEventListener("click", () => {
    const form = document.querySelector("#invite_form");
    form.style.display = form.style.display === "none" ? "block" : "none";
});

document.querySelector("#invite_submit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#invite_email").value.trim();
    if (!email) { toast("Please enter an email."); return; }
    if (!await checkEmailExists(email)) { toast("User not found."); return; }
    try {
        await apiInviteMember(email);
        toast(`Invite sent to ${email}!`, "success");
        document.querySelector("#invite_form").style.display = "none";
        document.querySelector("#invite_email").value = "";
        loadMembers();
    } catch (err) {
        console.error("Invite failed:", err);
        toast(err.message || "Could not send invite.");
    }
});

// ── LEAVE / DELETE GROUP ──────────────────────────────────────────────────────

document.querySelector("#leave_btn").addEventListener("click", async () => {
    if (currentUserRole === "Admin") {
        if (!confirm("Delete this group permanently? All files and members will be removed.")) return;
        try {
            await apiDeleteGroup();
            toast("Group deleted.", "success");
            window.location.href = "bonds.html";
        } catch (err) {
            console.error("Delete group failed:", err);
            toast(err.message || "Could not delete group.");
        }
    } else {
        if (!confirm("Are you sure you want to leave this group?")) return;
        try {
            await apiLeaveGroup();
            toast("You left the group.", "success");
            window.location.href = "bonds.html";
        } catch (err) {
            console.error("Leave failed:", err);
            toast(err.message || "Could not leave group.");
        }
    }
});

// ── INIT ──────────────────────────────────────────────────────────────────────

async function init() {
    initSidebar();
    initSearch();
    await Promise.all([
        loadUserHeader(),
        loadGroupInfo(),
        loadMembers(),
        loadGroupFiles()
    ]);
}

init();