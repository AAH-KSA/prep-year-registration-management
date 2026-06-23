
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Student, ScheduleRequest, ActivityLog } from '../types';

const STUDENTS_COLLECTION = 'students';
const REQUESTS_COLLECTION = 'requests';
const LOGS_COLLECTION = 'logs';

export const subscribeToStudents = (callback: (students: Student[]) => void) => {
  return onSnapshot(
    collection(db, STUDENTS_COLLECTION),
    (snapshot) => {
      const students = snapshot.docs.map(doc => doc.data() as Student);
      callback(students);
    },
    (error) => handleFirestoreError(error, OperationType.GET, STUDENTS_COLLECTION)
  );
};

export const subscribeToRequests = (callback: (requests: ScheduleRequest[]) => void) => {
  return onSnapshot(
    query(collection(db, REQUESTS_COLLECTION), orderBy('createdAt', 'desc')),
    (snapshot) => {
      const requests = snapshot.docs.map(doc => doc.data() as ScheduleRequest);
      callback(requests);
    },
    (error) => handleFirestoreError(error, OperationType.GET, REQUESTS_COLLECTION)
  );
};

export const subscribeToLogs = (callback: (logs: ActivityLog[]) => void) => {
  return onSnapshot(
    query(collection(db, LOGS_COLLECTION), orderBy('timestamp', 'desc')),
    (snapshot) => {
      const logs = snapshot.docs.map(doc => doc.data() as ActivityLog);
      callback(logs);
    },
    (error) => handleFirestoreError(error, OperationType.GET, LOGS_COLLECTION)
  );
};

// Helper to recursively remove undefined values as Firestore doesn't support them
const sanitizeData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  } else if (data !== null && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeData(v)])
    );
  }
  return data;
};

export const saveStudent = async (student: Student) => {
  try {
    const cleaned = sanitizeData(student);
    await setDoc(doc(db, STUDENTS_COLLECTION, student.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${STUDENTS_COLLECTION}/${student.id}`);
  }
};

export const deleteStudent = async (studentId: string) => {
  try {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${STUDENTS_COLLECTION}/${studentId}`);
  }
};

export const saveRequest = async (request: ScheduleRequest) => {
  try {
    const cleaned = sanitizeData(request);
    await setDoc(doc(db, REQUESTS_COLLECTION, request.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${REQUESTS_COLLECTION}/${request.id}`);
  }
};

export const saveLog = async (log: ActivityLog) => {
  try {
    const cleaned = sanitizeData(log);
    await setDoc(doc(db, LOGS_COLLECTION, log.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${LOGS_COLLECTION}/${log.id}`);
  }
};

export const bulkSaveStudents = async (students: Student[]) => {
  if (students.length === 0) return;
  
  try {
    // Firestore batches are limited to 500 operations
    const CHUNK_SIZE = 500;
    for (let i = 0; i < students.length; i += CHUNK_SIZE) {
      const chunk = students.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach(student => {
        const cleaned = sanitizeData(student);
        const ref = doc(db, STUDENTS_COLLECTION, student.id);
        batch.set(ref, cleaned);
      });
      
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, STUDENTS_COLLECTION);
  }
};

export const bulkSaveLogs = async (logs: ActivityLog[]) => {
  if (logs.length === 0) return;
  try {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
      const chunk = logs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(log => {
        const cleaned = sanitizeData(log);
        const ref = doc(db, LOGS_COLLECTION, log.id);
        batch.set(ref, cleaned);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LOGS_COLLECTION);
  }
};

export const deleteAllStudents = async () => {
  try {
    const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
    const docs = snapshot.docs;
    const CHUNK_SIZE = 500;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, STUDENTS_COLLECTION);
  }
};

export const deleteAllRequests = async () => {
  try {
    const snapshot = await getDocs(collection(db, REQUESTS_COLLECTION));
    const docs = snapshot.docs;
    const CHUNK_SIZE = 500;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, REQUESTS_COLLECTION);
  }
};

export const deleteAllLogs = async () => {
  try {
    const snapshot = await getDocs(collection(db, LOGS_COLLECTION));
    const docs = snapshot.docs;
    const CHUNK_SIZE = 500;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LOGS_COLLECTION);
  }
};

export const migrateInitialData = async (initialStudents: Student[]) => {
  const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
  if (snapshot.empty && initialStudents.length > 0) {
    const batch = writeBatch(db);
    initialStudents.forEach(student => {
      const ref = doc(db, STUDENTS_COLLECTION, student.id);
      const cleaned = sanitizeData(student);
      batch.set(ref, cleaned);
    });
    await batch.commit();
  }
};
