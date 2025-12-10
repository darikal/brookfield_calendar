let events = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

document.addEventListener("DOMContentLoaded", () => {
    generateYearOptions();
    showCalendar(currentMonth, currentYear);
    loadEventsFromBackend();
});

// ---------------------- BACKEND LOAD ----------------------

async function loadEventsFromBackend() {
    try {
        const response = await fetch("/api/getEvents");
        if (!response.ok) throw new Error("Failed to fetch events");

        events = await response.json();
        showCalendar(currentMonth, currentYear);

    } catch (err) {
        console.error("Backend fetch error:", err.message);
    }
}

// ---------------------- CLICK DATE FILL ----------------------

function selectDate(day) {
    const month = String(currentMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const fullDate = `${currentYear}-${month}-${dayStr}`;

    document.getElementById("eventDate").value = fullDate;
}

// ---------------------- CALENDAR RENDER ----------------------

function showCalendar(month, year) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = 32 - new Date(year, month, 32).getDate();

    const tbl = document.getElementById("calendar-body");
    tbl.innerHTML = "";
    document.getElementById("monthAndYear").innerHTML =
        `${new Date(year, month).toLocaleString("en", { month: "long" })} ${year}`;

    let date = 1;

    for (let i = 0; i < 6; i++) {
        const row = document.createElement("tr");

        for (let j = 0; j < 7; j++) {
            const cell = document.createElement("td");

            if (i === 0 && j < firstDay) {
                cell.innerHTML = "";
            } else if (date > daysInMonth) {
                break;
            } else {
                cell.innerHTML = date;
                cell.onclick = () => selectDate(date);

                const cellDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
                const eventOnDay = events.filter(e => e.date === cellDate);

                if (eventOnDay.length > 0) {
                    cell.classList.add("event-day");
                }

                date++;
            }

            row.appendChild(cell);
        }
        tbl.appendChild(row);
    }
}

// ---------------------- NAVIGATION ----------------------

function previous() {
    currentYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    currentMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    showCalendar(currentMonth, currentYear);
}

function next() {
    currentYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    currentMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    showCalendar(currentMonth, currentYear);
}

function jump() {
    currentYear = parseInt(document.getElementById("year").value);
    currentMonth = parseInt(document.getElementById("month").value);
    showCalendar(currentMonth, currentYear);
}

// ---------------------- EVENT SUBMIT ----------------------

async function addEvent() {
    const eventData = {
        date: document.getElementById("eventDate").value,
        startTime: document.getElementById("startTime").value,
        endTime: document.getElementById("endTime").value,
        eventTitle: document.getElementById("eventTitle").value,
        eventDescription: document.getElementById("eventDescription").value,
        groupSize: document.getElementById("groupSize").value
    };

    try {
        const response = await fetch("/api/addEvent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(eventData)
        });

        const result = await response.json();
        console.log("Backend result:", result);

        loadEventsFromBackend();

    } catch (err) {
        console.error("Backend error:", err);
    }
}

// ---------------------- MISC ----------------------

function generateYearOptions() {
    const yearSelect = document.getElementById("year");
    const current = new Date().getFullYear();

    for (let y = current - 2; y <= current + 5; y++) {
        const option = document.createElement("option");
        option.value = y;
        option.textContent = y;
        if (y === current) option.selected = true;
        yearSelect.appendChild(option);
    }
}
