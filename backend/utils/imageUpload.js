// utils/imageUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directories exist
const ensureUploadDirs = () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const profilesDir = path.join(uploadsDir, 'profiles');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }
};

// Configuration for different storage options
const uploadConfig = {
  // Local storage configuration
  local: {
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadPath = path.join(process.cwd(), 'uploads', 'profiles');
        ensureUploadDirs();
        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `user_${req.user.id}_${uniqueSuffix}${extension}`;
        cb(null, filename);
      }
    })
  },
  
  // Memory storage for cloud uploads (AWS S3, Cloudinary, etc.)
  memory: {
    storage: multer.memoryStorage()
  }
};

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  console.log('📸 File filter check:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log('✅ File type accepted:', file.mimetype);
    cb(null, true);
  } else {
    console.log('❌ File type rejected:', file.mimetype);
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'), false);
  }
};

// Create multer instance based on storage type
const createUploader = (storageType = 'local') => {
  const config = {
    storage: uploadConfig[storageType].storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit (increased from 5MB)
      files: 1 // Only one file at a time
    }
  };
  
  console.log(`🔧 Creating uploader with storage type: ${storageType}`);
  return multer(config);
};

// Main upload handler that supports both local and cloud storage
const uploadProfileImage = async (req, res, next) => {
  try {
    const storageType = process.env.UPLOAD_STORAGE_TYPE || 'local';
    const uploader = createUploader(storageType === 'local' ? 'local' : 'memory');
    
    console.log(`📸 Processing image upload with storage: ${storageType}`);
    
    uploader.single('profileImage')(req, res, async (err) => {
      if (err) {
        console.error('❌ Multer error:', err);
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              status: 'error',
              message: 'File too large. Maximum size is 10MB.'
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              status: 'error',
              message: 'Unexpected field name. Use "profileImage" as the field name.'
            });
          }
        }
        
        return res.status(400).json({
          status: 'error',
          message: err.message || 'File upload error'
        });
      }

      if (!req.file) {
        console.log('❌ No file provided in request');
        return res.status(400).json({
          status: 'error',
          message: 'No image file provided. Please select an image to upload.'
        });
      }

      console.log('✅ File uploaded successfully:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      try {
        let imageUrl;

        if (storageType === 'local') {
          // Local storage - file is already saved
          imageUrl = `/uploads/profiles/${req.file.filename}`;
          console.log('📁 Local storage URL:', imageUrl);
        } else {
          // Cloud storage - upload to cloud provider
          const cloudProvider = process.env.CLOUD_PROVIDER || 's3';
          console.log(`☁️ Uploading to cloud provider: ${cloudProvider}`);
          
          if (cloudUploaders[cloudProvider]) {
            imageUrl = await cloudUploaders[cloudProvider](req.file, req.user.id);
            console.log('☁️ Cloud storage URL:', imageUrl);
          } else {
            throw new Error(`Unsupported cloud provider: ${cloudProvider}`);
          }
        }

        // Add imageUrl to request for controller to use
        req.uploadedImageUrl = imageUrl;
        console.log('✅ Image URL set on request:', imageUrl);
        next();
      } catch (error) {
        console.error('❌ Cloud upload error:', error);
        
        // Clean up local file if it exists and cloud upload failed
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
            console.log('🗑️ Cleaned up failed upload file');
          } catch (cleanupError) {
            console.error('❌ Failed to cleanup file:', cleanupError);
          }
        }
        
        res.status(500).json({
          status: 'error',
          message: 'Failed to upload image to storage'
        });
      }
    });
  } catch (error) {
    console.error('❌ Upload handler error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during upload'
    });
  }
};

// Utility functions for different cloud storage providers
const cloudUploaders = {
  // AWS S3 uploader (requires aws-sdk)
  s3: async (file, userId) => {
    // Uncomment and configure if using AWS S3
    /*
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `profiles/user_${userId}_${Date.now()}_${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };

    const result = await s3.upload(params).promise();
    return result.Location;
    */
    throw new Error('S3 uploader not configured. Please set up AWS SDK and credentials.');
  },

  // Cloudinary uploader (requires cloudinary)
  cloudinary: async (file, userId) => {
    // Uncomment and configure if using Cloudinary
    /*
    const cloudinary = require('cloudinary').v2;
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'profiles',
          public_id: `user_${userId}_${Date.now()}`,
          resource_type: 'image'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      ).end(file.buffer);
    });
    */
    throw new Error('Cloudinary uploader not configured. Please set up Cloudinary SDK and credentials.');
  }
};

// Helper function to delete old images
const deleteOldImage = async (imageUrl, storageType = 'local') => {
  try {
    if (!imageUrl) return;
    
    if (storageType === 'local') {
      // Don't delete external URLs (like Unsplash, etc.)
      if (imageUrl.includes('http') && !imageUrl.startsWith('/uploads')) {
        console.log('🚫 Skipping deletion of external URL:', imageUrl);
        return;
      }
      
      // Delete local file
      const imagePath = imageUrl.startsWith('/uploads') 
        ? path.join(process.cwd(), imageUrl)
        : path.join(process.cwd(), 'uploads', imageUrl);
        
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('🗑️ Deleted old local image:', imagePath);
      } else {
        console.log('⚠️ Old image file not found:', imagePath);
      }
    } else {
      // Delete from cloud storage
      // Implementation depends on cloud provider
      console.log('☁️ Cloud image deletion not implemented for:', imageUrl);
    }
  } catch (error) {
    console.warn('⚠️ Could not delete old image:', error.message);
  }
};

// Validation helper
const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }

  return true;
};

// Test upload endpoint (for development/testing)
const testUpload = (req, res) => {
  res.json({
    status: 'success',
    message: 'Upload system is working',
    uploadConfig: {
      maxFileSize: '10MB',
      allowedTypes: ['JPEG', 'PNG', 'GIF', 'WebP'],
      storageType: process.env.UPLOAD_STORAGE_TYPE || 'local'
    }
  });
};

module.exports = {
  uploadProfileImage,
  deleteOldImage,
  validateImageFile,
  createUploader,
  cloudUploaders,
  testUpload,
  ensureUploadDirs
};