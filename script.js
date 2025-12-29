// ------------------------------
// Backend Functions
// ------------------------------
async function sendEventToBackend(eventData) {
    const response = await fetch("/api/addEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
}

async function loadEventsFromBackend() {
    const response = await fetch("/api/getEvents");
    if (!response.ok) throw new Error("Fetch failed");

    const data = await response.json();

    // 🔑 Normalize MongoDB _id → id
    events = data.map(ev => ({
        ...ev,
        id: ev._id || ev.id
    }));
}

// ------------------------------
// Local Event Storage
// ------------------------------
let events = [];

// ------------------------------
// Helper Functions
// ------------------------------
function parseDateFromInput(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function getReadableEventType(eType) {
    return {
        socialCommitteeEvent: "Social Committee",
        smallGroup: "Small Group",
        reservedPaid: "Paid Reservation",
        noSocialnoPaid: "Large Group"
    }[eType] || "Event";
}

function getEventColorClass(eType) {
    return {
        socialCommitteeEvent: "event-social",
        smallGroup: "event-small",
        reservedPaid: "event-paid",
        noSocialnoPaid: "event-large"
    }[eType] || "event-default";
}

function getEventsOnDate(date, month, year) {
    return events.filter(ev => {
        const d = parseDateFromInput(ev.date);
        return d.getDate() === date &&
               d.getMonth() === month &&
               d.getFullYear() === year;
    });
}

// ------------------------------
// Display Events & Reservations
// ------------------------------
function displayReminders() {
    reminderList.innerHTML = "";

    events.forEach(event => {
        const d = parseDateFromInput(event.date);
        if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return;

        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${getReadableEventType(event.eType)}</strong>
            (${event.startTime || "??"}–${event.endTime || "??"}):
            ${event.title}
        `;

        li.onclick = () => showEventDetails(event);
        reminderList.appendChild(li);
    });
}

// ------------------------------
// Event Detail Viewer
// ------------------------------
function showEventDetails(ev) {
    alert(`
${ev.title}
--------------------
Type: ${getReadableEventType(ev.eType)}
Date: ${ev.date}
Time: ${ev.startTime || "N/A"} – ${ev.endTime || "N/A"}
Group Size: ${ev.groupSize || "N/A"}
Contact: ${ev.contactName || "N/A"} (${ev.contactInfo || "N/A"})
Walk-ins: ${ev.walkIn}
Notes: ${ev.description || ""}
    `);
}

// ------------------------------
// Calendar Rendering (UNCHANGED)
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

            cell.innerHTML = `<span>${date}</span>`;
            const todaysEvents = getEventsOnDate(date, month, year);

            if (todaysEvents.length) {
                cell.classList.add('event-marker');
                const dots = document.createElement('div');
                dots.className = 'event-dots';
                todaysEvents.forEach(ev => {
                    const dot = document.createElement('span');
                    dot.className = 'event-dot ' + getEventColorClass(ev.eType);
                    dots.appendChild(dot);
                });
                cell.appendChild(dots);
            }

            row.appendChild(cell);
            date++;
        }
        calendarBody.appendChild(row);
    }
}

// ------------------------------
// Add Event Button
// ------------------------------
addEventButton.onclick = async () => {
    const date = eventDateInput.value;
    const title = eventTitleInput.value;
    const eType = eventTypeInput.value;

    if (!date || !title || !eType) {
        alert("Date, Title, and Event Type required");
        return;
    }

    const newEvent = {
        date,
        title,
        description: eventDescriptionInput.value,
        eType,
        startTime: startTimeInput.value,
        endTime: endTimeInput.value,
        groupSize: document.getElementById("groupSize").value,
        contactName: document.getElementById("contactName").value,
        contactInfo: document.getElementById("contactInfo").value,
        walkIn: walkInSelect.value
    };

    await sendEventToBackend(newEvent);
    await loadEventsFromBackend();

    showCalendar(currentMonth, currentYear);
    displayReminders();
};

// ------------------------------
// INITIAL LOAD
// ------------------------------
(async () => {
    await loadEventsFromBackend();
    showCalendar(currentMonth, currentYear);
    displayReminders();
})();
