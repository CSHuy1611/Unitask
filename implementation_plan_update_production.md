# Kế hoạch Cập nhật Code & Update Hệ thống trên Production (VPS)

Tài liệu này hướng dẫn chi tiết cách sửa lỗi chuyển hướng thanh toán (Redirect URL) về `localhost:4200` của PayOS, cách push code mới lên GitHub và cách kéo code mới để cập nhật hệ thống trên VPS.

---

## 1. Phân tích Nguyên nhân Lỗi Chuyển hướng localhost:4200
Khi tạo link thanh toán với PayOS, Backend ASP.NET Core lấy URL để người dùng quay lại sau khi thanh toán thông qua cấu hình `Frontend:Url` từ file `appsettings.json` (mặc định là `http://localhost:4200`) hoặc qua biến môi trường `Frontend__Url` trong Docker.

Hiện tại:
1.  Trong file [appsettings.json](file:///d:/7rd_Semester_FPTU/EXE101/Demo_MVP/backend/UniTask_BE/UniTask.Api/appsettings.json) mặc định có giá trị `http://localhost:4200`.
2.  Trong file `docker-compose.yml` đang set cứng `- Frontend__Url=http://localhost:8080`.
3.  Khi chạy trên VPS, vì không có biến cấu hình này trong file `.env` để quản lý động, hệ thống đã fallback (quay lại sử dụng) giá trị mặc định trong file `appsettings.json` là `http://localhost:4200`. Do đó, sau khi thanh toán thành công/thất bại, PayOS sẽ chuyển hướng người dùng về `localhost:4200` thay vì tên miền thực tế `https://unitaskapp.id.vn`.

---

## 2. Kế hoạch sửa đổi trong Codebase (Thực hiện trên máy Local)

Chúng ta sẽ đưa biến cấu hình này vào file `.env` để quản lý tập trung và dễ thay đổi trên VPS mà không cần sửa file `docker-compose.yml`.

### Bước 2.1: Cập nhật file `.env.example` và `.env` ở máy Local
1.  Mở file [.env.example](file:///d:/7rd_Semester_FPTU/EXE101/Demo_MVP/.env.example) và bổ sung cấu hình:
    ```env
    # 5. Frontend Url Config
    FRONTEND_URL=http://localhost:8080
    ```
2.  Mở file [.env](file:///d:/7rd_Semester_FPTU/EXE101/Demo_MVP/.env) ở máy local của bạn và bổ sung tương tự:
    ```env
    # 5. Frontend Url Config
    FRONTEND_URL=http://localhost:8080
    ```

### Bước 2.2: Cập nhật file `docker-compose.yml`
Chúng ta sẽ thay thế giá trị cứng bằng biến môi trường vừa khai báo. Mở file [docker-compose.yml](file:///d:/7rd_Semester_FPTU/EXE101/Demo_MVP/docker-compose.yml) và cập nhật dòng `Frontend__Url` của service `backend`:

```yaml
  backend:
    ...
    environment:
      ...
      - Frontend__Url=${FRONTEND_URL}  # Đọc động từ file .env
    ...
```

---

## 3. Phần A: Hướng dẫn Push Code mới lên GitHub (Thao tác trên máy Local)

Sau khi code đã được sửa đổi thành công ở máy local của bạn, hãy chạy các lệnh sau trong Terminal (Git Bash / PowerShell tại thư mục dự án `Demo_MVP` trên máy tính của bạn) để đẩy code lên GitHub:

1.  **Kiểm tra các file đã thay đổi:**
    ```bash
    git status
    ```
    *Bạn sẽ thấy các file `.env.example` và `docker-compose.yml` có màu đỏ (đã bị thay đổi).*
2.  **Thêm các file thay đổi vào hàng đợi Git:**
    ```bash
    git add .env.example docker-compose.yml
    ```
    *(Lưu ý: Không add file `.env` vì nó chứa mật khẩu nhạy cảm và đã được cấu hình trong `.gitignore`).*
3.  **Tạo một Commit ghi nhận thay đổi:**
    ```bash
    git commit -m "chore: configure frontend url via environment variables for payment redirect"
    ```
4.  **Đẩy code lên GitHub:**
    ```bash
    git push origin main
    ```
    *(Thay `main` bằng tên nhánh của bạn nếu bạn đang làm việc trên nhánh khác, ví dụ `git push origin master`).*

---

## 4. Phần B: Hướng dẫn Cập nhật Code và Update hệ thống trên VPS (Thao tác trên VPS)

Sau khi đã push code lên GitHub thành công, bạn hãy thực hiện các bước sau trên VPS của mình để cập nhật phiên bản mới:

### Bước B.1: Kết nối SSH vào VPS
Mở PowerShell trên máy tính cá nhân và kết nối vào VPS:
```bash
ssh root@<IP_VPS>
```
*(Nhập mật khẩu VPS nếu được yêu cầu).*

### Bước B.2: Kéo code mới nhất từ GitHub về VPS
Di chuyển vào thư mục dự án và chạy lệnh pull code:
```bash
cd /var/www/unitask
git pull origin main
```
*(Hệ thống sẽ tải file `docker-compose.yml` và `.env.example` mới về VPS).*

### Bước B.3: Cập nhật file cấu hình `.env` trên VPS
Chúng ta cần khai báo tên miền thực tế vào file cấu hình trên VPS:
1.  Mở file `.env` trên VPS:
    ```bash
    nano .env
    ```
2.  Dùng các phím mũi tên di chuyển xuống dòng cuối cùng và thêm cấu hình tên miền thật:
    ```env
    # 5. Frontend Url Config
    FRONTEND_URL=https://unitaskapp.id.vn
    ```
3.  Lưu và thoát trình soạn thảo: Nhấn **Ctrl + O** -> **Enter** để lưu, nhấn **Ctrl + X** để thoát.

### Bước B.4: Build và khởi động lại Backend để áp dụng thay đổi
Chạy lệnh Docker Compose để dừng và rebuild lại backend với cấu hình mới:
```bash
# 1. Tắt các container hiện tại
docker compose down

# 2. Khởi động lại hệ thống và rebuild backend
docker compose up -d --build
```
*Lưu ý: Vì code backend được cập nhật cấu hình docker-compose, quá trình rebuild sẽ diễn ra rất nhanh (khoảng 1 - 2 phút) và tự động cập nhật biến môi trường mới vào container.*

---

## 5. Phần C: Kiểm tra sau khi cập nhật (Verification)

1.  Kiểm tra xem các container đã hoạt động bình thường chưa:
    ```bash
    docker compose ps
    ```
2.  Thử tạo một giao dịch nạp tiền mới trên trang web `https://unitaskapp.id.vn`.
3.  Sau khi giao diện chuyển sang trang thanh toán của PayOS, bạn kiểm tra link thanh toán (ở phần thông tin chuyển khoản) xem khi bấm quay lại hoặc thanh toán thành công, trình duyệt có tự động chuyển hướng về `https://unitaskapp.id.vn/payment/success` thay vì `localhost:4200` hay không.
