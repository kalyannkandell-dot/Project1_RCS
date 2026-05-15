if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

async function apiFetchSharedWithMe() {
    const res = await fetch(`${API_BASE}/api/shared/with-me`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiFetchSharedByMe() {
    const res = await fetch(`${API_BASE}/api/shared/by-me`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiFetchLinks() {
    const res = await fetch(`${API_BASE}/api/links`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiRevokeShare(shareId) {
    const res = await fetch(`${API_BASE}/api/shared/${shareId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiCreateLink(file, expiry, password) {
    const res = await fetch(`${API_BASE}/api/links`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ fileName: file, expiry: expiry || null, password: password || null })
    });
    return res.json();
}

async function apiRevokeLink(linkId) {
    const res = await fetch(`${API_BASE}/api/links/${linkId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return res.json();
}


// rendering shared with me
async function loadSharedWithMe() {
    const container = document.querySelector("#shared_with_me_list");
    try {
        const files = await apiFetchSharedWithMe();

        if (!files.length) {
            container.innerHTML = "<p>No files shared with you yet.</p>";
            return;
        }

        container.innerHTML = files.map(f => `
            <div class="dash_card file_row floting_item" data-id="${f.id}">
                <span class="file_icon">${getFileIcon(f.name)}</span>
                <div class="file_meta">
                    <strong>${f.name}</strong>
                    <small>Shared by ${f.sharedBy} · ${f.size} · ${f.ago}</small>
                </div>
                <div class="file_btns">
                    <a href="${API_BASE}${f.downloadUrl}" class="btn" download>Download</a>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Failed to load shared files:", err);
        container.innerHTML = "<p>Could not load shared files.</p>";
    }
}


// rendering shared by me
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
                    <small>Shared with ${f.sharedWith} · ${f.size} · ${f.ago}</small>
                </div>
                <div class="file_btns">
                    <button class="btn btn_danger" onclick="revokeShare('${f.id}', this)">Revoke</button>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Failed to load shared by me:", err);
        container.innerHTML = "<p>Could not load your shares.</p>";
    }
}


// revoking share
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


// render links
async function loadLinks() {
    const container = document.querySelector("#links_list");
    try {
        const links = await apiFetchLinks();

        if (!links.length) {
            container.innerHTML = "<p>No share links yet.</p>";
            return;
        }

        container.innerHTML = links.map(l => `
            <div class="dash_card file_row floting_item" data-id="${l.id}">
                <span class="file_icon">🔗</span>
                <div class="file_meta">
                    <strong>${l.name}</strong>
                    <small>Expires: ${l.expiry} · ${l.password ? "Password protected 🔒" : "No password"}</small>
                </div>
                <div class="file_btns">
                    <button class="btn" onclick="copyLink('${l.url}', this)">Copy Link</button>
                    <button class="btn btn_danger" onclick="revokeLink('${l.id}', this)">Revoke</button>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Failed to load links:", err);
        container.innerHTML = "<p>Could not load share links.</p>";
    }
}


// copy link
function copyLink(url, btnEl) {
    navigator.clipboard.writeText(url)
        .then(() => {
            toast("Link copied!", "success");
            const orig = btnEl.textContent;
            btnEl.textContent = "Copied!";
            setTimeout(() => { btnEl.textContent = orig; }, 1800);
        })
        .catch(() => toast("Could not copy link."));
}


// revoke link
async function revokeLink(linkId, btnEl) {
    if (!confirm("Revoke this link? Anyone using it will lose access.")) return;
    btnEl.textContent = "…";
    btnEl.disabled = true;
    try {
        await apiRevokeLink(linkId);
        toast("Link revoked.", "success");
        await loadLinks();
    } catch (err) {
        console.error("Revoke failed:", err);
        toast("Failed to revoke link.");
        btnEl.textContent = "Revoke";
        btnEl.disabled = false;
    }
}


// form for new link
document.querySelector("#new_link_btn").addEventListener("click", () => {
    const form = document.querySelector("#new_link_form");
    form.style.display = form.style.display === "none" ? "block" : "none";
});

document.querySelector("#link_form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn      = document.querySelector("#auth_button");
    const file     = document.querySelector("#link_file").value.trim();
    const expiry   = document.querySelector("#link_expiry").value || null;
    const password = document.querySelector("#link_pass").value || null;

    if (!file) {
        toast("Please enter a file name.");
        return;
    }

    btn.textContent = "Generating…";
    btn.disabled = true;

    try {
        await apiCreateLink(file, expiry, password);
        toast("Share link created!", "success");
        await loadLinks();
        document.querySelector("#new_link_form").style.display = "none";
        document.querySelector("#link_form").reset();
    } catch (err) {
        console.error("Link creation failed:", err);
        toast("Failed to create link.");
    } finally {
        btn.textContent = "Generate Link";
        btn.disabled = false;
    }
});

document.addEventListener("click", (e) => {
    const form = document.querySelector("#new_link_form");
    const btn  = document.querySelector("#new_link_btn");
    if (form && !form.contains(e.target) && !btn.contains(e.target)) {
        form.style.display = "none";
    }
});


// tabs
const tabs = document.querySelectorAll(".tab_btn");
tabs.forEach(btn => {
    btn.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".dash_section").forEach(s => s.style.display = "none");
        document.querySelector("#" + btn.dataset.tab).style.display = "flex";
    });
});


// init for this page
async function init() {
    initSidebar();
    initSearch();
    await Promise.all([
        loadUserHeader(),
        loadSharedWithMe(),
        loadSharedByMe(),
        loadLinks()
    ]);
}

init();