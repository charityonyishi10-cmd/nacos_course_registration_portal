/**
 * NACOS Course Registration Portal Logic
 * This script handles login, navigation, and dynamic course filtering.
 */

let currentUser = null; // Track the currently logged-in student

document.addEventListener('DOMContentLoaded', () => {
    // --- 0. SESSION MANAGEMENT ---
    // Check if a session exists on the server when the page loads
    checkSession();

    // Attach all other event listeners
    attachEventListeners();
    loadNotifications();
});

async function checkSession() {
    try {
        // Ask the server if we have a valid session cookie
        const response = await fetch('/check-session', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('No active session');
        }
        const data = await response.json();
        currentUser = data.student;
        showDashboard();
        populateProfile(currentUser);
    } catch (error) {
        // If no session, show the login page
        showLogin();
    }
}

function logout() {
    // Tell the server to destroy the session
    fetch('/logout', { method: 'POST', credentials: 'include' })
        .then(() => {
            currentUser = null;
            window.location.reload(); // Reload the page to reset state and trigger checkSession
        });
}

function showDashboard() {
    loginSection.classList.add('hidden');
    header.classList.remove('hidden');
    mainContent.classList.remove('hidden');
}

function showLogin() {
    loginSection.classList.remove('hidden');
    header.classList.add('hidden');
    mainContent.classList.add('hidden');
}

// --- 1. LOGIN LOGIC ---
// Select the login form and the two main sections
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const header = document.querySelector('header');
const mainContent = document.getElementById('main-content');
const loginFormContainer = document.getElementById('login-form-container');
const signupFormContainer = document.getElementById('signup-form-container');
const showSignupLink = document.getElementById('show-signup-link');
const showLoginLink = document.getElementById('show-login-link');
const signupForm = document.getElementById('signupForm');
const signupPasswordInput = document.getElementById('signup-password');
const toggleSignupPassword = document.getElementById('toggleSignupPassword');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotPasswordContainer = document.getElementById('forgot-password-container');
const backToLoginLink = document.getElementById('back-to-login-link');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');

// --- TOAST NOTIFICATION LOGIC ---
function showToast(message, type = 'info') { // type can be 'success', 'error', or 'info'
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Remove the toast after the animation completes
    setTimeout(() => {
        toast.remove();
    }, 4500); // 4s for display + 0.5s for fade-out animation
}

function attachEventListeners() {

// --- FORM TOGGLING LOGIC ---
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormContainer.classList.add('hidden');
    signupFormContainer.classList.remove('hidden');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupFormContainer.classList.add('hidden');
    loginFormContainer.classList.remove('hidden');
});

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormContainer.classList.add('hidden');
    forgotPasswordContainer.classList.remove('hidden');
});

backToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotPasswordContainer.classList.add('hidden');
    loginFormContainer.classList.remove('hidden');
});

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const regNumber = document.getElementById('reset-reg-number').value;

    try {
        const response = await fetch('/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regNumber })
        });

        if (response.ok) {
            showToast(`Password reset link sent to email associated with ${regNumber}`, 'success');
            setTimeout(() => { backToLoginLink.click(); }, 3000);
        } else {
            showToast("Registration number not found.", 'error');
        }
    } catch (error) {
        showToast("Error connecting to server.", 'error');
    }
});

// Add the password visibility toggle functionality (Login)
togglePassword.addEventListener('click', function () {
    // Toggle the type attribute
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    // Toggle the eye icon class
    const icon = this.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
});

// Add the password visibility toggle functionality (Signup)
toggleSignupPassword.addEventListener('click', function () {
    const type = signupPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    signupPasswordInput.setAttribute('type', type);
    const icon = this.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
});

