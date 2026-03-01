import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabaseConfig";

type SupabaseErrorLike = {
  message?: string;
  code?: string;
};

const supabaseAny = supabase as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      order: (column: string, options: { ascending: boolean }) => Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
      eq: (column: string, value: string) => Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
      or: (filter: string) => {
        limit: (count: number) => Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
      };
      maybeSingle: () => Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
    };
    upsert: (payload: unknown) => Promise<{ error: SupabaseErrorLike | null }>;
    delete: () => {
      eq: (column: string, value: string) => Promise<{ error: SupabaseErrorLike | null }>;
    };
    insert: (payload: unknown) => Promise<{ error: SupabaseErrorLike | null }>;
  };
};

export type SemesterRecord = {
  semester_no: number;
  subject_name: string;
  mark: number;
  grade: string;
};

export type StoredFile = {
  name: string;
  mime_type: string;
  data_url?: string;
  url?: string;
};

export type StudentDocuments = {
  certificate_url?: StoredFile;
  sem1_marksheet?: StoredFile;
  sem2_marksheet?: StoredFile;
  sem3_marksheet?: StoredFile;
  sem4_marksheet?: StoredFile;
  sem5_marksheet?: StoredFile;
  sem6_marksheet?: StoredFile;
};

export type StudentRecord = {
  student_id: string;
  name: string;
  reg_no: string;
  department: string;
  batch: string;
  year_of_passing: number;
  cgpa: number;
  photo_url?: StoredFile;
  blockchain_hash: string;
  ipfs_cid: string;
  verification_id: string;
  created_at: string;
  semesters: SemesterRecord[];
  documents: StudentDocuments;
};

type StudentRow = {
  id: string;
  name: string;
  reg_no: string;
  department: string;
  batch: string;
  year_of_passing: number;
  cgpa: number;
  photo: StoredFile | null;
  blockchain_hash: string;
  ipfs_cid: string;
  verification_id: string;
  created_at: string;
};

type SemesterRow = {
  student_id: string;
  semester_no: number;
  subject_name: string;
  mark: number;
  grade: string;
};

type DocumentRow = {
  student_id: string;
  certificate: StoredFile | null;
  sem1_marksheet: StoredFile | null;
  sem2_marksheet: StoredFile | null;
  sem3_marksheet: StoredFile | null;
  sem4_marksheet: StoredFile | null;
  sem5_marksheet: StoredFile | null;
  sem6_marksheet: StoredFile | null;
};

const STORAGE_KEY = "certichain.students.v1";

function throwIfSupabaseError(error: SupabaseErrorLike | null | undefined, fallback: string): void {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

function isMissingSupabaseSchemaError(error: SupabaseErrorLike | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01") return true;

  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    message.includes("relation")
  );
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${canonicalize(obj[key])}`);
  return `{${entries.join(",")}}`;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildHashPayload(record: Omit<StudentRecord, "blockchain_hash" | "ipfs_cid" | "verification_id" | "created_at" | "student_id">): unknown {
  return {
    name: record.name,
    reg_no: record.reg_no,
    department: record.department,
    batch: record.batch,
    year_of_passing: record.year_of_passing,
    cgpa: record.cgpa,
    photo_data: record.photo_url?.data_url ?? record.photo_url?.url ?? null,
    semesters: record.semesters,
    documents: record.documents,
  };
}

async function toDataUrlFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resolveStoredFileData(file?: StoredFile): Promise<StoredFile | undefined> {
  if (!file) return undefined;
  if (file.data_url) return file;
  if (file.url) {
    const dataUrl = await toDataUrlFromUrl(file.url);
    return { ...file, data_url: dataUrl };
  }
  return file;
}

async function uploadFileToSupabase(studentId: string, file: StoredFile, pathSuffix: string): Promise<StoredFile> {
  if (!file.data_url) return file;
  const blob = await (await fetch(file.data_url)).blob();
  const fileExt = file.name.split(".").pop() || "bin";
  const path = `${studentId}/${pathSuffix}.${fileExt}`;

  const { error } = await supabase.storage.from("certichain-docs").upload(path, blob, {
    upsert: true,
    contentType: file.mime_type,
  });

  if (error) {
    return file;
  }

  const { data } = supabase.storage.from("certichain-docs").getPublicUrl(path);
  return {
    ...file,
    url: data.publicUrl,
    data_url: undefined,
  };
}

export async function computeBlockchainHash(
  record: Omit<StudentRecord, "blockchain_hash" | "ipfs_cid" | "verification_id" | "created_at" | "student_id">,
): Promise<string> {
  const canonicalPayload = canonicalize(buildHashPayload(record));
  return sha256Hex(canonicalPayload);
}

export function generateVerificationId(regNo: string): string {
  const cleanRegNo = regNo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VC-${cleanRegNo}-${randomPart}`;
}

export function generateIpfsCid(hash: string): string {
  return `bafy${hash.slice(0, 40)}`;
}

