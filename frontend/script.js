// script.js

// Define an array to store events
let events = [];

// Variables to store event input fields and reminder list
let eventDateInput = document.getElementById("eventDate");
let eventTitleInput = document.getElementById("eventTitle");
let eventDescriptionInput = document.getElementById("eventDescription");
let eventTypeInput = document.getElementById("eventType");
let walkInSelect = document.getElementById("walkInWelcome");
let startTimeInput = document.getElementById("startTime");
let endTimeInput = document.getElementById("endTime");
let reminderList = document.getElementById("reminderList");

// Counter to generate unique event IDs
let eventIdCounter = 1;

// ------------------------------
// Helper: parse input date string correctly (fix off-by-one)
// ------------------------------
function parseDateFromInput(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d); // month is 0-based
}

// ------------------------------
// Convert event type codes to human-readable labels
// ------------------------------
function getReadableEventType(eType) {
    switch (eType) {
        case "socialCommitteeEvent":
            return "Social Committee";
        case "smallGroup":
            return "Small Group";
        case "reservedPaid":
            return "Paid Reservation";
        case "noSocialnoPaid":
            return "Large Group";
        default:
            return "Event";
    }
}

// ------------------------------
// Add event
// ------------------------------
function addEvent() {
    const dropdown = document.getElementById("eventTypeMajor");
    let date = eventDateInput.value;
    let title = eventTitleInput.value;
    let description = eventDescriptionInput.value;
    let eType = dropdown.value;
    let startTime = startTimeInput.value;
    let endTime = endTimeInput.value;

    if (dropdown.value === "reservedPaid") {
        const acceptTerms = document.getElementById('acceptTerms');
        if (!acceptTerms.checked) {
            alert("You must accept the Terms and Conditions for paid reservations.");
            return;
        }
    }

    if (date && title) {
        let eventId = eventIdCounter++;

        events.push({
            id: eventId,
            date: date,
            title: title,
            description: description,
            eType: eType,
            startTime: startTime,
            endTime: endTime
        });

        showCalendar(currentMonth, currentYear);

        // Clear inputs
        eventDateInput.value = "";
        eventTitleInput.value = "";
        eventDescriptionInput.value = "";
        startTimeInput.value = "";
        endTimeInput.value = "";
        walkInSelect.value = "";
        toggleDiv();
        toggleTitleDiv();

        displayReminders();
    }
}

// ------------------------------
// Delete event
// ------------------------------
function deleteEvent(eventId) {
    let eventIndex = events.findIndex((event) => event.id === eventId);
    if (eventIndex !== -1) {
        events.splice(eventIndex, 1);
        showCalendar(currentMonth, currentYear);
        displayReminders();
    }
}

// ------------------------------
// Toggle recurring div
// ------------------------------
function toggleRecurDiv() {
    const recurDiv = document.getElementById('recurring');
    const recurBox = document.getElementById('recurCheckbox');
    if (!recurDiv || !recurBox) return;
    recurDiv.style.display = (recurBox.checked === true) ? 'block' : 'none';
}

// ------------------------------
// Toggle event details wrapper based on event type
// ------------------------------
function toggleTitleDiv() {
    const dropdown = document.getElementById('eventTypeMajor');
    const eventWrapper = document.getElementById('eventDetailsWrapper');

    if (!dropdown.value) {
        eventWrapper.style.display = "none";
        return;
    } else {
        eventWrapper.style.display = "block";
    }

    // Always show recurring checkbox (NOT the recurring options)
    document.getElementById('recurBox').style.display = 'block';

    if (dropdown.value === "reservedPaid") {
        document.getElementById('paidInfo').style.display = 'block';
        document.getElementById('recurBox').style.display = 'none'; // hide for paid
    } else {
        document.getElementById('paidInfo').style.display = 'none';
    }
}

