# 🚗 Smart Parking System

Welcome to the Smart Parking System project! This web-based system allows easy vehicle parking bookings with QR code tickets, live parking spot tracking, and an admin panel for management. It is designed for use in college offices, campuses, and similar environments to simplify parking operations.

---

## 🎯 Features

| Feature                | Description                                                           |
|------------------------|-----------------------------------------------------------------------|
| 🅿️ Slot Booking        | Users can book parking slots by entering vehicle details              |
| 📅 Real-time Availability | Live updates of available spots in different parking areas           |
| 🔍 QR Code Tickets      | Automatically generated QR codes for parking entry and exit          |
| 🛂 Admin Panel           | Admin can scan and verify QR tickets, manage bookings, and download reports |
| 📊 Report Download       | Admin can download CSV reports of recent parking activities           |
| 🚪 Entry/Exit Tracking   | Mark vehicle entry and exit to update spot availability               |

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla JS)
- **QR Code Generation:** qrcodejs library
- **UI:** Responsive grid layout with CSS variables for theming
- **Data Storage:** In-memory JavaScript arrays (no backend/database)
- **Browser-based:** Runs entirely in client browser without Node.js or server backend

---

## 🚀 How to Use

1. **Book a Slot:**
   - Enter your name, vehicle number, vehicle type, and parking area.
   - Click "Reserve Slot" to generate a ticket with QR code.
   
2. **Use Your QR Ticket:**
   - Show the QR code at entry and exit gates for scanning by admin.
   - Admin verifies and updates the entry/exit status for the slot.
   
3. **Admin Panel:**
   - Switch to admin view using the "Admin" button.
   - Scan ticket IDs, view recent notifications, and download parking reports.
   
4. **Live Parking View:**
   - See available spots for Campus, Gate1, and Gate2 areas (updated every 10 seconds).

---

## 📊 Parking Areas and Slots

| Area     | Total Slots | Available Slots (Live) |
|----------|-------------|-----------------------|
| Campus   | 10          | Dynamic                |
| Gate1    | 10          | Dynamic                |
| Gate2    | 10          | Dynamic                |

---

## 🤝 Contribution

Contributions and suggestions are welcome! Feel free to submit issues and pull requests.

---

## 📞 Contact

For questions or support, reach out to the project team.

---

Happy Parking! 🚘✨