export async function getAllStudentRecords(): Promise<StudentRecord[]> {
  if (!hasSupabaseConfig) {
    return getLocalStudentRecords();
  }

  const { data: students, error } = await supabaseAny
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSupabaseSchemaError(error)) {
      return getLocalStudentRecords();
    }
    throw new Error(error.message || "Unable to load student records.");
  }

  if (!students) {
    return [];
  }

  const { data: semesters, error: semestersError } = await supabaseAny.from("semesters").select("*");
  if (isMissingSupabaseSchemaError(semestersError)) {
    return getLocalStudentRecords();
  }
  throwIfSupabaseError(semestersError, "Unable to load semester records.");

  const { data: documents, error: documentsError } = await supabaseAny.from("documents").select("*");
  if (isMissingSupabaseSchemaError(documentsError)) {
    return getLocalStudentRecords();
  }
  throwIfSupabaseError(documentsError, "Unable to load document records.");

  return mapSupabaseRecords(students as StudentRow[], (semesters as SemesterRow[]) ?? [], (documents as DocumentRow[]) ?? []);
}

export async function saveStudentRecord(record: StudentRecord): Promise<void> {
  if (!hasSupabaseConfig) {
    saveLocalStudentRecord(record);
    return;
  }

  const studentId = record.student_id;

  const photo = record.photo_url ? await uploadFileToSupabase(studentId, record.photo_url, "photo") : undefined;
  const certificate = record.documents.certificate_url
    ? await uploadFileToSupabase(studentId, record.documents.certificate_url, "certificate")
    : undefined;
  const sem1 = record.documents.sem1_marksheet
    ? await uploadFileToSupabase(studentId, record.documents.sem1_marksheet, "sem1")
    : undefined;
  const sem2 = record.documents.sem2_marksheet
    ? await uploadFileToSupabase(studentId, record.documents.sem2_marksheet, "sem2")
    : undefined;
  const sem3 = record.documents.sem3_marksheet
    ? await uploadFileToSupabase(studentId, record.documents.sem3_marksheet, "sem3")
    : undefined;
  const sem4 = record.documents.sem4_marksheet
    ? await uploadFileToSupabase(studentId, record.documents.sem4_marksheet, "sem4")
    : undefined;
  const sem5 = record.documents.sem5_marksheet
    ? await uploadFileToSupabase(studentId, record.documents.sem5_marksheet, "sem5")
    : undefined;
  const sem6 = record.documents.sem6_marksheet
    ? await uploadFileToSupabase(studentId, record.documents.sem6_marksheet, "sem6")
    : undefined;

  const { error: studentError } = await supabaseAny.from("students").upsert({
    id: studentId,
    name: record.name,
    reg_no: record.reg_no,
    department: record.department,
    batch: record.batch,
    year_of_passing: record.year_of_passing,
    cgpa: record.cgpa,
    photo: photo ?? null,
    blockchain_hash: record.blockchain_hash,
    ipfs_cid: record.ipfs_cid,
    verification_id: record.verification_id,
    created_at: record.created_at,
  });
  if (isMissingSupabaseSchemaError(studentError)) {
    saveLocalStudentRecord(record);
    return;
  }
  throwIfSupabaseError(studentError, "Unable to save student record.");

  if (record.semesters.length) {
    const semesterPayload = record.semesters.map((semester) => ({
      student_id: studentId,
      semester_no: semester.semester_no,
      subject_name: semester.subject_name,
      mark: semester.mark,
      grade: semester.grade,
    }));

    const { error: deleteSemestersError } = await supabaseAny.from("semesters").delete().eq("student_id", studentId);
    if (isMissingSupabaseSchemaError(deleteSemestersError)) {
      saveLocalStudentRecord(record);
      return;
    }
    throwIfSupabaseError(deleteSemestersError, "Unable to update semester records.");

    const { error: insertSemestersError } = await supabaseAny.from("semesters").insert(semesterPayload);
    if (isMissingSupabaseSchemaError(insertSemestersError)) {
      saveLocalStudentRecord(record);
      return;
    }
    throwIfSupabaseError(insertSemestersError, "Unable to save semester records.");
  }

  const { error: documentsSaveError } = await supabaseAny.from("documents").upsert({
    student_id: studentId,
    certificate: certificate ?? null,
    sem1_marksheet: sem1 ?? null,
    sem2_marksheet: sem2 ?? null,
    sem3_marksheet: sem3 ?? null,
    sem4_marksheet: sem4 ?? null,
    sem5_marksheet: sem5 ?? null,
    sem6_marksheet: sem6 ?? null,
  });
  if (isMissingSupabaseSchemaError(documentsSaveError)) {
    saveLocalStudentRecord(record);
    return;
  }
  throwIfSupabaseError(documentsSaveError, "Unable to save student documents.");
}

