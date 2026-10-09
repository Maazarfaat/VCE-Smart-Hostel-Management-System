import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../types';
import { ExcelService } from '../services/excelService';
import { sendSuccess, sendError } from '../utils/response';
import { config } from '../config';

/**
 * Get default excel file path
 */
const getDefaultExcelPath = (): string => {
  const possiblePaths = [
    config.excelFilePath,
    path.resolve(process.cwd(), '../VCE BOYS HOSTEL  LIST 2026-27.xlsx'),
    path.resolve(process.cwd(), 'VCE BOYS HOSTEL  LIST 2026-27.xlsx'),
    path.resolve(__dirname, '../../../VCE BOYS HOSTEL  LIST 2026-27.xlsx'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  // Check with single space if double space differs
  const altPath = path.resolve(process.cwd(), '../VCE BOYS HOSTEL LIST 2026-27.xlsx');
  if (fs.existsSync(altPath)) return altPath;

  return possiblePaths[0];
};

export const getDefaultFileInfo = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filePath = getDefaultExcelPath();
    const exists = fs.existsSync(filePath);

    if (!exists) {
      sendError(res, 'Default hostel Excel file not found on server', 404);
      return;
    }

    const stats = fs.statSync(filePath);
    sendSuccess(res, 'Default file details retrieved', {
      fileName: path.basename(filePath),
      filePath,
      sizeBytes: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      modifiedAt: stats.mtime,
      isReady: true,
    });
  } catch (err) {
    next(err);
  }
};

export const previewExcelFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let target: string | Buffer;

    if (req.file) {
      target = req.file.buffer;
    } else {
      const defaultPath = getDefaultExcelPath();
      if (!fs.existsSync(defaultPath)) {
        sendError(res, 'No file was uploaded and default workbook was not found', 400);
        return;
      }
      target = defaultPath;
    }

    const report = await ExcelService.previewExcel(target);
    sendSuccess(res, 'Excel workbook preview generated successfully', report);
  } catch (err) {
    next(err);
  }
};

export const executeExcelImport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let target: string | Buffer;

    if (req.file) {
      target = req.file.buffer;
    } else {
      const defaultPath = getDefaultExcelPath();
      if (!fs.existsSync(defaultPath)) {
        sendError(res, 'No file was uploaded and default workbook was not found', 400);
        return;
      }
      target = defaultPath;
    }

    const { blockName, annualFee, academicYear, updateExisting } = req.body;

    const summary = await ExcelService.importExcel(target, {
      blockName: blockName || 'Main Boys Hostel',
      annualFee: annualFee ? parseFloat(annualFee) : 85000,
      academicYear: academicYear || '2026-27',
      updateExisting: updateExisting === 'true' || updateExisting === true,
    });

    sendSuccess(res, 'Hostel student data imported successfully', summary, 200);
  } catch (err) {
    next(err);
  }
};
