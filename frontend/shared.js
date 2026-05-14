
// swap for real fetch calls on integration

const DUMMY_SHARED_WITH_ME = [
    { id: "sw1", name: "semester_notes.pdf", sharedBy: "Aayush", size: "3.2 MB", ago: "1 day ago",  downloadUrl: "#" },
    { id: "sw2", name: "event_poster.png",   sharedBy: "Albert", size: "1.8 MB", ago: "2 days ago", downloadUrl: "#" },
    { id: "sw3", name: "budget_2025.xlsx",   sharedBy: "Aayush", size: "420 KB", ago: "4 days ago", downloadUrl: "#" },
];

const DUMMY_SHARED_BY_ME = [
    { id: "sb1", name: "project_report.pdf",  sharedWith: "Aayush, Albert", size: "1.2 MB", ago: "2 hours ago" },
    { id: "sb2", name: "notes_chapter3.docx", sharedWith: "Aayush",         size: "540 KB", ago: "3 days ago"  },
];

const DUMMY_LINKS = [
    { id: "lk1", name: "campus_photo.jpg",   expiry: "20 May 2025", password: false, url: "https://hamrocloud.app/s/abc123" },
    { id: "lk2", name: "project_report.pdf", expiry: "25 May 2025", password: true,  url: "https://hamrocloud.app/s/xyz789" },
];

let sharedWithMeStore = [...DUMMY_SHARED_WITH_ME];
let sharedByMeStore   = [...DUMMY_SHARED_BY_ME];
let linksStore        = [...DUMMY_LINKS];

function apiFetchSharedWithMe() { return Promise.resolve([...sharedWithMeStore]); }
function apiFetchSharedByMe()   { return Promise.resolve([...sharedByMeStore]); }
function apiFetchLinks()        { return Promise.resolve([...linksStore]); }

function apiRevokeShare(shareId) {
    sharedByMeStore = sharedByMeStore.filter(f => f.id !== shareId);
    return Promise.resolve({ success: true });
    // changed upon integration
}

function apiCreateLink(file, expiry, password) {
    const newLink = {
        id: "lk" + Date.now(),
        name: file,
        expiry: expiry || "No expiry",
        password: !!password,
        url: "https://hamrocloud.app/s/" + Math.random().toString(36).slice(2, 9)
    };
    linksStore.unshift(newLink);
    return Promise.resolve(newLink);
    // changed upon integration
}

function apiRevokeLink(linkId) {
    linksStore = linksStore.filter(l => l.id !== linkId);
    return Promise.resolve({ success: true });
    // changed upon integration
}


// rendering share with me 
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
                    <a href="${f.downloadUrl}" class="btn" download>Download</a>
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


// revokind share 
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
    const expiry   = document.querySelector("#link_expiry").value;
    const password = document.querySelector("#link_pass").value;

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
    if (!form.contains(e.target) && !btn.contains(e.target)) {
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