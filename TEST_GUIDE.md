# 📋 Hướng Dẫn Test Chat & Message API

## 🗂️ Cấu trúc Dữ Liệu Seed

Seed script sẽ tạo ra dữ liệu sau:

### 👥 Users (3 người)

| Email              | Role     | Password    | Công Ty          |
| ------------------ | -------- | ----------- | ---------------- |
| seeker@example.com | SEEKER   | password123 | -                |
| hr@techcorp.com    | EMPLOYEE | password123 | TechCorp Vietnam |
| hr2@startupvn.com  | EMPLOYEE | password123 | StartupVN Inc    |

### 🏢 Companies (2 công ty)

| ID  | Tên              | Ngành                  | Thành Phố        |
| --- | ---------------- | ---------------------- | ---------------- |
| 1   | TechCorp Vietnam | Information Technology | Ho Chi Minh City |
| 2   | StartupVN Inc    | Financial Technology   | Hanoi            |

### 💬 Chats (2 cuộc trò chuyện)

| ID  | Seeker   | Company          | Messages |
| --- | -------- | ---------------- | -------- |
| 1   | John Doe | TechCorp Vietnam | 3        |
| 2   | John Doe | StartupVN Inc    | 2        |

### 📨 Messages (5 tin nhắn)

- Chat 1: Seeker → Employee→ Seeker (3 messages)
- Chat 2: Seeker → Employee (2 messages)

---

## 🚀 Các Bước Để Setup

### 1️⃣ Chạy Seed Script

```bash
# Cách 1: Dùng Prisma seed
npx prisma db seed

# Cách 2: Dùng npm script
npm run db:seed
```

**Kết quả:**

```
✅ Seed dữ liệu thành công!
📊 Dữ liệu được tạo:
   - 3 Users (1 Seeker + 2 Employees)
   - 2 Companies
   - 2 Chats
   - 5 Messages

🔑 Thông tin đăng nhập:
   Seeker: seeker@example.com / password123
   Employee 1: hr@techcorp.com / password123
   Employee 2: hr2@startupvn.com / password123
```

### 2️⃣ Import Postman Collection

1. Mở Postman
2. **Collections** → **Import**
3. Chọn file `Chat-Message-API-Postman.postman_collection.json`
4. Chọn workspace và click **Import**

### 3️⃣ Chạy Tests

#### **Bước 1: Authenticate (Bắt buộc)**

Chạy lần lượt 3 requests trong folder **"Authentication"**:

- `Login as Seeker`
- `Login as Employee (TechCorp)`
- `Login as Employee (StartupVN)`

Variables sẽ tự động được lưu:

- `seekerToken`, `seekerId`, `seekerUserId`
- `employeeToken1`, `employeeUserId1`, `companyId1`
- `employeeToken2`, `employeeUserId2`, `companyId2`

#### **Bước 2: Test Chat API (Seeker)**

Chạy trong folder **"Chat API - Seeker"**:

1. `Create Chat (Seeker → TechCorp)` - tạo chat với company 1
2. `Create Chat (Seeker → StartupVN)` - tạo chat với company 2
3. `Get My Chats (Seeker)` - lấy tất cả chats của seeker
4. `Get Chat Detail (Chat 1)` - xem chi tiết chat 1
5. `Get Chat Detail (Chat 2)` - xem chi tiết chat 2

#### **Bước 3: Test Message API - Send**

Chạy trong folder **"Message API - Send"**:

1. `Send Message (Seeker to Chat 1)` - seeker gửi tin nhắn cho chat 1
2. `Send Message (Seeker to Chat 2)` - seeker gửi tin nhắn cho chat 2
3. `Send Message (Employee 1 Reply)` - employee 1 trả lời
4. `Send Message (Employee 2 Reply)` - employee 2 trả lời

#### **Bước 4: Test Message API - Retrieve**

Chạy trong folder **"Message API - Retrieve"**:

1. `Get Messages from Chat 1` - lấy tin nhắn từ chat 1
2. `Get Messages from Chat 2` - lấy tin nhắn từ chat 2
3. `Get Messages with Pagination (limit=10)` - test pagination

#### **Bước 5: Test Error Cases (Optional)**

Chạy trong folder **"Error Cases - Testing"**:

- `Send Empty Message (Should Fail)` - phải trả về error
- `Send Oversized Message (Should Fail)` - phải trả về error (> 1000 ký tự)
- `Access Chat Without Permission (Should Fail)` - employee khác không được xem chat
- `Get Invalid Chat ID (Should Fail)` - chat không tồn tại

---

## 📊 Thứ Tự Chạy Test (Recommend)

