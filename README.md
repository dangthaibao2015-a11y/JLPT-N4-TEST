# Luyện đề JLPT

Trang web cho người học: xem đề theo cấp, thi từng đề, trộn nhiều đề và chọn số câu từng phần.

## Cấu trúc

```
index.html          Toàn bộ trang web
json/               Mỗi đề là một tệp .json
  _danh-sach.js     Danh sách đề, tạo ra từ chính trang web (xem bên dưới)
README.md
```

## Thêm đề mới (người đăng đề)

1. Bỏ tệp `.json` của đề vào thư mục `json/`.
2. Bấm nút **Quản lý** ở góc trên của trang. Nhập **key admin** (đặt ở dòng `ADMIN_KEY` đầu phần script) rồi bấm Xác nhận.
3. Bước 1: bấm **Chọn thư mục json**, chọn thư mục `json` trong dự án (hoặc cả thư mục dự án) rồi cho phép. Web nhớ thư mục này cho các lần sau, lần sau chỉ cần bấm **Dùng lại thư mục**.
4. Bước 2: bấm **Tạo và lưu vào thư mục**. Web lưu thẳng `json/_danh-sach.js` vào thư mục.
5. Commit và push.

Chỉ Chrome và Edge (máy tính) lưu thẳng được. Trình duyệt khác sẽ tải `_danh-sach.js` về để bạn tự chép vào `json/`.

Người học luôn đọc đề từ `json/_danh-sach.js`, nên **thêm tệp .json mà chưa tạo lại danh sách thì người học chưa thấy đề mới**.

Người học cũng thấy nút Quản lý nhưng không có key thì không vào được. Key nằm ngay trong mã nguồn nên chỉ để người học không bấm nhầm, không phải khóa bảo mật. Khu quản lý không sửa được gì trên web, chỉ tạo ra tệp danh sách trong thư mục ở máy bạn.

## Định dạng tệp JSON

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
- Các câu cùng một bài đọc dùng chung `group` và `passage` để luôn đi liền nhau.
- Từ gạch chân viết trong hai dấu gạch dưới, ví dụ `__映画__`.
- Đặt tên đề dạng `N4 T7/2021` để trang tự xếp theo cấp, năm, tháng.
- Tệp sai định dạng sẽ không có trong danh sách. Trang `#quan-ly` liệt kê các tệp lỗi và lý do.

## Cách trang đọc danh sách đề

Thứ tự thử: danh sách thư mục của máy chủ (Live Server, `python -m http.server`) → `json/_danh-sach.js` → hỏi GitHub (chỉ khi không có tệp danh sách) → `json/index.json`.
