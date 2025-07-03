// Admin functionalities

const ADMIN_USERNAME = "admin"; // Hardcoded admin username
const ADMIN_PASSWORD = "password123"; // Hardcoded admin password - VERY INSECURE FOR PRODUCTION

// DOM Elements for Admin Page
const adminLoginSection = document.getElementById('adminLoginSection');
const adminDashboard = document.getElementById('adminDashboard'); // Main container for all admin sections
const adminLoginForm = document.getElementById('adminLoginForm');

// Sections within the dashboard (will be needed later)
const zoomRoomManagementSection = document.getElementById('zoomRoomManagement');
const userManagementSection = document.getElementById('userManagement');
const reservationManagementSection = document.getElementById('reservationManagement');
const notificationSwitch = document.getElementById('notificationSwitch'); // For admin preferences

// --- Admin Authentication ---
let isAdminLoggedIn = false;

function handleAdminLogin(event) {
    event.preventDefault();
    const username = adminLoginForm.adminUsername.value;
    const password = adminLoginForm.adminPassword.value;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        sessionStorage.setItem('quincho_isAdminLoggedIn', 'true');
        alert('Admin login successful!');
        showAdminDashboard();
        adminLoginForm.reset();
    } else {
        isAdminLoggedIn = false;
        sessionStorage.removeItem('quincho_isAdminLoggedIn');
        alert('Invalid admin credentials.');
    }
}

function checkAdminSession() {
    if (sessionStorage.getItem('quincho_isAdminLoggedIn') === 'true') {
        isAdminLoggedIn = true;
        showAdminDashboard();
    } else {
        isAdminLoggedIn = false;
        showAdminLoginView();
    }
}

// --- View Management for Admin Page ---
function showAdminDashboard() {
    if (!isAdminLoggedIn) return; // Should not happen if called correctly
    if (adminLoginSection) adminLoginSection.style.display = 'none';
    if (adminDashboard) adminDashboard.style.display = 'block';

    // Initialize dashboard components
    loadAdminZoomRooms();
    loadAdminUsers();
    populateAdminZoomRoomFilter(); // Populate filter dropdown
    loadAdminReservations(); // Load all reservations initially
    loadAdminNotificationSettings();
    console.log("Admin dashboard displayed and all components loading.");
}

function showAdminLoginView() {
    if (adminLoginSection) adminLoginSection.style.display = 'block';
    if (adminDashboard) adminDashboard.style.display = 'none';
}


// --- Event Listeners for Admin ---
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', handleAdminLogin);
}
if (addZoomRoomForm) {
    addZoomRoomForm.addEventListener('submit', handleAddZoomRoom);
}
if (notificationSwitch) {
    notificationSwitch.addEventListener('change', handleNotificationSwitchChange);
}
if (applyFiltersButton) {
    applyFiltersButton.addEventListener('click', handleApplyAdminReservationFilters);
}

// --- Initial Load for Admin Page ---
document.addEventListener('DOMContentLoaded', () => {
    // This script is specific to admin.html, so we can directly check session.
    checkAdminSession();

    // Initialize localStorage for data files if they don't exist (for demo/first run)
    if (!localStorage.getItem('quincho_users')) {
        localStorage.setItem('quincho_users', JSON.stringify([]));
    }
    if (!localStorage.getItem('quincho_reservations')) {
        localStorage.setItem('quincho_reservations', JSON.stringify([]));
    }
    if (!localStorage.getItem('quincho_zoomRooms')) {
        // Use the content from the actual data/zoomRooms.json as a default
        fetch('../data/zoomRooms.json') // Relative path from admin.html to data/
            .then(response => response.json())
            .then(data => {
                if (!localStorage.getItem('quincho_zoomRooms')) { // Check again in case of race condition
                    localStorage.setItem('quincho_zoomRooms', JSON.stringify(data));
                    console.log('Initialized localStorage quincho_zoomRooms from data/zoomRooms.json');
                }
            })
            .catch(error => {
                console.error('Error fetching initial zoomRooms.json for localStorage:', error);
                // Fallback if fetch fails and still no localStorage item
                if (!localStorage.getItem('quincho_zoomRooms')) {
                    localStorage.setItem('quincho_zoomRooms', JSON.stringify([{id: "1", name: "Quincho Principal (Default)"}]));
                }
            });
    }
});


