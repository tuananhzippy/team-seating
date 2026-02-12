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
    ├── engine.js       # Thuật toán random (Fisher-Yates + Smart Zone clustering)
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
  - Zone 1 (Left Top): Cụm bàn 4x2, seats 1–8 (hàng 1-2, col 1-4)
  - Zone 2 (Left Middle): Cụm bàn 4x2, seats 9–16 (hàng 4-5, col 1-4)
  - Zone 3 (Left Bottom): Cụm bàn 4x2, seats 17–24 (hàng 7-8, col 1-4)
  - Zone 4 (Middle): Cụm dọc 2x4, seats 25–32 (col 6-7)
  - Zone 5 (Right 1): Cụm dọc 2x4, seats 33–40 (col 9-10)
  - Zone 6 (Right 2): Cụm dọc 2x4, seats 41–48 (col 12-13)
  - Kitchen Room: Khu vực chung (col 6-13, hàng 6-8)
- **Rendering**: Mỗi ghế dùng `grid-column` / `grid-row` inline style
- **Animation**: fadeIn staggered (0.01s delay mỗi ghế)

### Thuật toán sắp xếp chỗ ngồi (engine.js) — Smart Zone Clustering

#### Nguyên tắc cốt lõi
- **Mỗi zone (cụm bàn) chỉ chứa thành viên của 1-2 team** — tránh trộn nhiều team trong cùng cụm bàn
- **Tối ưu sử dụng chỗ ngồi** — cho phép 2 team chia sẻ zone khi hợp lý (ví dụ 4+4)
- **Tránh thành viên lẻ loi** — không cho phép 1 người duy nhất của team ngồi trong zone đầy đủ team khác

#### Quy tắc `MIN_IN_ZONE = 2`
Mỗi team khi xuất hiện trong một zone phải có **ít nhất 2 thành viên**. Nếu việc tách team sẽ tạo ra phần nhỏ hơn 2 → bỏ trống ghế dư, team bắt đầu zone mới.

| Tình huống | Kết quả | Giải thích |
|------------|---------|------------|
| Team A (7) + Team B (1) trong zone 8 | ❌ Tách zone | Team B chỉ có 1 → lẻ loi |
| Team A (4) + Team B (4) trong zone 8 | ✅ Chung zone | Cả 2 đều ≥ 2 |
| Team A (6) + Team B (2) trong zone 8 | ✅ Chung zone | Cả 2 đều ≥ 2 |
| Team A (7) → tràn zone | ✅ 7 trong zone 1, team B zone mới | 1 ghế dư để trống |
| Team A (10) → tràn zone 8 | ✅ 8 zone 1 + 2 zone 2 | Cả 2 phần đều ≥ 2 |

#### Luồng thuật toán
```
1. Nhóm thành viên theo team
2. Shuffle thứ tự teams (random)
3. Shuffle thành viên trong mỗi team (random nội bộ)
4. Duyệt qua từng zone (trái → phải):
   a. Nếu team hiện tại vừa đủ chỗ còn lại → xếp hết, kiểm tra team tiếp theo
   b. Nếu team lớn hơn chỗ còn lại:
      - Cả 2 phần (trong zone + tràn zone) đều ≥ MIN_IN_ZONE → cho phép tách
      - Ngược lại → bỏ trống chỗ dư, team bắt đầu zone mới
5. Trả về mảng indexed theo seatId (index = seatId - 1)
```

#### Kết quả mẫu (35 thành viên thực tế)
| Zone | Chỗ ngồi | Teams |
|------|----------|-------|
| Left Top | 8/8 | System: 8 |
| Left Middle | 7/8 | EC: 7 |
| Left Bottom | 8/8 | Design: 4 + POD: 4 |
| Middle | 8/8 | POD: 6 + Tester: 2 |
| Right 1 | 4/8 | Tester: 2 + Mobile: 2 |
| Right 2 | 0/8 | *(trống)* |

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
1. Kiểm tra URL có tham số `?clear_cache` không
2. Nếu **có `clear_cache`**:
   - Xóa localStorage key `seat_randomizer_data`
   - Fetch lại dữ liệu từ `members.json`
   - Xóa tham số `clear_cache` khỏi URL (dùng `replaceState`) để tránh clear lặp khi refresh