loginForm.addEventListener('submit', async function (e) {
    e.preventDefault(); // Prevent page from refreshing

    const username = document.getElementById('username').value;
    const password = passwordInput.value;

    // --- Validation ---
    // 1. Username validation (Registration Number format: 2020/123456)
    const usernameRegex = /^\d{4}\/\d{6}$/;
    if (!usernameRegex.test(username)) {
        showToast("Invalid Registration Number.\nPlease use YYYY/XXXXXX format (e.g., 2020/123456).", 'error');
        return;
    }

    // 2. Password validation
    const passMinLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < passMinLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        let errorMsg = "Password does not meet requirements. It must have:\n";
        if (password.length < passMinLength) errorMsg += `\n- At least ${passMinLength} characters`;
        if (!hasUpperCase) errorMsg += "\n- At least one uppercase letter (A-Z)";
        if (!hasLowerCase) errorMsg += "\n- At least one lowercase letter (a-z)";
        if (!hasNumber) errorMsg += "\n- At least one number (0-9)";
        if (!hasSpecialChar) errorMsg += "\n- At least one special character (!@#$...)";
        
        showToast(errorMsg, 'error');
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ regNumber: username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.student;
            showDashboard();
            populateProfile(currentUser);
        } else {
            showToast(data.message || "Login failed", 'error');
        }
    } catch (error) {
        showToast("Server error. Please try again later.", 'error');
    }
});

// --- SIGN UP LOGIC ---
signupForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const fullName = document.getElementById('signup-name').value;
    const regNumber = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    // --- Validation ---
    if (fullName.trim() === '') {
        showToast("Full Name is required.", 'error');
        return;
    }

    const usernameRegex = /^\d{4}\/\d{6}$/;
    if (!usernameRegex.test(regNumber)) {
        showToast("Invalid Registration Number.\nPlease use YYYY/XXXXXX format.", 'error');
        return;
    }

    // Re-use password strength validation
    const passMinLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < passMinLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        showToast("Password is not strong enough. Please check the requirements.", 'error');
        return;
    }

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: fullName, regNumber, password })
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Registration successful! You can now sign in.", 'success');
            signupForm.reset();
            showLoginLink.click();
        } else {
            showToast(data.message || "Registration failed", 'error');
        }
    } catch (error) {
        showToast("Server error during registration.", 'error');
    }
});

    // --- COURSE VIEW LISTENERS ---
    // Ensure these IDs match your HTML buttons
    const viewCoursesBtn = document.getElementById('view-courses-btn');
    if (viewCoursesBtn) {
        viewCoursesBtn.addEventListener('click', loadCourseList);
    }

    const borrowCoursesBtn = document.getElementById('borrow-courses-btn');
    if (borrowCoursesBtn) {
        borrowCoursesBtn.addEventListener('click', loadBorrowCourses);
    }
}

// Function to populate profile fields with student data
function populateProfile(data) {
    const dropdownContent = document.getElementById('profile-dropdown-content');
    dropdownContent.innerHTML = `
        <div class="profile-details">
            <div class="profile-item"><span class="profile-label">Full Name:</span><span class="profile-value">${data.name || 'N/A'}</span></div>
            <div class="profile-item"><span class="profile-label">Registration No:</span><span class="profile-value">${data.regNumber || 'N/A'}</span></div>
        </div>
        <a href="#" class="profile-action-link" data-target="profile-update-content">Update Profile</a>
        <a href="#" class="profile-action-link" data-target="print-form">Print Slip</a>
        <a href="#" id="logout-btn" class="profile-action-link">Logout</a>
    `;

    // Add event listener for the new logout button in the dropdown
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Add listeners for the other new links to mimic sidebar behavior
    dropdownContent.querySelectorAll('.profile-action-link[data-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Find the corresponding sidebar link and click it programmatically
            const sidebarLink = document.querySelector(`.dash-nav li[data-target="${link.dataset.target}"]`);
            if (sidebarLink) {
                sidebarLink.click();
                profileDropdown.classList.add('hidden'); // Close dropdown after click
            }
        });
    });
}

// --- 2. COURSE FILTERING LOGIC ---
/**
 * This function is called by the "View Courses" button in your HTML.
 * It identifies which level and semester are selected and shows the matching <div>.
 */
