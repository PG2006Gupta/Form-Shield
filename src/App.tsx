import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";





type DocumentStatus = "Verified" | "Review" | "Missing";

type StoredDocument = { id: string; name: string; size: number; type: string; uploadedAt: string; status: DocumentStatus; blob?: Blob; sample?: boolean };

const DB_NAME = "formshield-document-vault";

const STORE_NAME = "documents";

function openDocumentDB(): Promise<IDBDatabase> {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" }); };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => reject(request.error);

  });

}

async function getStoredDocuments(): Promise<StoredDocument[]> {

  const db = await openDocumentDB();

  return new Promise((resolve, reject) => {

    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();

    request.onsuccess = () => { db.close(); resolve(request.result as StoredDocument[]); };

    request.onerror = () => { db.close(); reject(request.error); };

  });

}

async function saveStoredDocument(doc: StoredDocument): Promise<void> {

  const db = await openDocumentDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).put(doc);

    tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); };

  });

}

async function deleteStoredDocument(id: string): Promise<void> {

  const db = await openDocumentDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).delete(id);

    tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); };

  });

}

const INDIA_TZ = "Asia/Kolkata";

function indiaDate(date: Date, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {

  return new Intl.DateTimeFormat("en-IN", { ...options, timeZone: INDIA_TZ }).format(date);

}

function dateInDays(days: number): Date {

  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: INDIA_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);

  const month = Number(parts.find((part) => part.type === "month")?.value);

  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));

}

function formatDeadline(days: number): string { return indiaDate(dateInDays(days), { day: "numeric", month: "short" }); }

function currentAcademicYear(): string {

  const parts = new Intl.DateTimeFormat("en-IN", { timeZone: INDIA_TZ, year: "numeric", month: "numeric" }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value ?? new Date().getFullYear());

  const month = Number(parts.find((part) => part.type === "month")?.value ?? new Date().getMonth() + 1);

  const start = month >= 4 ? year : year - 1;

  return `${start}–${String(start + 1).slice(-2)}`;

}

function indiaTimestamp(iso: string): string { return indiaDate(new Date(iso), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }); }

function formatBytes(bytes: number): string { return !bytes ? "File not uploaded" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }

const initialDocuments: StoredDocument[] = [

  { id: "sample-marksheet", name: "Class XII marksheet", size: 1258291, type: "application/pdf", uploadedAt: "", status: "Verified", sample: true },

  { id: "sample-aadhaar", name: "Aadhaar card", size: 860160, type: "application/pdf", uploadedAt: "", status: "Verified", sample: true },

  { id: "sample-income", name: "Income certificate", size: 0, type: "", uploadedAt: "", status: "Missing", sample: true },

  { id: "sample-bank", name: "Bank passbook", size: 634880, type: "application/pdf", uploadedAt: "", status: "Review", sample: true },

];



type Page = "overview" | "applications" | "documents" | "analyze" | "opportunities" | "deadlines" | "settings" | "profile" | "notifications" | "report" | "privacy";

type IconName =

  | "grid"

  | "file"

  | "check"

  | "compass"

  | "calendar"

  | "settings"

  | "search"

  | "bell"

  | "arrow"

  | "upload"

  | "clock"

  | "spark"

  | "shield"

  | "chevron"

  | "close"

  | "menu"

  | "user"

  | "download";



function Icon({ name, size = 18 }: { name: IconName; size?: number }) {

  const paths: Record<IconName, ReactNode> = {

    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,

    file: <><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></>,

    check: <><path d="M20 11a8 8 0 1 1-3-6" /><path d="m9 11 3 3L22 4" /></>,

    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,

    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,

    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,

    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,

    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,

    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,

    upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></>,

    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,

    spark: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4zM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></>,

    shield: <><path d="M12 2 4.5 5v6c0 5 3.2 8.6 7.5 11 4.3-2.4 7.5-6 7.5-11V5z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,

    chevron: <path d="m9 18 6-6-6-6" />,

    close: <path d="M6 6l12 12M18 6 6 18" />,

    menu: <path d="M4 7h16M4 12h16M4 17h16" />,

    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-5 3.4-7 8-7s7.2 2 8 7" /></>,

    download: <><path d="M12 3v13M7 11l5 5 5-5M4 21h16" /></>,

  };

  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;

}



function Logo({ compact = false }: { compact?: boolean }) {

  return (

    <div className="logo">

      <span className="logo-mark"><Icon name="shield" size={20} /></span>

      {!compact && <span>FormShield</span>}

    </div>

  );

}



function Button({ children, variant = "primary", icon, onClick, full = false, type = "button", disabled = false, loading = false }: {

  children: ReactNode; variant?: "primary" | "secondary" | "ghost"; icon?: IconName; onClick?: () => void; full?: boolean; type?: "button" | "submit"; disabled?: boolean; loading?: boolean;

}) {

  return <button type={type} onClick={onClick} disabled={disabled || loading} aria-busy={loading} className={`btn btn-${variant}${full ? " btn-full" : ""}`}>{loading ? <span className="button-spinner" /> : icon && <Icon name={icon} />}{loading ? "Analyzing…" : children}</button>;

}



const navItems: { label: string; icon: IconName; page: Page }[] = [

  { label: "Overview", icon: "grid", page: "overview" },

  { label: "My Applications", icon: "file", page: "applications" },

  { label: "Document Checker", icon: "check", page: "documents" },

  { label: "Opportunities", icon: "compass", page: "opportunities" },

  { label: "Deadlines", icon: "calendar", page: "deadlines" },

  { label: "Settings", icon: "settings", page: "settings" },

];



