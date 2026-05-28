const requirements = [
  ["FR-01", "Система повинна відображати список номерів готелю.", "На головній сторінці є картки номерів із типом, ціною, описом і статусом.", "Скрін головної сторінки з номерами."],
  ["FR-02", "Клієнт повинен мати можливість створити бронювання.", "На сторінці booking.html є форма бронювання.", "Скрін заповненої форми."],
  ["FR-03", "Система повинна перевіряти обов’язкові поля.", "Якщо поле порожнє або дата неправильна, система показує повідомлення про помилку.", "Скрін повідомлення про помилку."],
  ["FR-04", "Система повинна зберігати бронювання.", "Заявки зберігаються на сервері у файлі data/bookings.json і не зникають після оновлення сторінки.", "Скрін після перезавантаження сторінки."],
  ["FR-05", "Адміністратор повинен бачити список заявок.", "На сторінці admin.html є таблиця всіх бронювань.", "Скрін адмін-панелі."],
  ["FR-06", "Адміністратор повинен керувати бронюваннями.", "Є кнопки підтвердження, заселення, скасування та видалення.", "Скрін кнопок дій."],
  ["FR-07", "Кожен номер повинен мати статус.", "Номери мають статуси: вільний, заброньований, зайнятий.", "Скрін карток номерів зі статусами."],
  ["FR-08", "Система повинна мати серверну частину для обробки даних.", "Node.js + Express обробляє API-запити, створює бронювання, змінює статуси та зберігає дані у JSON-файлах.", "Скрін структури проєкту або класифікаційної таблиці."],
  ["NFR-01", "Інтерфейс повинен бути українською мовою.", "Усі основні підписи, кнопки й повідомлення українською.", "Скрін будь-якої сторінки."],
  ["DR-01", "Бронювання повинно містити клієнта, номер і дати проживання.", "У таблиці є ім’я, телефон, номер, період, статус і коментар.", "Скрін створеної заявки."],
  ["TR-01", "Клієнтська частина повинна взаємодіяти із сервером через API.", "JavaScript використовує Fetch API для отримання, створення, оновлення та видалення бронювань.", "Скрін класифікації технологій комунікації."]
];

const SELECTED_ROOM_KEY = "hotel_selected_room";

let rooms = [];
let bookings = [];
let roomFilter = "all";

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Помилка запиту до сервера.");
  }

  return data;
}

async function loadData() {
  const [loadedRooms, loadedBookings] = await Promise.all([
    apiRequest("/api/rooms"),
    apiRequest("/api/bookings")
  ]);

  rooms = loadedRooms;
  bookings = loadedBookings;
}

function money(value) {
  return Number(value).toLocaleString("uk-UA") + " грн";
}

function roomStatusText(status) {
  if (status === "free") return "Вільний";
  if (status === "booked") return "Заброньований";
  if (status === "occupied") return "Зайнятий";
  return "Невідомо";
}

function bookingStatusText(status) {
  if (status === "new") return "Нова заявка";
  if (status === "confirmed") return "Підтверджено";
  if (status === "occupied") return "Клієнт заселений";
  if (status === "cancelled") return "Скасовано";
  return "Невідомо";
}

