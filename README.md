# Luyện đề JLPT (chạy trên máy, không cần cài gì)

## Cấu trúc thư mục

```
jlpt-test/
├── index.html            Cả web nằm trong file này
├── json/                 Mỗi đề là một tệp .json nằm trong đây
│   ├── jlpt_n4_2010_2011.json
│   ├── ...
│   └── _danh-sach.js     Danh sách tự tạo, để mở bằng nhấp đúp là thấy đề ngay (đừng xóa)
└── README.md
```

## Web tự hiện đề trong thư mục json như thế nào

| Cách bạn mở web | Đề có trong thư mục json |
|---|---|
| VS Code **Live Server**, hoặc bất kỳ máy chủ web nào (ví dụ `python -m http.server`) | Tự quét thư mục `json`. Thêm tệp rồi **tải lại trang** là thấy. |
| **GitHub Pages** (`tên.github.io/tên-repo`) | Tự lấy danh sách tệp trong thư mục `json` của repo qua GitHub. Đẩy tệp mới lên (push) rồi tải lại trang là thấy. |
| **Nhấp đúp** `index.html` (địa chỉ `file://`) | Trình duyệt không cho tự đọc thư mục, nên web đọc `json/_danh-sach.js`. Mở lên là thấy đề, không cần bấm gì. |

Chỉ riêng trường hợp **nhấp đúp** và bạn **tự chép thêm tệp .json bằng tay** thì `_danh-sach.js` chưa có đề mới. Khi đó vào tab **Ngân hàng đề**, bấm **Quét thư mục**, chọn thư mục `json` và bấm Cho phép (Chrome hoặc Edge). Web đọc lại thư mục và tự cập nhật `_danh-sach.js`, các lần mở sau không cần bấm nữa.

## Thêm đề

- **Cách 1:** chép tệp .json vào thư mục `json` (rồi tải lại trang, hoặc bấm Quét thư mục nếu mở bằng nhấp đúp).
- **Cách 2:** tab **Nhập đề**, dán JSON. Nếu đã cho phép ghi vào thư mục (Chrome hoặc Edge), web tự ghi tệp vào `json` và cập nhật `_danh-sach.js`.

Đặt tên đề dạng `N4 T7/2021` để web tự xếp đề theo cấp, năm, tháng.

## Định dạng JSON

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
- Mỗi tệp một đề thì web mới sửa tên, cấp và xóa tệp giúp bạn được. Tệp dạng `{"exams": [...]}` vẫn đọc được nhưng web không ghi đè.

## Lưu ý

- Ghi và xóa tệp trong thư mục chỉ làm được trên Chrome hoặc Edge (máy tính) sau khi bạn cho phép. Các trường hợp khác web chỉ đọc, đề mới thì bấm "Tải JSON" rồi tự bỏ tệp vào `json`.
- Chrome không cho chọn thẳng các thư mục như Desktop, Documents, Downloads. Hãy chọn thư mục con `json`.
- **Xóa đề trong web là xóa tệp thật** (khi đã cho phép ghi), không qua thùng rác.
- Tệp nào lỗi (JSON sai, thiếu đáp án…) được liệt kê ở mục “tệp không đọc được” ngay trên tab Ngân hàng đề.
- Font dùng bộ メイリオ (Meiryo) có sẵn trên Windows nên không cần mạng.
