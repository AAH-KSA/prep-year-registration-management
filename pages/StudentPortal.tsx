
import React from 'react';
import { Student, AcademicLevel, RegistrationStatus } from '../types';
import { GraduationCap, BookOpen, MapPin, AlertCircle, Info } from 'lucide-react';

interface StudentPortalProps {
  student?: Student;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ student }) => {
  if (!student) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Student Record Not Found</h2>
          <p className="text-slate-600 mt-2">The Student ID provided does not match our records. Please contact the Registrar's Office.</p>
        </div>
      </div>
    );
  }

  const isFreshman = student.academicLevel === AcademicLevel.FRESHMAN;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Profile Card */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 text-3xl font-bold shrink-0">
          {student.name.charAt(0)}
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
            <h1 className="text-3xl font-bold">{student.name}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${isFreshman ? 'bg-emerald-500' : 'bg-amber-500'}`}>
              {student.academicLevel}
            </span>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-slate-400 font-medium">
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> ID: {student.id}</span>
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Major: {student.admittedMajor}</span>
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Term: {student.term}</span>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-center">
           <div className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${student.status === RegistrationStatus.REGISTERED ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-amber-500 text-amber-400 bg-amber-500/10'}`}>
             {student.status.toUpperCase()}
           </div>
           <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-tighter">Registration Status</p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Placement Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
           <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
             <BookOpen className="text-sky-600" size={20} />
             Core Course Placements
           </h3>
           <div className="space-y-4">
              <div className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-sky-50 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">English Language</div>
                  <div className="text-xl font-black text-slate-800 tracking-tight">{student.englishPlacement}</div>
                </div>
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-sky-600">ENGL</div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-sky-50 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Mathematics</div>
                  <div className="text-xl font-black text-slate-800 tracking-tight">{student.mathPlacement}</div>
                </div>
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-sky-600">MATH</div>
              </div>
           </div>
        </div>

        {/* Academic Profile */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col">
           <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
             <GraduationCap className="text-sky-600" size={20} />
             Academic Pathway
           </h3>
           <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className={`w-20 h-20 rounded-2xl mb-4 flex items-center justify-center ${isFreshman ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                <GraduationCap size={40} />
              </div>
              <p className="text-slate-600 leading-relaxed mb-6">
                You are currently classified as <span className="font-bold text-slate-900">{student.academicLevel}</span>. 
                {isFreshman 
                  ? " You have successfully promoted all preparatory requirements and can begin your undergraduate major courses."
                  : " You are required to complete the preparatory year program before moving to your major courses."}
              </p>
           </div>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-sky-50 border border-sky-100 rounded-3xl p-8 flex gap-6 items-start">
         <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-600 shrink-0">
           <Info size={24} />
         </div>
         <div className="space-y-2">
            <h4 className="font-bold text-sky-900">Official Notice to Students</h4>
            <p className="text-sky-800 text-sm opacity-80 leading-relaxed">
              Placements are finalized based on the latest promotion test results provided by the Prep-Year Department. 
              If you have recently completed a test, please note that in case of any update it will be reflected here shortly.
            </p>
            <div className="pt-4 flex gap-4">
               <button className="text-xs font-bold text-sky-600 underline">Contact Prep Department</button>
               <button className="text-xs font-bold text-sky-600 underline">Download Registration Guide</button>
            </div>
         </div>
      </div>

      <footer className="text-center text-slate-400 text-xs pb-12">
        © 2024 KFUPM Preparatory Year Program. Information displayed here is for academic purposes only.
      </footer>
    </div>
  );
};

export default StudentPortal;