async function loadCourseList(e) {
    if (e) e.preventDefault();

    const level = document.getElementById('levelSelect').value;
    const semester = document.getElementById('semesterSelect').value;
    
    if (level === 'chooseLevel' || semester === 'chooseSemester') {
        showToast("Please select both a Level and a Semester to view courses.", 'info');
        return;
    }

    try {
        const response = await fetch(`/courses?level=${level}&semester=${semester}`);
        const courses = await response.json();

        const listContainer = document.getElementById('dynamic-course-list');
        const listTitle = document.getElementById('course-list-title');
        const listBody = document.getElementById('course-list-body');

        listTitle.textContent = `${level} Level - ${semester.charAt(0).toUpperCase() + semester.slice(1)} Semester`;
        listBody.innerHTML = '';

        const registeredCourses = currentUser && currentUser.registeredCourses ? currentUser.registeredCourses : [];

        courses.forEach(course => {
            const isRegistered = registeredCourses.includes(course.code);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" value="${course.code}" ${isRegistered ? 'checked disabled' : ''}></td>
                <td>${course.code}</td>
                <td>${course.title}</td>
                <td>${course.units}</td>
                <td>${course.type} ${isRegistered ? '<span style="color:green; font-weight:bold;">(Registered)</span>' : ''}</td>
            `;
            listBody.appendChild(tr);
        });
        listContainer.classList.remove('hidden');
        updateTotalUnits();
    } catch (error) {
        showToast("Error loading courses from server.", 'error');
    }
}

/**
 * This function handles the "Borrow Course" section.
 * It clones the existing course tables so you don't have to re-type them.
 */
async function loadBorrowCourses(e) {
    if (e) e.preventDefault();

    const level = document.getElementById('borrowLevelSelect').value;
    const semester = document.getElementById('borrowSemesterSelect').value;
    
    if (!level || !semester) {
        showToast("Please select both Level and Semester to view courses.", 'info');
        return;
    }

    try {
        const response = await fetch(`/courses?level=${level}&semester=${semester}`);
        const courses = await response.json();

        const table = document.getElementById('borrow-course-table');
        const tbody = document.getElementById('borrow-course-body');
        tbody.innerHTML = '';

        courses.forEach(course => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" value="${course.code}"></td>
                <td>${course.code}</td>
                <td>${course.title}</td>
                <td>${course.units}</td>
                <td>${course.type}</td>
            `;
            tbody.appendChild(tr);
        });
        table.classList.remove('hidden');
    } catch (error) {
        showToast("Error loading borrow courses.", 'error');
    }
}

// --- 3. FORM SUBMISSION LOGIC ---
// This section now includes a function to send data to your backend server.
const courseForm = document.getElementById('courseForm');
const successBanner = document.getElementById('success-banner');

courseForm.addEventListener('submit', async function (e) {
    handleFormSubmit(e, courseForm);
});

// --- DYNAMIC TOTAL UNITS CALCULATION ---
function updateTotalUnits() {
    // Select all checked checkboxes within the form
    const selectedCheckboxes = courseForm.querySelectorAll('input[type="checkbox"]:checked');
    let totalUnits = 0;

    selectedCheckboxes.forEach(cb => {
        // Calculate units from the 4th column (index 3) of the table row
        const row = cb.closest('tr');
        if (row && row.cells.length > 3) {
            const unitText = row.cells[3].textContent;
            const units = parseInt(unitText, 10);
            if (!isNaN(units)) {
                totalUnits += units;
            }
        }
    });

    const totalUnitsElement = document.getElementById('total-units');
    if (totalUnitsElement) {
        totalUnitsElement.textContent = totalUnits;
        if (totalUnits > 24) {
            totalUnitsElement.style.color = 'red';
        } else {
            totalUnitsElement.style.color = 'inherit';
        }
    }
}

// Add event listener to the form to catch checkbox changes
courseForm.addEventListener('change', function(e) {
    if (e.target.type === 'checkbox') {
        updateTotalUnits();
    }
});