function daysBetween(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end - start;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function showMessage(text, type) {
  const message = document.getElementById("message");
  if (!message) return;

  message.textContent = text;
  message.className = "message " + type;
}

function renderRooms() {
  const roomsList = document.getElementById("roomsList");
  if (!roomsList) return;

  roomsList.innerHTML = "";

  const filteredRooms = rooms.filter(room => {
    return roomFilter === "all" || room.status === roomFilter;
  });

  filteredRooms.forEach((room, index) => {
    const card = document.createElement("article");
    card.className = index === 0 ? "room-card big" : "room-card";

    card.innerHTML = `
      <div class="room-bg" style="background-image:url('${room.image}')"></div>
      <div class="room-info">
        <span class="badge ${room.status}">${roomStatusText(room.status)}</span>
        <h3>Номер ${room.id} · ${room.type}</h3>
        <p>${room.description}</p>
        <div class="room-actions">
          <span class="price">${money(room.price)} / доба</span>
          ${
            room.status === "free"
              ? `<button class="choose-btn" type="button" onclick="chooseRoom('${room.id}')">Обрати</button>`
              : `<button class="disabled-btn" type="button" disabled>Недоступно</button>`
          }
        </div>
      </div>
    `;

    roomsList.appendChild(card);
  });
}

function renderRoomSelect() {
  const roomSelect = document.getElementById("roomSelect");
  if (!roomSelect) return;

  roomSelect.innerHTML = `<option value="">Оберіть номер</option>`;

  rooms
    .filter(room => room.status === "free")
    .forEach(room => {
      const option = document.createElement("option");
      option.value = room.id;
      option.textContent = `Номер ${room.id} — ${room.type}, ${money(room.price)} / доба`;
      roomSelect.appendChild(option);
    });

  const selectedRoom = sessionStorage.getItem(SELECTED_ROOM_KEY);
  if (selectedRoom) {
    roomSelect.value = selectedRoom;
    sessionStorage.removeItem(SELECTED_ROOM_KEY);
  }
}

function renderBookings() {
  const bookingsTable = document.getElementById("bookingsTable");
  const emptyText = document.getElementById("emptyText");

  if (!bookingsTable) return;

  bookingsTable.innerHTML = "";

  if (emptyText) {
    emptyText.style.display = bookings.length === 0 ? "block" : "none";
  }

  bookings.forEach(booking => {
    const room = rooms.find(item => String(item.id) === String(booking.roomId));
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${booking.id}</td>
      <td>${booking.name}</td>
      <td>${booking.phone}</td>
      <td>№${booking.roomId}${room ? ", " + room.type : ""}</td>
      <td>${booking.checkIn} — ${booking.checkOut}</td>
      <td><span class="badge ${booking.status}">${bookingStatusText(booking.status)}</span></td>
      <td>${booking.comment || "—"}</td>
      <td>
        <button class="action-btn success" type="button" onclick="updateBooking('${booking.id}', 'confirmed')">Підтвердити</button>
        <button class="action-btn warning" type="button" onclick="updateBooking('${booking.id}', 'occupied')">Заселити</button>
        <button class="action-btn secondary" type="button" onclick="updateBooking('${booking.id}', 'cancelled')">Скасувати</button>
        <button class="action-btn danger" type="button" onclick="deleteBooking('${booking.id}')">Видалити</button>
      </td>
    `;

    bookingsTable.appendChild(row);
  });
}

function renderRequirements() {
  const requirementsTable = document.getElementById("requirementsTable");
  if (!requirementsTable) return;

  requirementsTable.innerHTML = "";

  requirements.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item[0]}</td>
      <td>${item[1]}</td>
      <td>${item[2]}</td>
      <td>${item[3]}</td>
      <td><span class="badge free">Перекрито</span></td>
    `;

    requirementsTable.appendChild(row);
  });
}

function renderStats() {
  const freeRooms = rooms.filter(room => room.status === "free").length;

  const income = bookings
    .filter(booking => booking.status !== "cancelled")
    .reduce((sum, booking) => {
      const room = rooms.find(item => String(item.id) === String(booking.roomId));
      if (!room) return sum;

      return sum + room.price * daysBetween(booking.checkIn, booking.checkOut);
    }, 0);

  setText("roomsCount", rooms.length);
  setText("bookingsCount", bookings.length);
  setText("freeCount", freeRooms);
  setText("incomeCount", money(income));
  setText("sideRoomsCount", rooms.length);
  setText("sideBookingsCount", bookings.length);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderAll() {
  renderRooms();
  renderRoomSelect();
  renderBookings();
  renderRequirements();
  renderStats();
}

function setRoomFilter(filter, button) {
  roomFilter = filter;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  if (button) button.classList.add("active");

  renderRooms();
}

function chooseRoom(roomId) {
  sessionStorage.setItem(SELECTED_ROOM_KEY, roomId);
  window.location.href = "booking.html";
}

function setRoomTypeQuick(type) {
  const availableRoom = rooms.find(room => {
    return room.type === type && room.status === "free";
  });

  if (!availableRoom) {
    alert("Немає вільних номерів цього типу.");
    return;
  }

  sessionStorage.setItem(SELECTED_ROOM_KEY, availableRoom.id);
  window.location.href = "booking.html";
}

function validateBooking(data) {
  if (!data.name) return "Введіть ім’я клієнта.";
  if (!data.phone) return "Введіть номер телефону.";
  if (!data.checkIn) return "Оберіть дату заїзду.";
  if (!data.checkOut) return "Оберіть дату виїзду.";

  if (new Date(data.checkOut) <= new Date(data.checkIn)) {
    return "Дата виїзду повинна бути пізнішою за дату заїзду.";
  }

  if (!data.roomId) return "Оберіть номер для бронювання.";

  const selectedRoom = rooms.find(room => String(room.id) === String(data.roomId));

  if (!selectedRoom || selectedRoom.status !== "free") {
    return "Обраний номер недоступний.";
  }

  return "";
}

async function handleBookingSubmit(event) {
  event.preventDefault();

  const bookingData = {
    name: document.getElementById("clientName").value.trim(),
    phone: document.getElementById("clientPhone").value.trim(),
    checkIn: document.getElementById("checkIn").value,
    checkOut: document.getElementById("checkOut").value,
    roomId: document.getElementById("roomSelect").value,
    comment: document.getElementById("comment").value.trim()
  };

  const error = validateBooking(bookingData);

  if (error) {
    showMessage(error, "error");
    return;
  }

  try {
    const result = await apiRequest("/api/bookings", {
      method: "POST",
      body: JSON.stringify(bookingData)
    });

    rooms = result.rooms;
    bookings = result.bookings;

    event.target.reset();
    renderAll();
    showMessage("Бронювання успішно створено та збережено на сервері.", "ok");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function updateBooking(id, status) {
  try {
    const result = await apiRequest(`/api/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    rooms = result.rooms;
    bookings = result.bookings;
    renderAll();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteBooking(id) {
  try {
    const result = await apiRequest(`/api/bookings/${id}`, {
      method: "DELETE"
    });

    rooms = result.rooms;
    bookings = result.bookings;
    renderAll();
  } catch (error) {
    alert(error.message);
  }
}

async function resetDemoData() {
  try {
    const result = await apiRequest("/api/reset", {
      method: "POST"
    });

    rooms = result.rooms;
    bookings = result.bookings;
    sessionStorage.removeItem(SELECTED_ROOM_KEY);

    const bookingForm = document.getElementById("bookingForm");
    if (bookingForm) bookingForm.reset();

    renderAll();
    showMessage("Демо-дані скинуто на сервері. Система готова до нової перевірки.", "ok");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function initApp() {
  try {
    await loadData();
    renderAll();
  } catch (error) {
    console.error(error);
    showMessage("Не вдалося підключитися до сервера. Запустіть команду npm start і відкрийте http://localhost:3000", "error");
  }

  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", handleBookingSubmit);
  }

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetDemoData);
  }
}

initApp();
