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

// Helper: parse input date string correctly (fix off-by-one)
function parseDateFromInput(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d); // month is 0-based
}

// Add event
function addEvent() {
	const dropdown = document.getElementById("eventTypeMajor");
    let date = eventDateInput.value;
    let title = eventTitleInput.value;
    let description = eventDescriptionInput.value;
    let eType = document.getElementById("eventTypeMajor").value;
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

// Delete event
function deleteEvent(eventId) {
    let eventIndex = events.findIndex((event) => event.id === eventId);
    if (eventIndex !== -1) {
        events.splice(eventIndex, 1);
        showCalendar(currentMonth, currentYear);
        displayReminders();
    }
}

// Toggle recurring div
function toggleRecurDiv() {
	const recurDiv = document.getElementById('recurring');
	const recurBox = document.getElementById('recurCheckbox');
	recurDiv.style.display = recurBox.checked ? 'block' : 'none';
}

// Toggle event details
function toggleTitleDiv() {
    const dropdown = document.getElementById('eventTypeMajor');
    const titleDiv = document.getElementById('titleDiv');
    const walkInSelect = document.getElementById('walkInWelcome');
    const signUpOption = document.getElementById('signUpRequired');
    const eventWrapper = document.getElementById('eventDetailsWrapper');
    const recurWhenSelect = document.getElementById('recurWhen');
    const recurLenSelect = document.getElementById('recurLength');

    if (!dropdown.value) {
        eventWrapper.style.display = "none";
        return;
    } else {
        eventWrapper.style.display = "block";
    }

    if (dropdown.value === "reservedPaid") {
        titleDiv.style.display = "none";
        walkInSelect.style.display = "none";
        document.getElementById('eventTitle').value = "";
        document.getElementById('eventOther').style.display = "none";
        document.getElementById('signUpField').style.display = "none";
        walkInSelect.value = "";
        document.getElementById('eventType').value = "";
        document.getElementById('paidInfo').style.display = 'block';
        document.getElementById('contactDiv').style.display = 'none';
        document.getElementById('recurBox').style.display = 'none';
        document.getElementById('acceptTerms').checked = false;

        const recurBox = document.getElementById('recurCheckbox');
        const recurDiv = document.getElementById('recurring');
        recurBox.checked = false;
        recurDiv.style.display = 'none';

    } else {
        titleDiv.style.display = "block";
        walkInSelect.style.display = "block";
        document.getElementById('paidInfo').style.display = 'none';
        document.getElementById('contactDiv').style.display = 'block';
        document.getElementById('recurBox').style.display = 'block';

        if (dropdown.value === "socialCommitteeEvent") {
            signUpOption.hidden = false;
            ['week', 'biWeek'].forEach(val => {
                const opt = recurWhenSelect.querySelector(`option[value="${val}"]`);
                if (opt) opt.hidden = true;
            });
            let yearlyOption = recurWhenSelect.querySelector('option[value="yearly"]');
            if (!yearlyOption) {
                yearlyOption = document.createElement('option');
                yearlyOption.value = 'yearly';
                yearlyOption.textContent = 'Yearly';
                recurWhenSelect.appendChild(yearlyOption);
            }
            recurWhenSelect.value = 'yearly';

            ['week', 'biWeek'].forEach(val => {
                const opt = recurLenSelect.querySelector(`option[value="${val}"]`);
                if (opt) opt.hidden = true;
            });

            let yearOption = recurLenSelect.querySelector('option[value="year"]');
            if (!yearOption) {
                yearOption = document.createElement('option');
                yearOption.value = 'year';
                yearOption.textContent = 'Years';
                recurLenSelect.appendChild(yearOption);
            }
            recurLenSelect.value = 'year';

        } else {
            signUpOption.hidden = true;
            ['week', 'biWeek'].forEach(val => {
                let opt = recurWhenSelect.querySelector(`option[value="${val}"]`);
                if (!opt) {
                    opt = document.createElement('option');
                    opt.value = val;
                    opt.textContent = val === 'week' ? 'Weekly' : 'Bi-Weekly';
                    recurWhenSelect.appendChild(opt);
                }
                opt.hidden = false;
            });
            const yearlyOption = recurWhenSelect.querySelector('option[value="yearly"]');
            if (yearlyOption) yearlyOption.hidden = true;

            ['week', 'biWeek'].forEach(val => {
                let opt = recurLenSelect.querySelector(`option[value="${val}"]`);
                if (opt) opt.hidden = false;
            });
            const yearOption = recurLenSelect.querySelector('option[value="year"]');
            if (yearOption) yearOption.hidden = true;

            recurWhenSelect.value = 'week';
            recurLenSelect.value = 'week';

            if (walkInSelect.value === "signUpRequired") {
                walkInSelect.value = "";
                document.getElementById('signUpField').style.display = "none";
            }
        }
        toggleDiv();
    }
}

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

// Display reminders
function displayReminders() {
    reminderList.innerHTML = "";
    for (let i = 0; i < events.length; i++) {
        let event = events[i];
        let eventDate = parseDateFromInput(event.date);

        if (eventDate.getMonth() === currentMonth &&
            eventDate.getFullYear() === currentYear) {

            let timeText = "";
            if (event.startTime || event.endTime) {
                timeText = ` from ${event.startTime || '??:??'} to ${event.endTime || '??:??'}`;
            }

            let listItem = document.createElement("li");
            listItem.innerHTML = `<strong>${event.title}</strong> - ${event.description}${timeText} on ${eventDate.toLocaleDateString()} is ${event.eType}`;

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

// Get events on a specific date
function getEventsOnDate(date, month, year) {
    return events.filter(event => {
        const eventDate = parseDateFromInput(event.date);
        return eventDate.getDate() === date &&
               eventDate.getMonth() === month &&
               eventDate.getFullYear() === year;
    });
}

// Check if date has events
function hasEventOnDate(date, month, year) {
    return getEventsOnDate(date, month, year).length > 0;
}

// Days in month
function daysInMonth(iMonth, iYear) {
    return 32 - new Date(iYear, iMonth, 32).getDate();
}

// Event color classes
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

// Generate year options
function generate_year_range(start, end) {
    let years = "";
    for (let year = start; year <= end; year++) {
        years += "<option value='" + year + "'>" + year + "</option>";
    }
    return years;
}

// Initialize date variables
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

// Calendar navigation
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

// Show calendar
function showCalendar(month, year) {
    let firstDay = new Date(year, month, 1).getDay();
    let tbl = document.getElementById("calendar-body");
    tbl.innerHTML = "";
    monthAndYear.innerHTML = months[month] + " " + year;
    selectYear.value = year;
    selectMonth.value = month;

    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement("tr");
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement("td");
            if (i === 0 && j < firstDay) {
                cell.appendChild(document.createTextNode(""));
                row.appendChild(cell);
            } else if (date > daysInMonth(month, year)) {
                break;
            } else {
                cell.setAttribute("data-date", date);
                cell.setAttribute("data-month", month + 1);
                cell.setAttribute("data-year", year);
                cell.setAttribute("data-month_name", months[month]);
                cell.className = "date-picker";
                cell.innerHTML = "<span>" + date + "</span>";

                if (date === today.getDate() &&
                    year === today.getFullYear() &&
                    month === today.getMonth()) {
                    cell.classList.add("selected");
                }

                if (hasEventOnDate(date, month, year)) {
				    const eventsOnDate = getEventsOnDate(date, month, year);

				    cell.classList.add("event-marker");

				    const existingDots = cell.querySelectorAll(".event-dot");
				    existingDots.forEach(dot => dot.remove());

				    let dotsContainer = document.createElement("div");
					dotsContainer.className = "event-dots";

					eventsOnDate.forEach(ev => {
					    const dot = document.createElement("span");
					    dot.className = "event-dot " + getEventColorClass(ev.eType);
					    dotsContainer.appendChild(dot);
					});

				    cell.appendChild(dotsContainer);
				    cell.appendChild(createEventTooltip(date, month, year));
				}

                row.appendChild(cell);
                date++;
            }
        }
        tbl.appendChild(row);
    }

    displayReminders();
}

// Event tooltip
function createEventTooltip(date, month, year) {
    let tooltip = document.createElement("div");
    tooltip.className = "event-tooltip";
    let eventsOnDate = getEventsOnDate(date, month, year);
    for (let i = 0; i < eventsOnDate.length; i++) {
        let event = eventsOnDate[i];
        let eventDate = parseDateFromInput(event.date);
        let timeText = "";
        if (event.startTime || event.endTime) {
            timeText = ` from ${event.startTime || '??:??'} to ${event.endTime || '??:??'}`;
        }
        let eventText = `<strong>${event.title}</strong> - ${event.description}${timeText} on ${eventDate.toLocaleDateString()} is ${event.eType}`;
        let eventElement = document.createElement("p");
        eventElement.innerHTML = eventText;
        tooltip.appendChild(eventElement);
    }
    return tooltip;
}

// On page load
window.onload = () => {
    document.getElementById("walkInWelcome").value = "";
    document.getElementById("eventTypeMajor").value = "";
    document.getElementById('eventDetailsWrapper').style.display ='none';
    document.getElementById("groupSize").value = ''
    document.getElementById('recurCheckbox').checked = false ;
    startTimeInput.value = "";
    endTimeInput.value = "";
    toggleDiv();
    toggleTitleDiv();
    showCalendar(currentMonth, currentYear);
};
