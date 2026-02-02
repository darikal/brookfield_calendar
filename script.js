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

            const hour = getStartHour(ev.startTime);
            if (hour < 12) amDots.appendChild(dot);
            else pmDots.appendChild(dot);
          });

          if (amDots.children.length) cell.appendChild(amDots);
          if (pmDots.children.length) cell.appendChild(pmDots);
        }

        cell.addEventListener("click", () => openEventsForDate(dateStr));
        date++;
      }

      row.appendChild(cell);
    }

    calendarBody.appendChild(row);
  }
}

/* =========================
   TIME PARSER
========================= */
function getStartHour(time) {
  if (!time) return 12;
  return parseInt(time.split(":")[0], 10);
}

/* =========================
   CLICK → OPEN EVENTS
========================= */
function openEventsForDate(dateStr) {
  document.querySelectorAll(".reminder-item").forEach(item => {
    const details = item.querySelector(".reminder-details");

    if (item.dataset.date === dateStr) {
      item.classList.add("highlight");
      item.classList.remove("dimmed");
      details?.classList.add("show");
    } else {
      item.classList.remove("highlight");
      item.classList.add("dimmed");
      details?.classList.remove("show");
    }
  });

  document
    .getElementById("reminder-section")
    .scrollIntoView({ behavior: "smooth" });
}

/* =========================
   EVENT MATCHING
========================= */
function eventMatchesDate(event, dateStr) {
  if (event.date === dateStr) return true;
  if (!event.recurring) return false;

  const start = new Date(event.date);
  const target = new Date(dateStr);
  if (target < start) return false;

  const diffDays = Math.floor((target - start) / 86400000);

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

  [...events]
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .forEach(ev => {
      const li = document.createElement("li");
      li.className = `reminder-item event-${ev.eventTypeMajor || "default"}`;
      li.dataset.date = ev.date;

      li.innerHTML = `
        <div class="reminder-header">
          ${ev.eventTitle}
        </div>
        <div class="reminder-details">
          <small>${ev.date} • ${ev.startTime || ""}–${ev.endTime || ""}</small><br>
          ${ev.eventDescription || ""}
        </div>
      `;

      li.querySelector(".reminder-header").onclick = () => {
        li.querySelector(".reminder-details").classList.toggle("show");
      };

      reminderList.appendChild(li);
    });
}

/* =========================
   NAV
========================= */
document.getElementById("previous").onclick = () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar(currentMonth, currentYear);
};

document.getElementById("next").onclick = () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar(currentMonth, currentYear);
};

/* =========================
   INIT
========================= */
loadEvents();
