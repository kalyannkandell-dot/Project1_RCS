

if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

async function apiFetchFiles() {
    const res = await fetch(`${API_BASE}/api/files`, { headers: getAuthHeaders() });
    return res.json();
}

async function apiFetchStorage() {
    const res = await fetch(`${API_BASE}/api/user/storage`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiUploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        headers: getAuthHeadersNoContent(),
        body: formData
    });
    return res.json();
}

async function apiDeleteFile(id) {
    const res = await fetch(`${API_BASE}/api/files/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiShareFile(id, email) {
    const res = await fetch(`${API_BASE}/api/files/${id}/share`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email })
    });
    return res.json();
}


// helper

function classifyFile(name) {
    const ext = name.split(".").pop().toLowerCase();
    if (["pdf"].includes(ext)) return "pdf";
    if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "image";
    if (["doc","docx","txt","xls","xlsx","csv"].includes(ext)) return "doc";
    return "other";
}


// render

let allFiles = [];
let activeFilter = "all";
let activeSearch  = "";

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
                <small>${file.size} · ${file.uploaded}</small>
            </div>
            <div class="file_btns">
                <a href="${API_BASE}${file.url}" class="btn" download="${file.name}">Download</a>
                <button class="btn btn_share" data-id="${file.id}">Share</button>
                <button class="btn btn_danger btn_delete" data-id="${file.id}">Delete</button>
            </div>
        `;
        list.appendChild(row);
    });

    list.querySelectorAll(".btn_delete").forEach(btn => btn.addEventListener("click", handleDelete));
    list.querySelectorAll(".btn_share").forEach(btn => btn.addEventListener("click", handleShare));
}


// load files and storage

async function loadFiles() {
    try {
        allFiles = await apiFetchFiles();
        renderFiles();
    } catch (err) {
        console.error("Failed to load files:", err);
        toast("Could not load files.", "error");
    }
}

async function loadStorage() {
    try {
        const data = await apiFetchStorage();
        const pct = Math.min((data.used / data.total) * 100, 100).toFixed(1);
        document.querySelector(".storage_numbers").textContent = `${data.used} GB / ${data.total} GB`;
        document.querySelector(".storage_fill").style.width = pct + "%";
    } catch (err) {
        console.error("Failed to load storage:", err);
    }
}


// upload

async function uploadFile(file) {
    toast(`Uploading ${file.name}…`);
    try {
        const uploaded = await apiUploadFile(file);
        if (uploaded.message && !uploaded.id) {
            toast(uploaded.message, "error");
            return;
        }
        toast(`${uploaded.name} uploaded!`, "success");
        await loadFiles();
        document.querySelector("#upload_area").style.display = "none";
    } catch (err) {
        console.error("Upload failed:", err);
        toast("Upload failed. Please try again.", "error");
    }
}


// deleat

async function handleDelete(e) {
    const id = e.target.dataset.id;
    const file = allFiles.find(f => f.id === id);
    if (!confirm(`Delete "${file?.name}"?`)) return;
    try {
        await apiDeleteFile(id);
        toast(`"${file?.name}" deleted.`, "success");
        await loadFiles();
    } catch (err) {
        console.error("Delete failed:", err);
        toast("Delete failed.", "error");
    }
}


// share
async function handleShare(e) {
    const id   = e.target.dataset.id;
    const file = allFiles.find(f => f.id === id);
    const email = prompt(`Share "${file?.name}" with (enter email):`);
    if (!email) return;
    try {
        const result = await apiShareFile(id, email.trim());
        if (result.message && !result.success) {
            toast(result.message, "error");
            return;
        }
        toast(`Shared with ${email}!`, "success");
    } catch (err) {
        console.error("Share failed:", err);
        toast("Could not share file.", "error");
    }
}


// upload area toggle

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


// drag and drop

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


// filter buttons

document.querySelectorAll(".filter_btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter_btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        renderFiles();
    });
});


// search

document.querySelector("#search").addEventListener("input", (e) => {
    activeSearch = e.target.value.trim().toLowerCase();
    renderFiles();
});


// init for this page

async function init() {
    initSidebar();
    initSearch();
    await Promise.all([
        loadUserHeader(),
        loadFiles(),
        loadStorage()
    ]);
}

init();