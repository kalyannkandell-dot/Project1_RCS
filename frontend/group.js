
// swap these for real fetch calls on integration

const DUMMY_GROUP = {
    id: "1", name: "CS Project Team", initials: "CS",
    memberCount: 4, fileCount: 12, createdByMe: true
};

const DUMMY_MEMBERS = [
    { id: "me",  name: "Kalyan Kandel",  email: "kalyan@email.com",  role: "Admin",  isMe: true  },
    { id: "2",   name: "Aayush Subedi",  email: "aayush@email.com",  role: "Member", isMe: false },
    { id: "3",   name: "Albert Baral",   email: "albert@email.com",  role: "Member", isMe: false },
    { id: "4",   name: "Raj Kumar",      email: "raj@email.com",     role: "Member", isMe: false },
];

const DUMMY_GROUP_FILES = [
    { id: "1", name: "project_proposal.pdf", size: "2.1 MB", uploadedBy: "Kalyan", uploaded: "1 day ago"   },
    { id: "2", name: "task_breakdown.xlsx",  size: "340 KB", uploadedBy: "Aayush", uploaded: "2 days ago"  },
    { id: "3", name: "security_plan.docx",   size: "180 KB", uploadedBy: "Albert", uploaded: "3 days ago"  },
];

let memberStore = [...DUMMY_MEMBERS];
let groupFileStore = [...DUMMY_GROUP_FILES];

function apiFetchGroup()           { return Promise.resolve({...DUMMY_GROUP}); }
function apiFetchMembers()         { return Promise.resolve([...memberStore]); }
function apiFetchGroupFiles()      { return Promise.resolve([...groupFileStore]); }

function apiInviteMember(email) {
    return Promise.resolve({ success: true });
    // changed upon intigration
}

function apiRemoveMember(memberId) {
    memberStore = memberStore.filter(m => m.id !== memberId);
    return Promise.resolve({ success: true });
    // changed upon intigration
}

function apiUploadGroupFile(file) {
    const newFile = {
        id: String(Date.now()), name: file.name,
        size: formatSize(file.size), uploadedBy: "Kalyan", uploaded: "Just now"
    };
    groupFileStore.unshift(newFile);
    return Promise.resolve(newFile);
    // changed upon intigration 
}

function apiDeleteGroupFile(fileId) {
    groupFileStore = groupFileStore.filter(f => f.id !== fileId);
    return Promise.resolve({ success: true });
    // changed upon intigration
}

function apiLeaveGroup() {
    return Promise.resolve({ success: true });
    // real: DELETE /api/groups/:id/members/me
}


// load group info
async function loadGroupInfo() {
    try {
        const group = await apiFetchGroup();
        document.querySelector("#group_initials").textContent = group.initials;
        document.querySelector("#group_name").textContent = group.name;
        document.querySelector("#group_meta").textContent =
            `${group.memberCount} members · ${group.fileCount} files · ${group.createdByMe ? "Created by you" : ""}`;
        document.title = `Hamro Cloud - ${group.name}`;
    } catch (err) {
        console.error("Failed to load group:", err);
        toast("Could not load group info.");
    }
}


// loding members
async function loadMembers() {
    const container = document.querySelector("#members_list");
    try {
        const members = await apiFetchMembers();

        container.innerHTML = members.map(m => `
            <div class="dash_card file_row floting_item">
                <div class="group_avatar">${m.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}</div>
                <div class="file_meta">
                    <strong>${m.name}</strong>
                    <small>${m.email} · ${m.role}</small>
                </div>
                ${m.isMe
                    ? `<span class="group_badge">You</span>`
                    : `<button class="btn btn_danger" onclick="removeMember('${m.id}')">Remove</button>`
                }
            </div>
        `).join("");

    } catch (err) {
        console.error("Failed to load members:", err);
        container.innerHTML = "<p>Could not load members.</p>";
    }
}


// removing members
async function removeMember(memberId) {
    if (!confirm("Remove this member?")) return;
    try {
        await apiRemoveMember(memberId);
        toast("Member removed.", "success");
        loadMembers();
    } catch (err) {
        console.error("Remove failed:", err);
        toast("Could not remove member.");
    }
}


// loding group files 
async function loadGroupFiles() {
    const container = document.querySelector("#group_files_list");
    try {
        const files = await apiFetchGroupFiles();

        if (files.length === 0) {
            container.innerHTML = "<p>No files yet.</p>";
            return;
        }

        container.innerHTML = files.map(f => `
            <div class="dash_card file_row floting_item">
                <span class="file_icon">${getFileIcon(f.name)}</span>
                <div class="file_meta">
                    <strong>${f.name}</strong>
                    <small>${f.size} · Uploaded by ${f.uploadedBy} · ${f.uploaded}</small>
                </div>
                <div class="file_btns">
                    <a href="#" class="btn" download="${f.name}">Download</a>
                    <button class="btn btn_danger" onclick="deleteGroupFile('${f.id}')">Delete</button>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Failed to load group files:", err);
        container.innerHTML = "<p>Could not load files.</p>";
    }
}


// deleating group files
async function deleteGroupFile(fileId) {
    if (!confirm("Delete this file?")) return;
    try {
        await apiDeleteGroupFile(fileId);
        toast("File deleted.", "success");
        loadGroupFiles();
    } catch (err) {
        console.error("Delete failed:", err);
        toast("Could not delete file.");
    }
}


// uploding group files 
document.querySelector("#upload_group_btn").addEventListener("click", () => {
    document.querySelector("#group_file_input").click();
});

document.querySelector("#group_file_input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast(`Uploading ${file.name}…`);
    try {
        await apiUploadGroupFile(file);
        toast(`${file.name} uploaded!`, "success");
        await loadGroupFiles();
    } catch (err) {
        console.error("Upload failed:", err);
        toast("Upload failed.");
    }
    e.target.value = "";
});


// invitation 
document.querySelector("#invite_btn").addEventListener("click", () => {
    const form = document.querySelector("#invite_form");
    form.style.display = form.style.display === "none" ? "block" : "none";
});

document.querySelector("#invite_submit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#invite_email").value.trim();
    try {
        await apiInviteMember(email);
        toast(`Invite sent to ${email}!`, "success");
        document.querySelector("#invite_form").style.display = "none";
        document.querySelector("#invite_email").value = "";
    } catch (err) {
        console.error("Invite failed:", err);
        toast("Could not send invite.");
    }
});


// leaving the group 
document.querySelector("#leave_btn").addEventListener("click", async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
        await apiLeaveGroup();
        toast("You left the group.", "success");
        window.location.href = "bonds.html";
    } catch (err) {
        console.error("Leave failed:", err);
        toast("Could not leave group.");
    }
});


// init for this page
async function init() {
    initSidebar();
    initSearch();
    await Promise.all([
        loadUserHeader(),
        loadGroupInfo(),
        loadMembers(),
        loadGroupFiles()
    ]);
}

init();