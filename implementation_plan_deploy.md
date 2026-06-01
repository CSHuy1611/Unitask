# Kế hoạch Deploy Hệ thống UniTask lên VPS bằng Docker & Cloudflare DNS Proxy (Không cần thẻ thanh toán)

Tài liệu này hướng dẫn chi tiết từng bước (không nhảy cóc) để đưa dự án UniTask (gồm Angular Frontend, ASP.NET Core Backend và MS SQL Server Database) lên VPS chạy Ubuntu, cấu hình tên miền **unitaskapp.id.vn** qua Cloudflare DNS Proxy để lấy HTTPS miễn phí mà **không cần thẻ thanh toán**.

---

## 1. Đánh giá VPS và Tên miền của Bạn

Hiện tại:
*   **Tên miền:** Đã kích hoạt thành công trên Cloudflare (`unitaskapp.id.vn`).
*   **VPS:** Bạn chuẩn bị đăng ký VPS (Gói **VPS CHEAP 2** - 2 vCPU E5 v2, 4 GB RAM, 40 GB SSD của Vietnix chạy hệ điều hành **Ubuntu 22.04 LTS** hoặc **Ubuntu 24.04 LTS**).
*   **Thay đổi giải pháp:** Vì Cloudflare Tunnel yêu cầu liên kết thẻ thanh toán để xác thực tài khoản Zero Trust, chúng ta sẽ chuyển sang dùng giải pháp **Cloudflare DNS Proxy (SSL Flexible)**. Giải pháp này hoàn toàn miễn phí, **không yêu cầu thẻ thanh toán**, vẫn ẩn được IP VPS thực tế và tự động có HTTPS bảo mật.

---

## 2. Nguyên lý hoạt động của Cloudflare DNS Proxy

Thay vì dùng đường ống Tunnel, chúng ta sẽ trỏ trực tiếp tên miền về IP của VPS thông qua Cloudflare DNS và bật chế độ **Proxied (Đám mây màu vàng)**.

```text
[Người dùng] --(HTTPS - cổng 443)--> [Cloudflare Edge] --(HTTP - cổng 80)--> [VPS của bạn]
                                                                                  |
                                                                        [frontend container:80]
                                                                                  |
                                                                        [backend container:8080]
```

*   **SSL Flexible:** Cloudflare sẽ chịu trách nhiệm mã hóa HTTPS (cổng 443) từ trình duyệt người dùng đến máy chủ Cloudflare. Từ Cloudflare về VPS của bạn sẽ chạy qua giao thức HTTP (cổng 80).
*   **Ẩn IP thật:** Khi người dùng check DNS tên miền `unitaskapp.id.vn`, họ chỉ thấy IP của Cloudflare chứ không thấy IP thật của VPS của bạn.
*   **Yêu cầu cổng trên VPS:** Bạn chỉ cần mở cổng `80` trên VPS (mặc định các nhà cung cấp VPS đã mở sẵn cổng này). Cổng database `1433` và backend `5250` sẽ được đóng hoàn toàn đối với bên ngoài.

---

## 3. Phần A: Cấu hình trên Cloudflare Dashboard (Thao tác trên Web)

Sau khi mua VPS, bạn sẽ có địa chỉ IP của VPS (Ví dụ: `103.153.254.89`). Hãy thực hiện cấu hình DNS như sau:

