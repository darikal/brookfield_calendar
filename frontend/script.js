// ------------------------------
// Backend Functions
// ------------------------------
async function sendEventToBackend(eventData) {
    try {
        const response = await fetch("/api/addEvent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
        });

        if (!response.ok) {
            console.error("Backend error:", await response.text());
            alert("Error sending event to server.");
        }
    } catch (err) {
        console.error("Network error:", err);
        alert("Could not reach server.");
    }
}

async function loadEventsFromBackend() {
    try {
        const response = await fetch("/api/getEvents");
        if (!response.ok) {
            console.error("Backend fetch error:", await response.text());
            return;
        }
        const data = await response.json();
        // Normalize events so each has a numeric id for local management
        events = data.map(ev => {
            // Keep backend fields, but ensure id exists (numeric local id used for UI)
            return Object.assign({}, ev);
        });

        // If backend events don't include a numeric `id`, assign local ids
        let maxId = 0;
        events.forEach(ev => {
            if (ev.id && Number.isFinite(ev.id)) {
                if (ev.id > maxId) maxId = ev.id;
            }
        });
        // If no numeric ids found, assign incremental ids
        if (maxId === 0) {
            events.forEach(ev => {
                if (!ev.id || !Number.isFinite(ev.id)) {
                    ev.id = eventIdCounter++;
                } else {
                    if (ev.id >= eventIdCounter) eventIdCounter = ev.id + 1;
                }
            });
        } else {
            eventIdCounter = maxId + 1;
        }
    } catch (err) {
        console.error("Network error:", err);
    }
}

// ------------------------------
// Local Event Storage
// ------------------------------
let events = [];
let eventIdCounter = 1;

// ------------------------------
// DOM Elements
// ------------------------------
let eventDateInput = document.getElementById("eventDate");
let eventTitleInput = document.getElementById("eventTitle");
let eventDescriptionInput = document.getElementById("eventDescription");
let startTimeInput = document.getElementById("startTime");
let endTimeInput = document.getElementById("endTime");
let eventTypeInput = document.getElementById("eventTypeMajor");
let walkInSelect = document.getElementById("walkInWelcome");
let recurCheckbox = document.getElementById("recurCheckbox");
let recurLengthNum = document.getElementById("recurLengthNum");
let recurWhen = document.getElementById("recurWhen");
let reminderList = document.getElementById("reminderList");
let addEventButton = document.getElementById("addEvent");

let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();
const monthAndYear = document.getElementById("monthAndYear");
const calendarBody = document.getElementById("calendar-body");
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ------------------------------
// Helper Functions
// ------------------------------
function parseDateFromInput(value) {
    if (!value && value !== 0) return null;
    // If already a Date object
    if (value instanceof Date) return value;
    // If ISO-style string like 2023-07-01T00:00:00.000Z
    if (typeof value === "string") {
        if (value.includes("T")) {
            const d = new Date(value);
            if (!isNaN(d)) return d;
        }
        // If "YYYY-MM-DD"
        const parts = value.split("-").map(Number);
        if (parts.length === 3 && parts.every(n => Number.isFinite(n))) {
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        // Fallback: try Date constructor
        const d = new Date(value);
        if (!isNaN(d)) return d;
    }
    // Last resort
    return new Date(value);
}

function getReadableEventType(eType) {
    switch (eType) {
        case "socialCommitteeEvent": return "Social Committee";
        case "smallGroup": return "Small Group";
        case "reservedPaid": return "Paid Reservation";
        case "noSocialnoPaid": return "Large Group";
        default: return "Event";
    }
}

function getEventColorClass(eType) {
    switch (eType) {
        case "socialCommitteeEvent": return "event-social";
        case "smallGroup": return "event-small";
        case "reservedPaid": return "event-paid";
        case "noSocialnoPaid": return "event-large";
        default: return "event-default";
    }
}

function daysInMonth(month, year) {
    return 32 - new Date(year, month, 32).getDate();
}

function generateRecurringDates(baseDate, type, count) {
    let dates = [];
    // generate `count` additional dates (count = number of repeats)
    for (let i = 1; i <= count; i++) {
        let nextDate = new Date(baseDate);
        if (type === "week") nextDate.setDate(baseDate.getDate() + 7 * (i - 1));
        if (type === "biWeek") nextDate.setDate(baseDate.getDate() + 14 * (i - 1));
        if (type === "month") nextDate.setMonth(baseDate.getMonth() + (i - 1));
        dates.push(nextDate);
    }
    return dates;
}

function getEventsOnDate(date, month, year) {
    return events.filter(ev => {
        const evDate = parseDateFromInput(ev.date);
        if (!evDate) return false;
        return evDate.getDate() === date && evDate.getMonth() === month && evDate.getFullYear() === year;
    });
}

// ------------------------------
// Display Events
// ------------------------------
function displayReminders() {
    if (!reminderList) return;
    reminderList.innerHTML = "";
    events.forEach(event => {
        const eventDate = parseDateFromInput(event.date);
        if (!eventDate) return;
        if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
            let timeText = (event.startTime || event.endTime) ? ` (${event.startTime || '??:??'} - ${event.endTime || '??:??'})` : '';
            const li = document.createElement("li");
            li.innerHTML = `<strong>${getReadableEventType(event.eType)}</strong>${timeText}: ${event.title || event.description || ''}`;
            const btn = document.createElement("button");
            btn.textContent = "Delete";
            btn.className = "delete-event";
            btn.onclick = () => deleteEvent(event.id);
            li.appendChild(btn);
            reminderList.appendChild(li);
        }
    });
}

