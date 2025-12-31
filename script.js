async function sendEventToBackend(eventData) {
    try {
        const response = await fetch("/api/addEvent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData)
        });
        if (!response.ok) console.error(await response.text());
    } catch (err) {
        console.error(err);
    }
}

async function loadEventsFromBackend(month = currentMonth, year = currentYear) {
    try {
        const response = await fetch(`/api/getEvents?month=${month}&year=${year}`);
        if (!response.ok) {
            console.error(await response.text());
            return;
        }
        const data = await response.json();
        events = data.map(ev => ({ ...ev, id: ev._id || ev.id }));
    } catch (err) {
        console.error(err);
    }
}

let events = [];

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
const reminderList = document.getElementById("reminderList");
const addEventButton = document.getElementById("addEvent");

let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

const monthAndYear = document.getElementById("monthAndYear");
const calendarBody = document.getElementById("calendar-body");
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function parseDateFromInput(value) {
    if (!value) return null;
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

function daysInMonth(month, year) {
    return 32 - new Date(year, month, 32).getDate();
}

function getEventsOnDate(date, month, year) {
    return events.filter(ev => {
        const d = parseDateFromInput(ev.date);
        return d && d.getDate() === date && d.getMonth() === month && d.getFullYear() === year;
    });
}

let openReminder = null;

function displayReminders() {
    reminderList.innerHTML = "";
    openReminder = null;

    events.forEach(ev => {
        const d = parseDateFromInput(ev.date);
        if (!d) return;
        if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return;

        const wrapper = document.createElement("li");
        wrapper.className = "reminder-item";

        const header = document.createElement("div");
        header.className = "reminder-header";
        header.innerHTML = `<strong>${getReadableEventType(ev.eType)}</strong>: ${ev.title}`;

        const details = document.createElement("div");
        details.className = "reminder-details";
        details.style.display = "none";
        details.innerHTML = `
            <div><strong>Date:</strong> ${ev.date}</div>
            ${ev.startTime || ev.endTime ? `<div><strong>Time:</strong> ${ev.startTime || ""} - ${ev.endTime || ""}</div>` : ""}
            ${ev.description ? `<div><strong>Description:</strong> ${ev.description}</div>` : ""}
            ${ev.contactName ? `<div><strong>Contact:</strong> ${ev.contactName}</div>` : ""}
            ${ev.contactInfo ? `<div><strong>Info:</strong> ${ev.contactInfo}</div>` : ""}
        `;

        header.onclick = (e) => {
            e.stopPropagation();
            if (openReminder && openReminder !== details) {
                openReminder.style.display = "none";
            }
            const isOpen = details.style.display === "block";
            details.style.display = isOpen ? "none" : "block";
            openReminder = details.style.display === "block" ? details : null;
        };

        wrapper.appendChild(header);
        wrapper.appendChild(details);
        reminderList.appendChild(wrapper);
    });
}

document.addEventListener("click", () => {
    if (openReminder) {
        openReminder.style.display = "none";
        openReminder = null;
    }
});

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
                eventDateInput.value = `${year}-${String(month + 1).padStart(2,"0")}-${String(capturedDate).padStart(2,"0")}`;
                toggleTitleDiv();
            };

            row.appendChild(cell);
            date++;
        }
        calendarBody.appendChild(row);
    }
}

function toggleTitleDiv() {
    const eventWrapper = document.getElementById("eventDetailsWrapper");
    if (!eventTypeInput.value) {
        eventWrapper.style.display = "none";
        return;
    }
    eventWrapper.style.display = "block";
}

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

(async () => {
    await loadEventsFromBackend(currentMonth, currentYear);
    showCalendar(currentMonth, currentYear);
    displayReminders();
})();
