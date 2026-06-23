
import React, { useState, useMemo } from 'react';
import { Student, RegistrationStatus, ScheduleRequest, AcademicLevel, ActivityLog } from '../types';
import { FileUp, Download, CheckCircle2, Clock, AlertCircle, Users, CheckSquare, Square, CheckCircle, Filter, FileSpreadsheet, History, Search, UserCheck, FileText, Calendar, RotateCcw, X, Mail, MapPin, GraduationCap, Award } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../components/ConfirmDialog';

interface RegistrarDashboardProps {
  students: Student[];
  setStudents: (students: Student[]) => Promise<void>;
  requests: ScheduleRequest[];
  setRequests: (requests: ScheduleRequest[]) => Promise<void>;
  logs: ActivityLog[];
  addLog: (type: ActivityLog['type'], description: string, actor: string, studentId?: string, studentName?: string) => Promise<void>;
  addLogs: (logEntries: { type: ActivityLog['type'], description: string, studentId?: string, studentName?: string }[], actor: string) => Promise<void>;
  onResetData?: () => Promise<void>;
  currentUserName?: string;
}

const RegistrarDashboard: React.FC<RegistrarDashboardProps> = ({ students, setStudents, requests, setRequests, logs, addLog, addLogs, onResetData, currentUserName }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'requests' | 'history'>('students');
  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const handleFullReset = () => {
    if (!onResetData) return;
    setIsResetDialogOpen(true);
  };

  const performReset = async () => {
    setResetLoading(true);
    try {
      if (onResetData) {
        await onResetData();
      }
      setIsResetDialogOpen(false);
      alert("Success: All application data has been removed.");
    } catch (error) {
      console.error("Reset failed:", error);
      alert("Error: Failed to reset data.");
    } finally {
      setResetLoading(false);
    }
  };

  const uniqueTerms = useMemo(() => {
    const terms = Array.from(new Set(students.map(s => s.term))).sort().reverse();
    return ['All', ...terms];
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (selectedTerm === 'All') return students;
    return students.filter(s => s.term === selectedTerm);
  }, [students, selectedTerm]);

  const filteredLogs = useMemo(() => {
    if (!logSearch) return logs;
    const search = logSearch.toLowerCase();
    return logs.filter(l => 
      l.description.toLowerCase().includes(search) || 
      l.type.toLowerCase().includes(search) ||
      l.actor.toLowerCase().includes(search) ||
      l.studentId?.toLowerCase().includes(search) ||
      l.studentName?.toLowerCase().includes(search)
    );
  }, [logs, logSearch]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const newStudents: Student[] = data.map((row: any) => {
          const rowKeys = Object.keys(row);
          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
               const pkLower = pk.toLowerCase().trim();
               const match = rowKeys.find(rk => rk.toLowerCase().trim() === pkLower);
               if (match !== undefined) return row[match];
            }
            return undefined;
          };

          const rowId = String(getVal(['ID', 'Student ID', 'id']) || '');
          if (!rowId) return null;

          return {
            id: rowId,
            name: String(getVal(['Name', 'name']) || 'Unknown Student'),
            gender: (getVal(['Gender', 'gender']) || 'Male') as 'Male' | 'Female',
            admittedMajor: String(getVal(['Major', 'major', 'Admitted Major']) || 'Undecided'),
            term: String(getVal(['Term', 'term']) || '261'),
            englishPlacement: 'Pending',
            mathPlacement: 'Pending',
            academicLevel: AcademicLevel.PREP,
            status: RegistrationStatus.UNDER_PROCESS,
            updatedAt: new Date().toISOString(),
            englishSection: getVal(['English Section', 'english_section']) ? String(getVal(['English Section', 'english_section'])) : undefined,
            mathSection: getVal(['Math Section', 'math_section']) ? String(getVal(['Math Section', 'math_section'])) : undefined
          };
        }).filter((s: any): s is Student => s !== null);

        if (newStudents.length > 0) {
          const existingIds = new Set(students.map(s => s.id));
          const filteredNew = newStudents.filter(s => !existingIds.has(s.id));
          
          if (filteredNew.length > 0) {
            await setStudents([...students, ...filteredNew]);
            await addLog('Admission', `Imported ${filteredNew.length} new student records from Excel.`, 'Registrar');
          }
          alert(`Successfully imported ${newStudents.length} base student records.`);
        } else {
          alert("No valid student data found in the file. Please check the column headers (ID, Name, etc.).");
        }
      } catch (err) {
        console.error("Import error:", err);
        alert("Error importing data. Please ensure the Excel file matches the template headers.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadInitialTemplate = () => {
    const templateData = [
      { ID: '20241001', Name: 'Ahmed Al-Fulan', Gender: 'Male', Major: 'Mechanical Engineering', Term: '261' },
      { ID: '20241002', Name: 'Sara Al-Fulan', Gender: 'Female', Major: 'Computer Science', Term: '261' },
      { ID: '20241003', Name: 'Khalid Abdullah', Gender: 'Male', Major: 'Industrial Design', Term: '262' }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admissions_Template");
    XLSX.writeFile(wb, "Initial_Students_Template.xlsx");
  };

  const updateStatus = async (id: string, newStatus: RegistrationStatus) => {
    const student = students.find(s => s.id === id);
    if (student) {
      const updatedStudent = { ...student, status: newStatus, updatedAt: new Date().toISOString() };
      await setStudents(students.map(s => s.id === id ? updatedStudent : s));
      await addLog('StatusUpdate', `Status changed to ${newStatus}.`, 'Registrar', student.id, student.name);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: RegistrationStatus) => {
    const updatedStudents = students.map(s => 
      selectedIds.includes(s.id) ? { ...s, status: newStatus, updatedAt: new Date().toISOString() } : s
    );
    
    await setStudents(updatedStudents);
    
    const logEntries = selectedIds.map(id => {
      const student = students.find(s => s.id === id);
      return {
        type: 'StatusUpdate' as const,
        description: `Bulk update: status set to ${newStatus}.`,
        studentId: student?.id,
        studentName: student?.name
      };
    }).filter(e => !!e.studentId);

    if (logEntries.length > 0) {
      await addLogs(logEntries, 'Registrar');
    }

    setSelectedIds([]);
  };

  const handleBulkRequestProcess = async (status: 'Registered' | 'Needs Revision') => {
    const updatedRequests = requests.map(r => 
      selectedRequestIds.includes(r.id) ? { ...r, status: status } : r
    );
    
    await setRequests(updatedRequests);

    const logEntries = selectedRequestIds.map(id => {
      const req = requests.find(r => r.id === id);
      return {
        type: 'Adjustment' as const,
        description: `Bulk update: Mark as ${status} for ${req?.requestType}.`,
        studentId: req?.studentId,
        studentName: req?.studentName
      };
    }).filter(e => !!e.studentId);

    if (logEntries.length > 0) {
      await addLogs(logEntries, 'Registrar');
    }

    setSelectedRequestIds([]);
  };

  const toggleSelectAll = () => {
    if (activeTab === 'students') {
      if (selectedIds.length === filteredStudents.length) {
        setSelectedIds([]);
      } else {
        setSelectedIds(filteredStudents.map(s => s.id));
      }
    } else if (activeTab === 'requests') {
      const pendingRequests = requests.filter(r => r.status === 'Pending');
      if (selectedRequestIds.length === pendingRequests.length) {
        setSelectedRequestIds([]);
      } else {
        setSelectedRequestIds(pendingRequests.map(r => r.id));
      }
    }
  };

  const toggleSelectOne = (id: string) => {
    if (activeTab === 'students') {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedRequestIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    }
  };

  const updateRequestStatus = async (requestId: string, status: 'Registered' | 'Needs Revision') => {
    const updatedRequests = requests.map(r => r.id === requestId ? { ...r, status } : r);
    await setRequests(updatedRequests);

    const req = requests.find(r => r.id === requestId);
    if (req) {
      await addLog('Adjustment', `Marked ${req.requestType} as ${status}.`, 'Registrar', req.studentId, req.studentName);
    }
  };

  const downloadData = () => {
    const exportData = students.map(s => ({
      'Student ID': s.id,
      'Name': s.name,
      'Gender': s.gender,
      'Major': s.admittedMajor,
      'Term': s.term,
      'English Section': s.englishSection || 'N/A',
      'Math Section': s.mathSection || 'N/A',
      'English Placement': s.englishPlacement,
      'Math Placement': s.mathPlacement,
      'Academic Level': s.academicLevel,
      'Registration Status': s.status,
      'Last Updated': new Date(s.updatedAt).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, `Banner_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadRequestsData = () => {
    const exportData = requests.map(r => ({
      'Request ID': r.id,
      'Student ID': r.studentId,
      'Student Name': r.studentName,
      'Request Type': r.requestType,
      'Course': r.courseName || 'N/A',
      'Section Number': r.sectionNumber || 'N/A',
      'Adjustment Details': r.details,
      'Status': r.status,
      'Submitted Date': new Date(r.createdAt).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Adjustment Requests');
    XLSX.writeFile(workbook, `Adjustment_Requests_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const stats = {
    total: students.length,
    registered: students.filter(s => s.status === RegistrationStatus.REGISTERED).length,
    pending: students.filter(s => s.status === RegistrationStatus.UNDER_PROCESS).length,
    requests: requests.filter(r => r.status === 'Pending').length,
  };

  const anySelected = activeTab === 'students' ? selectedIds.length > 0 : (activeTab === 'requests' ? selectedRequestIds.length > 0 : false);

  return (
    <div className="space-y-8 relative pb-20">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-lg"><Users size={20} /></div>
            <span className="text-xs font-medium text-slate-400">Total Students</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></div>
            <span className="text-xs font-medium text-slate-400">Registered</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.registered}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Clock size={20} /></div>
            <span className="text-xs font-medium text-slate-400">Under Process</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.pending}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertCircle size={20} /></div>
            <span className="text-xs font-medium text-slate-400">Open Requests</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.requests}</div>
        </div>
      </div>

      <div className="border-b border-slate-200 pb-4">
        <div className="flex gap-8">
          <button 
            onClick={() => setActiveTab('students')}
            className={`pb-4 px-2 font-medium transition-all ${activeTab === 'students' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Student Master List
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`pb-4 px-2 font-medium transition-all ${activeTab === 'requests' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Schedule Adjustments
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-2 font-medium transition-all ${activeTab === 'history' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2">
              <History size={16} />
              History Log
            </div>
          </button>
        </div>
      </div>

      {activeTab !== 'history' && (
        <div className="flex items-center justify-end gap-3 mt-4">
          {activeTab === 'students' && (
            <>
              <button 
                onClick={downloadInitialTemplate}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 underline underline-offset-4 mr-2"
              >
                Downloads template
              </button>
              {currentUserName === "Asma Alhajri" && (
                <button 
                  onClick={handleFullReset}
                  disabled={resetLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors text-sm font-bold shadow-sm disabled:opacity-50"
                >
                  <RotateCcw size={16} className={resetLoading ? "animate-spin" : ""} />
                  {resetLoading ? "Resetting..." : "Reset All Data"}
                </button>
              )}
              <label className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 cursor-pointer transition-colors text-sm font-medium shadow-sm">
                <FileUp size={16} />
                Import data
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx, .xls, .csv" />
              </label>
              <button 
                onClick={downloadData}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
              >
                <Download size={16} />
                Export for Banner
              </button>
            </>
          )}
          {activeTab === 'requests' && (
            <button 
              onClick={downloadRequestsData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
            >
              <FileSpreadsheet size={16} />
              Export Requests
            </button>
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <>
          <div className="flex items-center gap-4 mb-2 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-2 text-slate-400 mr-2 shrink-0">
              <Filter size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Filter by Term:</span>
            </div>
            <div className="flex gap-2">
              {uniqueTerms.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSelectedTerm(term);
                    setSelectedIds([]);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    selectedTerm === term 
                      ? 'bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-100' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {term === 'All' ? 'All Terms' : `Term ${term}`}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <button 
                      onClick={toggleSelectAll}
                      className={`transition-colors ${selectedIds.length === filteredStudents.length && filteredStudents.length > 0 ? 'text-sky-600' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                      {selectedIds.length === filteredStudents.length && filteredStudents.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </th>
                  <th className="px-6 py-4">Student ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Term</th>
                  <th className="px-6 py-4">Section</th>
                  <th className="px-6 py-4">Academic Level</th>
                  <th className="px-6 py-4">Placement</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    onClick={() => setViewingStudent(student)}
                    className={`transition-colors cursor-pointer ${selectedIds.includes(student.id) ? 'bg-sky-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => toggleSelectOne(student.id)}
                        className={`transition-colors ${selectedIds.includes(student.id) ? 'text-sky-600' : 'text-slate-300 hover:text-slate-400'}`}
                      >
                        {selectedIds.includes(student.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900">{student.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{student.name}</div>
                      <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">{student.admittedMajor}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {student.term}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                        E:{student.englishSection || '-'} M:{student.mathSection || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${student.academicLevel === 'Prep' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {student.academicLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold">
                      <span className="text-slate-400 uppercase mr-1">E:</span> 
                      <span className={student.englishPlacement === 'Pending' ? 'text-amber-500' : 'text-slate-700'}>{student.englishPlacement}</span>
                      <br/>
                      <span className="text-slate-400 uppercase mr-1">M:</span> 
                      <span className={student.mathPlacement === 'Pending' ? 'text-amber-500' : 'text-slate-700'}>{student.mathPlacement}</span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={student.status}
                        onChange={(e) => updateStatus(student.id, e.target.value as RegistrationStatus)}
                        className={`w-full p-2 rounded-lg text-sm font-bold outline-none border transition-all ${
                          student.status === RegistrationStatus.REGISTERED 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        <option value={RegistrationStatus.UNDER_PROCESS}>Under Process</option>
                        <option value={RegistrationStatus.REGISTERED}>Registered</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                No students found for this term.
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 mb-2 bg-slate-50 rounded-xl border border-slate-200 w-fit">
              <button 
                onClick={toggleSelectAll}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${selectedRequestIds.length === requests.filter(r => r.status === 'Pending').length ? 'text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {selectedRequestIds.length === requests.filter(r => r.status === 'Pending').length ? <CheckSquare size={18} /> : <Square size={18} />}
                Select All Pending
              </button>
            </div>
          )}
          
          <div className="grid gap-4">
            {requests.length === 0 ? (
              <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200 border-dashed">
                No pending schedule adjustment requests.
              </div>
            ) : (
              requests.map((request) => (
                <div 
                  key={request.id} 
                  className={`bg-white p-6 rounded-2xl shadow-sm border transition-all flex items-center gap-6 ${selectedRequestIds.includes(request.id) ? 'border-sky-300 bg-sky-50/30' : 'border-slate-200'}`}
                >
                  {request.status === 'Pending' && (
                    <button 
                      onClick={() => toggleSelectOne(request.id)}
                      className={`transition-colors shrink-0 ${selectedRequestIds.includes(request.id) ? 'text-sky-600' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                      {selectedRequestIds.includes(request.id) ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded ${
                        request.requestType === 'Section Change' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {request.requestType}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">Submitted {new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-bold text-slate-900">{request.studentName} <span className="text-slate-400 text-sm font-normal">({request.studentId})</span></h3>
                    <p className="text-slate-600 mt-2 text-sm leading-relaxed italic">"{request.details}"</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {request.status === 'Registered' ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                        <CheckCircle2 size={18} />
                        Registered
                      </span>
                    ) : request.status === 'Needs Revision' ? (
                      <span className="flex items-center gap-1.5 text-amber-600 font-bold bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                        <RotateCcw size={18} />
                        Revision Required
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateRequestStatus(request.id, 'Registered')}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-sm shadow-sm flex items-center gap-2"
                        >
                          <CheckCircle2 size={16} />
                          Register
                        </button>
                        <button 
                          onClick={() => updateRequestStatus(request.id, 'Needs Revision')}
                          className="px-4 py-2 bg-white border border-slate-200 text-amber-600 rounded-xl hover:bg-amber-50 transition-colors font-bold text-sm shadow-sm flex items-center gap-2"
                        >
                          <RotateCcw size={16} />
                          Revision Needed
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search history by ID, Name, Action or Event Type..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all font-medium text-slate-400"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <History size={18} className="text-sky-600" />
                Student Activity History Log
              </h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredLogs.length} Events Total</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Student ID</th>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Event Type</th>
                    <th className="px-6 py-4">Action Details</th>
                    <th className="px-6 py-4">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-20 text-center text-slate-400">
                        <History size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="font-medium">No activity log entries found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <Calendar size={12} className="text-slate-400" />
                            {new Date(log.timestamp).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 ml-5">
                            <Clock size={10} />
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                            {log.studentId || 'SYSTEM'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-sm text-slate-800">
                            {log.studentName || 'System Process'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            log.type === 'Admission' ? 'bg-sky-100 text-sky-700' :
                            log.type === 'Placement' ? 'bg-indigo-100 text-indigo-700' :
                            log.type === 'StatusUpdate' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-md">
                            {log.description}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              log.actor.includes('Registrar') ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {log.actor.includes('Registrar') ? 'R' : 'P'}
                            </div>
                            <span className="text-xs font-bold text-slate-600">{log.actor}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {anySelected && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-sm">
              {activeTab === 'students' ? selectedIds.length : selectedRequestIds.length}
            </div>
            <span className="text-sm font-semibold">{activeTab === 'students' ? 'Students' : 'Requests'} Selected</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Bulk Actions:</span>
            
            {activeTab === 'students' ? (
              <>
                <button 
                  onClick={() => handleBulkStatusUpdate(RegistrationStatus.REGISTERED)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold transition-colors"
                >
                  <CheckCircle2 size={16} />
                  Mark Registered
                </button>
                <button 
                  onClick={() => handleBulkStatusUpdate(RegistrationStatus.UNDER_PROCESS)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-sm font-bold transition-colors"
                >
                  <Clock size={16} />
                  Mark Under Process
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => handleBulkRequestProcess('Registered')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold transition-colors"
                >
                  <CheckCircle size={16} />
                  Register Selected
                </button>
                <button 
                  onClick={() => handleBulkRequestProcess('Needs Revision')}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-sm font-bold transition-colors"
                >
                  <RotateCcw size={16} />
                  Mark Revision Needed
                </button>
              </div>
            )}

            <button 
              onClick={() => activeTab === 'students' ? setSelectedIds([]) : setSelectedRequestIds([])}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={performReset}
        isDanger={true}
        title="Delete All Application Data"
        message="This will permanently delete all student records, schedule requests, and activity logs. This action is irreversible and affects the entire department database."
        confirmLabel="Delete Everything"
        requirePhrase="DELETE ALL"
        isLoading={resetLoading}
      />

      {/* Student Detail Modal */}
      <AnimatePresence>
        {viewingStudent && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingStudent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-100 text-sky-600 rounded-xl">
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">Student Details</h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{viewingStudent.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                    <p className="text-slate-900 font-bold">{viewingStudent.name}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      viewingStudent.status === RegistrationStatus.REGISTERED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {viewingStudent.status}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Academic Level</label>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      viewingStudent.academicLevel === AcademicLevel.PREP ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {viewingStudent.academicLevel}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</label>
                    <p className="text-slate-900 font-bold">{viewingStudent.gender}</p>
                  </div>
                </div>

                {/* Academic Placement */}
                <div className="mb-8">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <GraduationCap size={16} className="text-sky-600" />
                    Academic Placement
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-100 p-4 rounded-2xl">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">English Placement</label>
                      <p className="text-sky-700 font-black text-lg">{viewingStudent.englishPlacement}</p>
                      <p className="text-xs text-slate-400 mt-1 font-bold">Section: <span className="text-slate-900">{viewingStudent.englishSection || 'N/A'}</span></p>
                    </div>
                    <div className="border border-slate-100 p-4 rounded-2xl">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Math Placement</label>
                      <p className="text-indigo-700 font-black text-lg">{viewingStudent.mathPlacement}</p>
                      <p className="text-xs text-slate-400 mt-1 font-bold">Section: <span className="text-slate-900">{viewingStudent.mathSection || 'N/A'}</span></p>
                    </div>
                  </div>
                </div>

                {/* Score Details - English */}
                <div className="mb-8">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Award size={16} className="text-emerald-600" />
                    English Level Evaluation
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {['engl001', 'engl002', 'engl003', 'engl004'].map((field) => (
                      <div key={field} className="bg-slate-50 p-3 rounded-xl text-center">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{field.toUpperCase()}</label>
                        <p className="text-slate-900 font-bold">{(viewingStudent as any)[field] || '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score Details - Math */}
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Award size={16} className="text-emerald-600" />
                    Math Level Evaluation
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {['math001', 'math002', 'math012'].map((field) => (
                      <div key={field} className="bg-slate-50 p-3 rounded-xl text-center">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {field === 'math012' ? 'MATH012' : field.toUpperCase()}
                        </label>
                        <p className="text-slate-900 font-bold">{(viewingStudent as any)[field] || '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last Updated: {new Date(viewingStudent.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegistrarDashboard;
