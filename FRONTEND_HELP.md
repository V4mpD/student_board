# 🎨 Frontend Developer Guide - Student Board

This guide explains how to connect the React Frontend to the Student Board Backend.

## ⚡️ Quick Start

1.  **Backend URL:** `http://localhost:5000`
2.  **Proxy Setup:** To avoid CORS errors, add this to your `package.json`:
    ```json
    "proxy": "http://localhost:5000"
    ```
    _Now you can just fetch `/api/schedule` instead of the full URL._

---

## 🛠 Recommended Stack

- **HTTP Client:** `axios` (Better than fetch for error handling).
- **Routing:** `react-router-dom` (Login -> Dashboard).
- **Calendar UI:** `react-big-calendar` or `fullcalendar-react`.
  - _Why?_ Building a weekly grid from scratch is painful. These libraries handle the "Outlook" view automatically.
- **Icons:** `lucide-react` or `react-icons` (For the assignment ✅ and cancelled ❌ icons).

---

## 📡 How to Use the Backend API

### 1️⃣ Authentication (Login & Register)

The backend handles the logic. You just need to store the User Object.

- **Register:** `POST /api/register`
  - Send: `{ username, password, fullName, college, year, series, groupName }`
  - _Note:_ If the user is the **first** in that group, the backend makes them an **ADMIN** automatically.
- **Login:** `POST /api/login`
  - Response: `{ user: { id, role, groupName, ... } }`
  - **Action:** Save this `user` object in `localStorage` or React Context. You will need `user.role` to decide whether to show "Add Class" buttons.

### 2️⃣ The "Outlook" Schedule Logic (Crucial!)

The `/api/schedule` endpoint returns a mixed list of **Recurring Classes** and **One-Off Overrides**. You must merge them visually.

**The Logic You Must Implement:**

1.  **Fetch Data:** Call `GET /api/schedule?groupName=311&weekType=odd`.
2.  **Render the Calendar:** Loop through the days of the current week.
3.  **For Each Time Slot:**
    - **Check for Override:** Is there a class with `specific_date` matching today?
      - **Yes?** This is the version you show.
        - _Check Cancellation:_ If `is_cancelled === 1`, show a red "CANCELLED" block.
      - **No?** Show the standard recurring class (where `specific_date` is null).

**Visual Cues:**

- **Assignments:** If `has_assignment === true`, display a ⚠️ or ✅ icon on the class block.
- **Details:** Clicking a block should open a modal with `course_name` and `assignment_details`.

### 3️⃣ Admin Features

- **Hide Buttons:** Wrap "Add Class" and "Post Announcement" buttons in a check:
  ```javascript
  {
    user.role === "ADMIN" && <button>Add Class</button>;
  }
  ```
- **Cancelling a Class:**
  To cancel a class, send a POST request to `/api/schedule` with:
  ```json
  {
    "course_name": "Math",
    "specific_date": "2024-11-25",
    "is_cancelled": true
  }
  ```

---

## 🧩 API Reference Cheat Sheet

| Feature             | Method | Endpoint             | key Params / Body                         |
| :------------------ | :----- | :------------------- | :---------------------------------------- |
| **Login**           | `POST` | `/api/login`         | `username`, `password`                    |
| **Get Schedule**    | `GET`  | `/api/schedule`      | `?groupName=311`, `?weekType=odd`         |
| **Add Class**       | `POST` | `/api/schedule`      | `week_type`, `day_of_week` (Recurring)    |
| **Override/Cancel** | `POST` | `/api/schedule`      | `specific_date`, `is_cancelled` (One-Off) |
| **Announcements**   | `GET`  | `/api/announcements` | `?college=FMI`, `?year=1`                 |
| **Post Announce**   | `POST` | `/api/announcements` | `title`, `content`, `target_group`        |

---

## 💡 Pro Tips for the Frontend

1.  **State Management:** Use a simple global context (`AuthContext`) to keep track of the logged-in user and their `groupName`. You'll need to send that `groupName` with every schedule request.
2.  **Dates:** Be careful with Timezones! When sending `specific_date`, use a standard format like `YYYY-MM-DD`.
3.  **Testing:** Log in as "User A" (Admin), create a schedule. Then log in as "User B" (Student) in the same group to verify they see it but can't edit it.