function deleteEvent(eventId) {
    events = events.filter(ev => ev.id !== eventId);
    showCalendar(currentMonth, currentYear);
    displayReminders();
}

// ------------------------------
// Calendar Rendering
// ------------------------------
function showCalendar(month, year) {
    if (!calendarBody) return;
    calendarBody.innerHTML = '';
    if (month < 0 || month > 11) return;
    monthAndYear.textContent = `${months[month]} ${year}`;
    const firstDay = new Date(year, month, 1).getDay();
    let date = 1;

    for (let i = 0; i < 6; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            const cell = document.createElement('td');

            // blank cells before the first day
            if (i === 0 && j < firstDay) { row.appendChild(cell); continue; }
            if (date > daysInMonth(month, year)) {
                // append the row (may contain blanks) then break the inner loop
                break;
            }

            cell.className = 'date-picker';
            cell.innerHTML = `<span>${date}</span>`;

            const todaysEvents = getEventsOnDate(date, month, year);
            if (todaysEvents.length) {
                cell.classList.add('event-marker');
                const dots = document.createElement('div');
                dots.className = 'event-dots';
                todaysEvents.forEach(ev => {
                    const dot = document.createElement('span');
                    dot.className = 'event-dot ' + getEventColorClass(ev.eType);
                    dot.title = getReadableEventType(ev.eType);
                    dots.appendChild(dot);
                });
                cell.appendChild(dots);

                const tooltip = document.createElement('div');
                tooltip.className = 'event-tooltip';
                tooltip.innerHTML = todaysEvents.map(ev => {
                    let timeText = (ev.startTime || ev.endTime) ? ` (${ev.startTime || '??:??'} - ${ev.endTime || '??:??'})` : '';
                    return `<strong>${getReadableEventType(ev.eType)}</strong>${timeText}: ${ev.title || ev.description || ''}`;
                }).join('<hr style="margin:3px 0;">');
                cell.appendChild(tooltip);
            }

            // capture the current date value in a block-scoped variable so click uses correct day
            const cellDate = date;

            // Click-to-fill top input
            cell.addEventListener('click', () => {
                const clickedDate = `${year}-${String(month + 1).padStart(2,'0')}-${String(cellDate).padStart(2,'0')}`;
                if (eventDateInput) eventDateInput.value = clickedDate;

                // clear previous selection highlight then highlight this cell
                document.querySelectorAll('.date-picker').forEach(td => td.classList.remove('selected'));
                cell.classList.add('selected');

                // open event details wrapper if hidden and default to smallGroup if no selection
                const eventWrapper = document.getElementById('eventDetailsWrapper');
                if (eventWrapper && (!eventWrapper.style.display || eventWrapper.style.display === 'none')) {
                    eventWrapper.style.display = 'block';
                    if (eventTypeInput && !eventTypeInput.value) eventTypeInput.value = 'smallGroup';
                }

                toggleTitleDiv();
            });

            row.appendChild(cell);
            date++;
        }
        calendarBody.appendChild(row);
    }
}

