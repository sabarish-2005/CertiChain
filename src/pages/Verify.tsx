import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { signInWithRole } from "@/lib/auth";
import {
  findStudentRecord,
  isRecordTampered,
  StoredFile,
  StudentRecord,
} from "@/lib/records";
import { hasSupabaseConfig } from "@/lib/supabaseConfig";

type VerifyState = {
  status: "idle" | "found" | "not-found";
  student?: StudentRecord;
  tampered?: boolean;
};

const COMPANY_CREDENTIALS = {
  username: "companyhr",
  password: "Verify@123",
};

function normalizeVerifyQuery(raw: string): string {
  const cleaned = raw
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  if (!cleaned) return "";

  const upper = cleaned.toUpperCase();
  const verificationMatch = upper.match(/VC-[A-Z0-9]+-[A-Z0-9]+/);
  if (verificationMatch) {
    return verificationMatch[0];
  }

  return upper.replace(/\s+/g, "");
}

function resolvePreviewUrl(file?: StoredFile): string | undefined {
  if (!file) return undefined;

  const raw = (file.data_url ?? file.url ?? "").trim();
  if (!raw) return undefined;

  if (
    raw.startsWith("data:") ||
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  return `data:${file.mime_type || "application/octet-stream"};base64,${raw}`;
}

function toBlobUrlFromBase64(base64Payload: string, mimeType: string): string | undefined {
  try {
    const cleaned = base64Payload.replace(/\s+/g, "");
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
    return URL.createObjectURL(blob);
  } catch {
    return undefined;
  }
}

function resolveOpenPreviewUrl(file?: StoredFile): string | undefined {
  const previewUrl = resolvePreviewUrl(file);
  if (!previewUrl) return undefined;

  if (previewUrl.startsWith("http://") || previewUrl.startsWith("https://") || previewUrl.startsWith("blob:")) {
    return previewUrl;
  }

  if (previewUrl.startsWith("data:")) {
    const match = previewUrl.match(/^data:([^;]+);base64,(.*)$/i);
    if (!match) return previewUrl;

    const [, mimeType, base64Data] = match;
    return toBlobUrlFromBase64(base64Data, mimeType) ?? previewUrl;
  }

  return previewUrl;
}

function openFilePreview(file?: StoredFile): void {
  const previewUrl = resolveOpenPreviewUrl(file);
  if (!previewUrl) return;

  const popup = window.open(previewUrl, "_blank", "noopener,noreferrer");
  if (previewUrl.startsWith("blob:")) {
    setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
  }
  if (popup) return;

  const fallbackLink = document.createElement("a");
  fallbackLink.href = previewUrl;
  fallbackLink.target = "_blank";
  fallbackLink.rel = "noopener noreferrer";
  fallbackLink.click();
}

export default function Verify() {
  const [searchParams] = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [regQuery, setRegQuery] = useState("");
  const [qrQuery, setQrQuery] = useState("");
  const [scanActive, setScanActive] = useState(false);
  const [scanError, setScanError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [state, setState] = useState<VerifyState>({ status: "idle" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const dbLabel = hasSupabaseConfig ? "DB: Supabase" : "DB: Local";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanActiveRef = useRef(false);
  const autoVerifiedRef = useRef<string | null>(null);

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    return () => {
      controlsRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    scanActiveRef.current = scanActive;
  }, [scanActive]);

  const doVerify = useCallback(async (raw: string) => {
    const query = normalizeVerifyQuery(raw);
    if (!query) {
      setMessage("Enter Register Number or Verification ID.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const record = await findStudentRecord(query);
      if (!record) {
        setState({ status: "not-found" });
        return;
      }

      const tampered = await isRecordTampered(record);
      setState({ status: "found", student: record, tampered });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const query = (searchParams.get("q") ?? "").trim();
    if (!query) return;
    if (autoVerifiedRef.current === query) return;

    autoVerifiedRef.current = query;
    setQrQuery(query);
    void doVerify(query);
  }, [isLoggedIn, searchParams, doVerify]);

  const stopScan = () => {
    controlsRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanActive(false);
  };

  const toggleScan = async () => {
    if (scanActive) {
      stopScan();
      return;
    }

    if (!videoRef.current || !codeReaderRef.current) return;

    setScanError("");
    setScanActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);

      const controls = await codeReaderRef.current.decodeFromStream(
        stream,
        videoRef.current,
        (result, err) => {
          if (!scanActiveRef.current) return;

          if (result) {
            const text = result.getText();
            setQrQuery(text);
            stopScan();
            doVerify(text);
            return;
          }

          if (err && !(err instanceof NotFoundException)) {
            setScanError("Camera scan failed. Check permissions and try again.");
          }
        },
      );

      controlsRef.current = controls;
    } catch {
      setScanError("Camera permission denied or unavailable.");
      setScanActive(false);
    }
  };

  const handleQrUpload = async (file: File | null) => {
    if (!file) return;
    if (!codeReaderRef.current) return;

    setUploadError("");

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    try {
      const result = await codeReaderRef.current.decodeFromImageUrl(dataUrl);
      const text = result.getText();
      setQrQuery(text);
      doVerify(text);
    } catch {
      setUploadError("Unable to read QR image. Try a clearer image.");
    }
  };

  const handleLogin = async () => {
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setMessage("Enter HR credentials to continue.");
      return;
    }

    const usernameMatch = credentials.username.trim() === COMPANY_CREDENTIALS.username;
    const passwordMatch = credentials.password === COMPANY_CREDENTIALS.password;

    if (usernameMatch && passwordMatch) {
      setIsLoggedIn(true);
      setMessage("");
      return;
    }

    if (hasSupabaseConfig) {
      const result = await signInWithRole(credentials.username.trim(), credentials.password, "company");
      if (result.ok) {
        setIsLoggedIn(true);
        setMessage("");
        return;
      }

      const networkIssue = (result.error ?? "").toLowerCase().includes("fetch");
      if (!networkIssue) {
        setMessage(result.error ?? "Unable to sign in.");
        return;
      }
    }

    setMessage("Invalid company HR credentials.");
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card border rounded-xl shadow-card p-6">
          <h1 className="text-2xl font-semibold text-foreground">Company HR Login</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Company users can only verify and view student records.
          </p>
          {!hasSupabaseConfig && (
            <p className="text-xs text-muted-foreground mt-2">
              Demo login: companyhr / Verify@123
            </p>
          )}

          <div className="space-y-4 mt-5">
            <div className="space-y-1.5">
              <Label>Work Email</Label>
              <Input
                placeholder="hr@company.com"
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
                  Back
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero px-4 py-8 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-16 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="mx-auto max-w-6xl space-y-6 relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Company Verification Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Verify by Register Number or QR verification ID and view academic proof records.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{dbLabel}</Badge>
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft size={14} className="mr-1" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-card/95 border rounded-xl shadow-card p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Search by Register Number</h2>
            <div className="flex gap-2">
              <Input
                value={regQuery}
                placeholder="e.g. CS2022001"
                onChange={(event) => setRegQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && doVerify(regQuery)}
              />
              <Button onClick={() => doVerify(regQuery)} disabled={loading} className="gap-2">
                <Search size={15} />
                Verify
              </Button>
            </div>
          </div>

          <div className="bg-card/95 border rounded-xl shadow-card p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Scan QR / Enter Verification ID</h2>
            <div className="flex gap-2">
              <Input
                value={qrQuery}
                placeholder="e.g. VC-CS2022001-XXXXXX"
                onChange={(event) => setQrQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && doVerify(qrQuery)}
              />
              <Button onClick={() => doVerify(qrQuery)} disabled={loading} variant="secondary" className="gap-2">
                <QrCode size={15} />
                Scan
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <Button type="button" variant="outline" onClick={toggleScan} className="gap-2">
                <QrCode size={15} />
                {scanActive ? "Stop Camera" : "Start Camera Scan"}
              </Button>
              {scanError && <span className="text-xs text-destructive">{scanError}</span>}
            </div>
            <div className="rounded-lg border bg-muted/40 p-2">
              <video ref={videoRef} className="w-full rounded-md" muted autoPlay playsInline />
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label className="text-sm">Upload QR Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => handleQrUpload(event.target.files?.[0] ?? null)}
              />
              {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
            </div>
          </div>
        </div>

        {message && <p className="text-sm text-destructive">{message}</p>}

        {state.status === "not-found" && (
          <div className="bg-card/95 border rounded-xl shadow-card p-6">
            <p className="text-destructive font-medium">No student record found for the given value.</p>
            <p className="text-sm text-muted-foreground mt-1">Try exact Register Number or Verification ID.</p>
          </div>
        )}

        {state.status === "found" && state.student && (
          <div className="space-y-5">
            <BlockchainStatus tampered={Boolean(state.tampered)} />
            <StudentProfileCard student={state.student} />
            <div className="grid lg:grid-cols-2 gap-5">
              <AcademicTimeline student={state.student} />
              <PerformanceChart student={state.student} />
            </div>
            <DocumentViewer student={state.student} />
          </div>
        )}
      </div>
    </div>
  );
}

function BlockchainStatus({ tampered }: { tampered: boolean }) {
  return (
    <div className="bg-card/95 border rounded-xl shadow-card p-5 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p className="text-sm text-muted-foreground">Blockchain Verification Status</p>
        <p className="text-foreground font-medium mt-1">
          {tampered ? "Hash mismatch detected" : "Hash matches blockchain record"}
        </p>
      </div>
      {tampered ? (
        <Badge variant="destructive" className="gap-1.5 px-3 py-1">
          <ShieldAlert size={14} /> Red badge — Tampered
        </Badge>
      ) : (
        <Badge className="bg-secondary text-secondary-foreground gap-1.5 px-3 py-1">
          <ShieldCheck size={14} /> Green badge — Verified
        </Badge>
      )}
    </div>
  );
}

function StudentProfileCard({ student }: { student: StudentRecord }) {
  return (
    <div className="bg-card/95 border rounded-xl shadow-card p-5">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          {student.photo_url?.data_url || student.photo_url?.url ? (
            <img
              src={student.photo_url.data_url ?? student.photo_url.url}
              alt={student.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <User size={24} className="text-muted-foreground" />
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 text-sm">
          <Info label="Name" value={student.name} />
          <Info label="Register Number" value={student.reg_no} mono />
          <Info label="Department" value={student.department} />
          <Info label="Batch" value={student.batch} />
          <Info label="Year of Passing" value={String(student.year_of_passing)} />
          <Info label="CGPA" value={String(student.cgpa)} />
          <Info label="Verification ID" value={student.verification_id} mono />
          <Info label="IPFS CID" value={student.ipfs_cid} mono />
        </div>
      </div>
    </div>
  );
}

function AcademicTimeline({ student }: { student: StudentRecord }) {
  const sorted = [...student.semesters].sort((left, right) => left.semester_no - right.semester_no);

  return (
    <div className="bg-card/95 border rounded-xl shadow-card p-5">
      <h3 className="font-semibold text-foreground mb-4">Academic Timeline</h3>
      <div className="space-y-3">
        {sorted.map((semester) => {
          const year = Math.ceil(semester.semester_no / 2);
          return (
            <div key={semester.semester_no} className="flex items-start gap-3">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
              <div className="border rounded-lg p-3 w-full">
                <p className="text-sm font-medium text-foreground">
                  Year {year} → Sem {semester.semester_no}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {semester.subject_name} · Mark {semester.mark} · Grade {semester.grade}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PerformanceChart({ student }: { student: StudentRecord }) {
  const sorted = [...student.semesters].sort((left, right) => left.semester_no - right.semester_no);

  return (
    <div className="bg-card/95 border rounded-xl shadow-card p-5">
      <h3 className="font-semibold text-foreground mb-4">Semester-wise Performance</h3>
      <div className="space-y-3">
        {sorted.map((semester) => (
          <div key={semester.semester_no}>
            <div className="flex justify-between text-xs mb-1 text-muted-foreground">
              <span>Sem {semester.semester_no}</span>
              <span>{semester.mark}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.max(0, Math.min(100, semester.mark))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentViewer({ student }: { student: StudentRecord }) {
  const docs = [
    ["Certificate", student.documents.certificate_url],
    ["Sem 1 Marksheet", student.documents.sem1_marksheet],
    ["Sem 2 Marksheet", student.documents.sem2_marksheet],
    ["Sem 3 Marksheet", student.documents.sem3_marksheet],
    ["Sem 4 Marksheet", student.documents.sem4_marksheet],
    ["Sem 5 Marksheet", student.documents.sem5_marksheet],
    ["Sem 6 Marksheet", student.documents.sem6_marksheet],
  ] as const;

  return (
    <div className="bg-card/95 border rounded-xl shadow-card p-5">
      <h3 className="font-semibold text-foreground mb-4">Document Preview Viewer</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map(([label, file]) => (
          <div key={label} className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-foreground">{label}</p>
            {file ? (
              <>
                <p className="text-xs text-muted-foreground break-all">{file.name || file.url?.split("/").pop()}</p>
                {file.mime_type.startsWith("image/") ? (
                  <img
                    src={resolvePreviewUrl(file)}
                    alt={label}
                    className="h-36 w-full object-cover rounded border"
                  />
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-primary underline text-sm"
                    onClick={() => openFilePreview(file)}
                    disabled={!resolvePreviewUrl(file)}
                  >
                    Open file preview
                  </Button>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Not uploaded</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t text-sm">
        <div>
          <p className="text-muted-foreground">Blockchain Hash</p>
          <p className="font-mono text-xs break-all">{student.blockchain_hash}</p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={mono ? "font-mono text-xs break-all text-foreground" : "text-foreground"}>{value}</p>
    </div>
  );
}
