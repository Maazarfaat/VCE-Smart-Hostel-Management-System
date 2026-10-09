import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/smart_hostel_db',
  jwtSecret: process.env.JWT_SECRET || 'smart_hostel_default_secret_key_vce_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  excelFilePath: process.env.EXCEL_FILE_PATH || path.join(__dirname, '../../../VCE BOYS HOSTEL  LIST 2026-27.xlsx'),
  visitingHours: {
    start: '09:00',
    end: '18:30',
  },
  roles: {
    ADMIN: 'ADMIN',
    WARDEN: 'WARDEN',
    STUDENT: 'STUDENT',
    MAINTENANCE: 'MAINTENANCE',
    SECURITY: 'SECURITY',
  } as const,
};
