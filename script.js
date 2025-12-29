let events = [];

let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

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

const calendarBody = document.getElementById("calendar-body");
const monthAndYear = document.getElementById("monthAndYear");
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function parseDate(value) {
    const [y,m,d] = value.split("-").map(Number);
    return new Date(y,m-1,d);
}

function daysInMonth(month, year) {
    return 32 - new Date(year, month, 32).getDate();
}

function getReadableEventType(t) {
    return {
        socialCommitteeEvent: "Social Committee",
        smallGroup: "Small Group",
        reservedPaid: "Paid Reservation",
        noSocialnoPaid: "Large Group"
    }[t] || "Event";
}

function getEventColorClass(t) {
    return {
        socialCommitteeEvent: "event-social",
        smallGroup: "event-small",
        reservedPaid: "event-paid",
        noSocialnoPaid: "event-large"
    }[t] || "event-default";
}

function getEventsOnDate(date, month, year) {
    return events.filter(e => {
        const d = parseDate(e.date);
        return d.getDate() === date && d.getMonth() === month && d.getFullYear() === year;
    });
}

async function loadEventsFromBackend() {
    const res = await fetch("/api/getEvents");
    events = await res.json();
}

async function sendEventToBackend(eventData) {
    await fetch("/api/addEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData)
    });
}

function showEventDetails(ev) {
    const panel = document.getElementById("event-details");
    panel.innerHTML = `
        <h3>${ev.title}</h3>
        <p><strong>Date:</strong> ${new Date(ev.date).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${ev.startTime || "N/A"} - ${ev.endTime || "N/A"}</p>
        <p><strong>Type:</strong> ${getReadableEventType(ev.eType)}</p>
        <p><strong>People:</strong> ${ev.groupSize || "N/A"}</p>
        <p><strong>Description:</strong><br>${ev.description || ""}</p>
        <p><strong>Contact:</strong> ${ev.contactName || ""} ${ev.contactInfo || ""}</p>
    `;
    panel.style.display = "block";
}

function displayReminders() {
    reminderList.innerHTML = "";
    events.filter(e => {
        const d = parseDate(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).forEach(ev => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${ev.title}</strong> ${ev.startTime || ""}`;
        li.onclick = () => showEventDetails(ev);
        reminderList.appendChild(li);
    });
}

function showCalendar(month, year) {
    calendarBody.innerHTML = "";
    monthAndYear.textContent = `${months[month]} ${year}`;
    let firstDay = new Date(year, month, 1).getDay();
    let date = 1;

    for (let i=0;i<6;i++) {
        const row = document.createElement("tr");
        for (let j=0;j<7;j++) {
            const cell = document.createElement("td");
            if (i===0 && j<firstDay) { row.appendChild(cell); continue; }
            if (date>daysInMonth(month,year)) break;

            cell.innerHTML = `<span>${date}</span>`;
            const todaysEvents = getEventsOnDate(date,month,year);

            todaysEvents.forEach(ev => {
                const dot = document.createElement("div");
                dot.className = "calendar-event "+getEventColorClass(ev.eType);
                dot.textContent = ev.title;
                dot.onclick = e => { e.stopPropagation(); showEventDetails(ev); };
                cell.appendChild(dot);
            });

            const clickedDate = `${year}-${String(month+1).padStart(2,"0")}-${String(date).padStart(2,"0")}`;
            cell.onclick = () => { eventDateInput.value = clickedDate; };

            row.appendChild(cell);
            date++;
        }
        calendarBody.appendChild(row);
    }
}

addEventButton.onclick = async () => {
    const date = eventDateInput.value;
    if (!date || !eventTitleInput.value || !eventTypeInput.value) return;

    const base = parseDate(date);
    let dates = [base];

    if (recurCheckbox.checked && recurLengthNum.value) {
        for (let i=1;i<=recurLengthNum.value;i++) {
            const d = new Date(base);
            if (recurWhen.value==="week") d.setDate(base.getDate()+7*i);
            if (recurWhen.value==="biWeek") d.setDate(base.getDate()+14*i);
            if (recurWhen.value==="month") d.setMonth(base.getMonth()+i);
            dates.push(d);
        }
    }

    for (const d of dates) {
        const ev = {
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
        };
        await sendEventToBackend(ev);
    }

    await loadEventsFromBackend();
    showCalendar(currentMonth,currentYear);
    displayReminders();
};

(async () => {
    await loadEventsFromBackend();
    showCalendar(currentMonth,currentYear);
    displayReminders();
})();
