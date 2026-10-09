import { Router } from 'express';
import multer from 'multer';
import {
  getDefaultFileInfo,
  previewExcelFile,
  executeExcelImport,
} from '../controllers/excelController';
import { authenticate, authorizeRoles } from '../middlewares/auth';

const router = Router();

// Configure multer for in-memory buffer handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('excel') ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) files are supported'));
    }
  },
});

// All excel import endpoints are restricted strictly to ADMIN
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/default-info', getDefaultFileInfo);
router.post('/preview', upload.single('file'), previewExcelFile);
router.post('/import', upload.single('file'), executeExcelImport);

export default router;
