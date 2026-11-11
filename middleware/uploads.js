import path from "node:path";
import multer from "multer";

class UploadValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const imageExtensions = new Map([
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
  ["image/gif", new Set([".gif"])],
  ["image/webp", new Set([".webp"])],
]);
const excelMimeTypes = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    const allowedExtensions = imageExtensions.get(file.mimetype);
    if (!allowedExtensions?.has(path.extname(file.originalname).toLowerCase())) {
      return callback(new UploadValidationError("Upload a JPEG, PNG, GIF, or WebP image"));
    }
    return callback(null, true);
  },
});

const productsExcelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (
      path.extname(file.originalname).toLowerCase() !== ".xlsx" ||
      !excelMimeTypes.has(file.mimetype)
    ) {
      return callback(new UploadValidationError("Upload an .xlsx Excel file"));
    }
    return callback(null, true);
  },
});

function handleUpload(upload, fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
      if (!error) {
        return next();
      }
      if (error instanceof multer.MulterError) {
        const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        const message = error.code === "LIMIT_FILE_SIZE"
          ? "Uploaded file is too large"
          : "Invalid file upload";
        return res.status(status).json({ error: message });
      }
      if (error instanceof UploadValidationError) {
        return res.status(error.status).json({ error: error.message });
      }
      return next(error);
    });
  };
}

const uploadProfilePicture = handleUpload(profilePictureUpload, "picture");
const uploadProductsExcel = handleUpload(productsExcelUpload, "file");

export { uploadProfilePicture, uploadProductsExcel };
