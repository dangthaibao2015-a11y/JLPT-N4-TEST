# Luyện đề JLPT

Trang web cho người học: xem đề theo cấp, thi từng đề, trộn nhiều đề và chọn số câu từng phần.

## Cấu trúc

```
index.html          Toàn bộ trang web
json/               Mỗi đề là một tệp .json
  _danh-sach.js     Danh sách đề do trang quản lý tạo ra (dự phòng khi GitHub không trả danh sách)
README.md
```

## Thêm đề (dành cho người đăng đề)

1. Bỏ tệp `.json` của đề vào thư mục `json/`.
2. Commit và push lên GitHub, đợi 1 đến 2 phút. Trang người học tự đọc thư mục `json/` của repo nên đề mới tự hiện.
3. (Nên làm) Cập nhật `json/_danh-sach.js` để trang vẫn đủ đề khi GitHub từ chối trả danh sách:
   - Mở trang bằng địa chỉ có đuôi `#quan-ly`, ví dụ `index.html#quan-ly` hoặc `.../JLPT-N4-TEST/#quan-ly`.
   - Bấm **Chọn thư mục json**, chọn thư mục `json` trong dự án, bấm Cho phép (cần Chrome hoặc Edge).
   - Web quét thư mục, ghi lại `json/_danh-sach.js` và báo các tệp bị lỗi (nếu có).
   - Commit và push thêm tệp `_danh-sach.js`.

Trang `#quan-ly` không có nút nào dẫn tới và chỉ thao tác trên thư mục ở máy bạn, không thay đổi được trang web trên mạng.

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
- Tệp sai định dạng sẽ không hiện cho người học. Trang `#quan-ly` liệt kê các tệp lỗi và lý do.

## Cách trang đọc danh sách đề

| Cách mở trang | Cách đọc thư mục json |
|---|---|
| GitHub Pages | Hỏi GitHub danh sách tệp trong `json/`; nếu không được thì đọc `json/index.json`, rồi `json/_danh-sach.js` |
| Live Server hoặc máy chủ web khác | Đọc danh sách thư mục của máy chủ |
| Nhấp đúp `index.html` | Đọc `json/_danh-sach.js` |

GitHub giới hạn khoảng 60 lượt hỏi mỗi giờ cho mỗi địa chỉ mạng. Khi vượt, người học vẫn thấy đủ đề trong lần cập nhật gần nhất của `_danh-sach.js`.
