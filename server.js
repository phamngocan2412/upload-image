// 
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    // Tải hình ảnh lên Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'uploads', // Thư mục lưu trữ trên Cloudinary (tùy chọn)
    });

    // Lấy URL công khai của hình ảnh
    const imageUrl = result.secure_url;
    res.status(200).send({ imageUrl });

    // Xóa tệp tạm thời sau khi tải lên thành công
    fs.unlinkSync(req.file.path);
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