3. Nếu **không có `clear_cache`**:
   - Kiểm tra `localStorage` key `seat_randomizer_data`
   - Nếu **có** → parse JSON, dùng làm `currentMembers`
   - Nếu **không có** → fetch `members.json`, map teamColor, sort by teamId, save vào localStorage
4. Render sidebar + seat map (qua `randomizeSeats()`)

### Clear Cache
Thêm `?clear_cache` vào URL để xóa localStorage và fetch lại dữ liệu mới từ `members.json`:
```
http://localhost:8080/index.html?clear_cache
```
Hữu ích khi:
- Cập nhật file `members.json` hoặc cấu hình team
- Thay đổi màu team trong `data.js`
- Reset dữ liệu về mặc định

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

Sau mỗi CRUD operation → gọi `renderSidebar()` + `renderSeatMap(randomizeSeats(...))` + `renderMembersTable()`.

### Toast Notifications
- Hiện toast ở góc dưới bên phải
- Màu xanh (success) khi add/update, màu đỏ (danger) khi delete
- Tự động ẩn sau 3 giây với animation slide-out
- Có nút close "×" để đóng thủ công

## Teams Config (data.js)
| Key | ID | Name | Color | Mô tả |
|-----|-----|------|-------|-------|
| SYSTEM | system | System | `#ff6b6b` | 🔴 Đỏ hồng |
| EC | ec | EC | `#4ecdc4` | 🟢 Xanh ngọc |
| DESIGN | design | Design | `#ffe66d` | 🟡 Vàng |
| POD | pod | POD | `#1a535c` | 🟤 Xanh đậm |
| TESTER | tester | Tester | `#ff9f1c` | 🟠 Cam |
| MOBILE | mobile-app | Mobile App | `#7c3aed` | 🟣 Tím |

> **Lưu ý**: Mobile App đã đổi từ `#ff006e` (đỏ hồng, dễ nhầm với System) sang `#7c3aed` (tím) để phân biệt rõ ràng.

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

### Clear cache & reload dữ liệu
```
http://localhost:8080/index.html?clear_cache
```

### Checklist kiểm tra
- [ ] Trang load thành công, hiển thị team list ở sidebar
- [ ] Nút "Randomize Seats" hoạt động, members cùng team ngồi cạnh nhau
- [ ] Mỗi zone chỉ chứa 1-2 team, không có team nào chỉ có 1 người lẻ loi trong zone
- [ ] Các team nhỏ (4+4) chia sẻ zone hiệu quả, không lãng phí chỗ
- [ ] Team lớn (>8) tràn zone hợp lý (chia đều ≥ 2 mỗi phần)
- [ ] Nút "Manage Members" hiển thị rõ ràng, click mở modal
- [ ] Modal Manage Members: hiển thị bảng đầy đủ, search/filter hoạt động
- [ ] Add Member: mở modal form, nhập tên + chọn team, save thành công
- [ ] Edit Member: click edit từ bảng, form pre-fill đúng, save cập nhật
- [ ] Delete Member: click delete → hiện confirm → xóa thành công
- [ ] Toast notification hiện sau mỗi thao tác CRUD
- [ ] F5 reload → dữ liệu vẫn giữ nguyên (localStorage)
- [ ] `?clear_cache` → xóa localStorage, fetch lại members.json, URL tự clean
- [ ] ESC đóng modal, click overlay đóng modal
- [ ] Enter submit form trong Member modal
- [ ] Màu 6 team phân biệt rõ ràng (đặc biệt Mobile App tím vs System đỏ)