// --- Zoom Room Management ---
const addZoomRoomForm = document.getElementById('addZoomRoomForm');
const zoomRoomsListDiv = document.getElementById('zoomRoomsList');
const newZoomRoomNameInput = document.getElementById('newZoomRoomName');

async function loadAdminZoomRooms() {
    if (!zoomRoomsListDiv) return;
    zoomRoomsListDiv.innerHTML = '<h4>Cargando Zoom Rooms...</h4>';

    const zoomRooms = await fetchAdminData('quincho_zoomRooms');

    if (!zoomRooms || zoomRooms.length === 0) {
        zoomRoomsListDiv.innerHTML = '<p>No hay Zoom Rooms configurados.</p>';
        return;
    }

    zoomRoomsListDiv.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${zoomRooms.map(room => `
                    <tr>
                        <td>${room.id}</td>
                        <td><input type="text" class="form-control form-control-sm" value="${escapeHTML(room.name)}" id="zoomRoomName-${room.id}"></td>
                        <td>
                            <button class="btn btn-sm btn-success save-zoom-room-btn" data-id="${room.id}">Guardar</button>
                            <button class="btn btn-sm btn-danger delete-zoom-room-btn" data-id="${room.id}">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Add event listeners for save/delete buttons
    zoomRoomsListDiv.querySelectorAll('.save-zoom-room-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const roomId = e.target.dataset.id;
            const newNameInput = document.getElementById(`zoomRoomName-${roomId}`);
            const newName = newNameInput.value.trim();
            if (newName) {
                await handleUpdateZoomRoom(roomId, newName);
            } else {
                alert("El nombre no puede estar vacío.");
                // Optionally, revert to original name if input is emptied
                const originalRoom = (await fetchAdminData('quincho_zoomRooms')).find(r => r.id === roomId);
                if (originalRoom) newNameInput.value = originalRoom.name;
            }
        });
    });

    zoomRoomsListDiv.querySelectorAll('.delete-zoom-room-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const roomId = e.target.dataset.id;
            if (confirm(`¿Está seguro que desea eliminar el Zoom Room ID: ${roomId}? Esto podría afectar reservas existentes.`)) {
                await handleDeleteZoomRoom(roomId);
            }
        });
    });
}

async function handleAddZoomRoom(event) {
    event.preventDefault();
    const roomName = newZoomRoomNameInput.value.trim();
    if (!roomName) {
        alert('Por favor, ingrese un nombre para el Zoom Room.');
        return;
    }

    const zoomRooms = await fetchAdminData('quincho_zoomRooms');
    const newRoom = {
        id: `zr_${Date.now()}`, // Simple unique ID
        name: roomName
    };
    zoomRooms.push(newRoom);
    await saveAdminData('quincho_zoomRooms', zoomRooms);

    alert(`Zoom Room "${roomName}" agregado con éxito.`);
    newZoomRoomNameInput.value = ''; // Clear input
    await loadAdminZoomRooms(); // Refresh list
    // Also update on the user side if they are viewing reservations
    if (typeof window.populateZoomRoomsDropdown === 'function') {
        window.populateZoomRoomsDropdown();
    }
}

async function handleUpdateZoomRoom(roomId, newName) {
    const zoomRooms = await fetchAdminData('quincho_zoomRooms');
    const roomIndex = zoomRooms.findIndex(room => room.id === roomId);

    if (roomIndex > -1) {
        zoomRooms[roomIndex].name = newName;
        await saveAdminData('quincho_zoomRooms', zoomRooms);
        alert(`Zoom Room ID ${roomId} actualizado a "${newName}".`);
        await loadAdminZoomRooms(); // Refresh list
        // Also update on the user side
        if (typeof window.populateZoomRoomsDropdown === 'function') {
            window.populateZoomRoomsDropdown();
        }
    } else {
        alert(`Error: Zoom Room ID ${roomId} no encontrado.`);
    }
}

async function handleDeleteZoomRoom(roomId) {
    let zoomRooms = await fetchAdminData('quincho_zoomRooms');
    // Optional: Check if room is used in any reservations before deleting
    const reservations = await fetchAdminData('quincho_reservations');
    if (reservations.some(res => res.zoomRoomId === roomId)) {
        if (!confirm(`ADVERTENCIA: El Zoom Room ID ${roomId} tiene reservas asociadas. ¿Está seguro que desea eliminarlo? Esto no eliminará las reservas pero el nombre del room podría perderse en ellas.`)) {
            return;
        }
    }

    zoomRooms = zoomRooms.filter(room => room.id !== roomId);
    await saveAdminData('quincho_zoomRooms', zoomRooms);

    alert(`Zoom Room ID ${roomId} eliminado.`);
    await loadAdminZoomRooms(); // Refresh list
     // Also update on the user side
    if (typeof window.populateZoomRoomsDropdown === 'function') {
        window.populateZoomRoomsDropdown();
    }
}

// Helper to prevent XSS
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return str.toString().replace(/[&<>"']/g, function (match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}


// --- User Management (Admin) ---
const usersListDiv = document.getElementById('usersList');
// notificationSwitch is already defined globally if needed

async function loadAdminUsers() {
    if (!usersListDiv) return;
    usersListDiv.innerHTML = '<h4>Cargando Usuarios...</h4>';

    const users = await fetchAdminData('quincho_users');

    if (!users || users.length === 0) {
        usersListDiv.innerHTML = '<p>No hay usuarios registrados.</p>';
        return;
    }

    usersListDiv.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Dpto</th>
                    <th>Token (Editable)</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr id="userRow-${user.id}">
                        <td>${user.id}</td>
                        <td><input type="email" class="form-control form-control-sm" value="${escapeHTML(user.email)}" id="userEmail-${user.id}" readonly></td>
                        <td><input type="text" class="form-control form-control-sm" value="${escapeHTML(user.name)}" id="userName-${user.id}"></td>
                        <td><input type="text" class="form-control form-control-sm" value="${escapeHTML(user.surname)}" id="userSurname-${user.id}"></td>
                        <td><input type="text" class="form-control form-control-sm" value="${escapeHTML(user.department)}" id="userDepartment-${user.id}"></td>
                        <td><input type="text" class="form-control form-control-sm" value="${escapeHTML(user.token)}" id="userToken-${user.id}" pattern="\\d{4}"></td>
                        <td>
                            <button class="btn btn-sm btn-success save-user-btn" data-id="${user.id}">Guardar</button>
                            <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user.id}">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Add event listeners for save/delete user buttons
    usersListDiv.querySelectorAll('.save-user-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.dataset.id;
            await handleSaveUser(userId);
        });
    });

    usersListDiv.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.dataset.id;
            if (confirm(`¿Está seguro que desea eliminar al usuario ID: ${userId}? Esto también eliminará sus reservas.`)) {
                await handleDeleteUser(userId);
            }
        });
    });
}

async function handleSaveUser(userId) {
    const name = document.getElementById(`userName-${userId}`).value.trim();
    const surname = document.getElementById(`userSurname-${userId}`).value.trim();
    const department = document.getElementById(`userDepartment-${userId}`).value.trim();
    const token = document.getElementById(`userToken-${userId}`).value.trim();
    // Email is readonly, no need to fetch its value for update for now.

    if (!name || !surname || !department || !token) {
        alert("Nombre, Apellido, Departamento y Token no pueden estar vacíos.");
        return;
    }
    if (!/^\d{4}$/.test(token)) {
        alert("El token debe ser de 4 dígitos numéricos.");
        // Optionally, revert to original token
        const users = await fetchAdminData('quincho_users');
        const originalUser = users.find(u => u.id === userId);
        if (originalUser) document.getElementById(`userToken-${userId}`).value = originalUser.token;
        return;
    }

    const users = await fetchAdminData('quincho_users');
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex > -1) {
        users[userIndex].name = name;
        users[userIndex].surname = surname;
        users[userIndex].department = department;
        users[userIndex].token = token;
        // users[userIndex].email remains unchanged as it's the key and readonly in this UI

        await saveAdminData('quincho_users', users);
        alert(`Usuario ID ${userId} actualizado.`);
        // No need to call loadAdminUsers() again, data is saved. Highlight row?
        document.getElementById(`userRow-${userId}`).style.backgroundColor = '#d4edda'; // Greenish highlight
        setTimeout(() => {
            document.getElementById(`userRow-${userId}`).style.backgroundColor = '';
        }, 2000);
    } else {
        alert(`Error: Usuario ID ${userId} no encontrado.`);
    }
}

async function handleDeleteUser(userId) {
    let users = await fetchAdminData('quincho_users');
    users = users.filter(u => u.id !== userId);
    await saveAdminData('quincho_users', users);

    // Also delete user's reservations
    let reservations = await fetchAdminData('quincho_reservations');
    reservations = reservations.filter(res => res.userId !== userId);
    await saveAdminData('quincho_reservations', reservations);


    alert(`Usuario ID ${userId} y sus reservas han sido eliminados.`);
    await loadAdminUsers(); // Refresh user list
    // If admin is also viewing reservations, that list should be refreshed too.
    if (typeof loadAdminReservations === 'function' && document.getElementById('adminReservationsList')) {
        await loadAdminReservations();
    }
}


// --- Notification Settings (Admin) ---
function loadAdminNotificationSettings() {
    if (notificationSwitch) {
        const savedPreference = localStorage.getItem('quincho_adminNotifications');
        // Default to false (off) if not set.
        notificationSwitch.checked = savedPreference === 'true';
        handleNotificationSwitchChange(); // Update text based on initial state
    }
}

function handleNotificationSwitchChange() {
    if (!notificationSwitch) return;
    localStorage.setItem('quincho_adminNotifications', notificationSwitch.checked);
    const statusLabel = document.querySelector('label[for="notificationSwitch"]');
    if (statusLabel) { // Update label or add a span next to it
        // Simple console log for now, real app would show UI feedback
        console.log(`Admin notifications ${notificationSwitch.checked ? 'ACTIVADAS' : 'DESACTIVADAS'}. (Preferencia guardada en localStorage)`);
    }
     // For demo, show an alert
    alert(`Notificaciones de Admin ${notificationSwitch.checked ? 'ACTIVADAS' : 'DESACTIVADAS'}.`);
}


// --- Reservation Management (Admin) ---
const adminReservationsListDiv = document.getElementById('adminReservationsList');
const filterDateInput = document.getElementById('filterDate');
const filterUserInput = document.getElementById('filterUser');
const filterZoomRoomSelect = document.getElementById('filterZoomRoom');
const applyFiltersButton = document.getElementById('applyFiltersButton');

async function populateAdminZoomRoomFilter() {
    if (!filterZoomRoomSelect) return;
    const zoomRooms = await fetchAdminData('quincho_zoomRooms');
    filterZoomRoomSelect.innerHTML = '<option value="">Todos</option>'; // Default option
    zoomRooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        filterZoomRoomSelect.appendChild(option);
    });
}

async function loadAdminReservations(filters = {}) {
    if (!adminReservationsListDiv) return;
    adminReservationsListDiv.innerHTML = '<h4>Cargando Todas las Reservas...</h4>';

    let reservations = await fetchAdminData('quincho_reservations');
    const zoomRooms = await fetchAdminData('quincho_zoomRooms'); // For getting room names

    // Apply filters
    if (filters.date) {
        reservations = reservations.filter(res => res.date === filters.date);
    }
    if (filters.user) { // User filter can be ID or part of email/name
        const searchTerm = filters.user.toLowerCase();
        reservations = reservations.filter(res =>
            res.userId.toLowerCase().includes(searchTerm) ||
            res.userName.toLowerCase().includes(searchTerm) ||
            res.userDepartment.toLowerCase().includes(searchTerm) // also search by department
        );
    }
    if (filters.zoomRoomId) {
        reservations = reservations.filter(res => res.zoomRoomId === filters.zoomRoomId);
    }

    reservations.sort((a,b) => new Date(a.date + ' ' + a.timeSlots[0].split(' ')[0]) - new Date(b.date + ' ' + b.timeSlots[0].split(' ')[0]));


    if (!reservations || reservations.length === 0) {
        adminReservationsListDiv.innerHTML = '<p>No hay reservas que coincidan con los filtros aplicados, o no hay reservas registradas.</p>';
        return;
    }

    adminReservationsListDiv.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID Reserva</th>
                    <th>Usuario</th>
                    <th>Dpto</th>
                    <th>Zoom Room</th>
                    <th>Fecha</th>
                    <th>Horarios</th>
                    <th>Tipo</th>
                    <th>Registrada</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${reservations.map(res => {
                    const roomName = zoomRooms.find(zr => zr.id === res.zoomRoomId)?.name || 'Desconocido';
                    return `
                        <tr>
                            <td>${res.id}</td>
                            <td>${escapeHTML(res.userName)} (${escapeHTML(res.userId)})</td>
                            <td>${escapeHTML(res.userDepartment)}</td>
                            <td>${escapeHTML(roomName)}</td>
                            <td>${new Date(res.date + 'T00:00:00').toLocaleDateString()}</td>
                            <td>${res.timeSlots.join(', ')}</td>
                            <td>${res.isExclusive ? 'Exclusiva' : 'Compartible'}</td>
                            <td>${new Date(res.createdAt).toLocaleString()}</td>
                            <td>
                                <button class="btn btn-sm btn-warning admin-cancel-reservation-btn" data-id="${res.id}">Cancelar Reserva</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    adminReservationsListDiv.querySelectorAll('.admin-cancel-reservation-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const reservationId = e.target.dataset.id;
            if (confirm(`¿Está seguro que desea cancelar la reserva ID: ${reservationId}?`)) {
                await handleAdminCancelReservation(reservationId);
            }
        });
    });
}

