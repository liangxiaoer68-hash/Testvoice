# Đọc Truyện — chuyển văn bản thành giọng nói, tải MP3

Trang web chạy hoàn toàn trong trình duyệt: dán truyện vào, nghe đọc bằng giọng AI,
và tải file MP3 về máy — miễn phí, không giới hạn, không cần server, không cần API key.

## Vì sao lại như vậy

Bản đầu tiên dùng giọng đọc có sẵn của hệ điều hành (Web Speech API), nhưng công nghệ đó
**không cho phép xuất ra file âm thanh** — chỉ phát qua loa. Để tải được MP3, trang này
chuyển sang dùng **Piper TTS**, một mô hình giọng đọc AI mã nguồn mở, chạy bằng WebAssembly
ngay trong trình duyệt của người dùng. Nhờ vậy:

- Dùng đúng **một giọng cố định** cho toàn bộ truyện (không đổi giọng giữa chừng)
- Khoảng ngắt giữa các câu **cố định 0.35 giây** (luôn dưới 0.5 giây theo yêu cầu)
- Tải được file **MP3** thật sự, không phải bản ghi âm loa
- Miễn phí và không giới hạn số lần dùng, vì không gọi API trả phí nào cả

Đánh đổi: lần đầu chọn một giọng, trình duyệt cần tải mô hình giọng đó về (khoảng 20–60MB),
sau đó trình duyệt tự lưu lại nên các lần sau dùng ngay lập tức. Máy cấu hình yếu sẽ tạo
giọng đọc chậm hơn máy mạnh, vì mọi thứ tính toán ngay trên máy người dùng.

## Tính năng

- Dán hoặc gõ văn bản trực tiếp, tự lưu lại trong trình duyệt
- 3 giọng tiếng Việt để chọn (đều chạy offline sau khi tải lần đầu)
- Chỉnh tốc độ đọc và âm lượng
- Đọc / tạm dừng / dừng hẳn, nhảy tới câu trước — câu sau
- Câu đang đọc được tô sáng trên "trang giấy"
- **Tải file MP3** của toàn bộ truyện về máy

## Chạy thử trên máy

Không cần cài gì cả — chỉ cần mở file `index.html` bằng trình duyệt (khuyên dùng Chrome
hoặc Edge, vì cần hỗ trợ WebAssembly + AudioContext đầy đủ).

Hoặc chạy một server tĩnh nhỏ (không bắt buộc, nhưng tránh vài giới hạn khi mở file trực tiếp):

```bash
python3 -m http.server 8000
```

Rồi mở `http://localhost:8000`.

## Đưa lên GitHub Pages (miễn phí)

1. Tạo một repository mới trên GitHub, ví dụ đặt tên `doc-truyen`, để chế độ **Public**.
2. Vào trang repo đó (dạng `github.com/ten-ban/doc-truyen`) → **Add file → Upload files**
   → kéo thả 4 file `index.html`, `style.css`, `script.js`, `README.md` vào → **Commit changes**.
   - Hoặc dùng Git dòng lệnh:
     ```bash
     git init
     git add .
     git commit -m "Trang đọc truyện"
     git branch -M main
     git remote add origin https://github.com/<ten-cua-ban>/doc-truyen.git
     git push -u origin main
     ```
3. Vào **Settings → Pages** (trong repo đó).
4. Ở **Build and deployment → Source**, chọn **Deploy from a branch**.
5. Chọn **Branch: main**, thư mục **/ (root)** → **Save**.
6. Đợi khoảng 1–3 phút, tải lại trang Settings → Pages, sẽ thấy link dạng:
   `https://<ten-cua-ban>.github.io/doc-truyen/`

## Cách dùng

1. Dán truyện vào khung bên trái.
2. Chọn giọng đọc bên phải (lần đầu sẽ mất chút thời gian tải mô hình).
3. Bấm nút tròn to màu vàng để bắt đầu đọc — trang sẽ tạo giọng đọc cho từng câu,
   có thanh tiến trình hiển thị.
4. Đọc xong (hoặc trong lúc đang đọc, sau khi tạo xong toàn bộ), bấm **"Tải file MP3"**
   để lưu về máy.
5. Nếu sửa lại văn bản hoặc đổi giọng, cần bấm "Đọc" lại để tạo giọng đọc mới trước khi
   tải MP3 (nút tải sẽ tự khoá cho tới khi tạo xong).

## Giới hạn cần biết

- Văn bản càng dài, thời gian tạo giọng đọc càng lâu (tuỳ vào máy tính đang chạy).
- Chất lượng giọng ở mức khá tự nhiên nhưng chưa mượt bằng giọng thương mại trả phí
  (Google Cloud TTS, Azure, ElevenLabs...). Nếu sau này muốn nâng cấp, có thể quay lại
  và mình sẽ hướng dẫn tích hợp một dịch vụ TTS trả phí, đổi lại chất lượng cao hơn.
- Chỉ có giọng tiếng Việt; nếu dán văn bản xen tiếng Anh/tiếng khác, phát âm sẽ không chuẩn.
- Cần trình duyệt hỗ trợ WebAssembly + Web Audio API (hầu hết trình duyệt hiện đại đều có,
  trừ một số trình duyệt rất cũ).

## Cấu trúc file

```
doc-truyen/
├── index.html   # bố cục trang + khai báo import map cho onnxruntime-web
├── style.css    # giao diện
├── script.js    # tạo giọng đọc bằng Piper TTS, lịch phát, xuất MP3
└── README.md    # file này
```

## Công nghệ & giấy phép dùng bên trong

- [Piper](https://github.com/rhasspy/piper) — mô hình TTS mã nguồn mở (MIT), chạy qua
  bản build WebAssembly [`@mintplex-labs/piper-tts-web`](https://github.com/Mintplex-Labs/piper-tts-web).
- [onnxruntime-web](https://github.com/microsoft/onnxruntime) — chạy mô hình AI trong trình duyệt.
- [lamejs](https://github.com/zhuker/lamejs) — mã hoá MP3 thuần JavaScript, chạy phía trình duyệt.

Tất cả đều là mã nguồn mở, tải qua CDN công khai (jsDelivr), không cần đăng ký hay API key.
