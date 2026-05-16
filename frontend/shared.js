if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

function apiFetchSharedWithMe() {
    return fetch(`${API_BASE}/api/shared/with-me`, { headers: getAuthHeaders() }).then(r => r.json());
}
function apiFetchSharedByMe() {
    return fetch(`${API_BASE}/api/shared/by-me`, { headers: getAuthHeaders() }).then(r => r.json());
}
function apiRevokeShare(shareId) {
    return fetch(`${API_BASE}/api/shared/${shareId}`, { method: "DELETE", headers: getAuthHeaders() }).then(r => r.json());
}

async function loadSharedWithMe() {
    const container = document.querySelector("#shared_with_me_list");
    try {
        const data = await apiFetchSharedWithMe();
        const files = [...(data.direct || []), ...(data.viaGroups || [])];

        if (!files.length) {
            container.innerHTML = "<p>No files shared with you yet.</p>";
            return;
        }

        container.innerHTML = files.map(f => `
            <div class="dash_card file_row floting_item" data-id="${f.id}">
                <span class="file_icon">${getFileIcon(f.name)}</span>
                <div class="file_meta">
                    <strong>${f.name}</strong>
                    <small>Shared by ${f.sharedByEmail} · ${formatSize(f.size)} · ${timeAgo(f.createdAt)}</small>
                </div>
                <div class="file_btns">
                    <a href="${API_BASE}/api/files/${f.fileId}/download" class="btn" download>Download</a>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Failed to load shared files:", err);
        container.innerHTML = "<p>Could not load shared files.</p>";
    }
}

async function loadSharedByMe() {
    const container = document.querySelector("#shared_by_me_list");
    try {
        const files = await apiFetchSharedByMe();

        if (!files.length) {
            container.innerHTML = "<p>You haven't shared any files yet.</p>";
            return;
        }

        container.innerHTML = files.map(f => `
            <div class="dash_card file_row floting_item" data-id="${f.id}">
                <span class="file_icon">${getFileIcon(f.name)}</span>
                <div class="file_meta">
                    <strong>${f.name}</strong>
                    <small>Shared with ${f.sharedWithEmail || f.sharedWithGroupName} · ${formatSize(f.size)} · ${timeAgo(f.createdAt)}</small>
                </div>
                <div class="file_btns">
                    <button class="btn btn_danger" onclick="revokeShare('${f.shareId}', this)">Revoke</button>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Failed to load shared by me:", err);
        container.innerHTML = "<p>Could not load your shares.</p>";
    }
}

async function revokeShare(shareId, btnEl) {
    if (!confirm("Revoke this share?")) return;
    btnEl.textContent = "…";
    btnEl.disabled = true;
    try {
        await apiRevokeShare(shareId);
        toast("Share revoked.", "success");
        await loadSharedByMe();
    } catch (err) {
        console.error("Revoke failed:", err);
        toast("Failed to revoke share.");
        btnEl.textContent = "Revoke";
        btnEl.disabled = false;
    }
}

const tabs = document.querySelectorAll(".tab_btn");
tabs.forEach(btn => {
    btn.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".dash_section").forEach(s => s.style.display = "none");
        document.querySelector("#" + btn.dataset.tab).style.display = "flex";
    });
});

document.querySelector("#search").addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    const dropdown = document.querySelector("#search_results");
    if (query.length < 1) {
        dropdown.style.display = "none";
        return;
    }
    const matches = [];
    document.querySelectorAll(".file_row").forEach(row => {
        if (row.offsetParent === null) return;
        const nameEl = row.querySelector("strong");
        if (nameEl && nameEl.textContent.toLowerCase().includes(query)) {
            matches.push({ name: nameEl.textContent, icon: row.querySelector(".file_icon")?.textContent || "📁" });
        }
    });
    dropdown.innerHTML = matches.length
        ? matches.map(f => `<div class="search_item"><span>${f.icon}</span><span>${f.name}</span></div>`).join("")
        : `<div class="search_item">No results found</div>`;
    dropdown.style.display = "block";
});

document.addEventListener("click", (e) => {
    if (!e.target.closest("#search")) {
        document.querySelector("#search_results").style.display = "none";
    }
});

async function init() {
    initSidebar();
    await Promise.all([
        loadUserHeader(),
        loadSharedWithMe(),
        loadSharedByMe()
    ]);
}

init();