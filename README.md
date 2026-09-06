# Đọc Truyện — chuyển văn bản thành giọng nói

Một trang web đơn giản, chạy hoàn toàn trong trình duyệt: dán truyện vào, bấm đọc,
nghe giọng đọc máy đọc lại nội dung — không cần server, không cần API key, không mất phí.

Trang dùng **Web Speech API** có sẵn trong trình duyệt (Chrome, Edge, Safari...),
nên chất lượng giọng đọc phụ thuộc vào giọng mà máy/trình duyệt của người nghe có sẵn.

## Tính năng

- Dán hoặc gõ văn bản trực tiếp, tự lưu lại trong trình duyệt (localStorage)
- Chọn giọng đọc trong danh sách giọng có sẵn trên máy (ưu tiên hiển thị giọng tiếng Việt nếu có)
- Chỉnh tốc độ, cao độ, âm lượng
- Đọc / tạm dừng / dừng hẳn, và nhảy tới câu trước / câu sau
- Đang đọc tới câu nào thì câu đó được tô sáng trên "trang giấy"

## Chạy thử trên máy

Không cần cài gì cả — chỉ cần mở file `index.html` bằng trình duyệt.

Hoặc chạy một server tĩnh nhỏ (khuyên dùng, tránh vài giới hạn của trình duyệt khi mở file trực tiếp):

```bash
# Python có sẵn trên hầu hết máy
python3 -m http.server 8000
```

Rồi mở `http://localhost:8000` trong trình duyệt.

## Đưa lên GitHub Pages (miễn phí)

1. Tạo một repository mới trên GitHub, ví dụ đặt tên `doc-truyen`.
2. Đưa 3 file `index.html`, `style.css`, `script.js` (và `README.md` này) lên repo đó.
   - Cách dễ nhất: vào trang repo trên GitHub → **Add file → Upload files** → kéo thả 3 file vào → **Commit changes**.
   - Hoặc dùng Git dòng lệnh:
     ```bash
     git init
     git add .
     git commit -m "Trang đọc truyện đầu tiên"
     git branch -M main
     git remote add origin https://github.com/<ten-cua-ban>/doc-truyen.git
     git push -u origin main
     ```
3. Vào repo trên GitHub → **Settings → Pages**.
4. Ở mục **Build and deployment**, chọn **Source: Deploy from a branch**.
5. Chọn **Branch: main**, thư mục **/ (root)** → **Save**.
6. Đợi khoảng 1 phút, GitHub sẽ cho bạn một đường link dạng:
   `https://<ten-cua-ban>.github.io/doc-truyen/`

Vậy là xong — ai cũng có thể mở link đó để dùng trang của bạn.

## Ghi chú về giọng đọc tiếng Việt

Không phải máy nào cũng có sẵn giọng tiếng Việt. Nếu trang báo "chưa có giọng tiếng Việt":

- Trên **Windows**: vào Settings → Time & Language → Speech, tải thêm giọng tiếng Việt.
- Trên **macOS**: vào System Settings → Accessibility → Spoken Content, tải giọng "Vietnamese".
- Trên **Android**: cài thêm dữ liệu giọng nói tiếng Việt cho Google Text-to-Speech (Settings → System → Languages & input → Text-to-speech).
- Nếu không có giọng tiếng Việt, trang vẫn đọc được bằng giọng ngôn ngữ khác, chỉ là phát âm sẽ không chuẩn.

## Muốn nâng cấp lên giọng AI chất lượng cao hơn?

Bản này dùng giọng đọc miễn phí có sẵn của trình duyệt/hệ điều hành, nên chất lượng có giới hạn.
Nếu sau này bạn muốn giọng đọc tự nhiên hơn (kiểu giọng AI), sẽ cần gọi tới một dịch vụ
text-to-speech qua API (ví dụ Google Cloud TTS, ElevenLabs, FPT.AI...), việc này thường cần
một server nhỏ để giữ kín API key và có thể phát sinh chi phí theo số ký tự đọc.
Cứ quay lại đây khi bạn muốn làm phần đó, mình sẽ hướng dẫn tiếp.

## Cấu trúc file

```
doc-truyen/
├── index.html   # bố cục trang
├── style.css    # giao diện
├── script.js    # xử lý đọc văn bản
└── README.md    # file này
```
