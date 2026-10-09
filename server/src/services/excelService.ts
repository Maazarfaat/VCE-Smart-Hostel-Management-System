import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface ParsedStudentRow {
  sheetName: string;
  yearOfStudy: string;
  rowNumber: number;
  sNo: string;
  roomNumber: string;
  rollNumber: string;
  name: string;
  branch: string;
  isValid: boolean;
  errors: string[];
}

export interface SheetPreview {
  sheetName: string;
  yearOfStudy: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicatesInSheet: number;
  headers: string[];
  sampleData: ParsedStudentRow[];
}

export interface ExcelPreviewReport {
  fileName: string;
  sheets: SheetPreview[];
  totalStudentsFound: number;
  totalValidStudents: number;
  totalErrors: number;
  duplicateRollNumbers: string[];
  existingInDbRollNumbers: string[];
  uniqueRoomsCount: number;
  roomsSummary: { roomNumber: string; occupantCount: number }[];
}

export interface ImportResultSummary {
  success: boolean;
  totalProcessed: number;
  studentsCreated: number;
  studentsUpdated: number;
  studentsUnchanged: number;
  roomsCreated: number;
  roomsRetained: number;
  allocationsCreated: number;
  allocationsRetained: number;
  duplicatesSkipped: number;
  rejectedRecords: { rollNumber?: string; reason: string; sheet?: string }[];
  errors: string[];
}

export class ExcelService {
  /**
   * Normalize sheet name to standard YearOfStudy
   */
  public static normalizeYear(sheetName: string): string {
    const s = sheetName.toUpperCase().trim();
    if (s.includes('1ST') || s.includes('1 ST') || s.includes('FIRST')) return '1st Year';
    if (s.includes('2ND') || s.includes('2 ND') || s.includes('SECOND')) return '2nd Year';
    if (s.includes('3RD') || s.includes('3 RD') || s.includes('THIRD')) return '3rd Year';
    if (s.includes('4TH') || s.includes('4 TH') || s.includes('FOURTH')) return '4th Year';
    if (s.includes('MBA')) return 'MBA';
    return sheetName.trim();
  }

  /**
   * Parse workbook file buffer or file path
   */
  public static parseWorkbook(filePathOrBuffer: string | Buffer): {
    workbook: xlsx.WorkBook;
    fileName: string;
  } {
    let workbook: xlsx.WorkBook;
    let fileName = 'VCE BOYS HOSTEL  LIST 2026-27.xlsx';

    if (typeof filePathOrBuffer === 'string') {
      if (!fs.existsSync(filePathOrBuffer)) {
        throw new Error(`File not found at path: ${filePathOrBuffer}`);
      }
      workbook = xlsx.readFile(filePathOrBuffer, { cellDates: true });
      fileName = path.basename(filePathOrBuffer);
    } else {
      workbook = xlsx.read(filePathOrBuffer, { type: 'buffer', cellDates: true });
    }

    return { workbook, fileName };
  }