function Sidebar({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {

  return (

    <aside className="sidebar">

      <Logo />

      <nav className="side-nav" aria-label="Main navigation">

        {navItems.map((item) => (

          <button key={item.label} onClick={() => setPage(item.page)} className={`nav-item ${page === item.page ? "active" : ""}`}>

            <Icon name={item.icon} /><span>{item.label}</span>

          </button>

        ))}

      </nav>

      <div className="sidebar-support">

        <span className="support-icon"><Icon name="spark" /></span>

        <strong>Need guidance?</strong>

        <p>Get a personalized checklist for any new notice.</p>

        <button onClick={() => setPage("analyze")}>Analyze a notice <Icon name="arrow" size={15} /></button>

      </div>

      <button className="nav-item account-row" onClick={() => setPage("profile")}>

        <span className="avatar small">AK</span>

        <span><strong>Aarav Kumar</strong><small>Student plan</small></span>

        <Icon name="chevron" size={16} />

      </button>

    </aside>

  );

}



function Topbar({ setPage }: { setPage: (page: Page) => void }) {

  return (

    <header className="topbar">

      <div className="mobile-logo"><Logo /></div>

      <label className="search-box">

        <Icon name="search" size={17} />

        <input aria-label="Search applications and opportunities" placeholder="Search applications, notices, documents..." />

        <kbd>⌘ K</kbd>

      </label>

      <div className="top-actions">

        <Button variant="primary" icon="spark" onClick={() => setPage("analyze")}>Analyze New Notice</Button>

        <button className="icon-btn" aria-label="Notifications" title="Notifications" onClick={() => setPage("notifications")}><Icon name="bell" /><span className="notification-dot" /></button>

        <button className="profile-btn" aria-label="Open profile" onClick={() => setPage("profile")}><span className="avatar">AK</span><span className="profile-copy"><strong>Aarav Kumar</strong><small>Student</small></span><Icon name="chevron" size={14} /></button>

      </div>

    </header>

  );

}



function MobileNav({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {

  const items = [

    { label: "Home", icon: "grid" as IconName, page: "overview" as Page },

    { label: "Applications", icon: "file" as IconName, page: "applications" as Page },

    { label: "Analyze", icon: "spark" as IconName, page: "analyze" as Page },

    { label: "Documents", icon: "check" as IconName, page: "documents" as Page },

    { label: "More", icon: "menu" as IconName, page: "settings" as Page },

  ];

  return <nav className="mobile-nav" aria-label="Mobile navigation">{items.map((item) => <button key={item.label} className={page === item.page ? "active" : ""} onClick={() => setPage(item.page)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>;

}



const stats = [

  { label: "Active Applications", value: "6", note: "2 updated this week", meta: "+1 this month", icon: "file" as IconName, tone: "blue" },

  { label: "Deadlines Approaching", value: "3", note: "Next in 2 days", meta: "High attention", icon: "clock" as IconName, tone: "amber" },

  { label: "Documents Missing", value: "4", note: "Across 3 applications", meta: "1 blocks submission", icon: "upload" as IconName, tone: "red" },

  { label: "Applications Ready", value: "2", note: "Ready to submit", meta: "33% of portfolio", icon: "check" as IconName, tone: "green" },

];



const applications = [

  { short: "NSP", name: "National Scholarship Portal", org: "Ministry of Education", due: formatDeadline(2), days: "2 days left", progress: 82, missing: "Income certificate", tone: "amber" },

  { short: "IIT", name: "IIT Delhi Summer Internship", org: "Office of Career Services", due: formatDeadline(8), days: "8 days left", progress: 100, missing: "All complete", tone: "green" },

  { short: "YU", name: "Young India Fellowship", org: "Ashoka University", due: formatDeadline(14), days: "14 days left", progress: 64, missing: "Statement of purpose", tone: "blue" },

];



function StatCards() {

  return <div className="summary-grid">{stats.map((stat) => <article className={`stat-card stat-${stat.tone}`} key={stat.label}><div className="stat-card-top"><span className={`stat-icon ${stat.tone}`}><Icon name={stat.icon} /></span><span className={`stat-signal ${stat.tone}`}>{stat.meta}</span></div><div><span className="eyebrow">{stat.label}</span><strong className="stat-value">{stat.value}</strong><small>{stat.note}</small></div></article>)}</div>;

}



function IndiaClock() {

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {

    const timer = window.setInterval(() => setNow(new Date()), 30_000);

    return () => window.clearInterval(timer);

  }, []);

  return <>{indiaDate(now, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</>;

}



function BriefingStrip({ setPage }: { setPage: (page: Page) => void }) {

  return <section className="briefing-strip" aria-label="Today’s priority briefing">

    <div className="briefing-lead"><span className="edition-label">TODAY’S BRIEFING</span><strong>{indiaDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</strong><small><IndiaClock /> · India Standard Time (IST)</small></div>

    <div className="briefing-item critical"><span>01</span><div><small>CRITICAL</small><strong>Income certificate blocks NSP</strong></div><button onClick={() => setPage("documents")}>Resolve <Icon name="arrow" size={14} /></button></div>

    <div className="briefing-item"><span>02</span><div><small>NEXT DEADLINE</small><strong>{"IIT Delhi · " + formatDeadline(8)}</strong></div></div>

    <div className="briefing-item"><span>03</span><div><small>PORTFOLIO HEALTH</small><strong>4 of 6 on track</strong></div></div>

  </section>;

}



function Progress({ value, tone = "blue" }: { value: number; tone?: string }) {

  return <div className="progress-track" aria-label={`${value}% complete`}><span className={`progress-fill ${tone}`} style={{ width: `${value}%` }} /></div>;

}



function ReadinessReport({ setPage }: { setPage: (page: Page) => void }) {

  return (

    <section className="readiness card">

      <div className="readiness-copy">

        <span className="section-kicker"><Icon name="spark" size={15} /> OPPORTUNITY READINESS REPORT</span>

        <h2>You're closer than you think.</h2>

        <p>Complete two high-priority tasks to make your upcoming applications submission-ready.</p>

        <div className="readiness-bar"><Progress value={76} /><span>4 tasks remaining</span></div>

        <div className="readiness-breakdown">

          <span><small>PROFILE</small><strong>100%</strong></span>

          <span><small>DOCUMENTS</small><strong>75%</strong></span>

          <span><small>DEADLINES</small><strong>83%</strong></span>

        </div>

      </div>

      <div className="score-ring"><div><strong>76</strong><span>% ready</span></div></div>

      <div className="report-actions">

        <Button variant="secondary" onClick={() => setPage("report")}>View full report <Icon name="arrow" size={15} /></Button>

      </div>

    </section>

  );

}



function StatusPill({ children, tone }: { children: ReactNode; tone: string }) {

  return <span className={`status-pill ${tone}`}>{children}</span>;

}



function ApplicationTracker({ setPage }: { setPage: (page: Page) => void }) {

  return (

    <section className="card tracker-card">

      <div className="section-head"><div><span className="section-kicker">APPLICATION TRACKER</span><h2>Keep every application moving</h2></div><button className="text-link" onClick={() => setPage("applications")}>View all <Icon name="arrow" size={15} /></button></div>

      <div className="application-table">

        <div className="table-head"><span>Opportunity</span><span>Deadline</span><span>Completion</span><span>Missing</span><span /></div>

        {applications.map((app) => <div className="table-row" key={app.name}>

          <div className="opportunity-cell"><span className="app-monogram">{app.short}</span><span><strong>{app.name}</strong><small>{app.org}</small></span></div>

          <div className="deadline-cell"><strong>{app.due}</strong><small className={app.tone === "amber" ? "urgent-text" : ""}>{app.days}</small></div>

          <div className="completion-cell"><span><strong>{app.progress}%</strong><small> complete</small></span><Progress value={app.progress} tone={app.tone} /></div>

          <div><StatusPill tone={app.tone}>{app.missing}</StatusPill></div>

          <button className="row-action" aria-label={`Open ${app.name}`} onClick={() => setPage("applications")}><Icon name="chevron" size={17} /></button>

        </div>)}

      </div>

      <div className="application-cards">

        {applications.map((app) => <article className="application-card" key={app.name} onClick={() => setPage("applications")}>

          <div className="mobile-app-head"><span className="app-monogram">{app.short}</span><div><strong>{app.name}</strong><small>{app.org}</small></div><Icon name="chevron" size={17} /></div>

          <div className="app-meta"><span><small>DEADLINE</small><strong>{app.due}</strong></span><StatusPill tone={app.tone}>{app.days}</StatusPill></div>

          <div className="mobile-progress"><span><strong>{app.progress}% complete</strong><small>{app.missing}</small></span><Progress value={app.progress} tone={app.tone} /></div>

        </article>)}

      </div>

    </section>

  );

}



function RightRail({ setPage }: { setPage: (page: Page) => void }) {

  return <aside className="right-rail">

    <section className="rail-card urgent-card">

      <div className="rail-title"><span><Icon name="calendar" /> Upcoming deadlines</span><button onClick={() => setPage("deadlines")}>View all</button></div>

      <div className="deadline-item"><div className="date-block urgent"><strong>{indiaDate(dateInDays(2), { day: "2-digit" })}</strong><small>{indiaDate(dateInDays(2), { month: "short" }).toUpperCase()}</small></div><div><strong>National Scholarship Portal</strong><small>2 documents need attention</small></div><StatusPill tone="amber">2 days</StatusPill></div>

      <div className="deadline-item"><div className="date-block"><strong>{indiaDate(dateInDays(8), { day: "2-digit" })}</strong><small>{indiaDate(dateInDays(8), { month: "short" }).toUpperCase()}</small></div><div><strong>IIT Delhi Internship</strong><small>Application ready</small></div><StatusPill tone="green">8 days</StatusPill></div>

    </section>

    <section className="rail-card next-step">

      <span className="section-kicker"><Icon name="spark" size={14} /> RECOMMENDED NEXT STEP</span>

      <h3>Upload your income certificate</h3>

      <p>Needed for your National Scholarship Portal application due in 2 days.</p>

      <Button variant="primary" icon="upload" onClick={() => setPage("documents")} full>Upload document</Button>

    </section>

    <section className="rail-card">

      <div className="rail-title"><span><Icon name="clock" /> Recent activity</span></div>

      <div className="activity-item"><span className="activity-dot green" /><div><strong>Marksheet verified</strong><small>Today, 10:32 AM</small></div></div>

      <div className="activity-item"><span className="activity-dot blue" /><div><strong>Application updated</strong><small>Yesterday, 4:18 PM</small></div></div>

      <div className="activity-item"><span className="activity-dot amber" /><div><strong>Deadline reminder set</strong><small>14 Jun, 9:05 AM</small></div></div>

    </section>

    <section className="rail-card portfolio-card">

      <div className="rail-title"><span><Icon name="grid" /> Portfolio mix</span><small>6 active</small></div>

      <div className="portfolio-bar" aria-label="Portfolio split"><span className="scholarship" /><span className="internship" /><span className="admission" /></div>

      <div className="portfolio-legend"><span><i className="scholarship" />Scholarships <strong>3</strong></span><span><i className="internship" />Internships <strong>2</strong></span><span><i className="admission" />Admissions <strong>1</strong></span></div>

    </section>

  </aside>;

}



function UploadZone({ compact = false, onUpload }: { compact?: boolean; onUpload: () => void }) {

  return <button type="button" className={`upload-zone ${compact ? "compact" : ""}`} onClick={onUpload}><span className="upload-icon"><Icon name="upload" /></span><span><strong>Upload documents</strong><small>PDF, JPG or PNG up to 10 MB</small></span><span className="browse-label">Browse files</span></button>;

}



function Overview({ setPage, onUpload }: { setPage: (page: Page) => void; onUpload: () => void }) {

  return <>

    <div className="page-heading"><div><span className="greeting">{indiaDate(new Date(), { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</span><h1>Your opportunities, under control.</h1><p>Good morning, Aarav. Here’s what needs your attention today.</p></div><div className="heading-action"><Button variant="primary" icon="spark" onClick={() => setPage("analyze")}>Analyze New Notice</Button></div></div>

    <div className="mobile-priority"><span><Icon name="clock" size={16} /> Urgent</span><strong>NSP deadline is in 2 days</strong><button onClick={() => setPage("applications")}>Review now <Icon name="arrow" size={14} /></button></div>

    <BriefingStrip setPage={setPage} />

    <StatCards />

    <div className="dashboard-grid">

      <div className="primary-column"><ReadinessReport setPage={setPage} /><ApplicationTracker setPage={setPage} /><section className="card quick-upload"><div><span className="section-kicker">DOCUMENT VAULT</span><h2>Keep reusable documents ready</h2><p>Upload once and use across multiple applications.</p></div><UploadZone compact onUpload={onUpload} /></section></div>

      <RightRail setPage={setPage} />

    </div>

  </>;

}



function PageHeader({ kicker, title, description, back, action }: { kicker: string; title: string; description: string; back: () => void; action?: ReactNode }) {

  return <div className="detail-heading"><button className="back-btn" onClick={back}><Icon name="arrow" size={16} /> Overview</button><div className="detail-title-row"><div><span className="greeting">{kicker}</span><h1>{title}</h1><p>{description}</p></div>{action}</div></div>;

}



function ApplicationDetails({ setPage }: { setPage: (page: Page) => void }) {

  const steps = ["Eligibility", "Personal details", "Academic records", "Documents", "Review & submit"];

  return <>

    <PageHeader kicker="APPLICATION DETAILS" title="National Scholarship Portal" description="Post-Matric Scholarship for Students — Ministry of Education" back={() => setPage("overview")} action={<StatusPill tone="amber">Due in 2 days</StatusPill>} />

    <div className="detail-layout">

      <div className="detail-main">

        <section className="card application-hero"><div className="app-title"><span className="app-monogram large">NSP</span><div><span className="section-kicker">GOVERNMENT SCHOLARSHIP</span><h2>Application progress</h2></div></div><div className="hero-progress"><div><strong>82%</strong><span>4 of 5 sections complete</span></div><Progress value={82} tone="amber" /></div></section>

        <section className="card checklist-section"><div className="section-head"><div><span className="section-kicker">SUBMISSION CHECKLIST</span><h2>Finish your application</h2></div></div>{steps.map((step, i) => <div className="check-row" key={step}><span className={`check-circle ${i < 3 ? "done" : i === 3 ? "current" : ""}`}>{i < 3 ? <Icon name="check" size={15} /> : i + 1}</span><div><strong>{step}</strong><small>{i < 3 ? "Completed and saved" : i === 3 ? "1 required document missing" : "Available after documents are complete"}</small></div>{i === 3 && <Button variant="secondary" onClick={() => setPage("documents")}>Continue</Button>}{i !== 3 && <Icon name="chevron" size={16} />}</div>)}</section>

        <section className="card info-section"><div className="section-head"><div><span className="section-kicker">KEY INFORMATION</span><h2>Opportunity details</h2></div></div><div className="info-grid"><div><small>Application ID</small><strong>{"NSP-" + new Intl.DateTimeFormat("en-IN", { timeZone: INDIA_TZ, year: "numeric" }).format(new Date()) + "-448102"}</strong></div><div><small>Academic year</small><strong>{currentAcademicYear()}</strong></div><div><small>Benefit</small><strong>Up to ₹75,000 / year</strong></div><div><small>Last updated</small><strong>{indiaTimestamp(new Date().toISOString())}</strong></div></div></section>

      </div>

      <aside className="detail-side"><section className="rail-card next-step"><span className="section-kicker">NEXT ACTION</span><h3>Income certificate needed</h3><p>Upload a valid certificate issued after 1 April 2026.</p><Button full icon="upload" onClick={() => setPage("documents")}>Upload now</Button></section><section className="rail-card"><div className="rail-title"><span><Icon name="calendar" /> Important dates</span></div><div className="date-list"><div><span>Application deadline</span><strong className="urgent-text">{indiaDate(dateInDays(2))}</strong></div><div><span>Verification window</span><strong>{indiaDate(dateInDays(3), { day: "numeric", month: "short" })}–{indiaDate(dateInDays(12), { day: "numeric", month: "short" })}</strong></div><div><span>Award announcement</span><strong>{indiaDate(dateInDays(45), { month: "long", year: "numeric" })}</strong></div></div></section></aside>

    </div>

  </>;

}



function Documents({ setPage, documents, onUpload, onRename, onDelete, onPreview, onDownload }: {

  setPage: (page: Page) => void; documents: StoredDocument[]; onUpload: () => void;

  onRename: (doc: StoredDocument) => void; onDelete: (doc: StoredDocument) => void;

  onPreview: (doc: StoredDocument) => void; onDownload: (doc: StoredDocument) => void;

}) {

  const [filter, setFilter] = useState<"All documents" | "Verified" | "Needs review" | "Missing">("All documents");

  const [filterOpen, setFilterOpen] = useState(false);

  const [menuFor, setMenuFor] = useState<string | null>(null);

  const [menuPosition, setMenuPosition] = useState<{

  top: number;

  left: number;

} | null>(null);

  useEffect(() => {

  const handleOutsideClick = (event: MouseEvent) => {

    const target = event.target as HTMLElement;



    if (!target.closest(".document-menu-wrap") && !target.closest(".document-action-menu")) {
      setMenuFor(null);
      setMenuPosition(null);
    }

  };



  document.addEventListener("click", handleOutsideClick);



  return () => {

    document.removeEventListener("click", handleOutsideClick);

  };

}, []);

  const filtered = documents.filter((doc) => filter === "All documents" || (filter === "Needs review" ? doc.status === "Review" : doc.status === filter));

  const ready = documents.length ? Math.round((documents.filter((d) => d.status !== "Missing").length / documents.length) * 100) : 0;

  return <>

    <PageHeader kicker="DOCUMENT CHECKER" title="Your document vault" description="Store, verify and reuse documents securely across applications." back={() => setPage("overview")} action={<Button icon="upload" onClick={onUpload}>Upload documents</Button>} />

    <div className="documents-layout">

      <div className="detail-main">

        <section className="card document-score"><div className="score-ring small"><div>
        <strong>{ready}</strong><span>% ready</span></div></div>
        <div><span className="section-kicker">DOCUMENT READINESS</span>
        
<p className="readiness-primary-message">
  {documents.some((d) => d.status === "Missing")
    ? "Upload missing documents to complete your application checklist."
    : "Review your documents before submitting an application."}
</p>

        <Progress value={ready} tone="green" /></div></section>

        <UploadZone onUpload={onUpload} />

        <section className="card document-list">

          <div className="section-head"><div><span className="section-kicker">SAVED DOCUMENTS</span><h2>Application documents ({documents.length})</h2></div>

            <div className="filter-wrap"><button className="filter-btn" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>{filter} <Icon name="chevron" size={14} /></button>

              {filterOpen && <div className="filter-menu" role="menu">{(["All documents", "Verified", "Needs review", "Missing"] as const).map((item) => <button role="menuitem" key={item} onClick={() => { setFilter(item); setFilterOpen(false); }}>{item}{filter === item ? " ✓" : ""}</button>)}</div>}

            </div>

          </div>

          {!filtered.length ? <div className="document-empty">No documents match this filter.</div> : filtered.map((doc) => {

            const tone = doc.status === "Verified" ? "green" : doc.status === "Missing" ? "red" : "blue";

            return <div className="document-row" key={doc.id}>

              <span className={`document-icon ${tone}`}><Icon name="file" /></span>

              <div className="document-row-copy"><strong>{doc.name}</strong><small>{doc.sample ? "Sample record" : doc.type || "Document"} · {formatBytes(doc.size)}{doc.uploadedAt ? ` · Added ${indiaTimestamp(doc.uploadedAt)}` : ""}</small></div>

              <StatusPill tone={tone}>{doc.status}</StatusPill>

              <div className="document-menu-wrap"><button type="button" className="icon-btn" aria-label={`Options for ${doc.name}`}

               aria-expanded={menuFor === doc.id}
                  onClick={(event) => {
                    event.stopPropagation();

                    if (menuFor === doc.id) {
                      setMenuFor(null);
                      setMenuPosition(null);
                      return;
                    }

                    const rect = event.currentTarget.getBoundingClientRect();
                    const menuHeight = 170;
                    const menuWidth = 155;
                    const gap = 6;
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const spaceAbove = rect.top;

                    let top: number;
                    if (spaceBelow >= menuHeight + gap) {
                      top = rect.bottom + gap;
                    } else if (spaceAbove >= menuHeight + gap) {
                      top = rect.top - menuHeight - gap;
                    } else if (spaceBelow >= spaceAbove) {
                      top = Math.max(8, window.innerHeight - menuHeight - 8);
                    } else {
                      top = 8;
                    }

                    const left = Math.max(
                      8,
                      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)
                    );

                    setMenuPosition({ top, left });
                    setMenuFor(doc.id);
                  }}>
                <span className="dots">•••</span></button>
                {menuFor === doc.id && menuPosition && createPortal(
                  <div
                    className="document-action-menu"
                    role="menu"
                    style={{
                      position: "fixed",
                      top: menuPosition.top,
                      left: menuPosition.left,
                      bottom: "auto",
                      right: "auto",
                      zIndex: 9999
                    }}
                  >
                    <button role="menuitem" onClick={() => { setMenuFor(null); setMenuPosition(null); onPreview(doc); }}>Preview</button>
                    <button role="menuitem" disabled={!doc.blob} onClick={() => { setMenuFor(null); setMenuPosition(null); onDownload(doc); }}>Download</button>
                    <button role="menuitem" onClick={() => { setMenuFor(null); setMenuPosition(null); onRename(doc); }}>Rename</button>
                    <button role="menuitem" className="danger-action" onClick={() => { setMenuFor(null); setMenuPosition(null); onDelete(doc); }}>Delete record</button>
                  </div>,
                  document.body
                )}

              </div>

            </div>;

          })}

        </section>

      </div>

      <aside className="detail-side"><section className="rail-card next-step"><span className="section-kicker">SMART CHECK</span><h3>Before you upload</h3><p>Make sure all four corners are visible, text is clear, and the document has not expired.</p></section>

        <section className="rail-card"><div className="rail-title"><span><Icon name="shield" /> Security</span></div><p className="rail-copy">Files uploaded in this demo stay in this browser on this device.</p><button className="text-link" onClick={() => setPage("privacy")}>Learn about privacy <Icon name="arrow" size={14} /></button></section></aside>

    </div>

  </>;

}



function AnalyzeNotice({ setPage, onUpload }: { setPage: (page: Page) => void; onUpload: () => void }) {

  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "success">("idle");

  const runDemoAnalysis = () => {

    setAnalysisState("loading");

    window.setTimeout(() => setAnalysisState("success"), 1200);

  };

  return <>

    <PageHeader kicker="AI NOTICE ANALYZER" title="Turn any notice into a clear action plan." description="Upload an official notice and FormShield will identify eligibility, deadlines and required documents." back={() => setPage("overview")} />

    <div className="analyze-layout"><section className="card analyze-card"><div className="analyze-step"><span>1</span><div><h2>Add the opportunity notice</h2><p>Upload the PDF or paste a link to the official notice.</p></div></div><div className="tab-switch"><button className="active">Upload PDF</button><button>Paste link</button></div><UploadZone onUpload={onUpload} /><div className="divider"><span>OR</span></div><label className="field-label">Official notice URL<input placeholder="https\://example.gov.in/notice.pdf" /></label>{analysisState === "idle" && <div className="inline-state empty"><Icon name="file" /><div><strong>No notice selected</strong><small>Add a PDF or official URL to begin a sample analysis.</small></div></div>}{analysisState === "success" && <div className="inline-state success" role="status"><Icon name="check" /><div><strong>Sample analysis is ready</strong><small>Eligibility, 4 dates and 7 document requirements identified.</small></div><button onClick={() => setAnalysisState("idle")} aria-label="Dismiss status"><Icon name="close" size={15} /></button></div>}<div className="form-footer"><span><Icon name="shield" size={15} /> Your files are private and secure.</span><Button icon="spark" loading={analysisState === "loading"} onClick={runDemoAnalysis}>Analyze notice</Button></div></section><aside className="analysis-preview"><span className="section-kicker">WHAT YOU’LL GET</span><h2>A complete readiness brief</h2>{[["check", "Eligibility match", "See whether you qualify and why."], ["calendar", "Deadline timeline", "Never miss a key application date."], ["file", "Document checklist", "Know exactly what to prepare."], ["spark", "Recommended next steps", "A clear, prioritized action plan."]].map(([icon, title, copy]) => <div className="preview-item" key={title}><span><Icon name={icon as IconName} /></span><div><strong>{title}</strong><small>{copy}</small></div></div>)}<div className="sample-note"><span>NEW</span><p>Most notices take under 30 seconds to analyze.</p></div></aside></div>

  </>;

}



function UtilityPage({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {

  const [saved, setSaved] = useState(false);

  const [readNotifications, setReadNotifications] = useState(false);




  if (page === "opportunities") {
    return (
      <>
        <PageHeader
          kicker="DISCOVER"
          title="Opportunities for you"
          description="Explore scholarships, internships and programmes worth tracking."
          back={() => setPage("overview")}
          action={
            <Button icon="spark" onClick={() => setPage("analyze")}>
              Analyze a notice
            </Button>
          }
        />

        <div className="detail-main">
          {[
            {
              title: "National Scholarship Portal",
              type: "Scholarship",
              detail: "Check eligibility and prepare your income certificate.",
              due: formatDeadline(2),
              tone: "amber",
            },
            {
              title: "IIT Delhi Summer Internship",
              type: "Internship",
              detail: "Your application is marked complete in this demo.",
              due: formatDeadline(8),
              tone: "green",
            },
            {
              title: "Young India Fellowship",
              type: "Fellowship",
              detail: "Prepare your statement of purpose before applying.",
              due: formatDeadline(14),
              tone: "blue",
            },
          ].map((item) => (
            <section
              className="card info-section"
              key={item.title}
              style={{ marginBottom: 10 }}
            >
              <div className="section-head">
                <div>
                  <span className="section-kicker">
                    {item.type.toUpperCase()}
                  </span>
                  <h2>{item.title}</h2>
                </div>
                <StatusPill tone={item.tone}>{item.due}</StatusPill>
              </div>

              <p
                style={{
                  color: "var(--ink-muted)",
                  margin: "8px 16px 10px",
                  lineHeight: 1.5,
                }}
              >
                {item.detail}
              </p>

              <div style={{ margin: "0 16px 12px" }}>
                <Button
                  variant="secondary"
                  onClick={() => setPage("applications")}
                >
                  View tracked application <Icon name="arrow" size={14} />
                </Button>
              </div>
            </section>
          ))}
        </div>
      </>
    );
  }



  if (page === "deadlines") {

    return <>

      <PageHeader kicker="DEADLINE CALENDAR" title="Upcoming deadlines" description="Review the dates that need your attention and open the related application." back={() => setPage("overview")} />

      <section className="card document-list">

        {[{ date: formatDeadline(2), title: "National Scholarship Portal", note: "Income certificate missing", tone: "amber", next: "documents" as Page }, { date: formatDeadline(8), title: "IIT Delhi Summer Internship", note: "Application ready", tone: "green", next: "applications" as Page }, { date: formatDeadline(14), title: "Young India Fellowship", note: "Statement of purpose pending", tone: "blue", next: "applications" as Page }].map((item) => <div className="document-row" key={item.title}><span className={`document-icon ${item.tone}`}><Icon name="calendar" /></span><div><strong>{item.title}</strong><small>{item.date} · {item.note}</small></div><Button variant="secondary" onClick={() => setPage(item.next)}>Review</Button></div>)}

      </section>

    </>;

  }



  if (page === "notifications") {

    return <>

      <PageHeader kicker="ACTIVITY CENTER" title="Notifications" description="Important reminders and updates about your tracked applications." back={() => setPage("overview")} action={<Button variant="secondary" onClick={() => setReadNotifications(true)}>Mark all as read</Button>} />

      <section className="card document-list">

        {[{ title: "Income certificate is still missing", note: "National Scholarship Portal · Action recommended", tone: "amber" }, { title: "IIT Delhi application is ready", note: "All required checklist items are complete", tone: "green" }, { title: "Deadline reminder", note: "Young India Fellowship deadline is approaching", tone: "blue" }].map((item) => <div className="document-row" key={item.title}><span className={`document-icon ${item.tone}`}><Icon name="bell" /></span><div><strong>{item.title}</strong><small>{item.note}</small></div><StatusPill tone={readNotifications ? "green" : item.tone}>{readNotifications ? "Read" : "New"}</StatusPill></div>)}

      </section>

    </>;

  }



  if (page === "profile") {

    return <>

      <PageHeader kicker="YOUR ACCOUNT" title="Student profile" description="Review the profile details used to personalize your FormShield dashboard." back={() => setPage("overview")} />

      <section className="card info-section"><div className="app-title"><span className="avatar" style={{ width: 54, height: 54 }}>AK</span><div><h2>Aarav Kumar</h2><p style={{ color: "var(--ink-muted)" }}>Student account · Demo profile</p></div></div><div className="info-grid" style={{ marginTop: 24 }}><div><small>Account email</small><strong>aarav@example.com</strong></div><div><small>Plan</small><strong>Student</strong></div><div><small>Tracked applications</small><strong>6 active (sample data)</strong></div><div><small>Security</small><strong>Demo only — no login backend</strong></div></div><div style={{ marginTop: 20 }}><Button variant="secondary" onClick={() => setPage("settings")}>Account settings <Icon name="arrow" size={14} /></Button></div></section>

    </>;

  }



  if (page === "settings") {
    return (
      <div className="settings-page">
        <PageHeader
          kicker="PREFERENCES"
          title="Settings"
          description="Choose how you want this demo dashboard to behave."
          back={() => setPage("overview")}
        />

        <section className="card info-section settings-card">
          <div className="section-head">
            <div>
              <span className="section-kicker">REMINDERS</span>
              <h2>Notification preferences</h2>
            </div>
          </div>

          <p style={{ color: "var(--ink-muted)", margin: "8px 0 18px" }}>
            These controls demonstrate local UI behavior only. Email or push reminders require a backend service.
          </p>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <input type="checkbox" defaultChecked /> Show deadline reminders in the dashboard
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <input type="checkbox" defaultChecked /> Highlight missing documents
          </label>

          <Button onClick={() => setSaved(true)}>
            {saved ? "Preferences saved" : "Save preferences"}
          </Button>

          {saved && (
            <p role="status" style={{ color: "var(--green)", marginTop: 12 }}>
              Preferences saved for this screen session.
            </p>
          )}
        </section>
      </div>
    );
  }

  if (page === "privacy") {

    return <>

      <PageHeader kicker="PRIVACY & SECURITY" title="Your documents, your control." description="How FormShield handles files in this local demo." back={() => setPage("documents")} />

      <section className="card info-section privacy-page">

        <div className="privacy-note"><Icon name="shield" size={22} /><div><strong>Local browser storage</strong><p>Uploaded files are stored in this browser's IndexedDB on this device. This demo has no connected server, account authentication, or cloud backup.</p></div></div>

        <h2>What this means</h2><ul><li>Files are not uploaded to a FormShield server by this demo.</li><li>Files may be removed if you clear browser site data or use another browser/device.</li><li>Anyone with access to this browser profile may potentially access local data. Avoid uploading highly sensitive real documents to this demo.</li><li>The sample documents are placeholders and are not real uploaded files.</li></ul>

        <h2>Remove your files</h2><p>Use the three-dot menu beside a document and choose <strong>Delete record</strong>, or clear this site's data in your browser settings.</p>

        <Button variant="secondary" onClick={() => setPage("documents")}>Back to document vault</Button>

      </section>

    </>;

  }



  if (page === "report") {

    return <>

      <PageHeader kicker="READINESS REPORT" title="Your application readiness" description="A summary of the sample portfolio currently shown in the dashboard." back={() => setPage("overview")} />

      <div className="summary-grid"><article className="stat-card stat-blue"><span className="eyebrow">Overall readiness</span><strong className="stat-value">76%</strong><small>Based on sample data</small></article><article className="stat-card stat-green"><span className="eyebrow">Profile complete</span><strong className="stat-value">100%</strong><small>Profile information present</small></article><article className="stat-card stat-amber"><span className="eyebrow">Documents ready</span><strong className="stat-value">75%</strong><small>Income certificate missing</small></article><article className="stat-card stat-red"><span className="eyebrow">Open tasks</span><strong className="stat-value">4</strong><small>Across tracked applications</small></article></div>

      <section className="card info-section" style={{ marginTop: 16 }}><h2>Recommended next steps</h2><p style={{ color: "var(--ink-muted)", margin: "8px 0 16px" }}>Complete the missing income certificate and statement of purpose before the relevant deadlines.</p><Button onClick={() => setPage("documents")} icon="upload">Review missing documents</Button></section>

    </>;

  }



  return null;

}



export default function App() {

  const [page, setPage] = useState<Page>("overview");

  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [documentDialog, setDocumentDialog] = useState<{
  mode: "rename" | "delete";
  document: StoredDocument;
  name: string;
} | null>(null);

  const [dbReady, setDbReady] = useState(false);

  const [notice, setNotice] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {

    let active = true;

    (async () => {

      try {

        let existing = await getStoredDocuments();

        if (!existing.length) {

          existing = initialDocuments.map((doc) => ({ ...doc, uploadedAt: new Date().toISOString() }));

          for (const doc of existing) await saveStoredDocument(doc);

        }

        if (active) { setDocuments(existing); setDbReady(true); }

      } catch (error) {

        console.error("FormShield local document database error:", error);

        if (active) { setDocuments(initialDocuments.map((doc) => ({ ...doc, uploadedAt: new Date().toISOString() }))); setDbReady(true); setNotice("Browser storage is unavailable; changes may not persist."); }

      }

    })();

    return () => { active = false; };

  }, []);



  const openUpload = () => fileInputRef.current?.click();

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {

    const files: File[] = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (!files.length) return;

    const allowed = ["application/pdf", "image/jpeg", "image/png"];

    const accepted: File[] = [];

    const rejected: string[] = [];

    for (const file of files) {

      if (!allowed.includes(file.type)) { rejected.push(`${file.name}: unsupported file type`); continue; }

      if (file.size > 10 * 1024 * 1024) { rejected.push(`${file.name}: larger than 10 MB`); continue; }

      accepted.push(file);

    }

    try {

      const added: StoredDocument[] = accepted.map((file) => ({ id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, "") || file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString(), status: "Review", blob: file }));

      for (const doc of added) await saveStoredDocument(doc);

      setDocuments((current) => [...added, ...current]);

      setPage("documents");

      setNotice(`${added.length} file${added.length === 1 ? "" : "s"} added to your vault.${rejected.length ? ` ${rejected.join("; ")}` : ""}`);

    } catch (error) { console.error(error); setNotice("Could not save files in browser storage."); }

  };

  
const renameDocument = (doc: StoredDocument) => {
  setDocumentDialog({
    mode: "rename",
    document: doc,
    name: doc.name,
  });
};


  const removeDocument = (doc: StoredDocument) => {
  setDocumentDialog({
    mode: "delete",
    document: doc,
    name: doc.name,
  });
};

  const previewDocument = (doc: StoredDocument) => {

    if (!doc.blob) { setNotice("This is a sample record with no actual file attached to preview."); return; }
    const url = URL.createObjectURL(doc.blob);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) setNotice("The browser blocked the preview window. Allow pop-ups and try again.");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const downloadDocument = (doc: StoredDocument) => {

    if (!doc.blob) return;

    const url = URL.createObjectURL(doc.blob);

    const ext = doc.type === "application/pdf" ? ".pdf" : doc.type === "image/png" ? ".png" : ".jpg";

    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${doc.name}${doc.name.toLowerCase().endsWith(ext) ? "" : ext}`; anchor.click();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  };



  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} />
    <div className="app-body">
      <Topbar setPage={setPage} />
      <main className="main-content">
        {!dbReady && <div className="storage-status">Preparing your local document vault…</div>}
        {notice && <div className="app-notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Dismiss message">
        <Icon name="close" size={15} />
        </button>
        </div>}
        <input ref={fileInputRef} className="visually-hidden-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple onChange={handleFilesSelected} />
        {page === "overview" && <Overview setPage={setPage} onUpload={openUpload} />}

        {page === "applications" && <ApplicationDetails setPage={setPage} />}

        {page === "documents" && <Documents setPage={setPage} documents={documents} onUpload={openUpload} onRename={renameDocument} onDelete={removeDocument} onPreview={previewDocument} onDownload={downloadDocument} />}

        {page === "analyze" && <AnalyzeNotice setPage={setPage} onUpload={openUpload} />}

        {!["overview", "applications", "documents", "analyze"].includes(page) && <UtilityPage page={page} setPage={setPage} />}
{documentDialog && (
  <div
    className="document-dialog-backdrop"
    onClick={() => setDocumentDialog(null)}
  >
    <section
      className="document-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-dialog-title"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="document-dialog-close"
        onClick={() => setDocumentDialog(null)}
        aria-label="Close dialog"
      >
        ×
      </button>

      <h2 id="document-dialog-title">
        {documentDialog.mode === "rename"
          ? "Rename document"
          : "Delete document?"}
      </h2>

      {documentDialog.mode === "rename" ? (
        <>
          <p>Enter a new name for this document.</p>
          <input
            autoFocus
            value={documentDialog.name}
            onChange={(event) =>
              setDocumentDialog({
                ...documentDialog,
                name: event.target.value,
              })
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") setDocumentDialog(null);
            }}
            placeholder="Document name"
          />
        </>
      ) : (
        <p>
          Are you sure you want to delete{" "}
          <strong>{documentDialog.document.name}</strong>? This action cannot
          be undone.
        </p>
      )}

      <div className="document-dialog-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setDocumentDialog(null)}
        >
          Cancel
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (documentDialog.mode === "rename") {
              const name = documentDialog.name.trim();
              if (!name) return;

              const doc = documentDialog.document;
              const updated = { ...doc, name };

              void (async () => {
                try {
                  await saveStoredDocument(updated);
                  setDocuments((items) =>
                    items.map((item) =>
                      item.id === doc.id ? updated : item
                    )
                  );
                  setNotice("Document renamed successfully.");
                } catch {
                  setNotice("Could not rename this document.");
                } finally {
                  setDocumentDialog(null);
                }
              })();
            } else {
              const doc = documentDialog.document;

              void (async () => {
                try {
                  await deleteStoredDocument(doc.id);
                  setDocuments((items) =>
                    items.filter((item) => item.id !== doc.id)
                  );
                  setNotice("Document record deleted.");
                } catch {
                  setNotice("Could not delete this document.");
                } finally {
                  setDocumentDialog(null);
                }
              })();
            }
          }}
          style={
            documentDialog.mode === "delete"
              ? { background: "#c93232", borderColor: "#c93232" }
              : undefined
          }
        >
          {documentDialog.mode === "rename" ? "Save name" : "Delete document"}
        </button>
      </div>
    </section>
  </div>
)}
      </main>

    </div>

    <MobileNav page={page} setPage={setPage} />

  </div>;

}
