// line 1-30 is dummy, 31-57 will be changed on intigration 
const MOCK = {
    async getStorage() {
        await delay(300);
        return { used: 2.3, total: 10 };
    },
    async getStats() {
        await delay(300);
        return { totalFiles: 48, sharedWithMe: 12, groups: 3, activeLinks: 7 };
    },
    async getRecentFiles() {
        await delay(400);
        return [
            { id: '1', name: 'project_report.pdf', size: 1258291, uploadedAt: new Date(Date.now() - 7200000).toISOString() },
            { id: '2', name: 'database_backup.sql', size: 5033164, uploadedAt: new Date(Date.now() - 86400000).toISOString() },
            { id: '3', name: 'campus_photo.jpg', size: 3250000, uploadedAt: new Date(Date.now() - 172800000).toISOString() },
            { id: '4', name: 'notes_chapter3.docx', size: 552960, uploadedAt: new Date(Date.now() - 259200000).toISOString() },
        ];
    },
    async getGroups() {
        await delay(400);
        return [
            { id: '1', name: 'CS Project Team', initials: 'CS', memberCount: 4, fileCount: 12 },
            { id: '2', name: 'BCA Department', initials: 'BD', memberCount: 18, fileCount: 34 },
            { id: '3', name: 'Personal Research', initials: 'PR', memberCount: 2, fileCount: 5 },
        ];
    }
};



const API = {
    async getStorage() {
        // const res = await fetch(`${API_BASE}/api/user/storage`);
        // return await res.json();
        return await MOCK.getStorage();
    },
    async getStats() {
        // const res = await fetch(`${API_BASE}/api/user/stats`);
        // return await res.json();
        return await MOCK.getStats();
    },
    async getRecentFiles() {
        // const res = await fetch(`${API_BASE}/api/files/recent?limit=4`);
        // return await res.json();
        return await MOCK.getRecentFiles();
    },
    async getGroups() {
        // const res = await fetch(`${API_BASE}/api/groups`);
        // return await res.json();
        return await MOCK.getGroups();
    }
};


async function loadStorage() {
    try {
        const data = await API.getStorage();
        const percent = ((data.used / data.total) * 100).toFixed(1);
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
        document.querySelector("#stat_files").textContent = data.totalFiles ?? "--";
        document.querySelector("#stat_shared").textContent = data.sharedWithMe ?? "--";
        document.querySelector("#stat_groups").textContent = data.groups ?? "--";
        document.querySelector("#stat_links").textContent = data.activeLinks ?? "--";
    } catch (err) {
        console.error("Stats fetch failed:", err);
        toast("Could not load stats.");
    }
}

async function loadRecentFiles() {
    const container = document.querySelector("#recent_files_list");
    try {
        const files = await API.getRecentFiles();

        if (files.length === 0) {
            container.innerHTML = "<p>No recent files.</p>";
            return;
        }

        container.innerHTML = files.map(file => `
            <div class="dash_card file_row floting_item">
                <span class="file_icon">${getFileIcon(file.name)}</span>
                <div class="file_meta">
                    <strong>${file.name}</strong>
                    <small>${formatSize(file.size)} · ${timeAgo(file.uploadedAt)}</small>
                </div>
                <div class="file_btns">
                    <a href="${API_BASE}/api/files/${file.id}/download" class="btn">Download</a>
                    <a href="#" class="btn" onclick="shareFile('${file.id}', '${file.name}'); return false;">Share</a>
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
            </a>
        `).join("");
    } catch (err) {
        console.error("Groups fetch failed:", err);
        container.innerHTML = "<p>Could not load groups.</p>";
    }
}


function shareFile(fileId, fileName) {
    // ill add a proper share modal here later, for now just go to shared page
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