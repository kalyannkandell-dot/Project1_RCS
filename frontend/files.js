if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

function apiFetchFiles() {
    return fetch(`${API_BASE}/api/files/recent?limit=50`, { headers: getAuthHeaders() }).then(r => r.json());
}
function apiFetchStorage() {
    return fetch(`${API_BASE}/api/user/storage`, { headers: getAuthHeaders() }).then(r => r.json());
}
function apiFetchGroups() {
    return fetch(`${API_BASE}/api/groups`, { headers: getAuthHeaders() }).then(r => r.json());
}
function apiUploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/files`, { method: "POST", headers: getAuthHeadersNoContent(), body: formData }).then(r => r.json());
}
function apiDeleteFile(id) {
    return fetch(`${API_BASE}/api/files/${id}`, { method: "DELETE", headers: getAuthHeaders() }).then(r => r.json());
}
function apiShareWithPerson(fileId, email) {
    return fetch(`${API_BASE}/api/files/${fileId}/share/person`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ email }) }).then(r => r.json());
}
function apiShareWithGroup(fileId, groupId) {
    return fetch(`${API_BASE}/api/groups/${groupId}/files/${fileId}`, { method: "POST", headers: getAuthHeaders() }).then(r => r.json());
}

function classifyFile(name) {
    const ext = name.split(".").pop().toLowerCase();
    if (["pdf"].includes(ext)) return "pdf";
    if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "image";
    if (["doc","docx","txt","xls","xlsx","csv"].includes(ext)) return "doc";
    if (["js","html"].includes(ext)) return "invalid";
    return "other";
}

let allFiles = [];
let activeFilter = "all";
let activeSearch = "";

function renderFiles() {
    const list = document.querySelector("#file_list");
    list.innerHTML = "";

    const visible = allFiles.filter(f => {
        const matchFilter = activeFilter === "all" || classifyFile(f.name) === activeFilter;
        const matchSearch = f.name.toLowerCase().includes(activeSearch);
        return matchFilter && matchSearch;
    });

    if (visible.length === 0) {
        list.innerHTML = `<p>No files found.</p>`;
        return;
    }

    visible.forEach(file => {
        const row = document.createElement("div");
        row.className = "dash_card file_row floting_item";
        row.dataset.id = file.id;
        row.innerHTML = `
            <span class="file_icon">${getFileIcon(file.name)}</span>
            <div class="file_meta">
                <strong>${file.name}</strong>
                <small>${formatSize(file.size)} · ${timeAgo(file.createdAt)}</small>
            </div>
            <div class="file_btns">
                <button class="btn btn_download" data-id="${file.id}" data-name="${file.name}">Download</button>
                <button class="btn btn_share" data-id="${file.id}">Share</button>
                <button class="btn btn_danger btn_delete" data-id="${file.id}">Delete</button>
            </div>
        `;
        list.appendChild(row);
    });

    list.querySelectorAll(".btn_delete").forEach(btn => btn.addEventListener("click", handleDelete));
list.querySelectorAll(".btn_share").forEach(btn => btn.addEventListener("click", openShareModal));
// ADD EVERYTHING BELOW THIS
list.querySelectorAll(".btn_download").forEach(btn => {
    btn.addEventListener("click", async () => {
        const id = btn.dataset.id
        const name = btn.dataset.name
        const res = await fetch(`${API_BASE}/api/files/${id}/download`, { headers: getAuthHeaders() })
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        URL.revokeObjectURL(url)
    })
})
}

async function loadFiles() {
    try {
        allFiles = await apiFetchFiles();
        renderFiles();
    } catch (err) {
        console.error("Failed to load files:", err);
        toast("Could not load files.");
    }
}

async function loadStorage() {
    try {
        const data = await apiFetchStorage();
        const usedGB  = (data.used  / 1073741824).toFixed(2);
        const totalGB = (data.total / 1073741824).toFixed(2);
        const pct = Math.min((data.used / data.total) * 100, 100).toFixed(1);
        document.querySelector(".storage_numbers").textContent = `${usedGB} GB / ${totalGB} GB`;
        document.querySelector(".storage_fill").style.width = pct + "%";
    } catch (err) {
        console.error("Failed to load storage:", err);
    }
}

async function uploadFile(file) {
    if (classifyFile(file.name) === "invalid") {
        toast("Invalid file format.");
        return;
    }
    toast(`Uploading ${file.name}…`);
    try {
        const uploaded = await apiUploadFile(file);
        toast(`${uploaded.name} uploaded!`, "success");
        await loadFiles();
        await loadStorage();
        document.querySelector("#upload_area").style.display = "none";
    } catch (err) {
        console.error("Upload failed:", err);
        toast(err.error || "Upload failed. Please try again.");
    }
}

async function handleDelete(e) {
    const id   = e.target.dataset.id;
    const file = allFiles.find(f => String(f.id) === String(id));
    if (!confirm(`Delete "${file?.name}"?`)) return;
    try {
        await apiDeleteFile(id);
        toast(`"${file?.name}" deleted.`, "success");
        await loadFiles();
        await loadStorage();
    } catch (err) {
        console.error("Delete failed:", err);
        toast("Delete failed.");
    }
}

let activeShareFileId = null;

function openShareModal(e) {
    activeShareFileId = e.target.dataset.id;
    const file = allFiles.find(f => String(f.id) === String(activeShareFileId));
    document.querySelector("#modal_title").textContent = `Share: ${file?.name}`;

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
        const groups = await apiFetchGroups();
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
                const groupId   = card.dataset.groupId;
                const groupName = card.dataset.groupName;
                try {
                    await apiShareWithGroup(activeShareFileId, groupId);
                    toast(`Shared to ${groupName}!`, "success");
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

document.querySelector("#share_send_person").addEventListener("click", async () => {
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
        toast("Could not share file.");
    }
});

document.querySelector("#upload_btn").addEventListener("click", () => {
    const area = document.querySelector("#upload_area");
    area.style.display = area.style.display === "none" ? "block" : "none";
});

document.querySelector("#browse_btn").addEventListener("click", () => {
    document.querySelector("#file_input").click();
});

document.querySelector("#file_input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadFile(file);
    e.target.value = "";
});

const dropZone = document.querySelector("#drop_zone");

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.background = "rgba(23, 178, 221, 0.7)";
});

dropZone.addEventListener("dragleave", () => {
    dropZone.style.background = "";
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.background = "";
    const file = e.dataTransfer.files[0];
    if (!file) return;
    uploadFile(file);
});

document.querySelectorAll(".filter_btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter_btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        renderFiles();
    });
});

document.querySelector("#search").addEventListener("input", (e) => {
    activeSearch = e.target.value.trim().toLowerCase();
    renderFiles();
});

async function init() {
    initSidebar();
    await Promise.all([
        loadUserHeader(),
        loadFiles(),
        loadStorage()
    ]);
}

init();