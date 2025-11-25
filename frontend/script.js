// FULL UPDATED events.js with weekly, bi-weekly, and monthly recurring logic

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
const form = document.getElementById("eventForm");
const eventDateInput = document.getElementById("eventDate");
const eventTitleInput = document.getElementById("eventTitle");
const eventDescriptionInput = document.getElementById("eventDescription");
const eventStartInput = document.getElementById("eventStart");
const eventEndInput = document.getElementById("eventEnd");
const eventCategoryInput = document.getElementById("eventCategory");

const isRecurringCheckbox = document.getElementById("isRecurring");
const recurringOptions = document.getElementById("recurringOptions");
const recurringTypeSelect = document.getElementById("recurringType");
const recurringLengthNum = document.getElementById("recurLengthNum");

// Show/hide recurring options
isRecurringCheckbox.addEventListener("change", () => {
    recurringOptions.style.display = isRecurringCheckbox.checked ? "block" : "none";
});

// Add event
form.addEventListener("submit", (e) => {
    e.preventDefault();

    const baseDate = new Date(eventDateInput.value);
    const repeatCount = parseInt(recurringLengthNum.value, 10);
    const recurringType = recurringTypeSelect.value; // weekly, biweekly, monthly

    let allDates = [baseDate];

    if (isRecurringCheckbox.checked && repeatCount > 0) {
        for (let i = 1; i <= repeatCount; i++) {
            let nextDate = new Date(baseDate);

            if (recurringType === "weekly") {
                nextDate.setDate(baseDate.getDate() + 7 * i);
            } else if (recurringType === "biweekly") {
                nextDate.setDate(baseDate.getDate() + 14 * i);
            } else if (recurringType === "monthly") {
                nextDate.setMonth(baseDate.getMonth() + i);
            }

            allDates.push(nextDate);
        }
    }

    allDates.forEach(dateObj => {
        events.push({
            date: dateObj.toISOString().split("T")[0],
            title: eventTitleInput.value,
            description: eventDescriptionInput.value,
            startTime: eventStartInput.value,
            endTime: eventEndInput.value,
            category: eventCategoryInput.value,
            recurring: isRecurringCheckbox.checked,
            recurringType: isRecurringCheckbox.checked ? recurringType : null,
            recurringCount: isRecurringCheckbox.checked ? repeatCount : 0,
        });
    });

    saveEvents();
    renderCalendar(currentMonth, currentYear);
    renderEventList();

    form.reset();
    recurringOptions.style.display = "none";
});

// RENDERING FUNCTIONS REMAIN THE SAME

function renderCalendar(month, year) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const calendarGrid = document.getElementById("calendarGrid");
    calendarGrid.innerHTML = "";

    const startDayIndex = firstDay.getDay();

    for (let i = 0; i < startDayIndex; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.classList.add("day", "empty");
        calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const cell = document.createElement("div");
        cell.classList.add("day");

        const fullDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        cell.dataset.date = fullDate;

        cell.innerHTML = `<span class="day-number">${day}</span>`;

        const todaysEvents = events.filter(ev => ev.date === fullDate);

        todaysEvents.forEach(ev => {
            const dot = document.createElement("div");
            dot.classList.add("event-dot", ev.category);
            cell.appendChild(dot);
        });

        cell.addEventListener("click", () => {
            eventDateInput.value = fullDate;
        });

        calendarGrid.appendChild(cell);
    }
}

function renderEventList() {
    const list = document.getElementById("eventList");
    list.innerHTML = "";

    events.forEach((ev, idx) => {
        const item = document.createElement("div");
        item.classList.add("event-item");
        item.innerHTML = `
            <strong>${ev.title}</strong><br>
            ${ev.date} (${ev.startTime} - ${ev.endTime})<br>
            ${ev.description}
        `;
        list.appendChild(item);
    });
}

// INITIAL RENDER
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
renderCalendar(currentMonth, currentYear);
renderEventList();
