// Constants for JSON file paths
const RESERVATIONS_FILE = 'data/reservations.json';
const ZOOM_ROOMS_FILE = 'data/zoomRooms.json';

// DOM Elements for Reservation Form & Display
const reservationForm = document.getElementById('reservationForm');
const zoomRoomSelect = document.getElementById('resZoomRoom');
const dateInput = document.getElementById('resDate');
const timeSelect = document.getElementById('resTime');
const resUserNameSpan = document.getElementById('resUserName');
const resUserDepartmentSpan = document.getElementById('resUserDepartment');
const resExclusiveSwitch = document.getElementById('resExclusive');

const myReservationsListDiv = document.getElementById('myReservationsList');
const publicReservationsListDiv = document.getElementById('publicReservationsList');


// --- Utility functions for JSON data (similar to auth.js but for reservations) ---
// We can reuse fetchData from auth.js if it's made globally available, or redefine.
// For now, let's assume fetchData is available or we'll define a local version.
async function fetchLocalData(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            if (response.status === 404) {
                // For zoomRooms, it should ideally exist. For reservations, it's fine if it's empty.
                console.warn(`File ${filePath} not found. Returning empty array or default.`);
                return filePath === ZOOM_ROOMS_FILE ? [{id: "0", name: "Default Room - Configure Admin"}] : [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${filePath}:`, error);
        return filePath === ZOOM_ROOMS_FILE ? [{id: "0", name: "Default Room - Configure Admin"}] : [];
    }
}

async function saveReservations(reservations) {
    console.log("Simulating saveReservations. In a real app, this would be an API call.");
    console.log("Current reservation data:", reservations);
    localStorage.setItem('quincho_reservations', JSON.stringify(reservations, null, 2));
    // alert("Reservation data would be sent to a server here. Check console for data.");
}

async function saveZoomRooms(zoomRooms) { // For admin part, but good to have structure
    console.log("Simulating saveZoomRooms. In a real app, this would be an API call.");
    localStorage.setItem('quincho_zoomRooms', JSON.stringify(zoomRooms, null, 2));
}


// --- Reservation Logic ---
let localZoomRooms = [];
let localReservations = [];

async function initializeReservationsView() {
    console.log("Initializing Reservations View");
    const currentUser = window.getCurrentUser(); // Get user from auth.js
    if (!currentUser) {
        console.error("No current user found. Cannot initialize reservations view.");
        // showLoginView(); // This function is in auth.js, might need a global app manager
        return;
    }

    if (resUserNameSpan) resUserNameSpan.textContent = `${currentUser.name} ${currentUser.surname}`;
    if (resUserDepartmentSpan) resUserDepartmentSpan.textContent = currentUser.department;

    await populateZoomRoomsDropdown();
    populateTimeSlots();
    setMinReservationDate();
    await loadAndDisplayReservations();
}

function setMinReservationDate() {
    if (!dateInput) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    dateInput.value = `${yyyy}-${mm}-${dd}`; // Default to today
}

async function populateZoomRoomsDropdown() {
    if (!zoomRoomSelect) return;

    let zoomRoomsData = await fetchLocalData(ZOOM_ROOMS_FILE);
     // Use localStorage if available and populated (e.g., by admin)
    const storedZoomRooms = localStorage.getItem('quincho_zoomRooms');
    if (storedZoomRooms) {
        zoomRoomsData = JSON.parse(storedZoomRooms);
    } else {
        // If no stored rooms, save the fetched/default ones to localStorage
        // This ensures admin changes can be reflected if made before user interaction
        await saveZoomRooms(zoomRoomsData);
    }
    localZoomRooms = zoomRoomsData; // Cache locally

    zoomRoomSelect.innerHTML = '<option value="">Seleccione un espacio...</option>'; // Clear existing
    localZoomRooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        zoomRoomSelect.appendChild(option);
    });
}

function populateTimeSlots() {
    if (!timeSelect) return;
    timeSelect.innerHTML = ''; // Clear existing
    for (let hour = 9; hour <= 23; hour++) {
        const option = document.createElement('option');
        option.value = `${String(hour).padStart(2, '0')}:00`;
        option.textContent = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`;
        timeSelect.appendChild(option);
    }
    for (let hour = 0; hour <= 2; hour++) { // 00:00 to 03:00 of next day
        const option = document.createElement('option');
        option.value = `${String(hour).padStart(2, '0')}:00 (día sig.)`;
        option.textContent = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00 (día siguiente)`;
        timeSelect.appendChild(option);
    }
}

async function handleReservationSubmit(event) {
    event.preventDefault();
    const currentUser = window.getCurrentUser();
    if (!currentUser) {
        alert("Debe iniciar sesión para hacer una reserva.");
        // Potentially redirect to login: window.showLoginView(); (if showLoginView is global)
        return;
    }

    const zoomRoomId = zoomRoomSelect.value;
    const date = dateInput.value;
    const selectedTimeSlots = Array.from(timeSelect.selectedOptions).map(opt => opt.value);
    const isExclusive = resExclusiveSwitch.checked;

    if (!zoomRoomId || !date || selectedTimeSlots.length === 0) {
        alert('Por favor, complete todos los campos de la reserva.');
        return;
    }

    // Basic conflict check (simplified: checks if exact room, date, and any overlapping time slot is taken)
    // More sophisticated check would consider contiguous blocks and exclusive vs. sharable.
    const newReservationId = `res_${Date.now()}`; // Incremental ID
    const newReservation = {
        id: newReservationId,
        userId: currentUser.id,
        userName: `${currentUser.name} ${currentUser.surname}`,
        userDepartment: currentUser.department,
        zoomRoomId: zoomRoomId,
        zoomRoomName: localZoomRooms.find(r => r.id === zoomRoomId)?.name || 'Desconocido',
        date: date,
        timeSlots: selectedTimeSlots,
        isExclusive: isExclusive,
        createdAt: new Date().toISOString()
    };

    // Load current reservations
    let reservations = await fetchLocalData(RESERVATIONS_FILE);
    const storedReservations = localStorage.getItem('quincho_reservations');
    if (storedReservations) {
        reservations = JSON.parse(storedReservations);
    }

    // Conflict detection (basic)
    const conflict = reservations.find(res =>
        res.zoomRoomId === newReservation.zoomRoomId &&
        res.date === newReservation.date &&
        res.timeSlots.some(slot => newReservation.timeSlots.includes(slot)) &&
        (res.isExclusive || newReservation.isExclusive) // If either is exclusive, it's a conflict
    );

    if (conflict) {
        alert('Conflicto de reserva: El horario seleccionado ya está ocupado o marcado como exclusivo.');
        return;
    }

    reservations.push(newReservation);
    await saveReservations(reservations);
    localReservations = reservations; // Update local cache

    alert(`Reserva ${newReservationId} confirmada!`);
    reservationForm.reset();
    setMinReservationDate(); // Reset date to today
    await loadAndDisplayReservations(); // Refresh lists

    // Simulate Admin Notification for New Reservation
    const adminNotificationsEnabled = localStorage.getItem('quincho_adminNotifications') === 'true';
    if (adminNotificationsEnabled) {
        console.log('%cADMIN NOTIFICATION (Simulated Email)', 'color: green; font-weight: bold;');
        console.log(`Subject: Nueva Reserva Creada - QuinchoApp`);
        console.log(`Body: Se ha creado una nueva reserva:
        ID Reserva: ${newReservation.id}
        Usuario: ${newReservation.userName} (${newReservation.userDepartment})
        Zoom Room: ${newReservation.zoomRoomName}
        Fecha: ${new Date(newReservation.date + 'T00:00:00').toLocaleDateString()}
        Horarios: ${newReservation.timeSlots.join(', ')}
        Tipo: ${newReservation.isExclusive ? 'Exclusiva' : 'Compartible'}
        Fecha de Creación: ${new Date(newReservation.createdAt).toLocaleString()}`);
        console.log('%c------------------------------------', 'color: green;');
    }
}

async function loadAndDisplayReservations() {
    const currentUser = window.getCurrentUser();
    if (!currentUser && myReservationsListDiv) { // If user logged out while on page
        myReservationsListDiv.innerHTML = '<p>Inicie sesión para ver sus reservas.</p>';
    }

    let reservations = await fetchLocalData(RESERVATIONS_FILE);
    const storedReservations = localStorage.getItem('quincho_reservations');
    if (storedReservations) {
        reservations = JSON.parse(storedReservations);
    }
    localReservations = reservations; // Cache

    if (myReservationsListDiv && currentUser) {
        const myRes = localReservations.filter(r => r.userId === currentUser.id);
        renderReservations(myRes, myReservationsListDiv, true); // true for allowing cancel
    }
    if (publicReservationsListDiv) {
        renderReservations(localReservations, publicReservationsListDiv, false); // false, no cancel for public
    }
}

function renderReservations(reservationsToDisplay, containerElement, allowCancel) {
    if (!containerElement) return;
    containerElement.innerHTML = ''; // Clear previous

    if (reservationsToDisplay.length === 0) {
        containerElement.innerHTML = '<p>No hay reservas para mostrar.</p>';
        return;
    }

    reservationsToDisplay.sort((a,b) => new Date(a.date + ' ' + a.timeSlots[0].split(' ')[0]) - new Date(b.date + ' ' + b.timeSlots[0].split(' ')[0]));


    reservationsToDisplay.forEach(res => {
        const card = document.createElement('div');
        card.className = 'reservation-card';
        card.innerHTML = `
            <h3>Reserva ID: ${res.id}</h3>
            <p><strong>Usuario:</strong> ${res.userName}</p>
            <p><strong>Departamento:</strong> ${res.userDepartment}</p>
            <p><strong>Zoom Room:</strong> ${res.zoomRoomName}</p>
            <p><strong>Fecha:</strong> ${new Date(res.date + 'T00:00:00').toLocaleDateString()}</p>
            <p><strong>Horarios:</strong> ${res.timeSlots.join(', ')}</p>
            <p><strong>Tipo:</strong> ${res.isExclusive ? 'Exclusiva' : 'Compartible'}</p>
            <p><small>Registrada: ${new Date(res.createdAt).toLocaleString()}</small></p>
            ${allowCancel ? `<button class="cancel-reservation-btn" data-id="${res.id}">Cancelar Mi Reserva</button>` : ''}
        `;
        containerElement.appendChild(card);

        if (allowCancel) {
            card.querySelector('.cancel-reservation-btn').addEventListener('click', async function() {
                const resIdToCancel = this.dataset.id;
                if (confirm(`¿Está seguro que desea cancelar la reserva ${resIdToCancel}?`)) {
                    await cancelUserReservation(resIdToCancel);
                }
            });
        }
    });
}

async function cancelUserReservation(reservationId) {
    const currentUser = window.getCurrentUser();
    if (!currentUser) {
        alert("Debe estar logueado para cancelar una reserva.");
        return;
    }

    let reservations = await fetchLocalData(RESERVATIONS_FILE);
    const storedReservations = localStorage.getItem('quincho_reservations');
    if (storedReservations) {
        reservations = JSON.parse(storedReservations);
    }

    const reservationToCancel = reservations.find(r => r.id === reservationId);

    if (!reservationToCancel) {
        alert("Reserva no encontrada.");
        return;
    }

    if (reservationToCancel.userId !== currentUser.id) {
        alert("No tiene permiso para cancelar esta reserva.");
        return;
    }

    const remainingReservations = reservations.filter(r => r.id !== reservationId);
    await saveReservations(remainingReservations);
    localReservations = remainingReservations; // Update cache

    alert(`Reserva ${reservationId} cancelada.`);
    await loadAndDisplayReservations(); // Refresh lists
}


// Event Listeners
if (reservationForm) {
    reservationForm.addEventListener('submit', handleReservationSubmit);
}

// Expose initializeReservationsView for auth.js or direct calls if needed
window.initializeReservationsView = initializeReservationsView;

// Initial call if reservations.js is loaded and the section is visible
// (though auth.js typically controls the initial view)
// document.addEventListener('DOMContentLoaded', () => {
// if (document.getElementById('reservationsSection').style.display !== 'none') {
// initializeReservationsView();
// }
// });
