// script.js - Full Updated Calendar Script with Recurring Events Support

let events = [];

// Load events from localStorage
function loadEvents() {
    const saved = localStorage.getItem("events");
    if (saved) events = JSON.parse(saved);
}

function saveEvents() {
    localStorage.setItem("events", JSON.stringify(events));
}

loadEvents();

// DOM ELEMENTS
const eventDateInput = document.getElementById("eventDate");
const eventTitleInput = document.getElementById("eventTitle");
const eventDescriptionInput = document.getElementById("eventDescription");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const eventTypeInput = document.getElementById("eventTypeMajor");
const walkInSelect = document.getElementById("walkInWelcome");
const recurCheckbox = document.getElementById("recurCheckbox");
const recurLengthNum = document.getElementById("recurLengthNum");
const recurWhen = document.getElementById("recurWhen");
const addEventButton = document.getElementById("addEvent");
const reminderList = document.getElementById("reminderList");

// Calendar variables
let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();
const monthAndYear = document.getElementById("monthAndYear");
const calendarBody = document.getElementById("calendar-body");
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ----------- HELPER FUNCTIONS -----------
function parseDateFromInput(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
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

function displayReminders() {
    reminderList.innerHTML = "";
    events.forEach(event => {
        const eventDate = parseDateFromInput(event.date);
        if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
            let timeText = (event.startTime || event.endTime) ? ` (${event.startTime || '??:??'} - ${event.endTime || '??:??'})` : '';
            const li = document.createElement("li");
            li.innerHTML = `<strong>${getReadableEventType(event.eType)}</strong>${timeText}: ${event.description}`;
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
    saveEvents();
}

function generateRecurringDates(baseDate, type, count) {
    let dates = [baseDate];
    for (let i = 1; i <= count; i++) {
        let nextDate = new Date(baseDate);
        if (type === "week") nextDate.setDate(baseDate.getDate() + 7 * i);
        if (type === "biWeek") nextDate.setDate(baseDate.getDate() + 14 * i);
        if (type === "month") nextDate.setMonth(baseDate.getMonth() + i);
        dates.push(nextDate);
    }
    return dates;
}

// ----------- ADD EVENT -----------
addEventButton.onclick = () => {
    const date = eventDateInput.value;
    const title = eventTitleInput.value;
    const description = eventDescriptionInput.value;
    const eType = eventTypeInput.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const recurCount = parseInt(recurLengthNum.value, 10) || 0;

    if (!date || !title) { alert("Date and Title required"); return; }

    let baseDate = parseDateFromInput(date);
    let allDates = [baseDate];

    if (recurCheckbox.checked && recurCount > 0) {
        allDates = generateRecurringDates(baseDate, recurWhen.value, recurCount);
    }

    allDates.forEach(d => {
        events.push({
            id: Date.now() + Math.random(),
            date: d.toISOString().split('T')[0],
            title, description, eType, startTime, endTime
        });
    });

    showCalendar(currentMonth, currentYear);
    displayReminders();

    eventDateInput.value = title = description = startTime = endTime = '';
    recurCheckbox.checked = false;
    document.getElementById('recurring').style.display = 'none';
};

// ----------- TOGGLE RECURRING DIV -----------
recurCheckbox.addEventListener('change', () => {
    document.getElementById('recurring').style.display = recurCheckbox.checked ? 'block' : 'none';
});

// ----------- CALENDAR -----------
function daysInMonth(month, year) { return 32 - new Date(year, month, 32).getDate(); }

function getEventsOnDate(date, month, year) {
    return events.filter(ev => {
        const evDate = parseDateFromInput(ev.date);
        return evDate.getDate() === date && evDate.getMonth() === month && evDate.getFullYear() === year;
    });
}

function showCalendar(month, year) {
    calendarBody.innerHTML = '';
    monthAndYear.textContent = `${months[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    let date = 1;
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            const cell = document.createElement('td');
            if (i === 0 && j < firstDay) { row.appendChild(cell); continue; }
            if (date > daysInMonth(month, year)) break;

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
            }

            cell.onclick = () => { eventDateInput.value = `${year}-${String(month+1).padStart(2,'0')}-${String(date).padStart(2,'0')}`; };

            row.appendChild(cell);
            date++;
        }
        calendarBody.appendChild(row);
    }
}

// ----------- NAVIGATION -----------
function next() { currentYear = currentMonth === 11 ? currentYear + 1 : currentYear; currentMonth = (currentMonth + 1) % 12; showCalendar(currentMonth, currentYear); }
function previous() { currentYear = currentMonth === 0 ? currentYear - 1 : currentYear; currentMonth = currentMonth === 0 ? 11 : currentMonth - 1; showCalendar(currentMonth, currentYear); }
function jump() { currentYear = parseInt(document.getElementById('year').value); currentMonth = parseInt(document.getElementById('month').value); showCalendar(currentMonth, currentYear); }

// INITIAL RENDER
showCalendar(currentMonth, currentYear);
displayReminders();