async function handleFormSubmit(e, formElement) {
    e.preventDefault(); // Stop form from reloading page

    // Find all checkboxes that are checked
    const selectedCheckboxes = formElement.querySelectorAll('input[type="checkbox"]:checked');
    
    let totalUnits = 0;
    const selectedCourses = [];

    selectedCheckboxes.forEach(cb => {
        selectedCourses.push(cb.value);
        // Calculate units from the 4th column (index 3) of the table row
        const row = cb.closest('tr');
        if (row && row.cells.length > 3) {
            const unitText = row.cells[3].textContent;
            const units = parseInt(unitText, 10);
            if (!isNaN(units)) {
                totalUnits += units;
            }
        }
    });

    if (selectedCourses.length === 0) {
        showToast("Please select at least one course to register.", 'info');
        return;
    }

    if (totalUnits > 24) {
        showToast(`Cannot register. Total units (${totalUnits}) exceeds the maximum of 24.`, 'error');
        return;
    }

    try {
        // Send the data to your Node.js server
        const response = await fetch('/register-courses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ regNumber: currentUser.regNumber, courses: selectedCourses }),
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Server Response:", result);

            // Update local user data with the latest from server
            if (result.student) {
                currentUser = result.student;
            }
            // Refresh the course list to show the new registered status
            loadCourseList();

            // Display the success banner at the top of the page
            successBanner.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Hide banner after 5 seconds
            setTimeout(() => {
                successBanner.classList.add('hidden');
            }, 5000);

        } else {
            const data = await response.json();
            showToast(data.message || `Error: ${response.statusText}`, 'error');
        }
    } catch (error) {
        console.error("Failed to connect to the server:", error);
        showToast("Could not submit registration.\nIs the server running?", 'error');
    }
}

// --- PROFILE UPDATE LOGIC ---
const profileUpdateForm = document.getElementById('profileUpdateForm');

if (profileUpdateForm) {
    profileUpdateForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!currentUser) return;

        const updates = {
            regNumber: currentUser.regNumber,
            email: document.getElementById('update-email').value,
            contact: document.getElementById('update-contact').value,
            age: document.getElementById('update-age').value,
            address: document.getElementById('update-address').value,
            state: document.getElementById('update-state').value
        };

        const response = await fetch('/update-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.student;
            populateProfile(currentUser);
            showToast("Profile details updated successfully!", 'success');
        } else {
            showToast("Failed to update profile.", 'error');
        }
    });
}

function loadProfileForEditing() {
    if (!currentUser) return;
    // Pre-fill the form with current data
    document.getElementById('update-name').value = currentUser.name;
    document.getElementById('update-regNumber').value = currentUser.regNumber;
    document.getElementById('update-email').value = currentUser.email;
    document.getElementById('update-contact').value = currentUser.contact;
    document.getElementById('update-age').value = currentUser.age;
    document.getElementById('update-address').value = currentUser.address;
    document.getElementById('update-state').value = currentUser.state;
}

