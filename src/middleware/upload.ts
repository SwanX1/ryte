import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'src', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - accept more formats since we'll convert to WebM
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedImageTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 
    'image/bmp', 'image/tiff', 'image/svg+xml'
  ];
  const allowedVideoTypes = [
    'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov',
    'video/wmv', 'video/flv', 'video/mkv', 'video/3gp', 'video/m4v'
  ];
  
  if (file.fieldname === 'images' && allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file.fieldname === 'video' && allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}`));
  }
};

// Create multer instances with preserveExtension option
export const uploadImages = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per image (increased for larger formats)
    files: 10 // Max 10 images
  }
}).array('images', 10);

export const uploadVideo = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for video (increased for larger formats)
  }
}).single('video');

// Middleware wrapper
export const handleImageUpload = (req: any, res: any, next: any) => {
  uploadImages(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).render('post/create', {
        error: 'File upload error: ' + err.message
      });
    } else if (err) {
      return res.status(400).render('post/create', {
        error: 'Invalid file type'
      });
    }
    next();
  });
};

export const handleVideoUpload = (req: any, res: any, next: any) => {
  uploadVideo(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).render('post/create', {
        error: 'File upload error: ' + err.message
      });
    } else if (err) {
      return res.status(400).render('post/create', {
        error: 'Invalid file type'
      });
    }
    next();
  });
}; 