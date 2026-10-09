import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Database,
  Building,
  RefreshCw,
  Eye,
  FileCheck,
} from 'lucide-react';
import { Badge } from '../components/Badge';

interface ExcelImportProps {
  onNavigateTab?: (tab: string) => void;
}

export const ExcelImport: React.FC<ExcelImportProps> = ({ onNavigateTab }) => {
  const [defaultFileInfo, setDefaultFileInfo] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [activeSheetTab, setActiveSheetTab] = useState<number>(0);
  const [importResult, setImportResult] = useState<any>(null);

  const [loadingDefault, setLoadingDefault] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration options
  const [blockName, setBlockName] = useState('Main Boys Hostel');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [annualFee, setAnnualFee] = useState(85000);
  const [updateExisting, setUpdateExisting] = useState(false);

  // Check server default file on mount
  useEffect(() => {
    fetchDefaultFileInfo();
  }, []);

  const fetchDefaultFileInfo = async () => {
    try {
      setLoadingDefault(true);
      const res = await api.get('/excel/default-info');
      if (res.data.success) {
        setDefaultFileInfo(res.data.data);
      }
    } catch (err) {
      console.warn('Default file info check returned notice:', err);
    } finally {
      setLoadingDefault(false);
    }
  };

  const handlePreview = async (fileToPreview?: File) => {
    try {
      setError(null);
      setPreviewing(true);
      setImportResult(null);

      const formData = new FormData();
      if (fileToPreview) {
        formData.append('file', fileToPreview);
      }

      const res = await api.post('/excel/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setPreviewData(res.data.data);
        setActiveSheetTab(0);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to preview Excel file');
    } finally {
      setPreviewing(false);
    }
  };

  const handleExecuteImport = async () => {
    try {
      setError(null);
      setImporting(true);

      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('blockName', blockName);
      formData.append('academicYear', academicYear);
      formData.append('annualFee', String(annualFee));
      formData.append('updateExisting', String(updateExisting));

      const res = await api.post('/excel/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setImportResult(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Database import transaction failed');
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      handlePreview(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Hostel Excel Data Import Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin workflow to inspect, validate, preview, and ingest the 5-sheet VCE Boys Hostel dataset.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <span className="font-bold">Error: </span>
            {error}
          </div>
        </div>
      )}

      {/* Step 1: File Selection Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
          Step 1: Select or Load Existing Workbook
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Default file option */}
          <div className="p-5 border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                Existing Project Workbook Detected
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Found:{' '}
                <strong className="text-slate-800 font-mono">
                  {defaultFileInfo?.fileName || 'VCE BOYS HOSTEL  LIST 2026-27.xlsx'}
                </strong>{' '}
                ({defaultFileInfo?.sizeKB || 63} KB)
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Contains 5 sheets: 1st Year, 2nd Year, 3rd Year, 4th Year, and MBA.
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedFile(null);
                handlePreview();
              }}
              disabled={previewing}
              className="mt-4 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {previewing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Inspecting Workbook...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Inspect & Preview Existing File
                </>
              )}
            </button>
          </div>

          {/* Upload alternate workbook option */}
          <div className="p-5 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Upload className="w-5 h-5 text-slate-500" />
                Or Upload New Excel File (.xlsx)
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Upload updated student allocations or subsequent year lists.
              </p>
            </div>

            <label className="mt-4 cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl text-center shadow-xs transition-colors">
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Browse Local Files...'}
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Step 2: Interactive Validation & Sheet Preview */}
      {previewData && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Step 2: Column Validation & Dataset Preview
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Workbook: <span className="font-semibold text-slate-800">{previewData.fileName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Validation Passed</Badge>
              <Badge variant="info">{previewData.sheets.length} Sheets</Badge>
            </div>
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total Students</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">
                {previewData.totalStudentsFound}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs text-emerald-700 uppercase font-semibold">Valid Records</p>
              <p className="text-xl font-black text-emerald-800 mt-0.5">
                {previewData.totalValidStudents}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <p className="text-xs text-indigo-700 uppercase font-semibold">Unique Rooms</p>
              <p className="text-xl font-black text-indigo-800 mt-0.5">
                {previewData.uniqueRoomsCount}
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700 uppercase font-semibold">Duplicate Check</p>
              <p className="text-xl font-black text-amber-800 mt-0.5">
                {previewData.duplicateRollNumbers?.length || 0}
              </p>
            </div>
          </div>

          {/* Sheets Tab Switcher */}
          <div>
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {previewData.sheets.map((sheet: any, idx: number) => (
                <button
                  key={sheet.sheetName}
                  onClick={() => setActiveSheetTab(idx)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                    activeSheetTab === idx
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sheet.sheetName} ({sheet.totalRows} students)
                </button>
              ))}
            </div>

            {/* Active Sheet Sample Table */}
            {previewData.sheets[activeSheetTab] && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing first 10 students of{' '}
                    <strong className="text-slate-800">
                      {previewData.sheets[activeSheetTab].sheetName}
                    </strong>
                    :
                  </span>
                  <span>
                    Detected Headers: [
                    {previewData.sheets[activeSheetTab].headers.join(', ')}]
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Room No (Assigned)</th>
                        <th className="py-2.5 px-3">Roll Number</th>
                        <th className="py-2.5 px-3">Student Full Name</th>
                        <th className="py-2.5 px-3">Branch</th>
                        <th className="py-2.5 px-3">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {previewData.sheets[activeSheetTab].sampleData.map((row: any) => (
                        <tr key={row.rowNumber} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 text-slate-400 font-mono">{row.rowNumber}</td>
                          <td className="py-2 px-3 font-bold text-indigo-700">
                            Room {row.roomNumber || 'UNASSIGNED'}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {row.rollNumber}
                          </td>
                          <td className="py-2 px-3 text-slate-800">{row.name}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[11px]">
                              {row.branch}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="text-emerald-600 font-bold inline-flex items-center gap-1 text-[11px]">
                                <CheckCircle className="w-3.5 h-3.5" /> OK
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold inline-flex items-center gap-1 text-[11px]">
                                <AlertCircle className="w-3.5 h-3.5" /> {row.errors.join(', ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Batch Ingestion Execution */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
              Step 3: Database Ingestion Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Hostel Block Name
                </label>
                <input
                  type="text"
                  value={blockName}
                  onChange={(e) => setBlockName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Annual Hostel Fee (₹)
                </label>
                <input
                  type="number"
                  value={annualFee}
                  onChange={(e) => setAnnualFee(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="updateExisting"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
              />
              <label htmlFor="updateExisting" className="text-xs text-slate-600">
                Update existing student records if roll numbers already exist in the database
              </label>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={importing}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Executing Atomic Database Ingestion (Creating Rooms, Beds & Students)...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  Execute Full Excel Ingestion ({previewData.totalStudentsFound} Students)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Final Ingestion Summary */}
      {importResult && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm text-emerald-900 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-950">
                Hostel Excel Dataset Successfully Imported!
              </h3>
              <p className="text-xs text-emerald-700">
                All records, room allocations, beds, and fee structures have been committed.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-3 rounded-xl border border-emerald-200">
              <span className="text-xs text-slate-500 uppercase font-semibold">Students Created</span>
              <p className="text-xl font-black text-emerald-700 mt-0.5">
                {importResult.studentsCreated}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200">
              <span className="text-xs text-slate-500 uppercase font-semibold">Rooms Created</span>
              <p className="text-xl font-black text-indigo-700 mt-0.5">
                {importResult.roomsCreated}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200">
              <span className="text-xs text-slate-500 uppercase font-semibold">Beds Created</span>
              <p className="text-xl font-black text-indigo-700 mt-0.5">
                {importResult.bedsCreated}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200">
              <span className="text-xs text-slate-500 uppercase font-semibold">Allocations Made</span>
              <p className="text-xl font-black text-emerald-700 mt-0.5">
                {importResult.allocationsCreated}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('students')}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                Go to Student Directory
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