// --- PRINT FORM LOGIC ---
function loadPrintForm() {
    if (!currentUser) return;

    // 1. Populate Student Info
    const infoDiv = document.getElementById('print-student-info');
    infoDiv.innerHTML = `
        <p><strong>Name:</strong> ${currentUser.name}</p>
        <p><strong>Reg Number:</strong> ${currentUser.regNumber}</p>
        <p><strong>Department:</strong> ${currentUser.department}</p>
        <p><strong>Level:</strong> 100L (Example)</p> 
    `;
    

    // 2. Populate Registered Courses
    const tbody = document.querySelector('#print-course-table tbody');
    tbody.innerHTML = '';
    let totalUnits = 0;

    const registeredCodes = currentUser.registeredCourses || [];

    if (registeredCodes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No courses registered yet. (Note: You may need to re-register courses after the system update)</td></tr>';
    } else {
        // We need to fetch details for these codes since they aren't in the DOM anymore
        // For now, we can try to fetch all courses or just display codes.
        // A better approach is to fetch details from server.
        // Let's fetch all courses to lookup details (simple approach for now)
        fetch('/courses?level=&semester=').then(res => res.json()).then(allCourses => {
             registeredCodes.forEach(code => {
                const course = allCourses.find(c => c.code === code);
                if (course) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${course.code}</td>
                        <td>${course.title}</td>
                        <td>${course.units}</td>
                        <td>${course.semester}</td>
                    `;
                    tbody.appendChild(tr);
                    totalUnits += course.units;
                }
            });
            document.getElementById('print-total-units').textContent = `Total Units: ${totalUnits}`;
        });
    }

}

// Helper to find course details from the existing registration tables
// function getCourseDetailsFromDOM(code) { ... } // Removed as we now use DB

// --- MODULE (SIDEBAR) LOGIC ---
const moduleBtn = document.getElementById('module-btn');
const moduleOverlay = document.getElementById('module-overlay');

function openModule() {
    dashboardSection.classList.remove('hidden');
    moduleOverlay.classList.remove('hidden');
    // Use a tiny timeout to allow the 'display' property to change before starting the transition
    setTimeout(() => {
        dashboardSection.classList.add('open');
        moduleOverlay.classList.add('visible');
    }, 10);
}

function closeModule() {
    dashboardSection.classList.remove('open');
    moduleOverlay.classList.remove('visible');
    // Hide the elements after the transition is complete (300ms matches CSS)
    setTimeout(() => {
        dashboardSection.classList.add('hidden');
        moduleOverlay.classList.add('hidden');
    }, 300);
}

moduleBtn.addEventListener('click', openModule);
moduleOverlay.addEventListener('click', closeModule);

// --- HEADER PROFILE DROPDOWN LOGIC ---
const profileTrigger = document.getElementById('profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown-content');

profileTrigger.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevents the window click listener from firing immediately
    profileDropdown.classList.toggle('hidden');
    notificationContent.classList.add('hidden'); // Close notifications if open
});

// --- NOTIFICATION LOGIC ---
const notificationTrigger = document.getElementById('notification-trigger');
const notificationContent = document.getElementById('notification-dropdown-content');
const notificationBadge = document.getElementById('notification-badge');
const notificationList = document.getElementById('notification-list');

// Mock Notifications
const notifications = [
    { message: "Welcome to the 2023/2024 Academic Session!", time: "2 hours ago", unread: true },
    { message: "Course Registration deadline is approaching.", time: "1 day ago", unread: true },
    { message: "Your profile was successfully updated.", time: "3 days ago", unread: false }
];

function loadNotifications() {
    notificationList.innerHTML = '';
    let unreadCount = 0;

    notifications.forEach(note => {
        const li = document.createElement('li');
        li.className = note.unread ? 'unread' : '';
        li.innerHTML = `
            ${note.message}
            <span class="notification-time">${note.time}</span>
        `;
        notificationList.appendChild(li);
        if (note.unread) unreadCount++;
    });

    if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount;
        notificationBadge.classList.remove('hidden');
    } else {
        notificationBadge.classList.add('hidden');
    }
}

notificationTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    notificationContent.classList.toggle('hidden');
    profileDropdown.classList.add('hidden'); // Close profile if open
});

// Initial load

// Close dropdowns when clicking anywhere else on the page
window.addEventListener('click', (event) => {
    if (!profileDropdown.classList.contains('hidden') && !profileTrigger.contains(event.target)) {
        profileDropdown.classList.add('hidden');
    }
    if (!notificationContent.classList.contains('hidden') && !notificationTrigger.contains(event.target)) {
        notificationContent.classList.add('hidden');
    }
});

// --- 4. NAVIGATION / LOGOUT LOGIC ---
// This handles the dashboard tabs (Profile, Registration, etc.) and the "Logout" link
const navLinks = document.querySelectorAll('.dash-nav li');
const dashboardContents = document.querySelectorAll('.dashboard-content');
const welcomeContent = document.getElementById('welcome-content');

navLinks.forEach(link => {
    link.addEventListener('click', function () {
        // Handle Logout separately
        if (this.innerText === "Logout") {
            logout();
            return;
        }

        const targetId = this.dataset.target;
        if (!targetId) { // If it's a link without a target (like the future 'Print Form')
            closeModule(); // Just close the module
            return;
        }

        // Update active class on tabs
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // Hide welcome message and all other content panes first
        welcomeContent.classList.add('hidden');
        dashboardContents.forEach(content => {
            content.classList.add('hidden');
        });

        // Now, show the one that was clicked
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
            targetContent.classList.remove('hidden');
            // If the user clicked "Update Profile", load their data into the form
            if (targetId === 'profile-update-content') {
                loadProfileForEditing();
            }
            if (targetId === 'print-form') {
                loadPrintForm();
            }
        }

        // Close the module after selection
        closeModule();
    });
});