```
1. Authentication
   ├── Login as Seeker ✓
   ├── Login as Employee (TechCorp) ✓
   └── Login as Employee (StartupVN) ✓

2. Chat API - Seeker
   ├── Create Chat (Seeker → TechCorp) ✓
   ├── Create Chat (Seeker → StartupVN) ✓
   ├── Get My Chats (Seeker) ✓
   ├── Get Chat Detail (Chat 1) ✓
   └── Get Chat Detail (Chat 2) ✓

3. Message API - Send
   ├── Send Message (Seeker to Chat 1) ✓
   ├── Send Message (Seeker to Chat 2) ✓
   ├── Send Message (Employee 1 Reply) ✓
   └── Send Message (Employee 2 Reply) ✓

4. Message API - Retrieve
   ├── Get Messages from Chat 1 ✓
   ├── Get Messages from Chat 2 ✓
   └── Get Messages with Pagination ✓

5. Error Cases (Optional)
   ├── Send Empty Message ✓
   ├── Send Oversized Message ✓
   ├── Access Chat Without Permission ✓
   └── Get Invalid Chat ID ✓
```

---

## 🎯 Test Scenarios

### ✅ Scenario 1: Seeker Tạo Chat với Company

**Flow:**

1. Seeker login
2. Seeker tạo chat với TechCorp
3. Kiểm tra chat xuất hiện trong "Get My Chats"
4. Xem chi tiết chat

**Expected:**

- Chat được tạo với `chat_id` mới
- Danh sách chats chứa chat vừa tạo
- Có thể xem chi tiết chat với công ty

---

### ✅ Scenario 2: Trao Đổi Tin Nhắn

**Flow:**

1. Seeker gửi tin nhắn đầu tiên cho Chat 1
2. Employee 1 (TechCorp) trả lời
3. Seeker gửi tin nhắn tiếp
4. Lấy danh sách tin nhắn

**Expected:**

- Mỗi tin nhắn được lưu với `sender_type`, `sender_id`, `content`
- Tin nhắn hiển thị theo thứ tự `sent_at`
- `last_message_at` của chat được cập nhật
- Mỗi tin nhắn có trường `is_read` (default: false)

---

### ✅ Scenario 3: Pagination

**Flow:**

1. Gửi 10+ tin nhắn vào chat
2. Gọi API với `limit=5, offset=0`
3. Kiểm tra kết quả chỉ trả về 5 tin nhắn
4. Gọi với `limit=5, offset=5` để lấy tin nhắn tiếp theo

**Expected:**

- Tin nhắn được phân trang đúng
- Limit tối đa là 100 (nếu vượt sẽ set lại = 100)
- Offset phải >= 0

---

### ❌ Scenario 4: Authorization

**Flow:**

1. Employee 1 (TechCorp) login
2. Cố gắng xem Chat 2 (của StartupVN)
3. Cố gắng gửi tin nhắn vào Chat 2

**Expected:**

- GET /chat/{chat2Id} → **403 Forbidden** (không có quyền)
- POST /message cho Chat 2 → **403 Forbidden** (không có quyền)

---

### ❌ Scenario 5: Validation

**Flow:**

1. Gửi tin nhắn rỗng (`content: ""`)
2. Gửi tin nhắn quá dài (> 1000 ký tự)
3. Gửi tin nhắn không có `chatId`

**Expected:**

- Tất cả trả về **400 Bad Request** với message lỗi rõ ràng

---

## 📝 Ví Dụ Request/Response

### 1️⃣ Create Chat

**Request:**

```json
POST /chat
Authorization: Bearer {{seekerToken}}
Content-Type: application/json

{
  "company_id": 1
}
```

**Response (200):**

```json
{
  "chat_id": 1,
  "seeker_id": 1,
  "company_id": 1,
  "created_date": "2026-02-15T10:00:00.000Z",
  "last_message_at": null,
  "Company": {
    "company_id": 1,
    "company_name": "TechCorp Vietnam",
    "company_email": "contact@techcorp-vn.com",
    "company_image": "https://example.com/techcorp-logo.png"
  }
}
```

### 2️⃣ Send Message

**Request:**

```json
POST /message
Authorization: Bearer {{seekerToken}}
Content-Type: application/json

{
  "chatId": 1,
  "content": "Hello TechCorp!"
}
```

**Response (201):**

```json
{
  "message_id": 1,
  "chat_id": 1,
  "content": "Hello TechCorp!",
  "sender_type": "SEEKER",
  "sender_id": 1,
  "sent_at": "2026-02-15T10:05:30.000Z",
  "is_read": false
}
```

### 3️⃣ Get Messages

**Request:**

```
GET /message?chatId=1&limit=50&offset=0
Authorization: Bearer {{seekerToken}}
```

**Response (200):**

