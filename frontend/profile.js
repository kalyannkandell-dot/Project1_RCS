// ========== SIDEBAR ==========
document.querySelector("#hamburger").addEventListener("click", () => {
    document.querySelector("#sidebar").classList.toggle("active");
});


// ========== CHANGE PROFILE PICTURE ==========
document.querySelector("#change_pic_btn").addEventListener("click", () => {
    document.querySelector("#pic_input").click();
});

// TODO: on pic_input change, upload new photo to API
// POST /api/user/avatar with FormData containing the image
// on success -> update #profile_pic_lg src with new image URL


// ========== UPDATE PROFILE FORM ==========
// TODO: on #update_profile submit
// POST /api/user/update -> { fullName, email }
// on success -> show confirmation message


// ========== CHANGE PASSWORD FORM ==========
// TODO: on #change_password submit
// validate new_pass and confirm_pass match before sending
// POST /api/auth/change-password -> { currentPassword, newPassword }
// on success -> show confirmation, clear fields
// on fail (wrong current password) -> show error


// ========== LOAD USER INFO ==========
// TODO: fetch current user info from API on page load
// GET /api/user/me -> { fullName, email, memberSince, avatarUrl, storageUsed, storageTotal }
// then populate #full_name, #email, #profile_pic_lg, storage bar


// ========== DELETE ACCOUNT ==========
document.querySelector("#delete_account_btn").addEventListener("click", () => {
    if (confirm("Are you sure? This cannot be undone.")) {
        // TODO: delete account via API
        // DELETE /api/user/me
        // on success -> redirect to index.html
        window.location.href = "index.html";
    }
});

document.addEventListener("click", (e) => {
    const sidebar = document.querySelector("#sidebar");
    const hamburger = document.querySelector("#hamburger");
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
        sidebar.classList.remove("active");
    }
});