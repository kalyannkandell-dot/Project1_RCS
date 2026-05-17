const API_BASE ="http://192.168.1.7:3000"; 
// ─── CHANGE API_BASE FOR DIFFERENT NETWORKS ───────────────────────────────────
// 1. Run this in terminal to get your IP:
//    ipconfig getifaddr en0
//
// 2. Replace the IP above with your new IP:
//    const API_BASE = "http://<YOUR_IP>:3000"
//
// 3. Open frontend on any device on same WiFi:
//    http://<YOUR_IP>:5500/frontend/login.html
//
// Example:
//    const API_BASE = "http://192.168.1.5:3000"
//    http://192.168.1.5:5500/frontend/login.html
// ─────────────────────────────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function timeAgo(timestamp) {
    const now = Date.now();
    const diff = Math.floor((now - timestamp * 1000) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + " min ago";
    if (diff < 86400) return Math.floor(diff / 3600) + " hours ago";
    if (diff < 172800) return "Yesterday";
    return Math.floor(diff / 86400) + " days ago";
}

function getFileIcon(name) {
    const ext = name.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼";
    if (["mp4", "mov", "avi"].includes(ext)) return "🎬";
    if (["mp3", "wav"].includes(ext)) return "🎵";
    if (["pdf"].includes(ext)) return "📄";
    if (["xlsx", "csv"].includes(ext)) return "📊";
    if (["zip", "rar"].includes(ext)) return "🗜";
    if (["sql", "db", "sqlite"].includes(ext)) return "🗄";
    return "📁";
}

function toast(msg, type = 'error') {
    let el = document.getElementById('hc_toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'hc_toast';
        Object.assign(el.style, {
            position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
            padding: '0.65rem 1.1rem', borderRadius: '4px', fontSize: '0.875rem',
            fontWeight: 'bold', boxShadow: '5px 5px 0 0 black',
            transition: 'opacity 0.3s', opacity: '0', pointerEvents: 'none',
            fontFamily: "'Courier New', monospace",
        });
        document.body.appendChild(el);
    }
    el.style.background = type === 'error' ? '#cc0000' : '#006600';
    el.style.color = '#fff';
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

function initSidebar() {
    document.querySelector("#hamburger").addEventListener("click", () => {
        document.querySelector("#sidebar").classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
        const sidebar = document.querySelector("#sidebar");
        const hamburger = document.querySelector("#hamburger");
        if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
            sidebar.classList.remove("active");
        }
    });
}

function initSearch() {
    const input = document.querySelector("#search");
    const dropdown = document.querySelector("#search_results");
    if (!input || !dropdown) return;

    let allFilesCache = [];
    fetch(`${API_BASE}/api/files/recent?limit=50`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(files => { allFilesCache = files; })
        .catch(() => {
            allFilesCache = [];
        });

    input.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length < 1) {
            dropdown.style.display = "none";
            return;
        }
        const matches = allFilesCache.filter(f => f.name.toLowerCase().includes(query));
        dropdown.innerHTML = matches.length
            ? matches.map(f => `
                <div class="search_item" onclick="window.location.href='files.html'">
                    <span>${getFileIcon(f.name)}</span>
                    <span>${f.name}</span>
                </div>`).join("")
            : `<div class="search_item">No results found</div>`;
        dropdown.style.display = "block";
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#search")) {
            dropdown.style.display = "none";
        }
    });
}

async function loadUserHeader() {
    try {
        const res = await fetch(`${API_BASE}/api/user/me`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.avatarPath) {
            document.querySelector("#avatar").src = `${API_BASE}/${data.avatarPath}`;
        }
    } catch (err) {
        document.querySelector("#avatar").src = "images/profilepic.png";
    }
}