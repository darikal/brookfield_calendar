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

async function loadEventsFromBackend() {
    try {
        const response = await fetch("/api/getEvents");
        if (!response.ok) {
            console.error(await response.text());
            return;
        }
        const data = await response.json();
        events = data.map(ev => ({
            ...ev,
            id: ev._id || ev.id
        }));
    } catch (err) {
        console.error(err);
    }
}

let events = [];

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

function parseDateFromInput(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function getReadableEventType(eType) {
    if (eType === "socialCommitteeEvent") return "Social Committee";
    if (eType === "smallGroup") return "Small Group";
    if (eType === "reservedPaid") return "Paid Reservation";
    if (eType === "noSocialnoPaid") return "Large Group";
    return "Event";
}

function getEventColorClass(eType) {
    if (eType === "socialCommitteeEvent") return "event-social";
    if (eType === "smallGroup") return "event-small";
    if (eType === "reservedPaid") return "event-paid";
    if (eType === "noSocialnoPaid") return "event-large";
    return "event-default";
}

function daysInMonth(month, year) {
    return 32 - new Date(year, month, 32).getDate();
}

function generateRecurringDates(baseDate, type, count) {
    let dates = [];
    for (let i = 1; i <= count; i++) {
        let d = new Date(baseDate);
        if (type === "week") d.setDate(baseDate.getDate() + 7 * i);
        if (type === "biWeek") d.setDate(baseDate.getDate() + 14 * i);
        if (type === "month") d.setMonth(baseDate.getMonth() + i);
        dates.push(d);
    }
    return dates;
}

function getEventsOnDate(date, month, year) {
    return events.filter(ev => {
        const d = parseDateFromInput(ev.date);
        return d.getDate() === date && d.getMonth() === month && d.getFullYear() === year;
    });
}

function displayReminders() {
    reminderList.innerHTML = "";
    events.forEach(ev => {
        const d = parseDateFromInput(ev.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            const li = document.createElement("li");
            let timeText = ev.startTime || ev.endTime ? ` (${ev.startTime || ""} - ${ev.endTime || ""})` : "";
            li.innerHTML = `<strong>${getReadableEventType(ev.eType)}</strong>${timeText}: ${ev.title}`;
            reminderList.appendChild(li);
        }
    });
}

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

    if (eventTypeInput.value === "reservedPaid") {
        document.getElementById("paidInfo").style.display = "block";
        document.getElementById("recurBox").style.display = "none";
    } else {
        document.getElementById("paidInfo").style.display = "none";
        document.getElementById("recurBox").style.display = "block";
    }
}

function toggleDiv() {
    const otherDiv = document.getElementById("eventOther");
    const signUpDiv = document.getElementById("signUpField");
    if (walkInSelect.value === "Other") {
        otherDiv.style.display = "block";
        signUpDiv.style.display = "none";
    } else if (walkInSelect.value === "signUpRequired") {
        signUpDiv.style.display = "block";
        otherDiv.style.display = "none";
    } else {
        otherDiv.style.display = "none";
        signUpDiv.style.display = "none";
    }
}

recurCheckbox.addEventListener("change", () => {
    document.getElementById("recurring").style.display = recurCheckbox.checked ? "block" : "none";
});

addEventButton.onclick = async () => {
    const date = eventDateInput.value;
    if (!date || !eventTitleInput.value || !eventTypeInput.value) return;

    let baseDate = parseDateFromInput(date);
    let dates = [baseDate];

    if (recurCheckbox.checked && recurLengthNum.value) {
        dates = dates.concat(generateRecurringDates(baseDate, recurWhen.value, parseInt(recurLengthNum.value)));
    }

    for (const d of dates) {
        await sendEventToBackend({
            date: d.toISOString().split("T")[0],
            title: eventTitleInput.value,
            description: eventDescriptionInput.value,
            eType: eventTypeInput.value,
            startTime: startTimeInput.value,
            endTime: endTimeInput.value,
            groupSize: document.getElementById("groupSize").value,
            contactName: document.getElementById("contactName").value,
            contactInfo: document.getElementById("contactInfo").value,
            walkIn: walkInSelect.value
        });
    }

    await loadEventsFromBackend();
    showCalendar(currentMonth, currentYear);
    displayReminders();
};

(async () => {
    await loadEventsFromBackend();
    showCalendar(currentMonth, currentYear);
    displayReminders();
})();
