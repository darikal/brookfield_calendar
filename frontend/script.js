// script.js - Full Version with Recurring Events, Click-to-Fill, Hover Tooltips, and Fixed Dropdown

let events = [];

// DOM Elements
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

let eventIdCounter = 1;

// ------------------------------
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
}

function generateRecurringDates(baseDate, type, count) {
    let dates = [];
    for (let i = 0; i <= count; i++) {
        let nextDate = new Date(baseDate);
        if (type === "week") nextDate.setDate(baseDate.getDate() + 7 * i);
        if (type === "biWeek") nextDate.setDate(baseDate.getDate() + 14 * i);
        if (type === "month") nextDate.setMonth(baseDate.getMonth() + i);
        dates.push(nextDate);
    }
    return dates;
}

// ------------------------------
addEventButton.onclick = () => {
    const date = eventDateInput.value;
    const title = eventTitleInput.value;
    const description = eventDescriptionInput.value;
    const eType = eventTypeInput.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const recurCount = parseInt(recurLengthNum.value, 10) || 0;

    if (!date || !title || !eType) { alert("Date, Title, and Event Type required"); return; }

    let baseDate = parseDateFromInput(date);
    let allDates = [baseDate];

    if (recurCheckbox.checked && recurCount > 0) {
        allDates = [baseDate, ...generateRecurringDates(baseDate, recurWhen.value, recurCount)];
    }

    allDates.forEach(d => {
        events.push({
            id: eventIdCounter++,
            date: d.toISOString().split('T')[0],
            title, description, eType, startTime, endTime
        });
    });

    showCalendar(currentMonth, currentYear);
    displayReminders();

    // Clear inputs
    eventDateInput.value = eventTitleInput.value = eventDescriptionInput.value = startTimeInput.value = endTimeInput.value = '';
    recurCheckbox.checked = false;
    document.getElementById('recurring').style.display = 'none';
};

recurCheckbox.addEventListener('change', () => {
    document.getElementById('recurring').style.display = recurCheckbox.checked ? 'block' : 'none';
});

function daysInMonth(month, year) { return 32 - new Date(year, month, 32).getDate(); }
function getEventsOnDate(date, month, year) {
    return events.filter(ev => {
        const evDate = parseDateFromInput(ev.date);
        return evDate.getDate() === date && evDate.getMonth() === month && evDate.getFullYear() === year;
    });
}

// ------------------------------
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

                const tooltip = document.createElement('div');
                tooltip.className = 'event-tooltip';
                tooltip.innerHTML = todaysEvents.map(ev => {
                    let timeText = (ev.startTime || ev.endTime) ? ` (${ev.startTime || '??:??'} - ${ev.endTime || '??:??'})` : '';
                    return `<strong>${getReadableEventType(ev.eType)}</strong>${timeText}: ${ev.title || ev.description}`;
                }).join('<hr style="margin:3px 0;">');
                cell.appendChild(tooltip);
            }

            // Click-to-fill top input and open event section if needed
            cell.addEventListener('click', () => {
                const formattedDate = `${year}-${String(month + 1).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
                eventDateInput.value = formattedDate;

                // Highlight selected date
                document.querySelectorAll('.date-picker').forEach(td => td.classList.remove('selected'));
                cell.classList.add('selected');

                const eventWrapper = document.getElementById('eventDetailsWrapper');

                // Open event section if hidden and default type to smallGroup if nothing selected
                if (eventWrapper.style.display === 'none' || eventWrapper.style.display === '') {
                    eventWrapper.style.display = 'block';
                    if (!eventTypeInput.value) {
                        eventTypeInput.value = 'smallGroup';
                    }
                }

                toggleTitleDiv();
            });

            row.appendChild(cell);
            date++;
        }
        calendarBody.appendChild(row);
    }
}

function next() { currentYear = currentMonth === 11 ? currentYear + 1 : currentYear; currentMonth = (currentMonth + 1) % 12; showCalendar(currentMonth, currentYear); }
function previous() { currentYear = currentMonth === 0 ? currentYear - 1 : currentYear; currentMonth = currentMonth === 0 ? 11 : currentMonth - 1; showCalendar(currentMonth, currentYear); }
function jump() { currentYear = parseInt(document.getElementById('year').value); currentMonth = parseInt(document.getElementById('month').value); showCalendar(currentMonth, currentYear); }

function toggleTitleDiv() {
    const dropdown = document.getElementById('eventTypeMajor');
    const eventWrapper = document.getElementById('eventDetailsWrapper');
    if (!dropdown.value) { eventWrapper.style.display = 'none'; return; } else { eventWrapper.style.display = 'block'; }
    document.getElementById('recurBox').style.display = 'block';
    if (dropdown.value === "reservedPaid") {
        document.getElementById('paidInfo').style.display = 'block';
        document.getElementById('recurBox').style.display = 'none';
    } else { document.getElementById('paidInfo').style.display = 'none'; }
}

function toggleDiv() {
    const walkInSelect = document.getElementById("walkInWelcome");
    const otherDiv = document.getElementById("eventOther");
    const signUpDiv = document.getElementById("signUpField");
    if (walkInSelect.value === "Other") { otherDiv.style.display = "block"; signUpDiv.style.display = "none"; }
    else if (walkInSelect.value === "signUpRequired") { signUpDiv.style.display = "block"; otherDiv.style.display = "none"; }
    else { otherDiv.style.display = "none"; signUpDiv.style.display = "none"; }
}

// INITIAL RENDER
showCalendar(currentMonth, currentYear);
displayReminders();