export async function findStudentRecord(query: string): Promise<StudentRecord | undefined> {
  const normalized = query.trim().toUpperCase();
  if (!normalized) return undefined;
  const localRecord = findLocalStudentRecord(normalized);

  if (!hasSupabaseConfig) {
    return localRecord;
  }

  const { data: students, error: studentsError } = await supabaseAny
    .from("students")
    .select("*")
    .or(`reg_no.eq.${normalized},verification_id.eq.${normalized}`)
    .limit(1);

  if (isMissingSupabaseSchemaError(studentsError)) {
    return localRecord;
  }
  throwIfSupabaseError(studentsError, "Unable to search student records.");

  if (!students || students.length === 0) return localRecord;

  const student = students[0] as StudentRow;
  const { data: semesters, error: semestersError } = await supabaseAny
    .from("semesters")
    .select("*")
    .eq("student_id", student.id);
  if (isMissingSupabaseSchemaError(semestersError)) {
    return localRecord;
  }
  throwIfSupabaseError(semestersError, "Unable to load semester records.");

  const { data: documents, error: documentsError } = await supabaseAny
    .from("documents")
    .select("*")
    .eq("student_id", student.id)
    .maybeSingle();
  if (isMissingSupabaseSchemaError(documentsError)) {
    return localRecord;
  }
  throwIfSupabaseError(documentsError, "Unable to load student documents.");

  return mapSupabaseRecord(student, (semesters as SemesterRow[]) ?? [], (documents as DocumentRow) ?? null);
}

export async function isRecordTampered(record: StudentRecord): Promise<boolean> {
  const resolvedDocuments: StudentDocuments = {
    certificate_url: await resolveStoredFileData(record.documents.certificate_url),
    sem1_marksheet: await resolveStoredFileData(record.documents.sem1_marksheet),
    sem2_marksheet: await resolveStoredFileData(record.documents.sem2_marksheet),
    sem3_marksheet: await resolveStoredFileData(record.documents.sem3_marksheet),
    sem4_marksheet: await resolveStoredFileData(record.documents.sem4_marksheet),
    sem5_marksheet: await resolveStoredFileData(record.documents.sem5_marksheet),
    sem6_marksheet: await resolveStoredFileData(record.documents.sem6_marksheet),
  };

  const recomputed = await computeBlockchainHash({
    name: record.name,
    reg_no: record.reg_no,
    department: record.department,
    batch: record.batch,
    year_of_passing: record.year_of_passing,
    cgpa: record.cgpa,
    photo_url: await resolveStoredFileData(record.photo_url),
    semesters: record.semesters,
    documents: resolvedDocuments,
  });

  return recomputed !== record.blockchain_hash;
}

export function toIpfsGatewayUrl(cid: string): string {
  return `https://ipfs.io/ipfs/${cid}`;
}

function getLocalStudentRecords(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudentRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalStudentRecord(record: StudentRecord): void {
  const current = getLocalStudentRecords();
  const next = [record, ...current.filter((item) => item.student_id !== record.student_id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function findLocalStudentRecord(normalized: string): StudentRecord | undefined {
  return getLocalStudentRecords().find(
    (record) =>
      record.reg_no.toUpperCase() === normalized ||
      record.verification_id.toUpperCase() === normalized,
  );
}

function mapSupabaseRecords(
  students: StudentRow[],
  semesters: SemesterRow[],
  documents: DocumentRow[],
): StudentRecord[] {
  return students.map((student) => {
    const studentSemesters = semesters.filter((item) => item.student_id === student.id);
    const docRow = documents.find((item) => item.student_id === student.id) ?? null;
    return mapSupabaseRecord(student, studentSemesters, docRow);
  });
}

function mapSupabaseRecord(
  student: StudentRow,
  semesters: SemesterRow[],
  documents: DocumentRow | null,
): StudentRecord {
  return {
    student_id: student.id,
    name: student.name,
    reg_no: student.reg_no,
    department: student.department,
    batch: student.batch,
    year_of_passing: student.year_of_passing,
    cgpa: student.cgpa,
    photo_url: student.photo ?? undefined,
    blockchain_hash: student.blockchain_hash,
    ipfs_cid: student.ipfs_cid,
    verification_id: student.verification_id,
    created_at: student.created_at,
    semesters: semesters.map((semester) => ({
      semester_no: semester.semester_no,
      subject_name: semester.subject_name,
      mark: semester.mark,
      grade: semester.grade,
    })),
    documents: {
      certificate_url: documents?.certificate ?? undefined,
      sem1_marksheet: documents?.sem1_marksheet ?? undefined,
      sem2_marksheet: documents?.sem2_marksheet ?? undefined,
      sem3_marksheet: documents?.sem3_marksheet ?? undefined,
      sem4_marksheet: documents?.sem4_marksheet ?? undefined,
      sem5_marksheet: documents?.sem5_marksheet ?? undefined,
      sem6_marksheet: documents?.sem6_marksheet ?? undefined,
    },
  };
}
