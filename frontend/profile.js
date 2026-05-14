// first 14 lines are dummy api, 18-22 is supposed to be edited on intigration  and a lot of intigration is pending too
const MOCK = {
    async getProfile() {
        await delay(300);
        return {
            fullName: 'Kalyan Kandel',
            email: 'kalyan@email.com',
            memberSince: 'January 2025',
            avatarUrl: null,
            storageUsed: 2.3,
            storageTotal: 10
        };
    }
};



const API = {
    async getProfile() {
        // const res = await fetch(`${API_BASE}/api/user/me`);
        // return await res.json();
        return await MOCK.getProfile();
    }
};


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

    // still has to api intigration for this

    toast("Photo updated!", "success");
});


// updating profile
document.querySelector("#update_profile").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.querySelector("#full_name").value.trim();
    const email = document.querySelector("#email").value.trim();
    const msg = document.querySelector("#update_msg");

    if (!fullName || !email) {
        msg.textContent = "Please fill in all fields.";
        msg.style.color = "#cc0000";
        return;
    }

   // still has to do api intigration for this 

    console.log("Update profile:", fullName, email);
    msg.textContent = "Changes saved successfully.";
    msg.style.color = "green";
    document.querySelector("#profile_name").textContent = fullName;
    toast("Profile updated!", "success");
});


// changing password
document.querySelector("#change_password").addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentPass = document.querySelector("#current_pass").value;
    const newPass = document.querySelector("#new_pass").value;
    const confirmPass = document.querySelector("#confirm_pass").value;
    const msg = document.querySelector("#password_msg");

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
   
    // api intigration for this is not done 

    console.log("Password change submitted");
    msg.textContent = "Password updated successfully.";
    msg.style.color = "green";
    document.querySelector("#change_password").reset();
    toast("Password changed!", "success");
});


// delete account 
document.querySelector("#delete_account_btn").addEventListener("click", async () => {
    if (confirm("Are you sure? This will permanently delete your account and all files. This cannot be undone.")) {
        // api intigration for this is not done 
        window.location.href = "index.html";
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