// ------------------------------
// Toggle walk-in / other fields
// ------------------------------
function toggleDiv() {
    const walkInSelect = document.getElementById("walkInWelcome");
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

// ------------------------------
// Display reminders
// ------------------------------
function displayReminders() {
    reminderList.innerHTML = "";
    for (let i = 0; i < events.length; i++) {
        let event = events[i];
        let eventDate = parseDateFromInput(event.date);

        if (eventDate.getMonth() === currentMonth &&
            eventDate.getFullYear() === currentYear) {

            let timeText = "";
            if (event.startTime || event.endTime) {
                timeText = ` (${event.startTime || '??:??'} - ${event.endTime || '??:??'})`;
            }

            let listItem = document.createElement("li");
            listItem.innerHTML = `<strong>${getReadableEventType(event.eType)}</strong>${timeText}: ${event.description}`;

            let deleteButton = document.createElement("button");
            deleteButton.className = "delete-event";
            deleteButton.textContent = "Delete";
            deleteButton.onclick = function () {
                deleteEvent(event.id);
            };

            listItem.appendChild(deleteButton);
            reminderList.appendChild(listItem);
        }
    }
}

// ------------------------------
// Get events on a specific date
// ------------------------------
function getEventsOnDate(date, month, year) {
    return events.filter(event => {
        const eventDate = parseDateFromInput(event.date);
        return eventDate.getDate() === date &&
               eventDate.getMonth() === month &&
               eventDate.getFullYear() === year;
    });
}

// ------------------------------
// Check if date has events
// ------------------------------
function hasEventOnDate(date, month, year) {
    return getEventsOnDate(date, month, year).length > 0;
}

// ------------------------------
// Days in month
// ------------------------------
function daysInMonth(iMonth, iYear) {
    return 32 - new Date(iYear, iMonth, 32).getDate();
}

// ------------------------------
// Event color classes
// ------------------------------
function getEventColorClass(eType) {
    switch (eType) {
        case "socialCommitteeEvent":
            return "event-social";
        case "smallGroup":
            return "event-small";
        case "reservedPaid":
            return "event-paid";
        case "noSocialnoPaid":
            return "event-large";
        default:
            return "event-default";
    }
}

// ------------------------------
// Generate year options
// ------------------------------
function generate_year_range(start, end) {
    let years = "";
    for (let year = start; year <= end; year++) {
        years += "<option value='" + year + "'>" + year + "</option>";
    }
    return years;
}

// ------------------------------
// Initialize date variables
// ------------------------------
today = new Date();
currentMonth = today.getMonth();
currentYear = today.getFullYear();
selectYear = document.getElementById("year");
selectMonth = document.getElementById("month");
document.getElementById("year").innerHTML = generate_year_range(2020, 2075);

let calendar = document.getElementById("calendar");
let months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
let days = ["Sun", "Mon", "Tue", "Wed","Thu", "Fri", "Sat"];
$dataHead = "<tr>";
for (dhead in days) {
    $dataHead += "<th data-days='" + days[dhead] + "'>" + days[dhead] + "</th>";
}
$dataHead += "</tr>";
document.getElementById("thead-month").innerHTML = $dataHead;
monthAndYear = document.getElementById("monthAndYear");

// ------------------------------
// Calendar navigation
// ------------------------------
function next() {
    currentYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    currentMonth = (currentMonth + 1) % 12;
    showCalendar(currentMonth, currentYear);
}
function previous() {
    currentYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    currentMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    showCalendar(currentMonth, currentYear);
}
function jump() {
    currentYear = parseInt(selectYear.value);
    currentMonth = parseInt(selectMonth.value);
    showCalendar(currentMonth, currentYear);
}

// ------------------------------
// Show calendar
// ------------------------------
function showCalendar(month, year) {
    const firstDay = new Date(year, month, 1).getDay();
    const tbl = document.getElementById("calendar-body");
    tbl.innerHTML = "";
    monthAndYear.innerHTML = [
        "January","February","March","April","May","June","July","August","September","October","November","December"
    ][month] + " " + year;
    selectYear.value = year;
    selectMonth.value = month;
    
    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement("tr");
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement("td");
            if (i === 0 && j < firstDay) { 
                row.appendChild(cell); 
                continue; 
            }
            if (date > daysInMonth(month, year)) break;

            cell.className = "date-picker";
            cell.innerHTML = `<span>${date}</span>`;

            // Highlight today's date
            if (date === today.getDate() && year === today.getFullYear() && month === today.getMonth()) {
                cell.classList.add("selected");
            }

            // Add event markers
            const eventsOnDate = getEventsOnDate(date, month, year);
            if (eventsOnDate.length) {
                cell.classList.add("event-marker");
                const dots = document.createElement("div");
                dots.className = "event-dots";
                eventsOnDate.forEach(ev => {
                    const dot = document.createElement("span");
                    dot.className = "event-dot " + getEventColorClass(ev.eType);
                    dot.title = getReadableEventType(ev.eType);
                    dots.appendChild(dot);
                });
                cell.appendChild(dots);

                // Tooltip creation
                const tooltip = document.createElement("div");
                tooltip.className = "event-tooltip";
                tooltip.innerHTML = eventsOnDate.map(ev => 
                    `<strong>${getReadableEventType(ev.eType)}</strong><br>${ev.title || ev.description}<br>${ev.startTime || ''}-${ev.endTime || ''}`
                ).join("<hr style='margin:3px 0;'>");
                cell.appendChild(tooltip);
            }

            // Click on date to fill event input
            ((d) => {
                cell.onclick = () => {
                    eventDateInput.value = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    document.querySelectorAll(".date-picker").forEach(td => td.classList.remove("selected"));
                    cell.classList.add("selected");
                    if (!document.getElementById('eventTypeMajor').value) document.getElementById('eventTypeMajor').value = "reservedPaid";
                    toggleTitleDiv();
                };
            })(date);

            row.appendChild(cell);
            date++;
        }
        tbl.appendChild(row);
    }
    displayReminders();
}


