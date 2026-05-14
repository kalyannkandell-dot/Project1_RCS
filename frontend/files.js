
//  first 38lines are dummy api layer 
//  Swap these functions for real fetch calls on integration

const DUMMY_FILES = [
    { id: "1", name: "project_report.pdf",  size: "1.2 MB", uploaded: "2 hours ago", url: "#" },
    { id: "2", name: "database_backup.sql", size: "4.8 MB", uploaded: "Yesterday",   url: "#" },
    { id: "3", name: "campus_photo.jpg",    size: "3.1 MB", uploaded: "2 days ago",  url: "#" },
    { id: "4", name: "notes_chapter3.docx", size: "540 KB", uploaded: "3 days ago",  url: "#" },
    { id: "5", name: "marks_sheet.xlsx",    size: "210 KB", uploaded: "4 days ago",  url: "#" },
    { id: "6", name: "id_card_scan.png",    size: "890 KB", uploaded: "5 days ago",  url: "#" },
];

let fileStore = [...DUMMY_FILES];
let nextId = fileStore.length + 1;

function apiFetchFiles()    { return Promise.resolve([...fileStore]); }
function apiFetchStorage()  { return Promise.resolve({ usedGB: 2.3, totalGB: 10 }); }

function apiUploadFile(file) {
    const newFile = { id: String(nextId++), name: file.name, size: formatSize(file.size), uploaded: "Just now", url: "#" };
    fileStore.unshift(newFile);
    return Promise.resolve(newFile);
    // to be swapped upon intigration 
}

function apiDeleteFile(id) {
    fileStore = fileStore.filter(f => f.id !== id);
    return Promise.resolve({ success: true });
    // to be swapped
}

function apiShareFile(id) {
    const file = fileStore.find(f => f.id === id);
    return Promise.resolve({ link: `https://hamrocloud.app/share/${id}/${file?.name}` });
    // to be swapped 
}


// helper

function classifyFile(name) {
    const ext = name.split(".").pop().toLowerCase();
    if (["pdf"].includes(ext)) return "pdf";
    if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "image";
    if (["doc","docx","txt","xls","xlsx","csv"].includes(ext)) return "doc";
    return "other";
}


//  RENDER

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
                <a href="${file.url}" class="btn" download="${file.name}">Download</a>
                <button class="btn btn_share" data-id="${file.id}">Share</button>
                <button class="btn btn_danger btn_delete" data-id="${file.id}">Delete</button>
            </div>
        `;
        list.appendChild(row);
    });

    list.querySelectorAll(".btn_delete").forEach(btn => btn.addEventListener("click", handleDelete));
    list.querySelectorAll(".btn_share").forEach(btn => btn.addEventListener("click", handleShare));
}


//  load files and storage 


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
        const { usedGB, totalGB } = await apiFetchStorage();
        const pct = Math.min((usedGB / totalGB) * 100, 100).toFixed(1);
        document.querySelector(".storage_numbers").textContent = `${usedGB} GB / ${totalGB} GB`;
        document.querySelector(".storage_fill").style.width = pct + "%";
    } catch (err) {
        console.error("Failed to load storage:", err);
    }
}


//  upload

async function uploadFile(file) {
    toast(`Uploading ${file.name}…`);
    try {
        const uploaded = await apiUploadFile(file);
        toast(`${uploaded.name} uploaded!`, "success");
        await loadFiles();
        document.querySelector("#upload_area").style.display = "none";
    } catch (err) {
        console.error("Upload failed:", err);
        toast("Upload failed. Please try again.", "error");
    }
}



//  DELETE

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
    const id = e.target.dataset.id;
    try {
        const { link } = await apiShareFile(id);
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(link);
            toast("Share link copied!", "success");
        } else {
            prompt("Copy this share link:", link);
        }
    } catch (err) {
        console.error("Share failed:", err);
        toast("Could not generate share link.", "error");
    }
}


//  upload area toggle 

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


//  drag and drop 

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


// filter button

document.querySelectorAll(".filter_btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter_btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        renderFiles();
    });
});


//  search, filters rendered list, dropdown from utils

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