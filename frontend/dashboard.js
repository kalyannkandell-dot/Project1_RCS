if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

const API = {
    async getStorage()     { return await fetch(`${API_BASE}/api/user/storage`, { headers: getAuthHeaders() }).then(r => r.json()); },
    async getStats()       { return await fetch(`${API_BASE}/api/user/stats`, { headers: getAuthHeaders() }).then(r => r.json()); },
    async getRecentFiles() { return await fetch(`${API_BASE}/api/files/recent?limit=4`, { headers: getAuthHeaders() }).then(r => r.json()); },
    async getGroups()      { return await fetch(`${API_BASE}/api/groups`, { headers: getAuthHeaders() }).then(r => r.json()); },
};

function apiShareWithPerson(fileId, email) {
    return fetch(`${API_BASE}/api/files/${fileId}/share/person`, { 
        method: "POST", 
        headers: getAuthHeaders(), 
        body: JSON.stringify({ email }) 
    }).then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || data.message)
        return data
    })
}

function apiShareWithGroup(fileId, groupId) {
    return fetch(`${API_BASE}/api/groups/${groupId}/files/${fileId}`, { method: "POST", headers: getAuthHeaders() }).then(r => r.json());
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


async function loadStorage() {
    try {
        const data = await API.getStorage();
        const percent = ((data.used / data.total) * 100).toFixed(1);
        const usedGB  = (data.used  / 1073741824).toFixed(2);
        const totalGB = (data.total / 1073741824).toFixed(2);
        document.querySelector(".storage_fill").style.width = percent + "%";
        document.querySelector(".storage_numbers").textContent = `${usedGB} GB / ${totalGB} GB`;
    } catch (err) {
        console.error("Storage fetch failed:", err);
        document.querySelector(".storage_numbers").textContent = "Could not load";
    }
}

async function loadStats() {
    try {
        const data = await API.getStats();
        document.querySelector("#stat_files").textContent  = data.totalFiles   ?? "--";
        document.querySelector("#stat_shared").textContent = data.sharedWithMe ?? "--";
        document.querySelector("#stat_groups").textContent = data.totalGroups  ?? "--";
    } catch (err) {
        console.error("Stats fetch failed:", err);
        toast("Could not load stats.");
    }
}

async function loadRecentFiles() {
    const container = document.querySelector("#recent_files_list");
    try {
        const files = await API.getRecentFiles();

        if (!files.length) {
            container.innerHTML = "<p>No recent files.</p>";
            return;
        }

        container.innerHTML = files.map(file => `
            <div class="dash_card file_row floting_item">
                <span class="file_icon">${getFileIcon(file.name)}</span>
                <div class="file_meta">
                    <strong>${file.name}</strong>
                    <small>${formatSize(file.size)} · ${timeAgo(file.createdAt)}</small>
                </div>
                <div class="file_btns">
                    <button class="btn btn_download" data-id="${file.id}" data-name="${file.name}">Download</button>
                    <button class="btn btn_share" data-id="${file.id}" data-name="${file.name}">Share</button>
                </div>
            </div>
        `).join("");

        container.querySelectorAll(".btn_download").forEach(btn => {
            btn.addEventListener("click", () => downloadFile(btn.dataset.id, btn.dataset.name))
        });

        container.querySelectorAll(".btn_share").forEach(btn => {
            btn.addEventListener("click", () => openShareModal(btn.dataset.id, btn.dataset.name));
        });

    } catch (err) {
        console.error("Recent files fetch failed:", err);
        container.innerHTML = "<p>Could not load recent files.</p>";
    }
}

async function loadGroups() {
    const container = document.querySelector("#groups_list");
    try {
        const groups = await API.getGroups();

        if (!groups.length) {
            container.innerHTML = "<p>You are not in any groups yet.</p>";
            return;
        }

        container.innerHTML = groups.map(group => {
            const initials = group.name.slice(0, 2).toUpperCase();
            return `
                <a href="group.html?id=${group.id}" class="dash_card group_card floting_item">
                    <div class="group_avatar">${initials}</div>
                    <div class="file_meta">
                        <strong>${group.name}</strong>
                        <small>${group.memberCount ?? "—"} members · ${group.fileCount ?? "—"} files</small>
                    </div>
                </a>
            `;
        }).join("");

    } catch (err) {
        console.error("Groups fetch failed:", err);
        container.innerHTML = "<p>Could not load groups.</p>";
    }
}

let activeShareFileId = null;

function openShareModal(fileId, fileName) {
    activeShareFileId = fileId;
    document.querySelector("#modal_title").textContent = `Share: ${fileName}`;
    document.querySelector("#share_step_1").classList.remove("hidden");
    document.querySelector("#share_step_person").classList.add("hidden");
    document.querySelector("#share_step_group").classList.add("hidden");
    document.querySelector("#share_email").value = "";
    document.querySelector("#share_modal").classList.add("active");
}

function closeShareModal() {
    document.querySelector("#share_modal").classList.remove("active");
    activeShareFileId = null;
}

document.querySelector("#share_modal").addEventListener("click", (e) => {
    if (e.target === document.querySelector("#share_modal")) closeShareModal();
});

document.querySelector("#modal_close").addEventListener("click", closeShareModal);

document.querySelector("#share_to_person").addEventListener("click", () => {
    document.querySelector("#share_step_1").classList.add("hidden");
    document.querySelector("#share_step_person").classList.remove("hidden");
});

document.querySelector("#share_to_group").addEventListener("click", async () => {
    document.querySelector("#share_step_1").classList.add("hidden");
    document.querySelector("#share_step_group").classList.remove("hidden");

    const container = document.querySelector("#share_group_list");
    container.innerHTML = "<p>Loading groups...</p>";

    try {
        const groups = await API.getGroups();

        if (!groups.length) {
            container.innerHTML = "<p>You are not in any groups.</p>";
            return;
        }

        container.innerHTML = groups.map(g => {
            const initials = g.name.slice(0, 2).toUpperCase();
            return `
                <div class="dash_card group_card floting_item share_group_item" data-group-id="${g.id}" data-group-name="${g.name}">
                    <div class="group_avatar">${initials}</div>
                    <div class="file_meta"><strong>${g.name}</strong></div>
                </div>
            `;
        }).join("");

        container.querySelectorAll(".share_group_item").forEach(card => {
            card.addEventListener("click", async () => {
                try {
                    await apiShareWithGroup(activeShareFileId, card.dataset.groupId);
                    toast(`Shared to ${card.dataset.groupName}!`, "success");
                    closeShareModal();
                } catch (err) {
                    console.error("Share to group failed:", err);
                    toast("Could not share to group.");
                }
            });
        });

    } catch (err) {
        console.error("Failed to load groups:", err);
        container.innerHTML = "<p>Could not load groups.</p>";
    }
});

async function handleShareSend() {
    const email = document.querySelector("#share_email").value.trim();
    if (!email) {
        toast("Please enter an email address.");
        return;
    }
    try {
        await apiShareWithPerson(activeShareFileId, email);
        toast(`File shared with ${email}!`, "success");
        closeShareModal();
    } catch (err) {
        console.error("Share to person failed:", err);
        toast(err.message || "Could not share file.");
    }
}

document.querySelector("#share_send_person").addEventListener("click", handleShareSend);

document.querySelector("#share_email").addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleShareSend();
});

async function init() {
    initSidebar();
    initSearch();
    await Promise.all([
        loadUserHeader(),
        loadStorage(),
        loadStats(),
        loadRecentFiles(),
        loadGroups()
    ]);
}

init();