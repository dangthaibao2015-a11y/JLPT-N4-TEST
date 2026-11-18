# Luyện đề JLPT (chạy trên máy, không cần cài gì)

## Cấu trúc thư mục

```
jlpt-test/
├── index.html      Cả web nằm trong file này
├── json/           Mỗi đề là một tệp .json nằm trong đây
│   └── N4 T7-2021.json
└── README.md
```

## Cách dùng

1. Giải nén, nhấp đúp `index.html` để mở bằng **Chrome hoặc Edge**.
2. Ở tab **Ngân hàng đề**, bấm **Chọn thư mục json**, chọn thư mục `json` trong thư mục này, rồi bấm Cho phép. Web đọc mọi tệp .json trong đó (kể cả thư mục con).
3. Lần sau mở lại, nếu trình duyệt hỏi quyền thì bấm **Cho phép và đọc thư mục**, một lần là xong.

## Thêm đề

- **Cách 1:** chép tệp .json vào thư mục `json`, rồi bấm **Quét lại** ở tab Ngân hàng đề.
- **Cách 2:** vào tab **Nhập đề**, dán JSON. Khi đã kết nối thư mục, web tự ghi mỗi đề thành một tệp trong `json`.

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

- Ghi và xóa tệp trong thư mục chỉ làm được trên Chrome hoặc Edge (máy tính). Firefox và Safari chỉ có chế độ **chỉ đọc**: chọn thư mục để đọc, còn đề mới thì bấm "Tải JSON" rồi tự bỏ tệp vào `json`.
- Chrome không cho chọn thẳng các thư mục như Desktop, Documents, Downloads. Hãy chọn thư mục con `json`.
- **Xóa đề trong web là xóa tệp thật** trong thư mục, không qua thùng rác.
- Tệp nào lỗi (JSON sai, thiếu đáp án…) sẽ được liệt kê ở mục “tệp không đọc được” ngay trên tab Ngân hàng đề.
- Web giữ thêm một bản sao trong trình duyệt để mở lên là thấy ngay, nhưng thư mục `json` mới là bản gốc: quét lại là web lấy theo thư mục.
- Font chữ tải từ Google nên cần mạng, nếu không có mạng web tự dùng font hệ thống.
