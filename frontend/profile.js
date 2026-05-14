if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

async function apiGetProfile() {
    const res = await fetch(`${API_BASE}/api/user/me`, {
        headers: getAuthHeaders()
    });
    return await res.json();
}

async function apiGetStorage() {
    const res = await fetch(`${API_BASE}/api/user/storage`, {
        headers: getAuthHeaders()
    });
    return await res.json();
}

async function apiUpdateProfile(fullName, email) {
    // FIX: was PATCH /api/user/me — correct endpoint is /api/user/profile
    const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ fullName, email })
    });
    return res.json();
}

// FIX: backend has no avatar upload endpoint — keeping function but showing a warning
// If you add POST /api/user/avatar to the backend in the future, this will work as-is
async function apiUpdateAvatar(file) {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch(`${API_BASE}/api/user/avatar`, {
        method: "POST",
        headers: { "Authorization": "Bearer " + localStorage.getItem("hc_token") },
        body: formData
    });
    return res.json();
}

async function apiChangePassword(currentPass, newPass) {
    // FIX: was PATCH /api/user/password — correct endpoint is POST /api/user/change-password
    const res = await fetch(`${API_BASE}/api/user/change-password`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
    });
    return res.json();
}

async function apiDeleteAccount() {
    // FIX: was DELETE /api/user/me — correct endpoint is DELETE /api/user/account
    const res = await fetch(`${API_BASE}/api/user/account`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return res.json();
}


async function loadProfile() {
    try {
        // FIX: backend /api/user/me does NOT return storageUsed/storageTotal
        // those come from a separate /api/user/storage call
        const [data, storage] = await Promise.all([apiGetProfile(), apiGetStorage()]);

        document.querySelector("#profile_name").textContent = data.fullName;
        document.querySelector("#profile_email").textContent = data.email;
        document.querySelector("#profile_since").textContent = "Member since " + data.memberSince;
        document.querySelector("#full_name").value = data.fullName;
        document.querySelector("#email").value = data.email;

        if (data.avatarUrl) {
            document.querySelector("#profile_pic_lg").src = data.avatarUrl;
        }

        const percent = ((storage.used / storage.total) * 100).toFixed(1);
        document.querySelector(".storage_fill").style.width = percent + "%";
        document.querySelector(".storage_numbers").textContent = `${storage.used} GB / ${storage.total} GB`;

    } catch (err) {
        console.error("Profile fetch failed:", err);
        document.querySelector("#profile_name").textContent = "Could not load profile";
        toast("Could not load profile.");
    }
}


// changing profile pic
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
        await apiUpdateAvatar(file);
        toast("Photo updated!", "success");
    } catch (err) {
        console.error("Avatar update failed:", err);
        toast("Avatar endpoint not yet implemented on the server.");
    }
});


// updating profile
document.querySelector("#update_profile").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.querySelector("#full_name").value.trim();
    const email    = document.querySelector("#email").value.trim();
    const msg      = document.querySelector("#update_msg");

    if (!fullName || !email) {
        msg.textContent = "Please fill in all fields.";
        msg.style.color = "#cc0000";
        return;
    }

    try {
        const result = await apiUpdateProfile(fullName, email);
        if (!result.success) throw new Error(result.message);
        msg.textContent = "Changes saved successfully.";
        msg.style.color = "green";
        document.querySelector("#profile_name").textContent = fullName;
        toast("Profile updated!", "success");
    } catch (err) {
        console.error("Profile update failed:", err);
        msg.textContent = err.message || "Could not save changes.";
        msg.style.color = "#cc0000";
        toast("Could not update profile.");
    }
});


// changing password
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
        const result = await apiChangePassword(currentPass, newPass);
        if (!result.success) throw new Error(result.message);
        msg.textContent = "Password updated successfully.";
        msg.style.color = "green";
        document.querySelector("#change_password").reset();
        toast("Password changed!", "success");
    } catch (err) {
        console.error("Password change failed:", err);
        msg.textContent = err.message || "Could not update password.";
        msg.style.color = "#cc0000";
        toast("Could not change password.");
    }
});


// delete account
document.querySelector("#delete_account_btn").addEventListener("click", async () => {
    if (!confirm("Are you sure? This will permanently delete your account and all files. This cannot be undone.")) return;
    try {
        await apiDeleteAccount();
        localStorage.removeItem("hc_token");
        window.location.href = "index.html";
    } catch (err) {
        console.error("Delete account failed:", err);
        toast("Could not delete account.");
    }
});


// init for this page
async function init() {
    initSidebar();
    initSearch();
    await Promise.all([
        loadUserHeader(),
        loadProfile()
    ]);
}

init();