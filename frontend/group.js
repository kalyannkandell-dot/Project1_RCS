if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

const GROUP_ID = new URLSearchParams(window.location.search).get("id");

async function apiFetchGroup() {
    const res = await fetch(`${API_BASE}/api/groups/${GROUP_ID}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiFetchMembers() {
    const res = await fetch(`${API_BASE}/api/groups/${GROUP_ID}/members`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiFetchGroupFiles() {
    const res = await fetch(`${API_BASE}/api/groups/${GROUP_ID}/files`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiInviteMember(email) {
    const res = await fetch(`${API_BASE}/api/groups/${GROUP_ID}/invite`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email })
    });
    return res.json();
}

async function apiRemoveMember(memberId) {
    const res = await fetch(`${API_BASE}/api/groups/${GROUP_ID}/members/${memberId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiUploadGroupFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/api/groups/${GROUP_ID}/files`, {
        method: "POST",
        headers: { "Authorization": "Bearer " + localStorage.getItem("hc_token") },
        body: formData
    });
    return res.json();
}

async function apiDeleteGroupFile(fileId) {
    const res = await fetch(`${API_BASE}/api/groups/${GROUP_ID}/files/${fileId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiLeaveGroup() {
    const res = await fetch(`${API_BASE}/api/groups/${GROUP_ID}/members/me`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return res.json();
}


// load group info
async function loadGroupInfo() {
    try {
        const group = await apiFetchGroup();
        document.querySelector("#group_initials").textContent = group.initials;
        document.querySelector("#group_name").textContent = group.name;
        document.querySelector("#group_meta").textContent =
            `${group.memberCount} members · ${group.fileCount} files${group.createdByMe ? " · Created by you" : ""}`;
        document.title = `Hamro Cloud - ${group.name}`;
    } catch (err) {
        console.error("Failed to load group:", err);
        toast("Could not load group info.");
    }
}


// loading members
async function loadMembers() {
    const container = document.querySelector("#members_list");
    try {
        const members = await apiFetchMembers();

        container.innerHTML = members.map(m => `
            <div class="dash_card file_row floting_item">
                <div class="group_avatar">${m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</div>
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


// removing members
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


// loading group files
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
                    <a href="${API_BASE}${f.url}" class="btn" download="${f.name}">Download</a>
                    <button class="btn btn_danger" onclick="deleteGroupFile('${f.id}')">Delete</button>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Failed to load group files:", err);
        container.innerHTML = "<p>Could not load files.</p>";
    }
}


// deleting group files
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


// uploading group files
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


// invitation
document.querySelector("#invite_btn").addEventListener("click", () => {
    const form = document.querySelector("#invite_form");
    form.style.display = form.style.display === "none" ? "block" : "none";
});

document.querySelector("#invite_submit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#invite_email").value.trim();
    if (!email) {
        toast("Please enter an email address.");
        return;
    }
    try {
        const result = await apiInviteMember(email);
        if (result.success === false) throw new Error(result.message);
        toast(`Invite sent to ${email}!`, "success");
        document.querySelector("#invite_form").style.display = "none";
        document.querySelector("#invite_email").value = "";
    } catch (err) {
        console.error("Invite failed:", err);
        toast(err.message || "Could not send invite.");
    }
});


// leaving the group
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