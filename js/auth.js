// Constants for JSON file paths
const USERS_FILE = 'data/users.json';

// DOM Elements
const loginSection = document.getElementById('loginSection');
const registrationSection = document.getElementById('registrationSection');
const profileSection = document.getElementById('profileSection');
const reservationsSection = document.getElementById('reservationsSection'); // For showing/hiding

const loginForm = document.getElementById('loginForm');
const registrationForm = document.getElementById('registrationForm');
const profileForm = document.getElementById('profileForm');

const navLoginLink = document.getElementById('loginLink');
const navRegisterLink = document.getElementById('registerLink');
const navReservationsLink = document.getElementById('reservationsLink');
const navProfileLink = document.getElementById('profileLink');
const navLogoutLink = document.getElementById('logoutLink');

// --- Utility functions for JSON data ---
async function fetchData(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            // If file not found, it might be the first run, return empty array for users/reservations
            if (response.status === 404) {
                console.warn(`File ${filePath} not found. Returning empty array.`);
                return [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${filePath}:`, error);
        return []; // Return empty array on error to prevent app crash
    }
}

// NOTE: Saving data directly to the filesystem from client-side JS is not possible for security reasons.
// These 'save' functions will simulate saving and log to console.
// In a real application, this would be an API call to a backend server.
async function saveUsers(users) {
    console.log("Simulating saveUsers. In a real app, this would be an API call.");
    console.log("Current user data:", users);
    // For local testing, we can try to use localStorage or just keep it in memory.
    // To make it somewhat persistent for local demo, we can store as a string in localStorage.
    localStorage.setItem('quincho_users', JSON.stringify(users, null, 2));
    // alert("User data would be sent to a server here. Check console for data.");
}

// --- Authentication logic ---
let currentUser = null; // Store logged-in user data

async function registerUser(event) {
    event.preventDefault();
    const email = registrationForm.email.value;
    const token = registrationForm.token.value;
    const department = registrationForm.department.value;
    const name = registrationForm.name.value;
    const surname = registrationForm.surname.value;

    if (!email || !token || !department || !name || !surname) {
        alert('Por favor, complete todos los campos.');
        return;
    }
    if (!/^\d{4}$/.test(token)) {
        alert('El token debe ser de 4 dígitos numéricos.');
        return;
    }

    let users = await fetchData(USERS_FILE);
    if (localStorage.getItem('quincho_users')) { // Prefer localStorage if populated
        users = JSON.parse(localStorage.getItem('quincho_users'));
    }


    if (users.find(u => u.email === email)) {
        alert('Este email ya está registrado.');
        return;
    }

    const newUser = {
        id: `user_${Date.now()}`, // Simple unique ID
        email,
        token, // In a real app, hash this token before storing
        department,
        name,
        surname,
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    await saveUsers(users);

    alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
    showLoginView();
    registrationForm.reset();

    // Simulate Admin Notification for New User
    const adminNotificationsEnabled = localStorage.getItem('quincho_adminNotifications') === 'true';
    if (adminNotificationsEnabled) {
        console.log('%cADMIN NOTIFICATION (Simulated Email)', 'color: blue; font-weight: bold;');
        console.log(`Subject: Nueva Alta de Usuario - QuinchoApp`);
        console.log(`Body: Se ha registrado un nuevo usuario:
        Nombre: ${newUser.name} ${newUser.surname}
        Email: ${newUser.email}
        Departamento: ${newUser.department}
        Fecha de Alta: ${new Date(newUser.createdAt).toLocaleString()}`);
        console.log('%c------------------------------------', 'color: blue;');
    }
}

async function loginUser(event) {
    event.preventDefault();
    const email = loginForm.email.value;
    const token = loginForm.token.value;

    if (!email || !token) {
        alert('Por favor, ingrese email y token.');
        return;
    }

    let users = await fetchData(USERS_FILE);
    if (localStorage.getItem('quincho_users')) { // Prefer localStorage if populated
        users = JSON.parse(localStorage.getItem('quincho_users'));
    }

    const user = users.find(u => u.email === email && u.token === token); // Plain text token check

    if (user) {
        currentUser = user;
        sessionStorage.setItem('quincho_currentUser', JSON.stringify(user)); // Use sessionStorage
        alert(`Bienvenido ${user.name}!`);
        showReservationsView();
        loginForm.reset();
    } else {
        alert('Email o token incorrecto.');
    }
}

async function updateUserProfile(event) {
    event.preventDefault();
    if (!currentUser) {
        alert('No hay sesión activa.');
        showLoginView();
        return;
    }

    const newDepartment = profileForm.department.value;
    const newName = profileForm.name.value;
    const newSurname = profileForm.surname.value;
    const newToken = profileForm.token.value; // Optional new token

    if (!newDepartment || !newName || !newSurname) {
        alert('Nombre, apellido y departamento son obligatorios.');
        return;
    }

    let users = await fetchData(USERS_FILE);
    if (localStorage.getItem('quincho_users')) { // Prefer localStorage if populated
        users = JSON.parse(localStorage.getItem('quincho_users'));
    }

    const userIndex = users.findIndex(u => u.email === currentUser.email);
    if (userIndex === -1) {
        alert('Error: Usuario no encontrado.');
        logoutUser();
        return;
    }

    users[userIndex].department = newDepartment;
    users[userIndex].name = newName;
    users[userIndex].surname = newSurname;
    if (newToken) {
        if (!/^\d{4}$/.test(newToken)) {
            alert('El nuevo token debe ser de 4 dígitos numéricos.');
            return;
        }
        users[userIndex].token = newToken;
    }

    await saveUsers(users);
    currentUser = users[userIndex]; // Update current user session
    sessionStorage.setItem('quincho_currentUser', JSON.stringify(currentUser));

    alert('Perfil actualizado con éxito.');
    showReservationsView(); // Or stay on profile view with a success message
}

function logoutUser() {
    currentUser = null;
    sessionStorage.removeItem('quincho_currentUser');
    alert('Sesión cerrada.');
    showLoginView();
}

function loadUserProfile() {
    if (!currentUser) return;
    profileForm.email.value = currentUser.email;
    profileForm.department.value = currentUser.department;
    profileForm.name.value = currentUser.name;
    profileForm.surname.value = currentUser.surname;
    profileForm.token.value = ''; // Clear token field for security
}

function getCurrentUser() {
    if (currentUser) return currentUser;
    const storedUser = sessionStorage.getItem('quincho_currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        return currentUser;
    }
    return null;
}


// --- View Management ---
function hideAllSections() {
    loginSection.style.display = 'none';
    registrationSection.style.display = 'none';
    profileSection.style.display = 'none';
    reservationsSection.style.display = 'none';
}

function updateNavLinks() {
    const userLoggedIn = !!getCurrentUser();
    navLoginLink.style.display = userLoggedIn ? 'none' : 'inline';
    navRegisterLink.style.display = userLoggedIn ? 'none' : 'inline';
    navReservationsLink.style.display = userLoggedIn ? 'inline' : 'none';
    navProfileLink.style.display = userLoggedIn ? 'inline' : 'none';
    navLogoutLink.style.display = userLoggedIn ? 'inline' : 'none';
}

function showLoginView() {
    hideAllSections();
    loginSection.style.display = 'block';
    updateNavLinks();
}

function showRegistrationView() {
    hideAllSections();
    registrationSection.style.display = 'block';
    updateNavLinks();
}

function showProfileView() {
    if (!getCurrentUser()) {
        showLoginView();
        return;
    }
    hideAllSections();
    profileSection.style.display = 'block';
    loadUserProfile();
    updateNavLinks();
}

function showReservationsView() {
    if (!getCurrentUser()) {
        showLoginView();
        return;
    }
    hideAllSections();
    reservationsSection.style.display = 'block';
    updateNavLinks();
    // Call function from reservations.js to load content
    if (typeof initializeReservationsView === 'function') {
        initializeReservationsView();
    } else {
        console.warn('initializeReservationsView function not found in reservations.js');
        // Fallback or basic display for reservations section
        const resManagementSection = document.getElementById('reservationManagementSection');
        if (resManagementSection) {
            resManagementSection.innerHTML = '<p>Cargando datos de reservas...</p>';
        }
    }
}


// --- Event Listeners ---
if (loginForm) loginForm.addEventListener('submit', loginUser);
if (registrationForm) registrationForm.addEventListener('submit', registerUser);
if (profileForm) profileForm.addEventListener('submit', updateUserProfile);

if (navLoginLink) navLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginView(); });
if (navRegisterLink) navRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showRegistrationView(); });
if (navReservationsLink) navReservationsLink.addEventListener('click', (e) => { e.preventDefault(); showReservationsView(); });
if (navProfileLink) navProfileLink.addEventListener('click', (e) => { e.preventDefault(); showProfileView(); });
if (navLogoutLink) navLogoutLink.addEventListener('click', (e) => { e.preventDefault(); logoutUser(); });

// --- Initial state ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if a user session exists
    if (getCurrentUser()) {
        showReservationsView();
    } else {
        showLoginView();
    }
     // Initialize users from localStorage if exists (simulating DB persistence for demo)
    const storedUsers = localStorage.getItem('quincho_users');
    if (storedUsers) {
        // users = JSON.parse(storedUsers); // Not needed directly here, fetchData will handle
        console.log("Users loaded from localStorage for demo purposes.");
    } else {
        // Optionally pre-populate with empty array if no file & no localStorage
        localStorage.setItem('quincho_users', JSON.stringify([]));
    }
});

// Expose getCurrentUser for reservations.js
window.getCurrentUser = getCurrentUser;
