let events = [];

const reminderList = document.getElementById("reminderList");
const calendarBody = document.getElementById("calendar-body");
const monthAndYear = document.getElementById("monthAndYear");

let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

/* =========================
   FETCH EVENTS
========================= */
async function loadEvents() {
  try {
    const res = await fetch("/api/getEvents");
    events = await res.json();
    renderCalendar(currentMonth, currentYear);
    renderEventList();
  } catch (e) {
    console.error("Failed to load events", e);
  }
}

/* =========================
   RENDER CALENDAR
========================= */
function renderCalendar(month, year) {
  calendarBody.innerHTML = "";
  monthAndYear.textContent = `${months[month]} ${year}`;

  const firstDay = new Date(year, month).getDay();
  const daysInMonth = 32 - new Date(year, month, 32).getDate();

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
        const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(date).padStart(2,"0")}`;

        cell.classList.add("calendar-day");
        cell.dataset.date = dateStr;
        cell.innerHTML = `<span>${date}</span>`;

        const dayEvents = events.filter(e => eventMatchesDate(e, dateStr));

        if (dayEvents.length) {
          cell.classList.add("has-events");

          const amDots = document.createElement("div");
          amDots.className = "event-dots-am";

          const pmDots = document.createElement("div");
          pmDots.className = "event-dots-pm";

          dayEvents.forEach(ev => {
            const dot = document.createElement("span");
            dot.className = `event-dot event-${ev.eventTypeMajor || "default"}`;

            const hour = getEventStartHour(ev.startTime);

            if (hour < 12) {
              amDots.appendChild(dot);
            } else {
              pmDots.appendChild(dot);
            }
          });

          if (amDots.children.length) cell.appendChild(amDots);
          if (pmDots.children.length) cell.appendChild(pmDots);
        }

        cell.addEventListener("click", () => handleDateClick(dateStr));
        date++;
      }

      row.appendChild(cell);
    }

    calendarBody.appendChild(row);
  }
}

/* =========================
   TIME HELPERS
========================= */
function getEventStartHour(startTime) {
  if (!startTime) return 12; // default to PM bucket
  const parts = startTime.split(":");
  return parseInt(parts[0], 10);
}

/* =========================
   DATE CLICK HANDLER
========================= */
function handleDateClick(dateStr) {
  const items = document.querySelectorAll(".reminder-item");

  items.forEach(item => {
    if (item.dataset.date === dateStr) {
      item.classList.add("highlight");
      item.classList.remove("dimmed");
    } else {
      item.classList.remove("highlight");
      item.classList.add("dimmed");
    }
  });

  document
    .getElementById("reminder-section")
    .scrollIntoView({ behavior: "smooth" });
}

/* =========================
   EVENT DATE MATCHING
========================= */
function eventMatchesDate(event, dateStr) {
  if (event.date === dateStr) return true;
  if (!event.recurring) return false;

  const start = new Date(event.date);
  const target = new Date(dateStr);
  if (target < start) return false;

  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));

  if (event.recurWhen === "week") return diffDays % 7 === 0;
  if (event.recurWhen === "biWeek") return diffDays % 14 === 0;
  if (event.recurWhen === "month") return start.getDate() === target.getDate();

  return false;
}

/* =========================
   EVENT LIST
========================= */
function renderEventList() {
  reminderList.innerHTML = "";

  const sorted = [...events].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  sorted.forEach(ev => {
    const li = document.createElement("li");
    li.className = `reminder-item event-${ev.eventTypeMajor || "default"}`;
    li.dataset.date = ev.date;

    li.innerHTML = `
      <strong>${ev.eventTitle}</strong><br>
      <small>${ev.date} • ${ev.startTime || ""}–${ev.endTime || ""}</small><br>
      ${ev.eventDescription || ""}
    `;

    reminderList.appendChild(li);
  });
}

/* =========================
   NAV CONTROLS
========================= */
document.getElementById("previous").onclick = () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  clearHighlights();
  renderCalendar(currentMonth, currentYear);
};

document.getElementById("next").onclick = () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  clearHighlights();
  renderCalendar(currentMonth, currentYear);
};

function clearHighlights() {
  document.querySelectorAll(".reminder-item").forEach(i => {
    i.classList.remove("highlight","dimmed");
  });
}

/* =========================
   INIT
========================= */
loadEvents();