// ------------------------------
// Event tooltip (hover shows full details)
// ------------------------------
function createEventTooltip(date, month, year) {
    let tooltip = document.createElement("div");
    tooltip.className = "event-tooltip";

    let eventsOnDate = getEventsOnDate(date, month, year);
    eventsOnDate.forEach(event => {
        let timeText = "";
        if (event.startTime || event.endTime) {
            timeText = ` (${event.startTime || '??:??'} - ${event.endTime || '??:??'})`;
        }
        let eventText = `<strong>${getReadableEventType(event.eType)}</strong>${timeText}: ${event.description}`;
        let eventElement = document.createElement("p");
        eventElement.innerHTML = eventText;
        tooltip.appendChild(eventElement);
    });

    return tooltip;
}

// ------------------------------
// On page load
// ------------------------------
window.onload = () => {
    // Reset form controls to a known state
    const walkIn = document.getElementById("walkInWelcome");
    const eventTypeMajor = document.getElementById("eventTypeMajor");
    const eventDetailsWrapper = document.getElementById('eventDetailsWrapper');
    const recurBox = document.getElementById('recurCheckbox');
    const recurDiv = document.getElementById('recurring');

    if (walkIn) walkIn.value = "";
    if (eventTypeMajor) eventTypeMajor.value = "";
    if (eventDetailsWrapper) eventDetailsWrapper.style.display = 'none';
    if (document.getElementById("groupSize")) document.getElementById("groupSize").value = "";
    if (recurBox) recurBox.checked = false;
    if (recurDiv) recurDiv.style.display = 'none';

    startTimeInput.value = "";
    endTimeInput.value = "";

    // Attach listener (prevents conflicts with inline onchange attributes)
    if (recurBox) {
        // remove any existing handler to be safe
        recurBox.removeEventListener('change', toggleRecurDiv);
        recurBox.addEventListener('change', (e) => {
            // Prevent parents accidentally toggling things if they listen for clicks
            e.stopPropagation();
            toggleRecurDiv();
        });
    }

    // Ensure walkIn/select and type toggles are in correct state
    toggleDiv();
    toggleTitleDiv();
    showCalendar(currentMonth, currentYear);
};