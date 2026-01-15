# Implementation Plan - Seating Randomizer (HTML/Bootstrap/JS)

Ứng dụng web để random chỗ ngồi cho team 40 người, ưu tiên các thành viên cùng nhóm ngồi cạnh nhau.

## Proposed Changes

### Tech Stack
- **Core**: HTML5, Vanilla JavaScript
- **Styling**: Bootstrap 5 (Layout) + Custom CSS (Glassmorphism & animations)
- **Deployment**: Static HTML file

### Architecture

#### [NEW] File Structure
- `index.html`: Main entry point. Cấu trúc layout chia 2 cột: Sidebar (Control & List) - Main (Seat Map).
- `style.css`: Custom overrides cho Bootstrap để đạt giao diện "Premium/Glassmorphism".
- `js/data.js`: Chứa dữ liệu mẫu (40 nhân viên, các team System, Ecommerce...).
- `js/engine.js`: Chứa thuật toán random (Snake ordering hoặc Matrix clustering).
- `js/app.js`: Glue code, xử lý DOM events, render UI.

#### [NEW] UI Modules
- **Container**: `container-fluid` setup full height.
- **Sidebar**: Panel bên trái hiển thị danh sách team. Thêm nút **Export JSON**, **Import JSON**.
    - **Team List**: Hiển thị danh sách thành viên trong từng team. Mặc định thu gọn, bấm vào sẽ mở rộng (Expand/Collapse).
- **Seat Map**: Chuyển từ simple grid sang **Coordinate Mapping**.
    - `js/layout.js`: Định nghĩa vị trí (row/col) cho 48 ghế theo ảnh thiết kế.
    - **Zones**:
        - Zone 1 (Left): Các cụm bàn 4x2.
        - Zone 2 (Right): Các cụm bàn dọc.
        - Kitchen: Khu vực chung.
    - **Rendering**: Sử dụng `style="grid-column: x; grid-row: y"` cho từng ghế.
- **Export Image**: Sử dụng `html2canvas` (qua CDN) để chụp lại DOM `#seat-map` và tải xuống dưới dạng PNG.

### Data Management
- **Local Storage**: Tự động lưu danh sách thành viên vào `localStorage` khi có thay đổi (import). Load từ storage khi khởi động app.
- **Format JSON**:
  ```json
  [
    { "id": 1, "name": "...", "teamId": "system", "teamName": "System", "teamColor": "#..." }
  ]
  ```

## Verification Plan

### Manual Verification
- Mở file `index.html` trực tiếp trên trình duyệt.
- Kiểm tra tính responsive của Bootstrap.
- Bấm nút "Random" và xác nhận các thành viên cùng màu (cùng team) đứng cạnh nhau.
