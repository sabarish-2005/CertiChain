import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Database,
  Eye,
  EyeOff,
  GraduationCap,
  Menu,
  QrCode,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithRole } from "@/lib/auth";
import {
  computeBlockchainHash,
  generateIpfsCid,
  generateVerificationId,
  getAllStudentRecords,
  saveStudentRecord,
  StudentDocuments,
  StudentRecord,
} from "@/lib/records";
import { hasSupabaseConfig } from "@/lib/supabaseConfig";

const sidebarItems = [
  { icon: GraduationCap, label: "Add Student" },
  { icon: Upload, label: "Upload Documents" },
  { icon: QrCode, label: "Issue Certificate" },
  { icon: Database, label: "View Blockchain Status" },
];

const COLLEGE_CREDENTIALS = {
  username: "collegeadmin",
  password: "Certi@123",
};

type SemesterInput = {
  semester_no: number;
  subject_name: string;
  mark: string;
  grade: string;
};

type StudentForm = {
  name: string;
  reg_no: string;
  department: string;
  batch: string;
  year_of_passing: string;
  cgpa: string;
};

type UploadState = {
  photo_url: File | null;
  certificate_url: File | null;
  sem1_marksheet: File | null;
  sem2_marksheet: File | null;
  sem3_marksheet: File | null;
  sem4_marksheet: File | null;
  sem5_marksheet: File | null;
  sem6_marksheet: File | null;
};

const initialStudentForm: StudentForm = {
  name: "",
  reg_no: "",
  department: "",
  batch: "2022-2025",
  year_of_passing: "2025",
  cgpa: "",
};

const initialSemesters: SemesterInput[] = Array.from({ length: 6 }, (_, index) => ({
  semester_no: index + 1,
  subject_name: "",
  mark: "",
  grade: "",
}));

const initialUploads: UploadState = {
  photo_url: null,
  certificate_url: null,
  sem1_marksheet: null,
  sem2_marksheet: null,
  sem3_marksheet: null,
  sem4_marksheet: null,
  sem5_marksheet: null,
  sem6_marksheet: null,
};

async function fileToStored(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    name: file.name,
    mime_type: file.type || "application/octet-stream",
    data_url: dataUrl,
  };
}

