// ========== SIDEBAR ==========
document.querySelector("#hamburger").addEventListener("click", (event) => {
    document.querySelector("#sidebar").classList.toggle("active");
});


// ========== STORAGE BAR ==========
// TODO: fetch storage info from API
// GET /api/user/storage -> { used: 2.3, total: 10 }
// then update the storage bar fill width and text dynamically
// example:
// const { used, total } = await fetch('/api/user/storage').then(r => r.json());
// document.querySelector(".storage_fill").style.width = (used / total * 100) + "%";
// document.querySelector(".storage_numbers").textContent = `${used} GB / ${total} GB`;


// ========== STAT CARDS ==========
// TODO: fetch user stats from API
// GET /api/user/stats -> { totalFiles, sharedWithMe, groups, activeLinks }
// then update each stat_num element


// ========== RECENT FILES ==========
// TODO: fetch recent files from API
// GET /api/files/recent?limit=4 -> [{ name, size, uploadedAt, type }]
// then dynamically render file rows into the recent files section


// ========== MY GROUPS ==========
// TODO: fetch user groups from API
// GET /api/groups -> [{ id, name, memberCount, fileCount, initials }]
// then dynamically render group cards


// ========== SEARCH ==========
document.querySelector("#search").addEventListener("input", (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) return;
    // TODO: fetch search results from API
    // GET /api/search?q=query -> [{ name, type, size }]
    // then render results (could redirect to files.html?q=query)
});

document.addEventListener("click", (e) => {
    const sidebar = document.querySelector("#sidebar");
    const hamburger = document.querySelector("#hamburger");
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
        sidebar.classList.remove("active");
    }
});