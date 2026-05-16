if (!localStorage.getItem("hc_token")) {
    window.location.href = "login.html";
}

const API = {
    async getProfile() {
        const res = await fetch(`${API_BASE}/api/user/me`, { headers: getAuthHeaders() });
        return await res.json();
    },
    async updateProfile(fullName, email) {
        const res = await fetch(`${API_BASE}/api/user/update`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ fullName, email }) });
        return await res.json();
    },
    async changePassword(currentPassword, newPassword) {
        const res = await fetch(`${API_BASE}/api/user/change-password`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ currentPassword, newPassword }) });
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


// load profile
async function loadProfile() {
    try {
        const data = await API.getProfile();

        document.querySelector("#profile_name").textContent = data.fullName;
        document.querySelector("#profile_email").textContent = data.email;
        document.querySelector("#profile_since").textContent = "Member since " + data.memberSince;
        document.querySelector("#full_name").value = data.fullName;
        document.querySelector("#email").value = data.email;

        if (data.avatarUrl) {
            document.querySelector("#profile_pic_lg").src = data.avatarUrl;
        }

        const percent = ((data.storageUsed / data.storageTotal) * 100).toFixed(1);
        document.querySelector(".storage_fill").style.width = percent + "%";
        document.querySelector(".storage_numbers").textContent = `${data.storageUsed} GB / ${data.storageTotal} GB`;

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
        await API.uploadAvatar(file);
        toast("Photo updated!", "success");
    } catch (err) {
        console.error("Avatar upload failed:", err);
        toast("Could not upload photo.");
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
        await API.updateProfile(fullName, email);
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
        await API.changePassword(currentPass, newPass);
        msg.textContent = "Password updated successfully.";
        msg.style.color = "green";
        document.querySelector("#change_password").reset();
        toast("Password changed!", "success");
    } catch (err) {
        console.error("Password change failed:", err);
        msg.textContent = "Current password is wrong.";
        msg.style.color = "#cc0000";
        toast("Could not change password.");
    }
});


// delete account
document.querySelector("#delete_account_btn").addEventListener("click", async () => {
    if (!confirm("Are you sure? This will permanently delete your account and all files. This cannot be undone.")) return;
    try {
        await API.deleteAccount();
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