export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Add Student");
  const [studentForm, setStudentForm] = useState<StudentForm>(initialStudentForm);
  const [semesters, setSemesters] = useState<SemesterInput[]>(initialSemesters);
  const [uploads, setUploads] = useState<UploadState>(initialUploads);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [latestRecord, setLatestRecord] = useState<StudentRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const dbLabel = hasSupabaseConfig ? "DB: Supabase" : "DB: Local";

  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    const loadRecords = async () => {
      const data = await getAllStudentRecords();
      if (active) setRecords(data);
    };
    loadRecords();
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  const completedSemesterCount = useMemo(
    () => semesters.filter((semester) => semester.subject_name && semester.mark && semester.grade).length,
    [semesters],
  );

  const uploadCount = useMemo(
    () => Object.values(uploads).filter(Boolean).length,
    [uploads],
  );

  const handleLogin = async () => {
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setMessage("Enter admin credentials to continue.");
      return;
    }

    // check built-in demo credentials first (works even when Supabase is configured)
    const usernameMatch = credentials.username.trim() === COLLEGE_CREDENTIALS.username;
    const passwordMatch = credentials.password === COLLEGE_CREDENTIALS.password;

    if (usernameMatch && passwordMatch) {
      setIsLoggedIn(true);
      setMessage("");
      return;
    }

    // if Supabase is available, try authenticating there as a fallback
    if (hasSupabaseConfig) {
      const result = await signInWithRole(credentials.username.trim(), credentials.password, "college");
      if (result.ok) {
        setIsLoggedIn(true);
        setMessage("");
        return;
      }
      setMessage(result.error ?? "Invalid college admin credentials.");
      return;
    }

    setMessage("Invalid college admin credentials.");
  };

  const updateSemester = (
    semesterNo: number,
    key: keyof Omit<SemesterInput, "semester_no">,
    value: string,
  ) => {
    setSemesters((current) =>
      current.map((item) =>
        item.semester_no === semesterNo
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  };

  const handleFileChange = (key: keyof UploadState, file: File | null) => {
    setUploads((current) => ({
      ...current,
      [key]: file,
    }));
  };

  const handleIssueCertificate = async () => {
    if (!studentForm.name || !studentForm.reg_no || !studentForm.department || !studentForm.cgpa) {
      setMessage("Complete student details before issuing certificate.");
      return;
    }

    if (!uploads.certificate_url) {
      setMessage("Upload degree certificate (PDF) before issuing certificate.");
      return;
    }

    if (completedSemesterCount < 6) {
      setMessage("Fill all 6 semester records before issuing certificate.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const documents: StudentDocuments = {};

      if (uploads.certificate_url) documents.certificate_url = await fileToStored(uploads.certificate_url);
      if (uploads.sem1_marksheet) documents.sem1_marksheet = await fileToStored(uploads.sem1_marksheet);
      if (uploads.sem2_marksheet) documents.sem2_marksheet = await fileToStored(uploads.sem2_marksheet);
      if (uploads.sem3_marksheet) documents.sem3_marksheet = await fileToStored(uploads.sem3_marksheet);
      if (uploads.sem4_marksheet) documents.sem4_marksheet = await fileToStored(uploads.sem4_marksheet);
      if (uploads.sem5_marksheet) documents.sem5_marksheet = await fileToStored(uploads.sem5_marksheet);
      if (uploads.sem6_marksheet) documents.sem6_marksheet = await fileToStored(uploads.sem6_marksheet);

      const photo = uploads.photo_url ? await fileToStored(uploads.photo_url) : undefined;

      const payload = {
        name: studentForm.name.trim(),
        reg_no: studentForm.reg_no.trim().toUpperCase(),
        department: studentForm.department.trim(),
        batch: studentForm.batch.trim(),
        year_of_passing: Number(studentForm.year_of_passing),
        cgpa: Number(studentForm.cgpa),
        photo_url: photo,
        semesters: semesters.map((semester) => ({
          semester_no: semester.semester_no,
          subject_name: semester.subject_name.trim(),
          mark: Number(semester.mark),
          grade: semester.grade.trim().toUpperCase(),
        })),
        documents,
      };

      const blockchainHash = await computeBlockchainHash(payload);
      const ipfsCid = generateIpfsCid(blockchainHash);
      const verificationId = generateVerificationId(payload.reg_no);

      const record: StudentRecord = {
        student_id: crypto.randomUUID(),
        name: payload.name,
        reg_no: payload.reg_no,
        department: payload.department,
        batch: payload.batch,
        year_of_passing: payload.year_of_passing,
        cgpa: payload.cgpa,
        photo_url: payload.photo_url,
        blockchain_hash: blockchainHash,
        ipfs_cid: ipfsCid,
        verification_id: verificationId,
        created_at: new Date().toISOString(),
        semesters: payload.semesters,
        documents: payload.documents,
      };

      await saveStudentRecord(record);
      const updated = await getAllStudentRecords();
      setRecords(updated);
      setLatestRecord(record);
      setActiveTab("View Blockchain Status");
      setMessage("Certificate issued successfully with blockchain hash and verification QR.");
      setStudentForm(initialStudentForm);
      setSemesters(initialSemesters);
      setUploads(initialUploads);
    } catch (error) {
      const fallback = "Unable to issue certificate. Check login and ensure Register No is unique.";
      setMessage(error instanceof Error && error.message ? error.message : fallback);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeedLoading(true);
    setMessage("");

    try {
      const placeholderUrl = `${window.location.origin}/placeholder.svg`;
      const demoDocuments: StudentDocuments = {
        certificate_url: {
          name: "certificate.svg",
          mime_type: "image/svg+xml",
          url: placeholderUrl,
        },
        sem1_marksheet: { name: "sem1.svg", mime_type: "image/svg+xml", url: placeholderUrl },
        sem2_marksheet: { name: "sem2.svg", mime_type: "image/svg+xml", url: placeholderUrl },
        sem3_marksheet: { name: "sem3.svg", mime_type: "image/svg+xml", url: placeholderUrl },
        sem4_marksheet: { name: "sem4.svg", mime_type: "image/svg+xml", url: placeholderUrl },
        sem5_marksheet: { name: "sem5.svg", mime_type: "image/svg+xml", url: placeholderUrl },
        sem6_marksheet: { name: "sem6.svg", mime_type: "image/svg+xml", url: placeholderUrl },
      };

      const demoSemesters = [
        { semester_no: 1, subject_name: "Programming Foundations", mark: 86, grade: "A" },
        { semester_no: 2, subject_name: "Data Structures", mark: 89, grade: "A" },
        { semester_no: 3, subject_name: "Machine Learning", mark: 92, grade: "A+" },
        { semester_no: 4, subject_name: "Deep Learning", mark: 90, grade: "A+" },
        { semester_no: 5, subject_name: "Cloud Computing", mark: 88, grade: "A" },
        { semester_no: 6, subject_name: "Blockchain Systems", mark: 91, grade: "A+" },
      ];

      const demoPayload = {
        name: "Ananya Raman",
        reg_no: "AI2022007",
        department: "B.Sc AI & ML",
        batch: "2022-2025",
        year_of_passing: 2025,
        cgpa: 8.84,
        photo_url: {
          name: "photo.svg",
          mime_type: "image/svg+xml",
          url: placeholderUrl,
        },
        semesters: demoSemesters,
        documents: demoDocuments,
      };

      const blockchainHash = await computeBlockchainHash(demoPayload);
      const ipfsCid = generateIpfsCid(blockchainHash);
      const verificationId = generateVerificationId(demoPayload.reg_no);

      const record: StudentRecord = {
        student_id: crypto.randomUUID(),
        name: demoPayload.name,
        reg_no: demoPayload.reg_no,
        department: demoPayload.department,
        batch: demoPayload.batch,
        year_of_passing: demoPayload.year_of_passing,
        cgpa: demoPayload.cgpa,
        photo_url: demoPayload.photo_url,
        blockchain_hash: blockchainHash,
        ipfs_cid: ipfsCid,
        verification_id: verificationId,
        created_at: new Date().toISOString(),
        semesters: demoPayload.semesters,
        documents: demoPayload.documents,
      };

      await saveStudentRecord(record);
      const updated = await getAllStudentRecords();
      setRecords(updated);
      setLatestRecord(record);
      setActiveTab("View Blockchain Status");
      setMessage("Demo student seeded successfully.");
    } catch {
      setMessage("Unable to seed demo student. Please try again.");
    } finally {
      setSeedLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card rounded-xl shadow-card p-6">
          <div className="mb-5">
            <h1 className="text-2xl font-semibold text-foreground">College Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Only college administrators can add or issue student certificates.
            </p>
            {!hasSupabaseConfig && (
              <p className="text-xs text-muted-foreground mt-2">
                Demo login: collegeadmin / Certi@123
              </p>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                placeholder="admin@college.edu"
                value={credentials.username}
                onChange={(event) =>
                  setCredentials((current) => ({ ...current, username: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={credentials.password}
                  className="pr-10"
                  onChange={(event) =>
                    setCredentials((current) => ({ ...current, password: event.target.value }))
                  }
                  onKeyDown={(event) => event.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {message && <p className="text-sm text-destructive">{message}</p>}
            <div className="flex gap-3">
              <Button className="w-full" onClick={handleLogin}>
                Login
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">
                  <ArrowLeft size={14} className="mr-1" />
                  Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
      </div>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">CC</span>
          </div>
          <span className="font-semibold text-sidebar-primary text-sm">College Portal</span>
        </div>

        <nav className="p-3 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setActiveTab(item.label);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === item.label
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="h-16 bg-card border-b flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/">
                <ArrowLeft size={14} className="mr-1" />
                Back
              </Link>
            </Button>
            <h1 className="text-lg font-semibold text-foreground">{activeTab}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <ShieldCheck size={14} />
              Admin
            </Badge>
            <Badge variant="outline">{dbLabel}</Badge>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {message && (
            <div className="mb-4 rounded-lg border bg-card/95 shadow-card px-4 py-3 text-sm text-muted-foreground">
              {message}
            </div>
          )}

          {activeTab === "Add Student" && (
            <div className="bg-card/95 rounded-xl border shadow-card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Student Details & Semester Marks</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={studentForm.name}
                    onChange={(event) =>
                      setStudentForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Student full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Register Number</Label>
                  <Input
                    value={studentForm.reg_no}
                    onChange={(event) =>
                      setStudentForm((current) => ({ ...current, reg_no: event.target.value }))
                    }
                    placeholder="CS2022001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input
                    value={studentForm.department}
                    onChange={(event) =>
                      setStudentForm((current) => ({ ...current, department: event.target.value }))
                    }
                    placeholder="B.Sc AI & ML"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Batch</Label>
                  <Input
                    value={studentForm.batch}
                    onChange={(event) =>
                      setStudentForm((current) => ({ ...current, batch: event.target.value }))
                    }
                    placeholder="2022-2025"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Year of Passing</Label>
                  <Input
                    type="number"
                    value={studentForm.year_of_passing}
                    onChange={(event) =>
                      setStudentForm((current) => ({ ...current, year_of_passing: event.target.value }))
                    }
                    placeholder="2025"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CGPA</Label>
                  <Input
                    value={studentForm.cgpa}
                    onChange={(event) =>
                      setStudentForm((current) => ({ ...current, cgpa: event.target.value }))
                    }
                    placeholder="8.72"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Semester-wise Marks</h3>
                  <Badge variant="outline">{completedSemesterCount}/6 filled</Badge>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium">Semester</th>
                        <th className="text-left p-3 font-medium">Subject</th>
                        <th className="text-left p-3 font-medium">Mark</th>
                        <th className="text-left p-3 font-medium">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semesters.map((semester) => (
                        <tr key={semester.semester_no} className="border-b last:border-0">
                          <td className="p-3 font-medium">Sem {semester.semester_no}</td>
                          <td className="p-3">
                            <Input
                              value={semester.subject_name}
                              onChange={(event) =>
                                updateSemester(
                                  semester.semester_no,
                                  "subject_name",
                                  event.target.value,
                                )
                              }
                              placeholder="e.g. Machine Learning"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              value={semester.mark}
                              onChange={(event) =>
                                updateSemester(semester.semester_no, "mark", event.target.value)
                              }
                              placeholder="92"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={semester.grade}
                              onChange={(event) =>
                                updateSemester(semester.semester_no, "grade", event.target.value)
                              }
                              placeholder="A+"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setActiveTab("Upload Documents")}
                  disabled={
                    !studentForm.name.trim() ||
                    !studentForm.reg_no.trim() ||
                    !studentForm.department.trim() ||
                    !studentForm.cgpa.trim() ||
                    completedSemesterCount < 6
                  }
                >
                  Continue to Upload Documents
                </Button>
              </div>
            </div>
          )}

          {activeTab === "Upload Documents" && (
            <div className="bg-card/95 rounded-xl border shadow-card p-6 space-y-4 max-w-4xl">
              <h2 className="text-lg font-semibold text-foreground">Upload Documents</h2>
              <p className="text-sm text-muted-foreground">
                Upload degree certificate, semester marksheets, and student photo.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <FileInput
                  label="Student Photo"
                  accept="image/*"
                  onFile={(file) => handleFileChange("photo_url", file)}
                />
                <FileInput
                  label="Degree Certificate (PDF)"
                  accept="application/pdf"
                  onFile={(file) => handleFileChange("certificate_url", file)}
                  required
                />
                <FileInput
                  label="Sem 1 Marksheet"
                  accept="image/*,application/pdf"
                  onFile={(file) => handleFileChange("sem1_marksheet", file)}
                />
                <FileInput
                  label="Sem 2 Marksheet"
                  accept="image/*,application/pdf"
                  onFile={(file) => handleFileChange("sem2_marksheet", file)}
                />
                <FileInput
                  label="Sem 3 Marksheet"
                  accept="image/*,application/pdf"
                  onFile={(file) => handleFileChange("sem3_marksheet", file)}
                />
                <FileInput
                  label="Sem 4 Marksheet"
                  accept="image/*,application/pdf"
                  onFile={(file) => handleFileChange("sem4_marksheet", file)}
                />
                <FileInput
                  label="Sem 5 Marksheet"
                  accept="image/*,application/pdf"
                  onFile={(file) => handleFileChange("sem5_marksheet", file)}
                />
                <FileInput
                  label="Sem 6 Marksheet"
                  accept="image/*,application/pdf"
                  onFile={(file) => handleFileChange("sem6_marksheet", file)}
                />
              </div>
              <Badge variant="outline">{uploadCount} file(s) selected</Badge>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setActiveTab("Issue Certificate")}
                  disabled={!uploads.certificate_url}
                >
                  Continue to Issue Certificate
                </Button>
              </div>
            </div>
          )}

          {activeTab === "Issue Certificate" && (
            <div className="bg-card/95 rounded-xl border shadow-card p-6 space-y-5 max-w-3xl">
              <h2 className="text-lg font-semibold text-foreground">Issue Certificate</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground">Student</p>
                  <p className="font-medium text-foreground">{studentForm.name || "-"}</p>
                  <p className="text-muted-foreground mt-2">Register No</p>
                  <p className="font-medium text-foreground">{studentForm.reg_no || "-"}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground">Batch</p>
                  <p className="font-medium text-foreground">{studentForm.batch || "-"}</p>
                  <p className="text-muted-foreground mt-2">CGPA</p>
                  <p className="font-medium text-foreground">{studentForm.cgpa || "-"}</p>
                </div>
              </div>

              <Button onClick={handleIssueCertificate} disabled={submitting} className="gap-2">
                <ShieldCheck size={16} />
                {submitting ? "Issuing..." : "Generate Verification ID + QR"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSeedDemo}
                disabled={seedLoading}
              >
                {seedLoading ? "Seeding..." : "Seed Demo Student"}
              </Button>

              {latestRecord && (
                <div className="rounded-lg border p-4 grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Verification ID:</span>{" "}
                      <span className="font-medium">{latestRecord.verification_id}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Blockchain Hash:</span>{" "}
                      <span className="font-mono text-xs break-all">{latestRecord.blockchain_hash}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">IPFS CID:</span>{" "}
                      <span className="font-mono text-xs break-all">{latestRecord.ipfs_cid}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-center border rounded-lg p-3 bg-muted/20">
                    <img
                      alt="Verification QR"
                      className="h-36 w-36"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                        latestRecord.verification_id,
                      )}`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "View Blockchain Status" && (
            <div className="bg-card/95 rounded-xl border shadow-card overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-foreground">Issued Student Records</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Reg No</th>
                      <th className="text-left p-3 font-medium">Verification ID</th>
                      <th className="text-left p-3 font-medium">QR</th>
                      <th className="text-left p-3 font-medium">CID</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.student_id} className="border-b last:border-0">
                        <td className="p-3 font-medium text-foreground">{record.name}</td>
                        <td className="p-3 text-muted-foreground">{record.reg_no}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">
                          {record.verification_id}
                        </td>
                        <td className="p-3">
                          <img
                            alt={`QR for ${record.verification_id}`}
                            className="h-14 w-14 rounded border"
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                              record.verification_id,
                            )}`}
                          />
                        </td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{record.ipfs_cid}</td>
                        <td className="p-3">
                          <Badge className="bg-secondary text-secondary-foreground">Stored</Badge>
                        </td>
                        <td className="p-3">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/verify?q=${encodeURIComponent(record.verification_id)}`}>Open Verify</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                          No student records issued yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FileInput({
  label,
  accept,
  onFile,
  required = false,
}: {
  label: string;
  accept: string;
  onFile: (file: File | null) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        type="file"
        accept={accept}
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