### Bước A.1: Trỏ tên miền về IP của VPS
1.  Truy cập [dash.cloudflare.com](https://dash.cloudflare.com/) và đăng nhập tài khoản.
2.  Click chọn tên miền **unitaskapp.id.vn** trong danh sách.
3.  Nhìn vào menu bên trái, click chọn **DNS** -> chọn tiếp **Records**.
4.  Tạo bản ghi trỏ tên miền chính:
    *   Click vào nút **Add record** màu xanh.
    *   **Type:** Chọn `A`.
    *   **Name:** Nhập `@` (hoặc nhập `unitaskapp.id.vn`).
    *   **IPv4 address:** Dán địa chỉ IP thật của VPS vào đây (Ví dụ: dán IP VPS của bạn).
    *   **Proxy status:** Đảm bảo thanh gạt được bật sang màu cam (đám mây cam - **Proxied**).
    *   Click nút **Save**.
5.  Tạo bản ghi phụ (cho đường dẫn www):
    *   Click tiếp vào nút **Add record**.
    *   **Type:** Chọn `CNAME`.
    *   **Name:** Nhập `www`.
    *   **Target:** Nhập `unitaskapp.id.vn`.
    *   **Proxy status:** Đảm bảo bật màu cam (**Proxied**).
    *   Click nút **Save**.

### Bước A.2: Cấu hình SSL ở chế độ Flexible
1.  Nhìn vào menu bên trái của Cloudflare, click chọn mục **SSL/TLS** -> Chọn **Overview**.
2.  Tại mục cấu hình chế độ mã hóa, bạn click chọn vào tùy chọn **Flexible** (mã hóa kết nối giữa trình duyệt người dùng và Cloudflare).

---

## 4. Phần B: Thiết lập trên VPS và Khởi chạy code (Thao tác trên VPS)

Khi bạn có thông tin IP VPS, tài khoản `root` và mật khẩu từ Vietnix:

### Bước B.1: Kết nối SSH vào VPS
1.  Mở **PowerShell** trên máy tính Windows (nhấn `Windows + R`, gõ `powershell` -> Enter).
2.  Chạy lệnh kết nối (thay thế `<IP_VPS>` bằng IP thật của bạn):
    ```bash
    ssh root@<IP_VPS>
    ```
3.  Gõ `yes` khi hệ thống hỏi và dán mật khẩu VPS vào (lưu ý: khi dán mật khẩu trên Linux, màn hình sẽ không hiển thị các ký tự tròn hay dấu sao, bạn cứ dán rồi nhấn Enter).

### Bước B.2: Thiết lập múi giờ Việt Nam và cập nhật VPS
Chạy các lệnh sau từng dòng một:
```bash
apt update && apt upgrade -y
timedatectl set-timezone Asia/Ho_Chi_Minh
```

### Bước B.3: Tạo RAM ảo (Swap RAM) - Tránh lỗi sập database
```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
free -h
```

### Bước B.4: Cài đặt Docker và Docker Compose trên VPS
Chạy các lệnh sau từng dòng một để cài đặt Docker:
```bash
# 1. Cài đặt các gói phụ trợ
apt install -y ca-certificates curl gnupg lsb-release

# 2. Thêm khóa GPG chính thức của Docker
mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 3. Đăng ký repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Cập nhật apt và cài đặt Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Kiểm tra cài đặt thành công
docker --version
docker compose version
```

### Bước B.5: Cấu hình SSH Key kết nối GitHub để tải Code
1.  Tạo SSH Key trên VPS:
    ```bash
    ssh-keygen -t ed25519 -C "email-cua-ban@example.com"
    ```
    *(Nhấn Enter 3 lần liên tục để lưu mặc định).*
2.  Hiển thị khóa công khai (Public Key):
    ```bash
    cat ~/.ssh/id_ed25519.pub
    ```
3.  Bôi đen và Copy toàn bộ chuỗi ký tự hiển thị trên màn hình.
4.  Truy cập vào **GitHub Repository dự án của bạn** -> Click chọn **Settings** ở thanh tab trên cùng -> Chọn **Deploy keys** ở menu bên trái -> Click nút **Add deploy key** ở góc phải:
    *   **Title:** Điền `UniTask-VPS`
    *   **Key:** Dán chuỗi ký tự vừa copy từ VPS vào đây.
    *   Click **Add key**.

### Bước B.6: Tải Source Code (Clone Code) về VPS
```bash
# 1. Tạo thư mục chứa code
mkdir -p /var/www
cd /var/www

# 2. Tải code từ GitHub (Thay đường dẫn bằng link SSH của repo bạn)
git clone git@github.com:Username/RepoName.git unitask
cd unitask
```

### Bước B.7: Tạo và cấu hình file biến môi trường `.env`
1.  Tạo file `.env`:
    ```bash
    cp .env.example .env
    ```
2.  Mở file `.env` bằng trình soạn thảo `nano`:
    ```bash
    nano .env
    ```
3.  Cập nhật các dòng cấu hình (sử dụng phím mũi tên để di chuyển):
    *   `MSSQL_SA_PASSWORD=Mật_Khẩu_Mạnh_Của_Bạn_2026!`
    *   `JWT_KEY=Chuỗi_Bảo_Mật_JWT_Ngẫu_Nhiên_Rất_Dài_Của_Bạn_12345!`
    *   `CLOUDINARY_*`, `PAYOS_*`: Điền thông tin API Key thật của bạn.
4.  Lưu và thoát: Nhấn **Ctrl + O** -> **Enter** để lưu, nhấn **Ctrl + X** để thoát.

---

## 5. Phần C: Cập nhật cấu hình Docker Compose (Mở cổng Frontend)

Vì không dùng Cloudflare Tunnel, chúng ta sẽ mở cổng `80` của container `frontend` ra ngoài VPS để Cloudflare DNS trỏ trực tiếp vào.

1.  Mở file `docker-compose.yml` trên VPS để sửa đổi:
    ```bash
    nano docker-compose.yml
    ```
2.  Xóa toàn bộ nội dung cũ và dán nội dung cấu hình tối ưu dưới đây (đã mở cổng `80:80` cho frontend và loại bỏ hoàn toàn service `cloudflare-tunnel`):

```yaml
version: '3.8'

services:
  database:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: unitask-db
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=${MSSQL_SA_PASSWORD}
      - MSSQL_MEMORY_LIMIT_MB=2048
    volumes:
      - mssql-data:/var/opt/mssql
    networks:
      - unitask-network
    restart: always
    healthcheck:
      test: ["CMD", "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa", "-P", "${MSSQL_SA_PASSWORD}", "-C", "-Q", "SELECT 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  backend:
    build:
      context: ./backend/UniTask_BE
      dockerfile: Dockerfile
    container_name: unitask-backend
    environment:
      - ConnectionStrings__DefaultConnection=Server=database;Database=UniTaskDb;User Id=sa;Password=${MSSQL_SA_PASSWORD};TrustServerCertificate=True;MultipleActiveResultSets=true
      - Jwt__Key=${JWT_KEY}
      - Jwt__Issuer=${JWT_ISSUER}
      - Jwt__Audience=${JWT_AUDIENCE}
      - Cloudinary__CloudName=${CLOUDINARY_CLOUD_NAME}
      - Cloudinary__ApiKey=${CLOUDINARY_API_KEY}
      - Cloudinary__ApiSecret=${CLOUDINARY_API_SECRET}
      - PayOS__ClientId=${PAYOS_CLIENT_ID}
      - PayOS__ApiKey=${PAYOS_API_KEY}
      - PayOS__ChecksumKey=${PAYOS_CHECKSUM_KEY}
      - Frontend__Url=https://unitaskapp.id.vn  # Tên miền thật của bạn
    depends_on:
      database:
        condition: service_healthy
    networks:
      - unitask-network
    restart: always

  frontend:
    build:
      context: ./frontend/unitask
      dockerfile: Dockerfile
    container_name: unitask-frontend
    ports:
      - "80:80"  # Mở cổng 80 của VPS để Cloudflare DNS chuyển tiếp traffic vào frontend
    depends_on:
      - backend
    networks:
      - unitask-network
    restart: always

volumes:
  mssql-data:
    driver: local

networks:
  unitask-network:
    driver: bridge
```

3.  Lưu và thoát: Nhấn **Ctrl + O** -> **Enter** để lưu, nhấn **Ctrl + X** để thoát.

---

## 6. Phần D: Khởi động dự án và Kiểm tra kết nối

### Bước D.1: Khởi chạy các container
Chạy câu lệnh sau để tự động tải các Image, build code frontend Angular, backend .NET và chạy ngầm toàn bộ dịch vụ:
```bash
docker compose up -d --build
```
*Lưu ý: Quá trình build lần đầu tiên trên VPS có thể mất khoảng 5 - 10 phút.*

### Bước D.2: Kiểm tra trạng thái các container
1.  Xem danh sách các dịch vụ đang chạy:
    ```bash
    docker compose ps
    ```
    *Đảm bảo 3 container (`unitask-db`, `unitask-backend`, `unitask-frontend`) đều có trạng thái `running` (Up).*
2.  Xem log khởi động của backend để kiểm tra kết nối database và chạy migration:
    ```bash
    docker compose logs backend -f
    ```
    *Nhấn **Ctrl + C** để thoát.*

### Bước D.3: Kiểm tra trực tiếp trên trình duyệt
1.  Mở trình duyệt trên máy tính cá nhân của bạn.
2.  Truy cập vào tên miền của bạn: `https://unitaskapp.id.vn`.
3.  Kiểm tra giao diện Angular hiển thị thành công và có HTTPS (biểu tượng ổ khóa màu xanh lá/xám trên thanh địa chỉ).
4.  Thử chức năng Đăng ký / Đăng nhập.
