const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const admin = require('firebase-admin');

// Khởi tạo Firebase Admin SDK
const serviceAccount = require('./path/to/serviceAccountKey.json'); // Thay bằng đường dẫn đến file serviceAccountKey.json

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'project-vlu-f890e.firebasestorage.app', // Thay bằng bucket name của bạn
});

const bucket = admin.storage().bucket();

// Tạo một instance của express app
const app = express();

// Sử dụng CORS
app.use(cors());

// Tạo thư mục lưu trữ tạm thời nếu chưa tồn tại
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Đặt nơi lưu trữ hình ảnh tạm thời
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// API tải lên ảnh
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Không có tệp hình ảnh nào được tải lên');
  }

  try {
    // Tải hình ảnh lên Firebase Storage
    const file = bucket.file(req.file.filename);
    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.on('error', (err) => {
      console.error('Lỗi khi tải lên Firebase Storage:', err);
      res.status(500).send('Lỗi khi tải lên hình ảnh');
    });

    stream.on('finish', async () => {
      // Làm cho hình ảnh có thể truy cập công khai
      await file.makePublic();

      // Lấy URL công khai của hình ảnh
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      res.status(200).send({ imageUrl });

      // Xóa tệp tạm thời sau khi tải lên thành công
      fs.unlinkSync(req.file.path);
    });

    // Đọc tệp và ghi vào Firebase Storage
    fs.createReadStream(req.file.path).pipe(stream);
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).send('Lỗi server');
  }
});

// Khởi động server
const port = process.env.PORT || 8000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});