if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

const API = {
 async getProfile() {
    const res = await fetch(`${API_BASE}/api/user/me`, { headers: getAuthHeaders() });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Could not load profile."); }
    return await res.json();
},
async updateProfile(fullName) {
    const res = await fetch(`${API_BASE}/api/user/update`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ fullName })
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Update failed."); }
    return await res.json();
},
   async changePassword(currentPassword, newPassword) {
    const res = await fetch(`${API_BASE}/api/auth/change-password`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ currentPassword, newPassword }) });
    return await res.json();
   },
    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append("avatar", file);
        const res = await fetch(`${API_BASE}/api/user/avatar`, { method: "POST", headers: getAuthHeadersNoContent(), body: formData });
        return await res.json();
    },
    async deleteAccount() {
        const res = await fetch(`${API_BASE}/api/user/me`, { method: "DELETE", headers: getAuthHeaders() });
        return await res.json();
    }
};

async function loadProfile() {
    try {
        const data = await API.getProfile();

        document.querySelector("#profile_name").textContent = data.fullName;
        document.querySelector("#profile_email").textContent = data.email;
        document.querySelector("#profile_since").textContent = "Member since " + new Date(data.createdAt * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        document.querySelector("#full_name").value = data.fullName;
    

        if (data.avatarPath) {
            document.querySelector("#profile_pic_lg").src = `${API_BASE}/${data.avatarPath}`
            document.querySelector("#avatar").src = `${API_BASE}/${data.avatarPath}`
        }

const storageRes = await fetch(`${API_BASE}/api/user/storage`, { headers: getAuthHeaders() })
const storageData = await storageRes.json()
const usedGB = (storageData.used / 1073741824).toFixed(2)
const totalGB = (storageData.total / 1073741824).toFixed(2)
const percent = Math.min((storageData.used / storageData.total) * 100, 100).toFixed(1)
document.querySelector(".storage_fill").style.width = percent + "%"
document.querySelector(".storage_numbers").textContent = `${usedGB} GB / ${totalGB} GB`

    } catch (err) {
        console.error("Profile fetch failed:", err);
        document.querySelector("#profile_name").textContent = "Could not load profile";
        toast("Could not load profile.");
    }
}

document.querySelector("#change_pic_btn").addEventListener("click", () => {
    document.querySelector("#pic_input").click();
});

document.querySelector("#pic_input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        document.querySelector("#profile_pic_lg").src = ev.target.result;
        document.querySelector("#avatar").src = ev.target.result;
    };
    reader.readAsDataURL(file);

    try {
        const data = await API.uploadAvatar(file)
        if (data.avatarPath) {
            document.querySelector("#profile_pic_lg").src = `${API_BASE}/${data.avatarPath}`
            document.querySelector("#avatar").src = `${API_BASE}/${data.avatarPath}`
        }
        toast("Photo updated!", "success")
    } catch (err) {
        console.error("Avatar upload failed:", err)
        toast("Could not upload photo.")
    }
});
///////////////////////////////
document.querySelector("#update_profile").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.querySelector("#full_name").value.trim();
    const msg      = document.querySelector("#update_msg");

    if (!fullName) {
        msg.textContent = "Please fill in all fields.";
        msg.style.color = "#cc0000";
        return;
    }

    try {
        await API.updateProfile(fullName);
        msg.textContent = "Changes saved successfully.";
        msg.style.color = "green";
        document.querySelector("#profile_name").textContent = fullName;
        toast("Profile updated!", "success");
    } catch (err) {
        console.error("Update profile failed:", err);
        msg.textContent = "Could not save changes.";
        msg.style.color = "#cc0000";
        toast("Could not save changes.");
    }
});
///////////////////////////////////////
document.querySelector("#toggle_password_btn").addEventListener("click", () => {
    const wrap = document.querySelector("#password_form_wrap");
    const btn  = document.querySelector("#toggle_password_btn");
    const open = wrap.classList.toggle("open");
    btn.textContent = open ? "Cancel" : "Change";
});
document.querySelector("#change_password").addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentPass = document.querySelector("#current_pass").value;
    const newPass     = document.querySelector("#new_pass").value;
    const confirmPass = document.querySelector("#confirm_pass").value;
    const msg         = document.querySelector("#password_msg");

    if (!currentPass || !newPass || !confirmPass) {
        msg.textContent = "Please fill in all fields.";
        msg.style.color = "#cc0000";
        return;
    }

    if (newPass.length < 6) {
        msg.textContent = "New password must be at least 6 characters.";
        msg.style.color = "#cc0000";
        return;
    }

    if (newPass !== confirmPass) {
        msg.textContent = "New passwords do not match.";
        msg.style.color = "#cc0000";
        return;
    }

try {
    await API.changePassword(currentPass, newPass);
    msg.textContent = "Password updated successfully.";
    msg.style.color = "green";
    document.querySelector("#change_password").reset();
    document.querySelector("#password_form_wrap").classList.remove("open");
    document.querySelector("#toggle_password_btn").textContent = "Change";
    toast("Password changed!", "success");
} catch (err) {
    console.error("Password change failed:", err);
    msg.textContent = "Current password is wrong.";
    msg.style.color = "#cc0000";
    toast("Could not change password.");
}
});
document.querySelector("#logout_button").addEventListener("click", async () => {
    if (!await showConfirm("Are you sure you want to log out?", "Log Out")) return;
    localStorage.removeItem("hc_token");
    window.location.href = "index.html";
});

document.querySelector("#delete_account_btn").addEventListener("click", async () => {
    if (!await showConfirm("Are you sure? This will permanently delete your account and all files. This cannot be undone.", "Delete Account")) return;
    try {
        await API.deleteAccount();
        window.location.href = "index.html";
    } catch (err) {
        console.error("Delete account failed:", err);
        toast("Could not delete account.");
    }
});

async function init() {
    initSidebar();
    initSearch();
    await Promise.all([
        loadUserHeader(),
        loadProfile()
    ]);
}

init();