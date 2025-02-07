const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(__dirname, '../uploads/files');
    
    if (file.fieldname === 'avatar') {
      uploadPath = path.join(__dirname, '../uploads/avatars');
    } else if (file.fieldname === 'audio') {
      uploadPath = path.join(__dirname, '../uploads/audio');
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'avatar') {
    // 头像只允许图片
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只能上传图片文件！'), false);
    }
  } else if (file.fieldname === 'audio') {
    // 音频文件检查
    if (!file.mimetype.startsWith('audio/')) {
      return cb(new Error('只能上传音频文件！'), false);
    }
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = upload; 