// ------------------------------
// Navigation
// ------------------------------
function next() {
    currentYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    currentMonth = (currentMonth + 1) % 12;
    showCalendar(currentMonth, currentYear);
}
function previous() {
    currentYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    currentMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    showCalendar(currentMonth, currentYear);
}
function jump() {
    const y = parseInt(document.getElementById('year').value, 10);
    const m = parseInt(document.getElementById('month').value, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return;
    currentYear = y;
    currentMonth = m;
    showCalendar(currentMonth, currentYear);
}

// ------------------------------
// UI Toggles
// ------------------------------
function toggleTitleDiv() {
    const dropdown = document.getElementById('eventTypeMajor');
    const eventWrapper = document.getElementById('eventDetailsWrapper');
    if (!dropdown || !eventWrapper) return;
    if (!dropdown.value) { eventWrapper.style.display = 'none'; return; }
    eventWrapper.style.display = 'block';
    const recurBox = document.getElementById('recurBox');
    if (recurBox) recurBox.style.display = 'block';
    if (dropdown.value === "reservedPaid") {
        const paidInfo = document.getElementById('paidInfo');
        if (paidInfo) paidInfo.style.display = 'block';
        if (recurBox) recurBox.style.display = 'none';
    } else {
        const paidInfo = document.getElementById('paidInfo');
        if (paidInfo) paidInfo.style.display = 'none';
    }
}

function toggleDiv() {
    const walkInSelect = document.getElementById("walkInWelcome");
    const otherDiv = document.getElementById("eventOther");
    const signUpDiv = document.getElementById("signUpField");
    if (!walkInSelect) return;
    if (walkInSelect.value === "Other") { if (otherDiv) otherDiv.style.display = "block"; if (signUpDiv) signUpDiv.style.display = "none"; }
    else if (walkInSelect.value === "signUpRequired") { if (signUpDiv) signUpDiv.style.display = "block"; if (otherDiv) otherDiv.style.display = "none"; }
    else { if (otherDiv) otherDiv.style.display = "none"; if (signUpDiv) signUpDiv.style.display = "none"; }
}

// Recurring checkbox toggle
if (recurCheckbox) {
    recurCheckbox.addEventListener('change', () => {
        const recurring = document.getElementById('recurring');
        if (recurring) recurring.style.display = recurCheckbox.checked ? 'block' : 'none';
    });
}

// ------------------------------
// Add Event Button
// ------------------------------
if (addEventButton) {
    addEventButton.onclick = () => {
        const date = eventDateInput ? eventDateInput.value : "";
        const title = eventTitleInput ? eventTitleInput.value : "";
        const description = eventDescriptionInput ? eventDescriptionInput.value : "";
        const eType = eventTypeInput ? eventTypeInput.value : "";
        const startTime = startTimeInput ? startTimeInput.value : "";
        const endTime = endTimeInput ? endTimeInput.value : "";
        const recurCount = parseInt(recurLengthNum ? recurLengthNum.value : "0", 10) || 0;

        if (!date || !title || !eType) { alert("Date, Title, and Event Type required"); return; }

        let baseDate = parseDateFromInput(date);
        let allDates = [baseDate];
        if (recurCheckbox && recurCheckbox.checked && recurCount > 0) {
            allDates = [baseDate, ...generateRecurringDates(baseDate, recurWhen ? recurWhen.value : "week", recurCount)];
        }

        allDates.forEach(d => {
            const newEvent = {
                id: eventIdCounter++,
                date: d.toISOString().split('T')[0],
                title,
                description,
                eType,
                startTime,
                endTime,
                groupSize: (document.getElementById("groupSize") ? document.getElementById("groupSize").value : ""),
                contactName: (document.getElementById("contactName") ? document.getElementById("contactName").value : ""),
