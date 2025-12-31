async function sendEventToBackend(eventData) {
    await fetch("/api/addEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData)
    });
}

async function loadEventsFromBackend(month = currentMonth, year = currentYear) {
    const res = await fetch(`/api/getEvents?month=${month}&year=${year}`);
    events = await res.json();
}

let events = [];
let openReminder = null;

const eventDateInput = document.getElementById("eventDate");
const eventTitleInput = document.getElementById("eventTitle");
const eventDescriptionInput = document.getElementById("eventDescription");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const eventTypeInput = document.getElementById("eventTypeMajor");
const walkInSelect = document.getElementById("walkInWelcome");
const reminderList = document.getElementById("reminderList");
const addEventButton = document.getElementById("addEvent");

let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

const monthAndYear = document.getElementById("monthAndYear");
const calendarBody = document.getElementById("calendar-body");
const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
];

function parseDateFromInput(value) {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function getReadableEventType(type) {
    return {
        socialCommitteeEvent: "Social Committee",
        smallGroup: "Small Group",
        reservedPaid: "Paid Reservation",
        noSocialnoPaid: "Large Group"
    }[type] || "Event";
}

function getEventColorClass(type) {
    return {
        socialCommitteeEvent: "event-social",
        smallGroup: "event-small",
        reservedPaid: "event-paid",
        noSocialnoPaid: "event-large"
    }[type] || "event-default";
}

function daysInMonth(month, year) {
    return 32 - new Date(year, month, 32).getDate();
}

function getEventsOnDate(day, month, year) {
    return events.filter(ev => {
        const d = parseDateFromInput(ev.date);
        return d &&
            d.getDate() === day &&
            d.getMonth() === month &&
            d.getFullYear() === year;
    });
}

/* ==============================
   EVENTS & RESERVATIONS LIST
============================== */

function displayReminders() {
    reminderList.innerHTML = "";
    openReminder = null;

    events.forEach(ev => {
        const d = parseDateFromInput(ev.date);
        if (!d || d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return;

        const li = document.createElement("li");
        li.className = "reminder-item";

        const header = document.createElement("div");
        header.className = "reminder-header " + getEventColorClass(ev.eType);
        header.textContent = `${getReadableEventType(ev.eType)}: ${ev.title}`;

        const details = document.createElement("div");
        details.className = "reminder-details hidden";
        details.innerHTML = `
            <div><strong>Date:</strong> ${ev.date}</div>
            <div><strong>Time:</strong> ${ev.startTime || ""}${ev.endTime ? " - " + ev.endTime : ""}</div>
            <div><strong>Description:</strong> ${ev.description || "—"}</div>
            <div><strong>Contact:</strong> ${ev.contactName || ""} ${ev.contactInfo || ""}</div>
            <div><strong>Walk-ins:</strong> ${ev.walkIn || ""}</div>
        `;

        header.onclick = e => {
            e.stopPropagation();
            if (openReminder && openReminder !== details) {
                openReminder.classList.add("hidden");
            }
            details.classList.toggle("hidden");
            openReminder = details.classList.contains("hidden") ? null : details;
        };

        li.appendChild(header);
        li.appendChild(details);
        reminderList.appendChild(li);
    });
}

/* Close open reminder ONLY when clicking outside reminder list */
document.addEventListener("click", e => {
    if (!e.target.closest("#reminderList")) {
        if (openReminder) {
            openReminder.classList.add("hidden");
            openReminder = null;
        }
    }
});

/* ==============================
   CALENDAR
============================== */

function showCalendar(month, year) {
    calendarBody.innerHTML = "";
    monthAndYear.textContent = `${months[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    let date = 1;

    for (let i = 0; i < 6; i++) {
        const row = document.createElement("tr");

        for (let j = 0; j < 7; j++) {
            const cell = document.createElement("td");

            if (i === 0 && j < firstDay) {
                row.appendChild(cell);
                continue;
            }
            if (date > daysInMonth(month, year)) break;

            cell.className = "date-picker";
            cell.innerHTML = `<span>${date}</span>`;

            const todaysEvents = getEventsOnDate(date, month, year);
            if (todaysEvents.length) {
                const dots = document.createElement("div");
                dots.className = "event-dots";
                todaysEvents.forEach(ev => {
                    const dot = document.createElement("span");
                    dot.className = "event-dot " + getEventColorClass(ev.eType);
                    dots.appendChild(dot);
                });
                cell.appendChild(dots);
            }

            const capturedDate = date;
            cell.onclick = () => {
                eventDateInput.value =
                    `${year}-${String(month + 1).padStart(2,"0")}-${String(capturedDate).padStart(2,"0")}`;
                toggleTitleDiv();
            };

            row.appendChild(cell);
            date++;
        }
        calendarBody.appendChild(row);
    }
}

/* ==============================
   SUBMIT EVENT
============================== */

addEventButton.onclick = async () => {
    const date = eventDateInput.value;
    if (!date || !eventTitleInput.value || !eventTypeInput.value) return;

    const payload = {
        date,
        title: eventTitleInput.value,
        description: eventDescriptionInput.value,
        eType: eventTypeInput.value,
        startTime: startTimeInput.value,
        endTime: endTimeInput.value,
        groupSize: document.getElementById("groupSize").value,
        contactName: document.getElementById("contactName").value,
        contactInfo: document.getElementById("contactInfo").value,
        walkIn: walkInSelect.value
    };

    await sendEventToBackend(payload);
    await loadEventsFromBackend(currentMonth, currentYear);
    showCalendar(currentMonth, currentYear);
    displayReminders();
};

/* ==============================
   NAVIGATION
============================== */

async function previous() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    await loadEventsFromBackend(currentMonth, currentYear);
    showCalendar(currentMonth, currentYear);
    displayReminders();
}

async function next() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    await loadEventsFromBackend(currentMonth, currentYear);
    showCalendar(currentMonth, currentYear);
    displayReminders();
}

/* ==============================
   INIT
============================== */

(async () => {
    const yearSelect = document.getElementById("year");
    for (let y = today.getFullYear() - 5; y <= today.getFullYear() + 5; y++) {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    await loadEventsFromBackend(currentMonth, currentYear);
    showCalendar(currentMonth, currentYear);
    displayReminders();
})();
