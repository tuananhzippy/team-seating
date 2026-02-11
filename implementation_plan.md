# Implementation Plan - Seating Randomizer (HTML/CSS/JS)

Ứng dụng web để random chỗ ngồi cho team, ưu tiên các thành viên cùng nhóm ngồi cạnh nhau. Hỗ trợ quản lý thành viên (CRUD) với dữ liệu lưu trữ trên localStorage.

## Tech Stack
- **Core**: HTML5, Vanilla JavaScript (ES Modules)
- **Styling**: Vanilla CSS (Glassmorphism & animations) — _Không sử dụng Bootstrap hay bất kỳ UI framework nào_
- **Font**: Google Fonts (Inter)
- **Deployment**: Static files, cần chạy qua local server (do ES Modules yêu cầu CORS)

## File Structure

```
team-seating/
├── index.html          # Entry point - Layout & Modal templates
├── style.css           # Toàn bộ styling (layout, modal, table, toast, animations)
├── members.json        # Dữ liệu mặc định (35 thành viên)
├── favicon.ico
├── images/
└── js/
    ├── app.js          # Main app logic: init, render, CRUD, event handlers
    ├── data.js         # TEAMS config (id, name, color)
    ├── engine.js       # Thuật toán random (Fisher-Yates + Team clustering)
    └── layout.js       # Seat coordinate mapping (48 ghế, grid 13x8)
```

## Architecture

### Layout (index.html)
- **App Layout**: Flexbox 2 cột — Sidebar (300px) + Main Content (flex: 1)
- **Sidebar**:
  - Nút **Randomize Seats** — random chỗ ngồi
  - Nút **Manage Members** — mở modal quản lý thành viên (viền rõ, nổi bật trên nền glass)
  - **Team List**: Danh sách team dạng card, mỗi card có header (click để expand/collapse), hiển thị số lượng thành viên
  - **Footer**: Tổng số thành viên
- **Main Content**: Seat Map hiển thị dạng CSS Grid (13 cột x 8 hàng)

### Seat Map (layout.js)
- 48 ghế được định nghĩa tọa độ cố định theo ảnh thiết kế
- **Zones**:
  - Zone 1 (Left): 3 cụm bàn 4x2 (hàng 1-2, 4-5, 7-8)
  - Zone 2 (Middle): 1 cụm dọc (col 6-7)
  - Zone 3 (Right): 2 cụm dọc (col 9-10, col 12-13)
  - Kitchen Room: Khu vực chung (col 6-13, hàng 6-8)
- **Rendering**: Mỗi ghế dùng `grid-column` / `grid-row` inline style
- **Animation**: fadeIn staggered (0.01s delay mỗi ghế)

### Modal System (Vanilla JS — No library)
Tất cả modal tự xây bằng HTML/CSS/JS, không dùng thư viện:
- **Modal Overlay**: `.modal-overlay` — fixed full screen, backdrop blur, click outside để đóng
- **Modal Content**: `.glass-modal` — glassmorphism effect, border-radius 16px
- **Z-index stacking**:
  - Manage Members Modal: `z-index: 1000`
  - Member Add/Edit Modal: `z-index: 1010` (hiện trên Manage Members)
  - Delete Confirm Modal: `z-index: 1010` (hiện trên Manage Members)
- **Đóng modal**: Click overlay, nút Close, hoặc phím ESC
- **Keyboard**: Enter để save trong Member modal

### 3 Modal chính

#### 1. Manage Members Modal (`#manageMembersOverlay`)
- Toolbar: Search input + Filter by Team
- Table: Hiển thị danh sách thành viên với cột #, Name, Team (badge), Actions
- Actions: Nút Edit (✏️ emoji) + Delete (SVG trash icon)
- Footer: Tổng số members + nút Close

#### 2. Member Modal (`#memberModalOverlay`) — Add / Edit
- Form fields: Full Name (text input) + Team (select dropdown)
- Hidden input `#member-id`: Rỗng = Add mới, Có giá trị = Edit
- Validation: Name trống → hiện `is-invalid` class + shake animation
- Sau khi save → cập nhật localStorage, re-render sidebar + seat map + table

#### 3. Delete Confirm Modal (`#deleteConfirmOverlay`)
- Hiển thị tên member sắp xóa
- Nút Cancel + Nút Delete (SVG trash icon, nền đỏ)
- Sau khi confirm → xóa khỏi array, cập nhật localStorage, re-render tất cả

## Data Management

### Luồng load dữ liệu (init)
1. Kiểm tra `localStorage` key `seat_randomizer_data`
2. Nếu **có** → parse JSON, dùng làm `currentMembers`
3. Nếu **không có** → fetch `members.json`, map teamColor, sort by teamId, save vào localStorage
4. Render sidebar + seat map

### Format JSON
```json
[
  {
    "id": 1,
    "name": "Đỗ Xuân Thành",
    "teamId": "design",
    "teamName": "Design",
    "teamColor": "#ffe66d"
  }
]
```

### CRUD Operations
| Action | Logic | Persistence |
|--------|-------|-------------|
| **Create** | Push new member (auto-increment ID) vào `currentMembers` | `saveData()` → localStorage |
| **Update** | Tìm member by ID, cập nhật name/teamId/teamName/teamColor | `saveData()` → localStorage |
| **Delete** | Filter out member by ID | `saveData()` → localStorage |

Sau mỗi CRUD operation → gọi `renderSidebar()` + `renderSeatMap()` + `renderMembersTable()`.

### Toast Notifications
- Hiện toast ở góc dưới bên phải
- Màu xanh (success) khi add/update, màu đỏ (danger) khi delete
- Tự động ẩn sau 3 giây với animation slide-out
- Có nút close "×" để đóng thủ công

## Teams Config (data.js)
| Key | ID | Name | Color |
|-----|-----|------|-------|
| SYSTEM | system | System | #ff6b6b |
| EC | ec | EC | #4ecdc4 |
| DESIGN | design | Design | #ffe66d |
| POD | pod | POD | #1a535c |
| TESTER | tester | Tester | #ff9f1c |
| MOBILE | mobile-app | Mobile App | #ff006e |

## Verification

### Cách chạy
Cần chạy qua local server (do ES Modules):
```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# VS Code
# Dùng extension "Live Server"
```
Sau đó mở `http://localhost:8080`

### Checklist kiểm tra
- [ ] Trang load thành công, hiển thị team list ở sidebar
- [ ] Nút "Randomize Seats" hoạt động, members cùng team ngồi cạnh nhau
- [ ] Nút "Manage Members" hiển thị rõ ràng, click mở modal
- [ ] Modal Manage Members: hiển thị bảng đầy đủ, search/filter hoạt động
- [ ] Add Member: mở modal form, nhập tên + chọn team, save thành công
- [ ] Edit Member: click edit từ bảng, form pre-fill đúng, save cập nhật
- [ ] Delete Member: click delete → hiện confirm → xóa thành công
- [ ] Toast notification hiện sau mỗi thao tác CRUD
- [ ] F5 reload → dữ liệu vẫn giữ nguyên (localStorage)
- [ ] ESC đóng modal, click overlay đóng modal
- [ ] Enter submit form trong Member modal
