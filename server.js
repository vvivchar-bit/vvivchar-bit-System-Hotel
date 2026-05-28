const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");

const defaultRooms = [
  {
    id: 101,
    type: "Одномісний",
    price: 900,
    status: "free",
    description: "Затишний одномісний номер для короткого проживання.",
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: 102,
    type: "Одномісний",
    price: 950,
    status: "free",
    description: "Компактний номер із базовими зручностями для одного гостя.",
    image: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: 201,
    type: "Двомісний",
    price: 1500,
    status: "free",
    description: "Комфортний номер для двох гостей із сучасним інтер’єром.",
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: 202,
    type: "Двомісний",
    price: 1600,
    status: "free",
    description: "Двомісний номер із покращеним плануванням.",
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: 301,
    type: "Люкс",
    price: 2600,
    status: "free",
    description: "Просторий номер підвищеного комфорту для вимогливих гостей.",
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: 302,
    type: "Люкс",
    price: 2900,
    status: "free",
    description: "Преміальний люкс із розширеним набором послуг.",
    image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80"
  }
];

app.use(express.json());
app.use(express.static(__dirname));

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(ROOMS_FILE);
  } catch {
    await writeJson(ROOMS_FILE, defaultRooms);
  }

  try {
    await fs.access(BOOKINGS_FILE);
  } catch {
    await writeJson(BOOKINGS_FILE, []);
  }
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function validateBooking(data, rooms) {
  if (!data.name || !data.name.trim()) return "Введіть ім’я клієнта.";
  if (!data.phone || !data.phone.trim()) return "Введіть номер телефону.";
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

function updateRoomStatusByBookingStatus(status) {
  if (status === "occupied") return "occupied";
  if (status === "cancelled") return "free";
  return "booked";
}

app.get("/api/rooms", async (req, res) => {
  const rooms = await readJson(ROOMS_FILE, defaultRooms);
  res.json(rooms);
});

app.get("/api/bookings", async (req, res) => {
  const bookings = await readJson(BOOKINGS_FILE, []);
  res.json(bookings);
});

app.post("/api/bookings", async (req, res) => {
  const rooms = await readJson(ROOMS_FILE, defaultRooms);
  const bookings = await readJson(BOOKINGS_FILE, []);

  const bookingData = {
    name: String(req.body.name || "").trim(),
    phone: String(req.body.phone || "").trim(),
    checkIn: req.body.checkIn,
    checkOut: req.body.checkOut,
    roomId: req.body.roomId,
    comment: String(req.body.comment || "").trim()
  };

  const error = validateBooking(bookingData, rooms);
  if (error) {
    return res.status(400).json({ error });
  }

  const booking = {
    id: "B-" + Date.now(),
    ...bookingData,
    status: "new"
  };

  const updatedRooms = rooms.map(room => {
    if (String(room.id) === String(booking.roomId)) {
      return { ...room, status: "booked" };
    }
    return room;
  });

  const updatedBookings = [...bookings, booking];

  await writeJson(ROOMS_FILE, updatedRooms);
  await writeJson(BOOKINGS_FILE, updatedBookings);

  res.status(201).json({ booking, rooms: updatedRooms, bookings: updatedBookings });
});

app.patch("/api/bookings/:id", async (req, res) => {
  const allowedStatuses = ["new", "confirmed", "occupied", "cancelled"];
  const nextStatus = req.body.status;

  if (!allowedStatuses.includes(nextStatus)) {
    return res.status(400).json({ error: "Некоректний статус бронювання." });
  }

  const rooms = await readJson(ROOMS_FILE, defaultRooms);
  const bookings = await readJson(BOOKINGS_FILE, []);
  const booking = bookings.find(item => item.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Бронювання не знайдено." });
  }

  const updatedBookings = bookings.map(item => {
    if (item.id === req.params.id) {
      return { ...item, status: nextStatus };
    }
    return item;
  });

  const updatedRooms = rooms.map(room => {
    if (String(room.id) === String(booking.roomId)) {
      return { ...room, status: updateRoomStatusByBookingStatus(nextStatus) };
    }
    return room;
  });

  await writeJson(ROOMS_FILE, updatedRooms);
  await writeJson(BOOKINGS_FILE, updatedBookings);

  res.json({ rooms: updatedRooms, bookings: updatedBookings });
});

app.delete("/api/bookings/:id", async (req, res) => {
  const rooms = await readJson(ROOMS_FILE, defaultRooms);
  const bookings = await readJson(BOOKINGS_FILE, []);
  const booking = bookings.find(item => item.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Бронювання не знайдено." });
  }

  const updatedBookings = bookings.filter(item => item.id !== req.params.id);

  const hasActiveBooking = updatedBookings.some(item => {
    return String(item.roomId) === String(booking.roomId) && item.status !== "cancelled";
  });

  const updatedRooms = rooms.map(room => {
    if (String(room.id) === String(booking.roomId) && !hasActiveBooking) {
      return { ...room, status: "free" };
    }
    return room;
  });

  await writeJson(ROOMS_FILE, updatedRooms);
  await writeJson(BOOKINGS_FILE, updatedBookings);

  res.json({ rooms: updatedRooms, bookings: updatedBookings });
});

app.post("/api/reset", async (req, res) => {
  await writeJson(ROOMS_FILE, defaultRooms);
  await writeJson(BOOKINGS_FILE, []);
  res.json({ rooms: defaultRooms, bookings: [] });
});

app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не знайдено." });
});

ensureDataFiles()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Сервер програмної системи «Готель» запущено: http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error("Помилка запуску сервера:", error);
    process.exit(1);
  });