  /**
   * Preview and validate Excel contents without making any database writes
   */
  public static async previewExcel(
    filePathOrBuffer: string | Buffer
  ): Promise<ExcelPreviewReport> {
    const { workbook, fileName } = this.parseWorkbook(filePathOrBuffer);

    const sheetPreviews: SheetPreview[] = [];
    const allRollNumbers = new Map<string, number>(); // rollNumber -> count
    const allParsedRows: ParsedStudentRow[] = [];
    const roomOccupantsMap = new Map<string, number>();

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const rawData = xlsx.utils.sheet_to_json<any[]>(worksheet, {
        header: 1,
        blankrows: false,
        defval: '',
      });

      if (!rawData || rawData.length === 0) continue;

      // Identify header row (find row containing 'ROLL' or 'NAME')
      let headerRowIndex = -1;
      let colIdxMap = { sNo: 0, room: 1, roll: 2, name: 3, branch: 4 };

      for (let i = 0; i < Math.min(rawData.length, 6); i++) {
        const row = rawData[i];
        if (!Array.isArray(row)) continue;

        const strRow = row.map((c) => String(c || '').toUpperCase().trim());
        const hasRoll = strRow.some((c) => c.includes('ROLL'));
        const hasName = strRow.some((c) => c.includes('NAME'));

        if (hasRoll || hasName) {
          headerRowIndex = i;
          strRow.forEach((colText, idx) => {
            if (colText.includes('S.NO') || colText.includes('S NO') || colText.includes('SL NO')) colIdxMap.sNo = idx;
            else if (colText.includes('ROOM')) colIdxMap.room = idx;
            else if (colText.includes('ROLL')) colIdxMap.roll = idx;
            else if (colText.includes('NAME')) colIdxMap.name = idx;
            else if (colText.includes('BRANCH') || colText.includes('DEPT')) colIdxMap.branch = idx;
          });
          break;
        }
      }

      const headers = headerRowIndex >= 0
        ? rawData[headerRowIndex].map((c: any) => String(c || '').trim()).filter(Boolean)
        : ['S.NO', 'ROOM NO', 'ROLL NUMBER', 'NAME', 'BRANCH'];

      const yearOfStudy = this.normalizeYear(sheetName);
      const sheetRows: ParsedStudentRow[] = [];
      let currentRoomNumber = '';
      let duplicatesInSheet = 0;

      const startIdx = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
      for (let r = startIdx; r < rawData.length; r++) {
        const row = rawData[r];
        if (!Array.isArray(row) || row.length === 0) continue;

        const rawSNo = String(row[colIdxMap.sNo] ?? '').trim();
        const rawRoom = String(row[colIdxMap.room] ?? '').trim();
        const rawRoll = String(row[colIdxMap.roll] ?? '').trim();
        const rawName = String(row[colIdxMap.name] ?? '').trim();
        const rawBranch = String(row[colIdxMap.branch] ?? '').trim().toUpperCase();

        // Skip completely empty rows
        if (!rawRoll && !rawName && !rawRoom) continue;

        // Skip header/title repeats
        if (rawRoll.toUpperCase().includes('ROLL') || rawName.toUpperCase().includes('NAME')) continue;

        // Update room number when provided (handles multi-row room groups)
        if (rawRoom) {
          currentRoomNumber = rawRoom.replace(/\s+/g, '');
        }

        // Only parse if we have a student roll or name
        if (!rawRoll && !rawName) continue;

        const errors: string[] = [];
        if (!rawRoll) {
          errors.push('Missing Roll Number');
        } else {
          const count = allRollNumbers.get(rawRoll) || 0;
          allRollNumbers.set(rawRoll, count + 1);
          if (count > 0) {
            duplicatesInSheet++;
            errors.push(`Duplicate Roll Number in file: ${rawRoll}`);
          }
        }

        if (!rawName) errors.push('Missing Student Name');
        if (!rawBranch) errors.push('Missing Branch');
        if (!currentRoomNumber) errors.push('Missing Room Assignment');

        if (currentRoomNumber && rawRoll) {
          roomOccupantsMap.set(currentRoomNumber, (roomOccupantsMap.get(currentRoomNumber) || 0) + 1);
        }

        const parsedRow: ParsedStudentRow = {
          sheetName,
          yearOfStudy,
          rowNumber: r + 1,
          sNo: rawSNo,
          roomNumber: currentRoomNumber,
          rollNumber: rawRoll,
          name: rawName,
          branch: rawBranch || 'GENERAL',
          isValid: errors.length === 0,
          errors,
        };

        sheetRows.push(parsedRow);
        allParsedRows.push(parsedRow);
      }

      sheetPreviews.push({
        sheetName,
        yearOfStudy,
        totalRows: sheetRows.length,
        validRows: sheetRows.filter((r) => r.isValid).length,
        invalidRows: sheetRows.filter((r) => !r.isValid).length,
        duplicatesInSheet,
        headers,
        sampleData: sheetRows.slice(0, 10),
      });
    }

    const duplicateRolls: string[] = [];
    allRollNumbers.forEach((count, roll) => {
      if (count > 1) duplicateRolls.push(roll);
    });

    let existingInDb: string[] = [];
    try {
      const extractedRolls = Array.from(allRollNumbers.keys()).filter(Boolean);
      const existingStudents = await prisma.student.findMany({
        where: { rollNumber: { in: extractedRolls } },
        select: { rollNumber: true },
      });
      existingInDb = existingStudents.map((s) => s.rollNumber);
    } catch (e) {
      // Ignored if DB is initializing
    }

    const totalValid = allParsedRows.filter((r) => r.isValid).length;
    const totalErrors = allParsedRows.filter((r) => !r.isValid).length;

    const roomsSummary = Array.from(roomOccupantsMap.entries()).map(([roomNumber, occupantCount]) => ({
      roomNumber,
      occupantCount,
    }));