```json
[
  {
    "message_id": 1,
    "content": "Hello TechCorp!",
    "sent_at": "2026-02-15T10:05:30.000Z",
    "sender_type": "SEEKER",
    "sender_id": 1,
    "is_read": false
  },
  {
    "message_id": 2,
    "content": "Hi! How can we help?",
    "sent_at": "2026-02-15T10:10:00.000Z",
    "sender_type": "EMPLOYEE",
    "sender_id": 2,
    "is_read": true
  }
]
```

### 4️⃣ Get My Chats

**Request:**

```
GET /chat/me
Authorization: Bearer {{seekerToken}}
```

**Response (200):**

```json
[
  {
    "chat_id": 1,
    "seeker_id": 1,
    "company_id": 1,
    "created_date": "2026-02-15T08:00:00.000Z",
    "last_message_at": "2026-02-15T10:10:00.000Z",
    "Company": {
      "company_id": 1,
      "company_name": "TechCorp Vietnam",
      "company_email": "contact@techcorp-vn.com",
      "company_image": "https://example.com/techcorp-logo.png"
    },
    "Message": [
      {
        "message_id": 2,
        "content": "Hi! How can we help?",
        "sent_at": "2026-02-15T10:10:00.000Z",
        "sender_type": "EMPLOYEE"
      }
    ]
  },
  {
    "chat_id": 2,
    "seeker_id": 1,
    "company_id": 2,
    "created_date": "2026-02-14T09:00:00.000Z",
    "last_message_at": "2026-02-14T15:30:00.000Z",
    "Company": {
      "company_id": 2,
      "company_name": "StartupVN Inc",
      "company_email": "jobs@startupvn.io",
      "company_image": "https://example.com/startup-logo.png"
    },
    "Message": [
      {
        "message_id": 5,
        "content": "Perfect! Let's schedule an interview next week.",
        "sent_at": "2026-02-14T15:30:00.000Z",
        "sender_type": "EMPLOYEE"
      }
    ]
  }
]
```

---

## 🐛 Troubleshooting

### ❌ Lỗi: "Cannot find module 'src/...'"

**Giải pháp:**

```bash
npm run build
npm run start:dev
```

### ❌ Lỗi: "Cannot login"

**Giải pháp:**

1. Chạy seed script lại: `npm run db:seed`
2. Kiểm tra database connection trong `.env`
3. Xóa database và migrate lại:
   ```bash
   npx prisma migrate reset
   ```

### ❌ Lỗi: "Invalid token"

**Giải pháp:**

1. Logout rồi login lại trong Postman
2. Kiểm tra token trong environment variables
3. Đảm bảo request có header `Authorization: Bearer {{token}}`

### ❌ Lỗi: WebSocket Connection Failed (for chat gateway)

**Giải pháp:**

1. Kiểm tra server đang chạy: `npm run start:dev`
2. Kiểm tra CORS config trong `chat.gateway.ts`
3. Dùng client như `socket.io-client` để test WebSocket

---

## 🔍 Kiểm Tra Toàn Bộ Flow

Chạy tất cả requests theo thứ tự:

```bash
# Terminal 1: Start server
npm run start:dev

# Terminal 2: Run seed
npm run db:seed

# Terminal 3: Mở Postman và test
# - Import collection
# - Run all tests
```

---

## 📚 API Documentation

### Chat API

#### Create Chat

```
POST /chat
Authorization: Bearer {token}
Content-Type: application/json

Body: {
  "company_id": number (required)
}

Response: 201 - Chat object
Response: 400 - Bad request
Response: 401 - Unauthorized
Response: 404 - Company not found
```

#### Get My Chats (Seeker only)

```
GET /chat/me
Authorization: Bearer {token}

Response: 200 - Array of Chat objects
Response: 401 - Unauthorized
```

#### Get Chat Detail

```
GET /chat/{chatId}
Authorization: Bearer {token}

Response: 200 - Chat object with messages
Response: 401 - Unauthorized
Response: 403 - Forbidden (no permission)
Response: 404 - Chat not found
```

### Message API

#### Send Message

```
POST /message
Authorization: Bearer {token}
Content-Type: application/json

Body: {
  "chatId": number (required),
  "content": string (required, 1-1000 chars)
}

Response: 201 - Message object
Response: 400 - Bad request / Validation error
Response: 401 - Unauthorized
Response: 404 - Chat not found
```

#### Get Messages

```
GET /message?chatId={chatId}&limit={limit}&offset={offset}
Authorization: Bearer {token}

Query Params:
- chatId: number (required)
- limit: number (default: 50, max: 100)
- offset: number (default: 0)

Response: 200 - Array of Message objects
Response: 401 - Unauthorized
Response: 404 - Chat not found
```

---

**Happy Testing! 🎉**
