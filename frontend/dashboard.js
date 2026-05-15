

if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

const API = {
    async getStorage() {
        const res = await fetch(`${API_BASE}/api/user/storage`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },
    async getStats() {
        const res = await fetch(`${API_BASE}/api/user/stats`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },
    async getRecentFiles() {
        const res = await fetch(`${API_BASE}/api/files/recent?limit=4`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },
    async getGroups() {
        const res = await fetch(`${API_BASE}/api/groups`, {
            headers: getAuthHeaders()
        });
        return res.json();
    }
};

async function loadStorage() {
    try {
        const data = await API.getStorage();
        const percent = Math.min((data.used / data.total) * 100, 100).toFixed(1);
        document.querySelector(".storage_fill").style.width = percent + "%";
        document.querySelector(".storage_numbers").textContent = `${data.used} GB / ${data.total} GB`;
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
        document.querySelector("#stat_groups").textContent = data.groups        ?? "--";
        document.querySelector("#stat_links").textContent  = data.activeLinks   ?? "--";
    } catch (err) {
        console.error("Stats fetch failed:", err);
        toast("Could not load stats.");
    }
}

async function loadRecentFiles() {
    const container = document.querySelector("#recent_files_list");
    try {
        const files = await API.getRecentFiles();

        if (!Array.isArray(files) || files.length === 0) {
            container.innerHTML = "<p>No recent files.</p>";
            return;
        }

        container.innerHTML = files.map(file => `
            <div class="dash_card file_row floting_item">
                <span class="file_icon">${getFileIcon(file.name)}</span>
                <div class="file_meta">
                    <strong>${file.name}</strong>
                    <!--
                        FIX: backend /api/files/recent returns raw sizeBytes (not pre-formatted),
                        so we call formatSize() here. timeAgo() also called on uploadedAt.
                    -->
                    <small>${formatSize(file.sizeBytes)} · ${timeAgo(file.uploadedAt)}</small>
                </div>
                <div class="file_btns">
                    <a href="${API_BASE}/api/files/${file.id}/download"
                       class="btn"
                       target="_blank">Download</a>
                    <button class="btn" onclick="shareFile('${file.id}', '${file.name}')">Share</button>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.error("Recent files fetch failed:", err);
        container.innerHTML = "<p>Could not load recent files.</p>";
    }
}

async function loadGroups() {
    const container = document.querySelector("#groups_list");
    try {
        const groups = await API.getGroups();

        if (!Array.isArray(groups) || groups.length === 0) {
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
            </a>
        `).join("");
    } catch (err) {
        console.error("Groups fetch failed:", err);
        container.innerHTML = "<p>Could not load groups.</p>";
    }
}

function shareFile(fileId, fileName) {
    window.location.href = `shared.html?file=${fileId}`;
}

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