async function handleAdminCancelReservation(reservationId) {
    let reservations = await fetchAdminData('quincho_reservations');
    const initialLength = reservations.length;
    reservations = reservations.filter(res => res.id !== reservationId);

    if (reservations.length < initialLength) {
        await saveAdminData('quincho_reservations', reservations);
        alert(`Reserva ID ${reservationId} cancelada por el administrador.`);
        // Refresh the list with current filters
        const currentFilters = {
            date: filterDateInput.value,
            user: filterUserInput.value,
            zoomRoomId: filterZoomRoomSelect.value
        };
        await loadAdminReservations(currentFilters);
        // Also update on the user side if they are viewing reservations
        if (typeof window.loadAndDisplayReservations === 'function') {
             window.loadAndDisplayReservations();
        }
    } else {
        alert(`Error: Reserva ID ${reservationId} no encontrada.`);
    }
}

function handleApplyAdminReservationFilters() {
    const filters = {
        date: filterDateInput.value,
        user: filterUserInput.value.trim(),
        zoomRoomId: filterZoomRoomSelect.value
    };
    loadAdminReservations(filters);
}


// Utility function for admin to fetch data (can be shared or specific)
async function fetchAdminData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// Utility function for admin to save data
async function saveAdminData(key, data) {
    localStorage.setItem(key, JSON.stringify(data, null, 2));
    console.log(`Admin data saved for key: ${key}`);
}

// Expose functions if they need to be called from HTML or other scripts (though less common for admin)
// window.handleAdminLogin = handleAdminLogin;
