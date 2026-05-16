if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
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


// load group info
async function loadGroupInfo() {
    try {
        const group = await apiFetchGroup();
        document.querySelector("#group_initials").textContent = group.initials;
        document.querySelector("#group_name").textContent = group.name;
        document.querySelector("#group_meta").textContent =
            `${group.memberCount} members · ${group.fileCount} files · ${group.createdByMe ? "Created by you" : ""}`;
        document.title = `Hamro Cloud - ${group.name}`;
    } catch (err) {
        console.error("Failed to load group:", err);
        toast("Could not load group info.");
    }
}


// load members
async function loadMembers() {
    const container = document.querySelector("#members_list");
    try {
        const members = await apiFetchMembers();

        container.innerHTML = members.map(m => `
            <div class="dash_card file_row floting_item">
                <div class="group_avatar">${m.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}</div>
                <div class="file_meta">
                    <strong>${m.name}</strong>
                    <small>${m.email} · ${m.role}</small>
                </div>
                ${m.isMe
                    ? `<span class="group_badge">You</span>`
                    : `<button class="btn btn_danger" onclick="removeMember('${m.id}')">Remove</button>`
                }
            </div>
        `).join("");

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
        toast("Could not remove member.");
    }
}


// load group files
async function loadGroupFiles() {
    const container = document.querySelector("#group_files_list");
    try {
        const files = await apiFetchGroupFiles();

        if (files.length === 0) {
            container.innerHTML = "<p>No files yet.</p>";
            return;
        }

        container.innerHTML = files.map(f => `
            <div class="dash_card file_row floting_item">
                <span class="file_icon">${getFileIcon(f.name)}</span>
                <div class="file_meta">
                    <strong>${f.name}</strong>
                    <small>${f.size} · Uploaded by ${f.uploadedBy} · ${f.uploaded}</small>
                </div>
                <div class="file_btns">
                    <a href="#" class="btn" download="${f.name}">Download</a>
                    <button class="btn btn_danger" onclick="deleteGroupFile('${f.id}')">Delete</button>
                </div>
            </div>
        `).join("");

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
        toast("Could not delete file.");
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
        toast("Upload failed.");
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
    try {
        await apiInviteMember(email);
        toast(`Invite sent to ${email}!`, "success");
        document.querySelector("#invite_form").style.display = "none";
        document.querySelector("#invite_email").value = "";
    } catch (err) {
        console.error("Invite failed:", err);
        toast("Could not send invite.");
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
        toast("Could not leave group.");
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