    return {
      fileName,
      sheets: sheetPreviews,
      totalStudentsFound: allParsedRows.length,
      totalValidStudents: totalValid,
      totalErrors,
      duplicateRollNumbers: duplicateRolls,
      existingInDbRollNumbers: existingInDb,
      uniqueRoomsCount: roomOccupantsMap.size,
      roomsSummary,
    };
  }

  /**
   * Execute actual batch import within an idempotent Prisma transaction
   */
  public static async importExcel(
    filePathOrBuffer: string | Buffer,
    options: {
      blockName?: string;
      annualFee?: number;
      academicYear?: string;
      updateExisting?: boolean;
    } = {}
  ): Promise<ImportResultSummary> {
    const blockName = options.blockName || 'Boys Hostel';
    const academicYear = options.academicYear || '2026-2027';
    const annualFee = options.annualFee || 85000;
    const updateExisting = options.updateExisting ?? true;

    const { workbook } = this.parseWorkbook(filePathOrBuffer);

    // Parse all sheets
    const studentRecords: {
      rollNumber: string;
      name: string;
      branch: string;
      yearOfStudy: string;
      roomNumber: string;
      sheetName: string;
    }[] = [];

    const seenRollNumbers = new Set<string>();
    const rejectedRecords: { rollNumber?: string; reason: string; sheet?: string }[] = [];
    const errors: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const rawData = xlsx.utils.sheet_to_json<any[]>(worksheet, {
        header: 1,
        blankrows: false,
        defval: '',
      });

      let headerRowIndex = -1;
      let colIdxMap = { room: 1, roll: 2, name: 3, branch: 4 };

      for (let i = 0; i < Math.min(rawData.length, 6); i++) {
        const row = rawData[i];
        if (!Array.isArray(row)) continue;
        const strRow = row.map((c) => String(c || '').toUpperCase().trim());
        if (strRow.some((c) => c.includes('ROLL')) || strRow.some((c) => c.includes('NAME'))) {
          headerRowIndex = i;
          strRow.forEach((colText, idx) => {
            if (colText.includes('ROOM')) colIdxMap.room = idx;
            else if (colText.includes('ROLL')) colIdxMap.roll = idx;
            else if (colText.includes('NAME')) colIdxMap.name = idx;
            else if (colText.includes('BRANCH') || colText.includes('DEPT')) colIdxMap.branch = idx;
          });
          break;
        }
      }

      const yearOfStudy = this.normalizeYear(sheetName);
      let currentRoom = '';
      const startIdx = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

      for (let r = startIdx; r < rawData.length; r++) {
        const row = rawData[r];
        if (!Array.isArray(row)) continue;

        const rawRoom = String(row[colIdxMap.room] ?? '').trim();
        const rawRoll = String(row[colIdxMap.roll] ?? '').trim();
        const rawName = String(row[colIdxMap.name] ?? '').trim();
        const rawBranch = String(row[colIdxMap.branch] ?? '').trim().toUpperCase();

        if (rawRoom) {
          currentRoom = rawRoom.replace(/\s+/g, '');
        }

        if (!rawRoll || rawRoll.toUpperCase().includes('ROLL') || !rawName) {
          continue;
        }

        if (seenRollNumbers.has(rawRoll)) {
          rejectedRecords.push({
            rollNumber: rawRoll,
            reason: 'Duplicate roll number in workbook',
            sheet: sheetName,
          });
          continue;
        }

        seenRollNumbers.add(rawRoll);

        studentRecords.push({
          rollNumber: rawRoll,
          name: rawName,
          branch: rawBranch || 'GENERAL',
          yearOfStudy,
          roomNumber: currentRoom,
          sheetName,
        });
      }
    }

    if (studentRecords.length === 0) {
      throw new Error('No valid student records found to import from the Excel file');
    }

    // Execute idempotent transaction
    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 1. Get or create Block (Default: "Boys Hostel")
        let block = await tx.block.findUnique({ where: { name: blockName } });
        if (!block) {
          block = await tx.block.create({
            data: {
              name: blockName,
              description: 'Vardhaman College of Engineering Campus Boys Hostel',
              totalFloors: 3,
            },
          });
        }

        // 2. Get or create Fee Structure
        let feeStructure = await tx.feeStructure.findFirst({
          where: { academicYear, name: `Annual Hostel Fee ${academicYear}` },
        });
        if (!feeStructure) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 3);
          feeStructure = await tx.feeStructure.create({
            data: {
              academicYear,
              name: `Annual Hostel Fee ${academicYear}`,
              totalAmount: annualFee,
              dueDate,
            },
          });
        }

        // 3. Group students by room
        const roomStudentsMap = new Map<string, typeof studentRecords>();
        for (const record of studentRecords) {
          const rNum = record.roomNumber || 'UNASSIGNED';
          if (!roomStudentsMap.has(rNum)) {
            roomStudentsMap.set(rNum, []);
          }
          roomStudentsMap.get(rNum)!.push(record);
        }

        let roomsCreatedCount = 0;
        let roomsRetainedCount = 0;
        let studentsCreatedCount = 0;
        let studentsUpdatedCount = 0;
        let studentsUnchangedCount = 0;
        let allocationsCreatedCount = 0;
        let allocationsRetainedCount = 0;

        // 4. Ensure Rooms exist with capacity null (unspecified!) and exact occupancy
        const roomEntities = new Map<string, { id: string; roomNumber: string }>();

        for (const [roomNumber, students] of roomStudentsMap.entries()) {
          if (roomNumber === 'UNASSIGNED') continue;

          // Determine floor from first digit: 101 -> 1, 201 -> 2, 301 -> 3
          const firstChar = roomNumber.charAt(0);
          const floor = Number.isInteger(parseInt(firstChar)) ? parseInt(firstChar) : 1;

          let room = await tx.room.findUnique({
            where: {
              blockId_roomNumber: {
                blockId: block.id,
                roomNumber,
              },
            },
          });

          if (!room) {
            room = await tx.room.create({
              data: {
                blockId: block.id,
                roomNumber,
                floor,
                capacity: null, // Critical: DO NOT fabricate capacity!
                currentOccupancy: students.length,
                status: 'OCCUPIED',
              },
            });
            roomsCreatedCount++;
          } else {
            room = await tx.room.update({
              where: { id: room.id },
              data: {
                currentOccupancy: students.length,
                status: 'OCCUPIED',
              },
            });
            roomsRetainedCount++;
          }

          roomEntities.set(roomNumber, { id: room.id, roomNumber: room.roomNumber });
        }

        // 5. Create / Update Students and active Allocations idempotently
        for (const [roomNumber, students] of roomStudentsMap.entries()) {
          const roomObj = roomEntities.get(roomNumber);

          for (const sData of students) {
            // Find existing student by unique roll number
            let student = await tx.student.findUnique({
              where: { rollNumber: sData.rollNumber },
            });

            if (student) {
              if (updateExisting) {
                student = await tx.student.update({
                  where: { id: student.id },
                  data: {
                    fullName: sData.name,
                    branch: sData.branch,
                    yearOfStudy: sData.yearOfStudy,
                  },
                });
                studentsUpdatedCount++;
              } else {
                studentsUnchangedCount++;
              }
            } else {
              student = await tx.student.create({
                data: {
                  rollNumber: sData.rollNumber,
                  fullName: sData.name,
                  branch: sData.branch,
                  yearOfStudy: sData.yearOfStudy,
                  status: 'ACTIVE',
                },
              });
              studentsCreatedCount++;

              // Create initial student fee record
              await tx.studentFee.create({
                data: {
                  studentId: student.id,
                  feeStructureId: feeStructure.id,
                  totalAmount: feeStructure.totalAmount,
                  paidAmount: 0.0,
                  balanceAmount: feeStructure.totalAmount,
                  status: 'PENDING',
                  dueDate: feeStructure.dueDate,
                },
              });
            }

            // Allocation: check if active allocation already exists
            if (roomObj) {
              const existingActiveAllocation = await tx.allocation.findFirst({
                where: {
                  studentId: student.id,
                  status: 'ACTIVE',
                },
              });

              if (!existingActiveAllocation) {
                await tx.allocation.create({
                  data: {
                    studentId: student.id,
                    roomId: roomObj.id,
                    status: 'ACTIVE',
                    remarks: `Workbook Ingestion: ${sData.yearOfStudy} (Room ${roomObj.roomNumber})`,
                    allocatedBy: 'Chief Warden',
                  },
                });
                allocationsCreatedCount++;
              } else if (existingActiveAllocation.roomId !== roomObj.id) {
                // If allocated to a different room, update to the authoritative room from Excel
                await tx.allocation.update({
                  where: { id: existingActiveAllocation.id },
                  data: {
                    roomId: roomObj.id,
                    remarks: `Workbook Update: Reallocated to Room ${roomObj.roomNumber}`,
                  },
                });
                allocationsCreatedCount++;
              } else {
                allocationsRetainedCount++;
              }
            }
          }
        }

        // 6. Record Audit Log
        await tx.auditLog.create({
          data: {
            action: 'EXCEL_STUDENT_IMPORT',
            entity: 'Student',
            details: `Imported workbook dataset: ${studentsCreatedCount} created, ${studentsUpdatedCount} updated, ${roomsCreatedCount} rooms created, ${allocationsCreatedCount} allocations established.`,
          },
        });

        return {
          success: true,
          totalProcessed: studentRecords.length,
          studentsCreated: studentsCreatedCount,
          studentsUpdated: studentsUpdatedCount,
          studentsUnchanged: studentsUnchangedCount,
          roomsCreated: roomsCreatedCount,
          roomsRetained: roomsRetainedCount,
          allocationsCreated: allocationsCreatedCount,
          allocationsRetained: allocationsRetainedCount,
          duplicatesSkipped: rejectedRecords.length,
          rejectedRecords,
          errors,
        };
      },
      {
        timeout: 90000, // 90s transaction timeout for full 466-student dataset
      }
    );
  }
}
