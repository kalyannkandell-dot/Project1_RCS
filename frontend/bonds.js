
// upto line 35 is dummy api changed upon intigration 
const DUMMY_GROUPS = [
    { id: "1", name: "CS Project Team",   initials: "CS", memberCount: 4,  fileCount: 12, role: "Admin"  },
    { id: "2", name: "BCA Department",    initials: "BD", memberCount: 18, fileCount: 34, role: "Member" },
    { id: "3", name: "Personal Research", initials: "PR", memberCount: 2,  fileCount: 5,  role: "Admin"  },
];

const DUMMY_INVITES = [
    { id: "1", groupName: "Web Dev Club",    initials: "WD", invitedBy: "Aayush", memberCount: 8  },
    { id: "2", groupName: "Design Society",  initials: "DS", invitedBy: "Albert", memberCount: 12 },
];

let groupStore = [...DUMMY_GROUPS];

function apiFetchGroups()  { return Promise.resolve([...groupStore]); }
function apiFetchInvites() { return Promise.resolve([...DUMMY_INVITES]); }

function apiCreateGroup(name, desc, inviteEmail) {
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const newGroup = { id: String(Date.now()), name, initials, memberCount: 1, fileCount: 0, role: "Admin" };
    groupStore.unshift(newGroup);
    return Promise.resolve(newGroup);
    // changed upon intigration 
}

function apiAcceptInvite(inviteId) {
    return Promise.resolve({ success: true });
    // changed upon intigration 
}

function apiDeclineInvite(inviteId) {
    return Promise.resolve({ success: true });
    // changed upon intigration
}


// render groups
async function loadGroups() {
    const container = document.querySelector("#groups_list");
    try {
        const groups = await apiFetchGroups();

        if (groups.length === 0) {
            container.innerHTML = "<p>You are not in any groups yet.</p>";
            return;
        }

        container.innerHTML = groups.map(group => `
            <a href="group.html?id=${group.id}" class="dash_card group_card floting_item">
                <div class="group_avatar">${group.initials}</div>
                <div class="file_meta">
                    <strong>${group.name}</strong>
                    <small>${group.memberCount} members · ${group.fileCount} files</small>
                </div>
                <span class="group_badge">${group.role}</span>
            </a>
        `).join("");

    } catch (err) {
        console.error("Groups fetch failed:", err);
        container.innerHTML = "<p>Could not load groups.</p>";
    }
}


// render invites
async function loadInvites() {
    const container = document.querySelector("#invites_list");
    try {
        const invites = await apiFetchInvites();

        if (invites.length === 0) {
            container.innerHTML = "<p>No pending invites.</p>";
            return;
        }

        container.innerHTML = invites.map(invite => `
            <div class="dash_card group_card" id="invite_${invite.id}">
                <div class="group_avatar">${invite.initials}</div>
                <div class="file_meta">
                    <strong>${invite.groupName}</strong>
                    <small>Invited by ${invite.invitedBy} · ${invite.memberCount} members</small>
                </div>
                <div class="file_btns">
                    <button class="btn" onclick="acceptInvite('${invite.id}')">Accept</button>
                    <button class="btn btn_danger" onclick="declineInvite('${invite.id}')">Decline</button>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Invites fetch failed:", err);
        container.innerHTML = "<p>Could not load invites.</p>";
    }
}


// accept invite
async function acceptInvite(inviteId) {
    try {
        await apiAcceptInvite(inviteId);
        document.querySelector(`#invite_${inviteId}`)?.remove();
        toast("Invite accepted!", "success");
        loadGroups();
    } catch (err) {
        console.error("Accept failed:", err);
        toast("Could not accept invite.");
    }
}


// decline invite
async function declineInvite(inviteId) {
    try {
        await apiDeclineInvite(inviteId);
        document.querySelector(`#invite_${inviteId}`)?.remove();
        toast("Invite declined.", "success");
    } catch (err) {
        console.error("Decline failed:", err);
        toast("Could not decline invite.");
    }
}


// creating group 
document.querySelector("#create_group_btn").addEventListener("click", () => {
    const form = document.querySelector("#create_group_form");
    form.style.display = form.style.display === "none" ? "block" : "none";
});

document.querySelector("#new_group").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name      = document.querySelector("#group_name").value.trim();
    const desc      = document.querySelector("#group_desc").value.trim();
    const invite    = document.querySelector("#invite_email").value.trim();
    const msg       = document.querySelector("#create_group_msg");

    if (!name) {
        msg.textContent = "Group name is required.";
        msg.style.color = "#cc0000";
        return;
    }

    try {
        await apiCreateGroup(name, desc, invite);
        msg.textContent = "Group created!";
        msg.style.color = "green";
        toast("Group created!", "success");
        document.querySelector("#new_group").reset();
        await loadGroups();
        setTimeout(() => {
            document.querySelector("#create_group_form").style.display = "none";
            msg.textContent = "";
        }, 1500);
    } catch (err) {
        console.error("Create group failed:", err);
        toast("Could not create group.");
    }
});


// init for this page 
async function init() {
    initSidebar();
    initSearch();
    await Promise.all([
        loadUserHeader(),
        loadGroups(),
        loadInvites()
    ]);
}

init();