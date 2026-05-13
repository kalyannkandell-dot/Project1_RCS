// ========== SIDEBAR ==========
document.querySelector("#hamburger").addEventListener("click", () => {
    document.querySelector("#sidebar").classList.toggle("active");
});


// ========== UPLOAD AREA TOGGLE ==========
document.querySelector("#upload_btn").addEventListener("click", () => {
    const area = document.querySelector("#upload_area");
    area.style.display = area.style.display === "none" ? "block" : "none";
});


// ========== BROWSE BUTTON ==========
document.querySelector("#browse_btn").addEventListener("click", () => {
    document.querySelector("#file_input").click();
});


// ========== FILE SELECTED VIA BROWSE ==========
document.querySelector("#file_input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // TODO: upload file to API
    // POST /api/files with FormData containing the file
    // on success -> re-render file list with new file at top

    console.log("File selected:", file.name, file.size);
});


// ========== DRAG AND DROP ==========
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

    // TODO: upload file to API
    // POST /api/files with FormData containing the file
    // on success -> re-render file list with new file at top

    console.log("File dropped:", file.name, file.size);
});


// ========== FILE LIST ==========
// TODO: fetch user files from API
// GET /api/files -> [{ id, name, size, uploadedAt, type }]
// then dynamically render file rows


// ========== FILTER BUTTONS ==========
document.querySelectorAll(".filter_btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter_btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const filter = btn.dataset.filter;

        // client side filter by file extension
        document.querySelectorAll(".file_row").forEach(row => {
            const name = row.querySelector("strong").textContent.toLowerCase();
            if (filter === "all") {
                row.style.display = "flex";
            } else if (filter === "pdf") {
                row.style.display = name.endsWith(".pdf") ? "flex" : "none";
            } else if (filter === "image") {
                row.style.display = (name.endsWith(".jpg") || name.endsWith(".png") || name.endsWith(".jpeg")) ? "flex" : "none";
            } else if (filter === "doc") {
                row.style.display = (name.endsWith(".doc") || name.endsWith(".docx") || name.endsWith(".xlsx") || name.endsWith(".txt")) ? "flex" : "none";
            } else if (filter === "other") {
                const known = [".pdf", ".jpg", ".png", ".jpeg", ".doc", ".docx", ".xlsx", ".txt"];
                row.style.display = !known.some(ext => name.endsWith(ext)) ? "flex" : "none";
            }
        });
    });
});


// ========== SEARCH ==========
document.querySelector("#search").addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    document.querySelectorAll(".file_row").forEach(row => {
        const name = row.querySelector("strong").textContent.toLowerCase();
        row.style.display = name.includes(query) ? "flex" : "none";
    });
});

document.addEventListener("click", (e) => {
    const sidebar = document.querySelector("#sidebar");
    const hamburger = document.querySelector("#hamburger");
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
        sidebar.classList.remove("active");
    }
});