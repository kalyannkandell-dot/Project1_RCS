if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

const params  = new URLSearchParams(window.location.search);
const groupId = params.get("id");

if (!groupId) {
    window.location.href = "bonds.html";
}

function apiFetchGroup() {
    return fetch(`${API_BASE}/api/groups/${groupId}`, { headers: getAuthHeaders() }).then(r => r.json());
}
function apiFetchMembers() {
    return fetch(`${API_BASE}/api/groups/${groupId}/members`, { headers: getAuthHeaders() }).then(r => r.json());
}
function apiFetchGroupFiles() {
    return fetch(`${API_BASE}/api/groups/${groupId}/files`, { headers: getAuthHeaders() }).then(r => r.json());
}
function apiInviteMember(email) {
    return fetch(`${API_BASE}/api/groups/${groupId}/invite`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ email }) }).then(r => r.json());
}
function apiRemoveMember(memberId) {
    return fetch(`${API_BASE}/api/groups/${groupId}/members/${memberId}`, { method: "DELETE", headers: getAuthHeaders() }).then(r => r.json());
}
function apiUploadGroupFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/groups/${groupId}/files`, { method: "POST", headers: getAuthHeadersNoContent(), body: formData }).then(r => r.json());
}
function apiDeleteGroupFile(fileId) {
    return fetch(`${API_BASE}/api/groups/${groupId}/files/${fileId}`, { method: "DELETE", headers: getAuthHeaders() }).then(r => r.json());
}
function apiLeaveGroup() {
    return fetch(`${API_BASE}/api/groups/${groupId}/members/me`, { method: "DELETE", headers: getAuthHeaders() }).then(r => r.json());
}

// get current user id from token
function getCurrentUserId() {
    try {
        const token   = localStorage.getItem("hc_token");
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.id;
    } catch {
        return null;
    }
}


// load group info
async function loadGroupInfo() {
    try {
        const group    = await apiFetchGroup();
        const initials = group.name.slice(0, 2).toUpperCase();

        document.querySelector("#group_initials").textContent = initials;
        document.querySelector("#group_name").textContent     = group.name;

        const currentUserId  = getCurrentUserId();
        const createdByMe    = group.createdBy === currentUserId;
        const memberCount    = group.memberCount ?? "—";
        const fileCount      = group.fileCount   ?? "—";

        document.querySelector("#group_meta").textContent =
            `${memberCount} members · ${fileCount} files${createdByMe ? " · Created by you" : ""}`;

        document.title = `Hamro Cloud - ${group.name}`;
    } catch (err) {
        console.error("Failed to load group:", err);
        toast("Could not load group info.");
    }
}


// load members
async function loadMembers() {
    const container     = document.querySelector("#members_list");
    const currentUserId = getCurrentUserId();

    try {
        const members = await apiFetchMembers();

        if (members.length === 0) {
            container.innerHTML = "<p>No members found.</p>";
            return;
        }

        container.innerHTML = members.map(m => {
            const displayName = m.fullName || m.email;
            const initials    = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            const isMe        = m.id === currentUserId;
            return `
                <div class="dash_card file_row floting_item">
                    <div class="group_avatar">${initials}</div>
                    <div class="file_meta">
                        <strong>${displayName}</strong>
                        <small>${m.email} · ${m.role}</small>
                    </div>
                    ${isMe
                        ? `<span class="group_badge">You</span>`
                        : `<button class="btn btn_danger" onclick="removeMember('${m.id}')">Remove</button>`
                    }
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Failed to load members:", err);
        container.innerHTML = "<p>Could not load members.</p>";
    }
}


// remove member
async function removeMember(memberId) {
    if (!confirm("Remove this member?")) return;
    try {
        await apiRemoveMember(memberId);
        toast("Member removed.", "success");
        loadMembers();
    } catch (err) {
        console.error("Remove failed:", err);
        toast(err.error || "Could not remove member.");
    }
}

// load group file 
async function loadGroupFiles() {
    const container = document.querySelector("#group_files_list");
    try {
        const files = await apiFetchGroupFiles();
        if (files.length === 0) {
            container.innerHTML = "<p>No files yet.</p>";
            return;
        }
        container.innerHTML = files.map(f => {
            const uploadedBy = f.addedByName || f.addedByEmail;
            return `
                <div class="dash_card file_row floting_item">
                    <span class="file_icon">${getFileIcon(f.name)}</span>
                    <div class="file_meta">
                        <strong>${f.name}</strong>
                        <small>${formatSize(f.size)} · Uploaded by ${uploadedBy} · ${timeAgo(f.addedAt)}</small>
                    </div>
                    <div class="file_btns">
                        <button class="btn btn_download" data-id="${f.id}" data-name="${f.name}">Download</button>
                        <button class="btn btn_danger" onclick="deleteGroupFile('${f.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join("");

        container.querySelectorAll(".btn_download").forEach(btn => {
            btn.addEventListener("click", () => downloadFile(btn.dataset.id, btn.dataset.name))
        });

    } catch (err) {
        console.error("Failed to load group files:", err);
        container.innerHTML = "<p>Could not load files.</p>";
    }
}


// delete group file
async function deleteGroupFile(fileId) {
    if (!confirm("Delete this file?")) return;
    try {
        await apiDeleteGroupFile(fileId);
        toast("File deleted.", "success");
        loadGroupFiles();
    } catch (err) {
        console.error("Delete failed:", err);
        toast(err.error || "Could not delete file.");
    }
}


// upload group file
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
        toast(err.error || "Upload failed.");
    }
    e.target.value = "";
});


// invite member
document.querySelector("#invite_btn").addEventListener("click", () => {
    const form = document.querySelector("#invite_form");
    form.style.display = form.style.display === "none" ? "block" : "none";
});

document.querySelector("#invite_submit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#invite_email").value.trim();
    if (!email) {
        toast("Please enter an email.");
        return;
    }
    try {
        await apiInviteMember(email);
        toast(`Invite sent to ${email}!`, "success");
        document.querySelector("#invite_form").style.display = "none";
        document.querySelector("#invite_email").value = "";
        loadMembers();
    } catch (err) {
        console.error("Invite failed:", err);
        toast(err.error || "Could not send invite.");
    }
});


// leave group
document.querySelector("#leave_btn").addEventListener("click", async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
        await apiLeaveGroup();
        toast("You left the group.", "success");
        window.location.href = "bonds.html";
    } catch (err) {
        console.error("Leave failed:", err);
        toast(err.error || "Could not leave group.");
    }
});


// init for this page
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