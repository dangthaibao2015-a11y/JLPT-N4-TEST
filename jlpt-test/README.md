# Luyện đề JLPT (Vercel + Neon)

Trang luyện đề có tài khoản: đăng ký, đăng nhập, thi, lưu kết quả mỗi lần nộp bài, xem lịch sử. Admin quản lý đề (dán JSON), người dùng và kết quả ngay trên web.

## Luồng sử dụng

1. **Người học:** vào trang, Tạo tài khoản (chỉ cần tên đăng nhập và mật khẩu), đăng nhập.
2. Chọn đề ở **Ngân hàng đề** hoặc **Tạo bài thi** (chọn cấp, đề, số câu từng phần), làm bài, nộp.
3. Mỗi lần nộp, kết quả được lưu: số câu đúng, sai, bỏ trống, điểm từng phần, thời gian làm, đề nào. Xem lại ở tab **Lịch sử** (kèm số lần làm, số câu đã làm, tỉ lệ đúng, số ngày đã luyện).
4. **Tài khoản** (bấm vào tên): đổi mật khẩu. Quên mật khẩu thì nhắn tin cho admin Anh Hào (đổi tên ở dòng `ADMIN_CONTACT` đầu phần script của `public/index.html`).
5. **Admin** thấy thêm tab **Quản lý**: Đề thi (dán JSON, sửa tên và cấp, tải JSON, xóa), Người dùng (đặt lại mật khẩu, khóa, cấp hoặc gỡ quyền admin), Kết quả của mọi người.

## Cài đặt (làm một lần)

1. **GitHub:** thay toàn bộ nội dung repo bằng thư mục này, commit và push.
2. **Vercel:** vercel.com, Add New, Project, chọn repo. Framework Preset để **Other**, các ô khác để mặc định. Bấm Deploy.
3. **Neon:** trong project Vercel vào **Storage**, tạo database **Neon** và nối vào project (bật cả Production và Preview). Vercel tự thêm biến `DATABASE_URL`.
4. **Admin:** vào **Settings, Environment Variables**, thêm hai biến:
   - `ADMIN_USERNAME`: tên đăng nhập admin (3 đến 30 ký tự, chữ không dấu, số, `.` `_` `-`)
   - `ADMIN_PASSWORD`: mật khẩu (từ 8 ký tự)
5. **Redeploy** (tab Deployments). Mở trang web và đăng nhập bằng tài khoản admin vừa đặt.

Không cần chạy SQL. Bảng còn thiếu được tự tạo ở lần gọi đầu tiên sau mỗi lần deploy. Các đề trong `data/exams/` được nạp vào cơ sở dữ liệu đúng một lần, ngay lúc bảng `exams` được tạo (xóa đề sau đó không làm đề tự quay lại).

Nếu cơ sở dữ liệu của bạn đã có sẵn `users`, `sessions`, `auth_events` từ bản trước thì cứ giữ nguyên: người dùng cũ vẫn đăng nhập được, web chỉ thêm `exams` và `attempts`. Bảng `settings` của bản cũ không còn dùng nữa, xóa hay giữ đều được. Tài khoản admin chỉ được tạo nếu chưa có. Sau khi vào được, hãy đổi mật khẩu ở mục Tài khoản (mật khẩu trong biến môi trường chỉ dùng để tạo tài khoản lần đầu, đổi trong web sẽ không ảnh hưởng tới biến đó).

## Đề nằm ở đâu

Sau lần nạp đầu, đề nằm trong cơ sở dữ liệu. Thêm, sửa, xóa đề ở **Quản lý, Đề thi**, không cần commit. Thư mục `data/exams/` chỉ là bộ đề nạp ban đầu: sửa tệp trong đó sau khi đã deploy sẽ **không** thay đổi đề đang có.

Định dạng JSON của một đề:

```json
{
  "name": "N4 T7/2021",
  "level": "N4",
  "questions": [
    {
      "section": "A",
      "sectionTitle": "文字・語彙",
      "mondai": "問題1",
      "instruction": "＿＿＿の言葉の読み方として…",
      "text": "来週、友達と__映画__を見に行きます。",
      "choices": ["えいか", "えいが", "えいがく", "えが"],
      "answer": 2
    }
  ]
}
```

- Bắt buộc: `section`, `text`, `choices` (2 đến 6 đáp án), `answer` (số thứ tự đáp án đúng, đếm từ 1).
- Không bắt buộc: `sectionTitle`, `mondai`, `instruction`, `passage`, `group`, `explanation`.
- Các câu cùng một bài đọc dùng chung `group` và `passage` để đi liền nhau. Từ gạch chân viết trong hai dấu gạch dưới, ví dụ `__映画__`.
- Đặt tên đề dạng `N4 T7/2021` để tự xếp theo cấp, năm, tháng. Có thể dán nhiều đề một lần bằng `{"exams": [ ... ]}`.

## Logo

Logo nằm ở `public/logo.png` (hiện ở thanh trên cùng và màn đăng nhập). Muốn đổi thì thay tệp này, giữ tên `logo.png`. Nên dùng PNG nền trong suốt, tỉ lệ ngang khoảng 3:1 (ảnh hiện tại 160 x 52). Ở chế độ tối, logo tự đặt trên nền trắng nhỏ để chữ đen vẫn đọc được.

## Cấu trúc

```
public/index.html      Giao diện
public/logo.png        Logo
api/auth.js            Đăng ký, đăng nhập, đăng xuất, đổi mật khẩu
api/exams.js           Đề cho người đã đăng nhập
api/attempts.js        Lưu kết quả làm bài, xem lịch sử
api/admin.js           Quản lý (chỉ admin)
api/_lib/              Mã dùng chung (kết nối, bảng, mật khẩu, phiên)
data/exams/            Bộ đề nạp ban đầu
vercel.json            Cấu hình Vercel
```

Các bảng (5): `users` (có cờ `is_admin` và `is_disabled`), `sessions`, `exams`, `attempts`, `auth_events`.

## An toàn: đã làm gì và còn gì

- Mật khẩu được băm bằng scrypt. Mã phiên chỉ lưu bản băm, cookie ẩn với trang (HttpOnly, Secure, SameSite=Lax), hạn 30 ngày. Đổi mật khẩu hoặc đặt lại sẽ đăng xuất các máy khác.
- Nhập sai mật khẩu quá nhiều lần bị chặn 15 phút. Đăng ký tối đa 60 lượt mỗi giờ từ một địa chỉ mạng (vì không còn mã lớp, đây là chốt chặn spam).
- Cờ admin và trạng thái khóa luôn được máy chủ đọc lại từ cơ sở dữ liệu ở mỗi yêu cầu. Mọi API quản lý đều kiểm tra quyền admin ở máy chủ.
- Còn lại: đáp án nằm trong dữ liệu đề gửi xuống trình duyệt của người đã đăng nhập, và điểm do trình duyệt tính rồi gửi lên, nên người học có thể sửa điểm của chính mình. Admin nên coi bảng kết quả là tham khảo luyện tập, không phải điểm thi chính thức.
- Không có email nên không có "quên mật khẩu" tự động.

## Chưa làm

Lưu từng câu đã chọn (để xem lại bài cũ và thống kê câu hay sai), làm dở rồi làm tiếp, chấm điểm trên máy chủ.
