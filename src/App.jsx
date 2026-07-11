import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileSignature,
  Hash,
  Link2,
  Loader2,
  PenLine,
  RefreshCcw,
  Send,
  ShieldCheck,
  Upload,
  UsersRound,
} from 'lucide-react';
import { format } from 'date-fns';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import SignaturePad from 'signature_pad';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const ROLE_OPTIONS = [
  'Chief Executive Officer',
  'Chief Information Security Officer',
  'Red Team Lead / Reviewer',
  'Platform or Organization Administrator',
  'Penetration Tester Intern',
  'Security Event Manager Intern',
  'Red Team Member',
];

const SIGNER_BLOCKS = {
  ceo: {
    pageIndex: 10,
    fields: {
      name: { x: 104, y: 233.15, w: 155, h: 9 },
      jobTitle: { x: 100, y: 166.65, w: 155, h: 9 },
      signature: { pageIndex: 11, x: 118, y: 656, w: 145, h: 24 },
      signedAt: { pageIndex: 11, x: 122, y: 579.35, w: 145, h: 9 },
      status: { pageIndex: 11, x: 149, y: 512.85, w: 90, h: 9 },
    },
  },
  ciso: {
    pageIndex: 10,
    fields: {
      name: { x: 338, y: 233.15, w: 155, h: 9 },
      jobTitle: { x: 334, y: 166.65, w: 155, h: 9 },
      signature: { pageIndex: 11, x: 352, y: 656, w: 145, h: 24 },
      signedAt: { pageIndex: 11, x: 356, y: 579.35, w: 145, h: 9 },
      status: { pageIndex: 11, x: 383, y: 512.85, w: 90, h: 9 },
    },
  },
  redTeamLead: {
    pageIndex: 11,
    fields: {
      name: { x: 104, y: 364.5, w: 155, h: 9 },
      jobTitle: { x: 100, y: 298, w: 155, h: 9 },
      signature: { x: 118, y: 204, w: 145, h: 24 },
      signedAt: { x: 122, y: 127, w: 145, h: 9 },
      status: { pageIndex: 12, x: 149, y: 683.85, w: 90, h: 9 },
    },
  },
  hrAuthority: {
    pageIndex: 11,
    fields: {
      name: { x: 338, y: 364.5, w: 155, h: 9 },
      jobTitle: { x: 334, y: 298, w: 155, h: 9 },
      signature: { x: 352, y: 204, w: 145, h: 24 },
      signedAt: { x: 356, y: 127, w: 145, h: 9 },
      status: { pageIndex: 12, x: 383, y: 683.85, w: 90, h: 9 },
    },
  },
};

const INTERN_BLOCKS = [
  { pageIndex: 13, y: 614.2 },
  { pageIndex: 13, y: 538.95 },
  { pageIndex: 13, y: 463.7 },
  { pageIndex: 13, y: 388.45 },
];

const PROFESSIONAL_AUTHORITY_BLOCKS = {
  ceo: professionalAuthorityBlock(20, 555.05, 530.55, 196.5, 232),
  ciso: professionalAuthorityBlock(21, 624.35, 599.85, 265.8, 300),
  redTeamLead: professionalAuthorityBlock(22, 624.35, 599.85, 265.8, 300, 'jobTitle'),
};

const PROFESSIONAL_INTERN_BLOCKS = [
  professionalInternBlock(23, 555.4, 82.25, 116),
  professionalInternBlock(24, 624.7, 151.55, 185),
  professionalInternBlock(25, 624.7, 151.55, 185),
  professionalInternBlock(26, 624.7, 151.55, 185),
];

const TEMPLATE_DETAILS = {
  minimal: {
    label: 'Minimal Blank Approvals',
    previewNote: 'Only management approvals and intern acknowledgement fields render on pages 11-14',
  },
  professional: {
    label: 'Professional Signature Pages',
    previewNote: 'Signature-ready fields render on pages 21-27, roster page 30, and audit page 31',
  },
};

function professionalAuthorityBlock(pageIndex, nameY, secondY, statusY, signatureY, secondField = 'organization') {
  return {
    pageIndex,
    fields: {
      name: { x: 196, y: nameY, w: 350, h: 9 },
      [secondField]: { x: 196, y: secondY, w: 350, h: 9 },
      signedAt: { x: 196, y: nameY - 49, w: 350, h: 9 },
      timeZone: { x: 196, y: nameY - 73.5, w: 350, h: 9 },
      ip: { x: 196, y: nameY - 98, w: 350, h: 9 },
      documentHash: { x: 196, y: nameY - 122.5, w: 350, h: 9 },
      signature: { x: 50, y: signatureY, w: 506, h: 168 },
      status: { x: 196, y: statusY, w: 350, h: 9 },
    },
  };
}

function professionalInternBlock(pageIndex, nameY, statusY, signatureY) {
  return {
    pageIndex,
    fields: {
      name: { x: 196, y: nameY, w: 350, h: 9 },
      internId: { x: 196, y: nameY - 23.75, w: 350, h: 9 },
      jobTitle: { x: 196, y: nameY - 47.5, w: 350, h: 9 },
      group: { x: 196, y: nameY - 71.25, w: 350, h: 9 },
      signedAt: { x: 196, y: nameY - 95, w: 350, h: 9 },
      timeZone: { x: 196, y: nameY - 118.75, w: 350, h: 9 },
      ip: { x: 196, y: nameY - 142.5, w: 350, h: 9 },
      consentVersion: { x: 196, y: nameY - 166.25, w: 350, h: 9 },
      documentHash: { x: 196, y: nameY - 190, w: 350, h: 9 },
      signature: { x: 50, y: signatureY, w: 506, h: 168 },
      status: { x: 196, y: statusY, w: 350, h: 9 },
    },
  };
}

function internBlock(index = 0) {
  const block = INTERN_BLOCKS[index] || INTERN_BLOCKS[0];
  const y = block.y;
  return {
    pageIndex: block.pageIndex,
    fields: {
      name: { x: 196.35, y, w: 155, h: 8 },
      internId: { x: 196.35, y: y - 15.05, w: 145, h: 8 },
      jobTitle: { x: 196.35, y: y - 30.1, w: 185, h: 8 },
      signature: { x: 196.35, y: y - 52, w: 120, h: 24 },
      signedAt: { x: 359, y: y - 45.15, w: 70, h: 8 },
      status: { x: 196.35, y: y - 60.2, w: 230, h: 8 },
    },
  };
}

function signerBlock(signer, templateKey = 'minimal') {
  if (templateKey === 'professional') {
    if (signer.type === 'intern') return PROFESSIONAL_INTERN_BLOCKS[signer.row] || PROFESSIONAL_INTERN_BLOCKS[0];
    return PROFESSIONAL_AUTHORITY_BLOCKS[signer.block] || PROFESSIONAL_AUTHORITY_BLOCKS.redTeamLead;
  }
  if (signer.type === 'intern') return internBlock(signer.row);
  return SIGNER_BLOCKS[signer.block] || SIGNER_BLOCKS.redTeamLead;
}

function rectPageIndex(block, rect) {
  return rect.pageIndex ?? block.pageIndex;
}

function App() {
  const signToken = window.location.pathname.match(/^\/sign\/([^/]+)$/)?.[1];
  return signToken ? <SignerApp token={signToken} /> : <AdminApp />;
}

function AdminApp() {
  const [documentState, setDocumentState] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');
  const [links, setLinks] = useState({});
  const [selectedSignerId, setSelectedSignerId] = useState('');
  const viewportWidth = useViewportWidth();

  const loadDocument = useCallback(async () => {
    setBusy(true);
    const doc = await api('/api/documents/active');
    setDocumentState(doc);
    setSelectedSignerId((current) => current || doc.signers[0]?.id || '');
    setBusy(false);
  }, []);

  useEffect(() => {
    loadDocument().catch((error) => {
      setNotice(error.message);
      setBusy(false);
    });
  }, [loadDocument]);

  useEffect(() => {
    api('/api/documents/templates')
      .then(setTemplates)
      .catch((error) => setNotice(error.message));
  }, []);

  useEffect(() => {
    if (!documentState?.pdfUrl) return;
    let cancelled = false;
    fetch(documentState.pdfUrl)
      .then((response) => response.arrayBuffer())
      .then((buffer) => pdfjsLib.getDocument({ data: buffer }).promise)
      .then((loaded) => {
        if (!cancelled) setPdfDoc(loaded);
      })
      .catch((error) => setNotice(error.message));
    return () => {
      cancelled = true;
    };
  }, [documentState?.pdfUrl]);

  const signers = documentState?.signers || [];
  const selectedSigner = signers.find((item) => item.id === selectedSignerId) || signers[0];
  const requiredSigners = signers.filter((item) => item.requiresSignature !== false);
  const completed = requiredSigners.filter((item) => item.auditStatus === 'SIGNED').length;
  const previewScale = getPdfScale(viewportWidth, 'admin');
  const templateKey = documentState?.templateKey || 'minimal';
  const templateDetail = TEMPLATE_DETAILS[templateKey] || TEMPLATE_DETAILS.minimal;

  async function switchTemplate(nextTemplateKey) {
    setBusy(true);
    const doc = await api('/api/documents/active-template', {
      method: 'POST',
      body: JSON.stringify({ templateKey: nextTemplateKey }),
    });
    setDocumentState(doc);
    setPdfDoc(null);
    setSelectedSignerId(doc.signers[0]?.id || '');
    setTemplates(await api('/api/documents/templates'));
    setNotice(`${doc.templateLabel || 'Template'} loaded.`);
    setBusy(false);
  }

  async function patchDocument(patch) {
    const updated = await api(`/api/documents/${documentState.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setDocumentState(updated);
    return updated;
  }

  async function updateAdmin(key, value) {
    setDocumentState((current) => ({
      ...current,
      admin: { ...current.admin, [key]: value },
    }));
    await patchDocument({ admin: { [key]: value } });
  }

  async function generateDocumentHash() {
    setNotice('Generating document hash...');
    const source = await fetch(documentState.pdfUrl).then((response) => response.arrayBuffer());
    const hash = await sha256Hex(source);
    await updateAdmin('documentHash', hash);
    setNotice('Document hash generated.');
  }

  async function updateAdminField(id, value) {
    setDocumentState((current) => ({
      ...current,
      adminFields: (current.adminFields || []).map((field) => (
        field.id === id ? { ...field, value } : field
      )),
    }));
    await patchDocument({ adminFields: [{ id, value }] });
  }

  async function updateSigner(id, patch) {
    setDocumentState((current) => ({
      ...current,
      signers: current.signers.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
    await patchDocument({ signers: [{ id, ...patch }] });
  }

  async function generateLink(signerId) {
    const result = await api(`/api/documents/${documentState.id}/sign-links`, {
      method: 'POST',
      body: JSON.stringify({ signerId, expiresInDays: 7 }),
    });
    setDocumentState(result.document);
    if (result.url) {
      setLinks((current) => ({ ...current, [signerId]: result.url }));
      await navigator.clipboard?.writeText(result.url).catch(() => {});
    }
    setNotice(result.retained ? 'Signature is already retained.' : 'Signing link copied.');
  }

  async function uploadPdf(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('pdf', file);
    const updated = await fetch(`/api/documents/${documentState.id}/upload`, {
      method: 'POST',
      body,
    }).then((response) => response.json());
    setDocumentState(updated);
    setNotice('PDF uploaded. Existing CipherX field map remains active.');
  }

  async function exportPdf() {
    if (!documentState) return;
    setNotice('Exporting PDF...');
    const bytes = await buildSignedPdf(documentState);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'CipherX_ROE_Fillable_Signed.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Exported with original PDF design.');
  }

  if (busy || !documentState) {
    return <LoadingScreen label="Opening CipherX-HR workspace" />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">CX</div>
          <div>
            <strong>CipherX-HR</strong>
            <span>Document Control</span>
          </div>
        </div>
        <nav className="nav-stack">
          <a className="nav-item active"><FileSignature size={18} /> RoE Builder</a>
          <a className="nav-item"><UsersRound size={18} /> Signers</a>
          <a className="nav-item"><ShieldCheck size={18} /> Audit</a>
        </nav>
        <div className="sidebar-footer">
          <span>{completed}/{requiredSigners.length} signed</span>
          <div className="progress-track"><i style={{ width: `${(completed / requiredSigners.length) * 100}%` }} /></div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{documentState.reference}</h1>
            <p>{documentState.originalFileName}</p>
          </div>
          <div className="toolbar">
            <label className="icon-button file-button" title="Upload PDF">
              <Upload size={17} />
              <input type="file" accept="application/pdf" onChange={uploadPdf} />
            </label>
            <button className="icon-button" onClick={loadDocument} title="Refresh"><RefreshCcw size={17} /></button>
            <button className="primary-button" onClick={exportPdf}><Download size={17} /> Export PDF</button>
          </div>
        </header>

        <section className="command-strip">
          <label className="template-switcher">
            <span>Template</span>
            <select value={templateKey} onChange={(event) => switchTemplate(event.target.value)}>
              {(templates.length ? templates : Object.values(TEMPLATE_DETAILS).map((item, index) => ({
                key: index === 0 ? 'minimal' : 'professional',
                label: item.label,
              }))).map((template) => (
                <option key={template.key} value={template.key}>{template.label}</option>
              ))}
            </select>
          </label>
          <StatusChip label={documentState.admin.finalState} tone={documentState.admin.finalState === 'FULLY SIGNED' ? 'green' : 'blue'} />
          <StatusChip label={documentState.admin.engagementState} tone={documentState.admin.engagementState === 'ACTIVE' ? 'green' : 'slate'} />
          <span className="strip-meta">Version {documentState.version}</span>
          <span className="strip-meta">Updated {format(new Date(documentState.updatedAt), 'MMM d, yyyy h:mm a')}</span>
          {notice && <span className="notice">{notice}</span>}
        </section>

        <div className="work-grid">
          <section className="document-stage">
            <div className="stage-header">
              <strong>PDF Preview</strong>
              <span>{templateDetail.previewNote}</span>
            </div>
            <div className="pdf-scroll">
              {pdfDoc ? (
                Array.from({ length: pdfDoc.numPages }, (_, index) => (
                  <PdfPage
                    key={`${documentState.pdfUrl}-${index}`}
                    pdfDoc={pdfDoc}
                    pageNumber={index + 1}
                    scale={previewScale}
                    signers={signers}
                    adminFields={documentState.adminFields || []}
                    selectedSignerId={selectedSigner?.id}
                    templateKey={templateKey}
                  />
                ))
              ) : (
                <LoadingScreen label="Rendering PDF pages" compact />
              )}
            </div>
          </section>

          <aside className="right-panel">
            <section className="panel-section">
              <div className="section-title">
                <span>HR Admin Fields</span>
                <ShieldCheck size={16} />
              </div>
              <Field label="Document hash" value={documentState.admin.documentHash} onChange={(value) => updateAdmin('documentHash', value)} />
              <button className="secondary-button full" onClick={generateDocumentHash}>
                <Hash size={16} /> Generate Hash
              </button>
              <div className="two-col">
                <SelectField label="Final state" value={documentState.admin.finalState} onChange={(value) => updateAdmin('finalState', value)} options={['DRAFT', 'SENT', 'PARTIALLY SIGNED', 'FULLY SIGNED']} />
                <SelectField label="Engagement" value={documentState.admin.engagementState} onChange={(value) => updateAdmin('engagementState', value)} options={['INACTIVE', 'READY', 'ACTIVE', 'PAUSED', 'CLOSED']} />
              </div>
              <Field label="Activation timestamp" value={documentState.admin.activationTimestamp} placeholder="YYYY-MM-DD HH:MM:SS EDT" onChange={(value) => updateAdmin('activationTimestamp', value)} />
            </section>

            <section className="panel-section signer-section">
              <div className="section-title">
                <span>Recipients</span>
                <UsersRound size={16} />
              </div>
              <div className="recipient-list">
                {signers.map((signer) => (
                  <button
                    key={signer.id}
                    className={`recipient-row ${selectedSigner?.id === signer.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSignerId(signer.id)}
                  >
                    <span>
                      <strong>{signer.name || signer.role}</strong>
                      <small>{signer.type === 'intern' ? signer.internId : signer.role}</small>
                    </span>
                    {signer.auditStatus === 'SIGNED' ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}
                  </button>
                ))}
              </div>
            </section>

            {selectedSigner && (
              <section className="panel-section">
                <div className="section-title">
                  <span>Signer Detail</span>
                  <PenLine size={16} />
                </div>
                <Field label="Full name" value={selectedSigner.name} onChange={(value) => updateSigner(selectedSigner.id, { name: value })} />
                <Field label="Email" value={selectedSigner.email || ''} onChange={(value) => updateSigner(selectedSigner.id, { email: value })} />
                <SelectField label="Role" value={selectedSigner.role} onChange={(value) => updateSigner(selectedSigner.id, { role: value, jobTitle: value })} options={ROLE_OPTIONS} />
                {selectedSigner.type === 'intern' ? (
                  <>
                    <Field label="Intern ID" value={selectedSigner.internId || ''} onChange={(value) => updateSigner(selectedSigner.id, { internId: value })} />
                    <Field label="Job title" value={selectedSigner.jobTitle || ''} onChange={(value) => updateSigner(selectedSigner.id, { jobTitle: value })} />
                    <Field label="Group" value={selectedSigner.group || ''} onChange={(value) => updateSigner(selectedSigner.id, { group: value })} />
                  </>
                ) : (
                  <>
                    <Field label="Organization" value={selectedSigner.organization || ''} onChange={(value) => updateSigner(selectedSigner.id, { organization: value })} />
                    <Field label="Job title" value={selectedSigner.jobTitle || selectedSigner.role || ''} onChange={(value) => updateSigner(selectedSigner.id, { jobTitle: value })} />
                  </>
                )}
                <div className="signer-meta">
                  <StatusChip label={selectedSigner.auditStatus} tone={selectedSigner.auditStatus === 'SIGNED' ? 'green' : 'slate'} />
                  {selectedSigner.signedAt && <span>{format(new Date(selectedSigner.signedAt), 'MMM d, yyyy h:mm a')}</span>}
                </div>
                <button className="primary-button full" onClick={() => generateLink(selectedSigner.id)} disabled={selectedSigner.requiresSignature === false}>
                  <Send size={17} /> Generate Signing Link
                </button>
                {(links[selectedSigner.id] || selectedSigner.token) && (
                  <div className="link-box">
                    <Link2 size={15} />
                    <input readOnly value={links[selectedSigner.id] || `${window.location.origin}/sign/${selectedSigner.token}`} />
                    <button onClick={() => navigator.clipboard?.writeText(links[selectedSigner.id] || `${window.location.origin}/sign/${selectedSigner.token}`)} title="Copy link"><Copy size={15} /></button>
                  </div>
                )}
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function SignerApp({ token }) {
  const [payload, setPayload] = useState(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [internId, setInternId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [group, setGroup] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const [pdfDoc, setPdfDoc] = useState(null);
  const viewportWidth = useViewportWidth();

  useEffect(() => {
    api(`/api/signing/${token}`)
      .then((result) => {
        setPayload(result);
        setName(result.signer.name || '');
        setEmail(result.signer.email || '');
        setOrganization(result.signer.organization || '');
        setInternId(result.signer.internId || '');
        setJobTitle(result.signer.jobTitle || result.signer.role || '');
        setGroup(result.signer.group || '');
        return fetch(result.document.pdfUrl).then((response) => response.arrayBuffer());
      })
      .then((buffer) => pdfjsLib.getDocument({ data: buffer }).promise)
      .then(setPdfDoc)
      .catch((error) => setNotice(error.message));
  }, [token]);

  async function submit() {
    if (!signatureDataUrl || !consent) {
      setNotice('Signature and consent are required.');
      return;
    }
    const result = await api(`/api/signing/${token}`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        organization,
        internId,
        jobTitle,
        group,
        signatureDataUrl,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        displayedTime: new Date().toLocaleString(),
        consentVersion: 'CX-ROE-CONSENT-v1',
      }),
    });
    setPayload((current) => ({ ...current, signer: result.signer, document: result.document }));
    setSubmitted(true);
  }

  if (!payload) {
    return <LoadingScreen label={notice || 'Opening signing link'} />;
  }

  const signer = payload.signer;
  const templateKey = payload.document.templateKey || 'minimal';
  const targetPage = signerBlock(signer, templateKey).pageIndex + 1;
  const alreadySigned = submitted || signer.auditStatus === 'SIGNED';
  const previewScale = getPdfScale(viewportWidth, 'signer');

  return (
    <div className="signing-shell">
      <header className="signing-header">
        <div className="brand-lockup light">
          <div className="brand-mark">CX</div>
          <div>
            <strong>CipherX-HR</strong>
            <span>Rules of Engagement</span>
          </div>
        </div>
        <StatusChip label={alreadySigned ? 'SIGNED' : 'PENDING'} tone={alreadySigned ? 'green' : 'blue'} />
      </header>
      <main className="signing-grid">
        <section className="signing-preview">
          <div className="stage-header">
            <strong>{payload.document.reference}</strong>
            <span>Page {targetPage} signature target</span>
          </div>
          <div className="pdf-scroll signer-scroll">
            {pdfDoc ? (
              <PdfPage pdfDoc={pdfDoc} pageNumber={targetPage} scale={previewScale} signers={[signer]} adminFields={[]} selectedSignerId={signer.id} templateKey={templateKey} />
            ) : (
              <LoadingScreen label="Rendering target page" compact />
            )}
          </div>
        </section>
        <aside className="sign-card">
          <div>
            <h1>{alreadySigned ? 'Signature captured' : signer.name}</h1>
            <p>{signer.role}</p>
          </div>
          {!alreadySigned ? (
            <>
              <Field label="Full legal name" value={name} onChange={setName} />
              <Field label="Email" value={email} onChange={setEmail} />
              {signer.type === 'intern' ? (
                <>
                  <Field label="Intern ID" value={internId} onChange={setInternId} />
                  <Field label="Job title" value={jobTitle} onChange={setJobTitle} />
                  <Field label="Group" value={group} onChange={setGroup} />
                </>
              ) : (
                <>
                  <Field label="Organization" value={organization} onChange={setOrganization} />
                  <Field label="Job title" value={jobTitle} onChange={setJobTitle} />
                </>
              )}
              <SignatureCapture onChange={setSignatureDataUrl} />
              <label className="consent-row">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                <span>I confirm I have read and accept the CipherX-HR Rules of Engagement.</span>
              </label>
              {notice && <span className="notice block">{notice}</span>}
              <button className="primary-button full" onClick={submit}><FileSignature size={17} /> Submit Signature</button>
            </>
          ) : (
            <div className="signed-result">
              <CheckCircle2 size={34} />
              <strong>{format(new Date(payload.signer.signedAt), 'MMMM d, yyyy h:mm a')}</strong>
              <span>Your signature has been saved. Next step: the full PDF will be available once everyone has signed.</span>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function PdfPage({ pdfDoc, pageNumber, scale, signers, adminFields = [], selectedSignerId, templateKey = 'minimal' }) {
  const canvasRef = useRef(null);
  const [viewport, setViewport] = useState(null);

  useEffect(() => {
    let renderTask;
    let cancelled = false;
    pdfDoc.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const nextViewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(nextViewport.width * ratio);
      canvas.height = Math.floor(nextViewport.height * ratio);
      canvas.style.width = `${nextViewport.width}px`;
      canvas.style.height = `${nextViewport.height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      setViewport(nextViewport);
      renderTask = page.render({ canvasContext: context, viewport: nextViewport });
      renderTask.promise.catch((error) => {
        if (error?.name !== 'RenderingCancelledException') {
          console.error(error);
        }
      });
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNumber, scale]);

  const pageSigners = signers.filter((signer) => {
    const block = signerBlock(signer, templateKey);
    return Object.values(block.fields).some((rect) => rectPageIndex(block, rect) === pageNumber - 1);
  });
  const pageAdminFields = adminFields.filter((field) => field.pageIndex === pageNumber - 1);
  return (
    <div className="pdf-page-wrap" style={viewport ? { width: viewport.width } : undefined}>
      <canvas ref={canvasRef} className="pdf-canvas" />
      {viewport && (
        <div className="field-layer">
          {pageSigners.map((signer) => (
            <SignerOverlay
              key={signer.id}
              signer={signer}
              scale={scale}
              pageIndex={pageNumber - 1}
              selected={signer.id === selectedSignerId}
              templateKey={templateKey}
            />
          ))}
          {pageAdminFields.map((field) => (
            <OverlayRect key={field.id} rect={field.rect} scale={scale} tone="admin" />
          ))}
        </div>
      )}
      <span className="page-tag">Page {pageNumber}</span>
    </div>
  );
}

function SignerOverlay({ signer, scale, pageIndex, selected, templateKey = 'minimal' }) {
  if (!selected && signer.auditStatus !== 'SIGNED') return null;
  const block = signerBlock(signer, templateKey);
  const visibleKeys = signer.type === 'intern' && templateKey === 'minimal'
    ? (signer.auditStatus === 'SIGNED' ? ['signature', 'signedAt', 'status'] : ['signature'])
    : Object.keys(block.fields);
  const rects = visibleKeys
    .map((key) => block.fields[key])
    .filter((rect) => rect && rectPageIndex(block, rect) === pageIndex);
  return rects.map((rect, index) => (
    <OverlayRect
      key={`${signer.id}-${index}`}
      rect={rect}
      scale={scale}
      tone={selected ? 'selected' : signer.auditStatus === 'SIGNED' ? 'signed' : 'pending'}
    />
  ));
}

function useViewportWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

function getPdfScale(width, mode) {
  if (width <= 430) return 0.55;
  if (width <= 620) return 0.68;
  if (width <= 900) return mode === 'signer' ? 0.82 : 0.78;
  if (width <= 1180) return mode === 'signer' ? 0.98 : 0.92;
  return mode === 'signer' ? 1.08 : 1.08;
}

function OverlayRect({ rect, scale, label, tone }) {
  const top = (792 - rect.y - rect.h) * scale;
  return (
    <div
      className={`overlay-rect ${tone}`}
      style={{
        left: rect.x * scale,
        top,
        width: rect.w * scale,
        height: rect.h * scale,
      }}
    >
      {label && <span>{label}</span>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function StatusChip({ label, tone }) {
  return <span className={`status-chip ${tone}`}>{label}</span>;
}

function SignatureCapture({ onChange }) {
  const canvasRef = useRef(null);
  const padRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      padRef.current?.clear();
      onChange('');
    };
    padRef.current = new SignaturePad(canvas, {
      minWidth: 0.8,
      maxWidth: 2.2,
      penColor: '#111827',
      backgroundColor: 'rgba(255,255,255,0)',
    });
    padRef.current.addEventListener('endStroke', () => {
      onChange(padRef.current.toDataURL('image/png'));
    });
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [onChange]);

  return (
    <div className="signature-capture">
      <div className="capture-bar">
        <span>Signature</span>
        <button onClick={() => { padRef.current?.clear(); onChange(''); }}>Clear</button>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
}

function LoadingScreen({ label, compact = false }) {
  return (
    <div className={compact ? 'loading compact' : 'loading'}>
      <Loader2 className="spin" size={22} />
      <span>{label}</span>
    </div>
  );
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

async function buildSignedPdf(doc) {
  const source = await fetch(doc.pdfUrl).then((response) => response.arrayBuffer());
  const sourceHash = await sha256Hex(source);
  const templateKey = doc.templateKey || 'minimal';
  const pdf = await PDFDocument.load(source);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  const drawTextField = (page, rect, text, options = {}) => {
    if (!page || !rect || !text) return;
    if (options.fill !== false) {
      page.drawRectangle({
        x: rect.x,
        y: rect.y + (options.fillOffsetY ?? -1),
        width: options.fillWidth || rect.w,
        height: options.fillHeight || rect.h + 3,
        color: rgb(1, 1, 1),
      });
    }
    page.drawText(String(text), {
      x: rect.x,
      y: rect.y,
      size: options.size || 7.2,
      font: options.bold ? boldFont : font,
      color: rgb(0.06, 0.09, 0.16),
      maxWidth: rect.w,
    });
  };

  const drawSignature = async (page, rect, dataUrl) => {
    if (!page || !rect || !dataUrl) return;
    const imageBytes = await fetch(dataUrl).then((response) => response.arrayBuffer());
    const image = await pdf.embedPng(imageBytes);
    page.drawRectangle({
      x: rect.x - 2,
      y: rect.y,
      width: rect.w + 4,
      height: rect.h,
      color: rgb(1, 1, 1),
    });
    page.drawImage(image, {
      x: rect.x,
      y: rect.y + 1,
      width: rect.w,
      height: rect.h - 2,
    });
  };

  for (const signer of doc.signers) {
    const block = signerBlock(signer, templateKey);
    const pageFor = (rect) => pages[rectPageIndex(block, rect)];
    const fields = block.fields;
    if (templateKey === 'professional' || signer.type !== 'intern') {
      drawTextField(pageFor(fields.name), fields.name, signer.name, { size: 7.4 });
      if (fields.organization) drawTextField(pageFor(fields.organization), fields.organization, signer.organization || 'CipherX Security Solutions', { size: 7.4 });
      if (fields.jobTitle) drawTextField(pageFor(fields.jobTitle), fields.jobTitle, signer.jobTitle || signer.role, { size: 7.4 });
      if (fields.internId) drawTextField(pageFor(fields.internId), fields.internId, signer.internId, { size: 7.4 });
      if (fields.group) drawTextField(pageFor(fields.group), fields.group, signer.group, { size: 7.4 });
      if (fields.documentHash) drawTextField(pageFor(fields.documentHash), fields.documentHash, cleanHash(doc.admin.documentHash, sourceHash), { size: 5.7 });
    }
    await drawSignature(pageFor(fields.signature), fields.signature, signer.signatureDataUrl);
    if (templateKey === 'professional' && fields.status) {
      drawTextField(pageFor(fields.status), fields.status, signer.auditStatus || 'PENDING', { size: 7, bold: signer.auditStatus === 'SIGNED' });
    }
    if (signer.auditStatus === 'SIGNED') {
      drawTextField(pageFor(fields.signedAt), fields.signedAt, formatDateTime(signer.audit?.signedAtUtc || signer.signedAt), { size: 6.4 });
      if (fields.status) {
        const status = templateKey === 'professional'
          ? 'SIGNED'
          : signer.type === 'intern'
          ? `SIGNED | ${formatDateTime(signer.signedAt)} | ${signer.audit?.ip || ''}`
          : 'SIGNED';
        drawTextField(pageFor(fields.status), fields.status, status, { size: signer.type === 'intern' ? 5.4 : 7, bold: true });
      }
      if (fields.timeZone) drawTextField(pageFor(fields.timeZone), fields.timeZone, signer.audit?.timeZone || 'UTC', { size: 7 });
      if (fields.ip) drawTextField(pageFor(fields.ip), fields.ip, signer.audit?.ip || '', { size: 7 });
      if (fields.consentVersion) drawTextField(pageFor(fields.consentVersion), fields.consentVersion, signer.audit?.consentVersion || 'CX-ROE-CONSENT-v1', { size: 7 });
      if (fields.documentHash) drawTextField(pageFor(fields.documentHash), fields.documentHash, cleanHash(doc.admin.documentHash, sourceHash), { size: 5.7 });
    }
  }

  (doc.adminFields || []).forEach((field) => {
    let value = field.value;
    if (field.id === 'finalDocumentStatus') value = doc.admin.finalState;
    if (field.id === 'completedUtcTimestamp') value = doc.admin.activationTimestamp || value;
    if (field.id === 'finalSha256Hash') value = cleanHash(value, sourceHash);
    drawTextField(pages[field.pageIndex], field.rect, value, { size: field.size });
  });

  if (templateKey === 'professional') {
    drawRoster(pages[29], doc.signers, drawTextField);
    drawAuditRecord(pages[30], doc, sourceHash, drawTextField);
  } else {
    drawMinimalAuditRecord(pages[13], doc, sourceHash, drawTextField);
  }

  return pdf.save();
}

function drawMinimalAuditRecord(page, doc, sourceHash, drawTextField) {
  if (!page) return;
  drawTextField(page, { x: 198.6, y: 282.9, w: 260, h: 8 }, `${doc.reference} | ${doc.version} | ${cleanHash(doc.admin.documentHash, sourceHash)}`, { size: 5.8 });
  drawTextField(page, { x: 198.6, y: 201.3, w: 194, h: 8 }, doc.admin.finalState, { size: 7, bold: true });
  drawTextField(page, { x: 198.6, y: 182.6, w: 145, h: 8 }, doc.admin.engagementState, { size: 7, bold: true });
  drawTextField(page, { x: 198.6, y: 163.9, w: 120, h: 8 }, doc.admin.activationTimestamp, { size: 7 });
}

function drawRoster(page, signers, drawTextField) {
  if (!page) return;
  const interns = signers.filter((signer) => signer.type === 'intern').slice(0, 10);
  const rosterFill = { fillHeight: 8.4, fillOffsetY: -1.2 };
  interns.forEach((signer, index) => {
    const y = 664.2 - index * 9.3;
    drawTextField(page, { x: 88.2, y, w: 108, h: 8 }, fitText(signer.name, 26), { size: 4.6, ...rosterFill });
    drawTextField(page, { x: 203.4, y, w: 68, h: 8 }, signer.internId, { size: 4.7, ...rosterFill });
    drawTextField(page, { x: 279, y, w: 105, h: 8 }, fitText(signer.jobTitle || signer.role, 24), { size: 4.4, ...rosterFill });
    drawTextField(page, { x: 390.5, y, w: 75, h: 8 }, fitText(signer.group, 18), { size: 4.2, ...rosterFill });
    drawTextField(page, { x: 469.8, y, w: 76, h: 8 }, signer.auditStatus || 'PENDING', { size: 5, bold: signer.auditStatus === 'SIGNED', ...rosterFill });
  });
}

function drawAuditRecord(page, doc, sourceHash, drawTextField) {
  if (!page) return;
  const signed = doc.signers.filter((signer) => signer.auditStatus === 'SIGNED');
  const required = doc.signers.filter((signer) => signer.requiresSignature !== false);
  const firstByRole = (match) => signed.find((signer) => signer.role.includes(match));
  const now = new Date().toISOString();
  const completed = signed.filter((signer) => signer.requiresSignature !== false).length;
  const completionId = doc.adminFields?.find((field) => field.id === 'completionCertificateId')?.value || 'PENDING';
  const correlationId = doc.adminFields?.find((field) => field.id === 'correlationId')?.value || doc.id;
  const auditFill = { fillHeight: 8.6, fillOffsetY: -1.4 };
  const finalFill = { fillHeight: 9, fillOffsetY: -1.5 };
  drawTextField(page, { x: 212.4, y: 676.6, w: 78, h: 8 }, 'System', { size: 5.2, ...auditFill });
  drawTextField(page, { x: 316.8, y: 676.6, w: 84, h: 8 }, formatDateTime(doc.createdAt), { size: 4.8, ...auditFill });
  drawTextField(page, { x: 414.2, y: 676.6, w: 132, h: 8 }, `File: ${fitText(doc.originalFileName, 32)}`, { size: 3.6, ...auditFill });
  drawTextField(page, { x: 316.8, y: 667.3, w: 84, h: 8 }, formatDateTime(doc.createdAt), { size: 4.8, ...auditFill });
  drawTextField(page, { x: 414.2, y: 667.3, w: 132, h: 8 }, `Hash: ${shortHash(sourceHash)}`, { size: 4.1, ...auditFill });
  drawTextField(page, { x: 316.8, y: 658, w: 84, h: 8 }, formatDateTime(doc.createdAt), { size: 4.8, ...auditFill });
  drawTextField(page, { x: 414.2, y: 658, w: 132, h: 8 }, `Version: ${fitText(doc.version, 24)}`, { size: 4.1, ...auditFill });
  drawTextField(page, { x: 212.4, y: 648.7, w: 78, h: 8 }, 'CipherX-HR', { size: 5.2, ...auditFill });
  drawTextField(page, { x: 316.8, y: 648.7, w: 84, h: 8 }, formatDateTime(doc.updatedAt), { size: 4.8, ...auditFill });
  drawTextField(page, { x: 414.2, y: 648.7, w: 132, h: 8 }, `Signer count: ${required.length}`, { size: 5, ...auditFill });
  [
    { role: 'Chief Executive Officer', y: 639.4 },
    { role: 'Chief Information Security Officer', y: 630.1 },
  ].forEach(({ role, y }) => {
    const signer = firstByRole(role);
    if (!signer) return;
    drawTextField(page, { x: 212.4, y, w: 78, h: 8 }, fitText(signer.name, 18), { size: 4.8, ...auditFill });
    drawTextField(page, { x: 316.8, y, w: 84, h: 8 }, formatDateTime(signer.signedAt), { size: 4.8, ...auditFill });
    drawTextField(page, { x: 414.2, y, w: 132, h: 8 }, `Signature ID: ${fitText(signer.audit?.signatureId || 'SIGNED', 20)}`, { size: 3.9, ...auditFill });
  });
  drawTextField(page, { x: 316.8, y: 620.8, w: 84, h: 8 }, formatDateTime(now), { size: 4.8, ...auditFill });
  drawTextField(page, { x: 414.2, y: 620.8, w: 132, h: 8 }, `Completed: ${completed} / ${required.length}`, { size: 5, ...auditFill });
  drawTextField(page, { x: 316.8, y: 611.5, w: 84, h: 8 }, formatDateTime(now), { size: 4.8, ...auditFill });
  drawTextField(page, { x: 414.2, y: 611.5, w: 132, h: 8 }, `Final hash: ${shortHash(sourceHash)}`, { size: 4.1, ...auditFill });
  drawTextField(page, { x: 316.8, y: 602.2, w: 84, h: 8 }, formatDateTime(now), { size: 4.8, ...auditFill });
  drawTextField(page, { x: 414.2, y: 602.2, w: 132, h: 8 }, `Certificate ID: ${fitText(completionId, 20)}`, { size: 4.1, ...auditFill });
  drawTextField(page, { x: 212.4, y: 592.9, w: 78, h: 8 }, doc.admin.engagementState, { size: 5, ...auditFill });
  drawTextField(page, { x: 316.8, y: 592.9, w: 84, h: 8 }, doc.admin.activationTimestamp || '', { size: 4.8, ...auditFill });
  drawTextField(page, { x: 414.2, y: 592.9, w: 132, h: 8 }, `Audit ID: ${fitText(correlationId, 22)}`, { size: 3.9, ...auditFill });

  drawTextField(page, { x: 221.4, y: 543.3, w: 335, h: 8 }, doc.admin.finalState, { size: 6.2, bold: true, ...finalFill });
  drawTextField(page, { x: 221.4, y: 532.85, w: 335, h: 8 }, fitText(doc.version, 40), { size: 5.4, ...finalFill });
  drawTextField(page, { x: 221.4, y: 522.4, w: 335, h: 8 }, shortHash(sourceHash), { size: 5.2, ...finalFill });
  drawTextField(page, { x: 221.4, y: 511.95, w: 335, h: 8 }, completionId, { size: 5.4, ...finalFill });
  drawTextField(page, { x: 221.4, y: 501.5, w: 335, h: 8 }, doc.admin.activationTimestamp || formatDateTime(now), { size: 5.4, ...finalFill });
  drawTextField(page, { x: 221.4, y: 491.05, w: 335, h: 8 }, fitText(correlationId, 40), { size: 5, ...finalFill });
}

function cleanHash(value, fallback) {
  if (!value || value.includes('PLATFORM-GENERATED')) return fallback;
  return value;
}

function fitText(value, maxLength) {
  const text = String(value || '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}...`;
}

function shortHash(value) {
  const text = String(value || '');
  if (text.length <= 24) return text;
  return `${text.slice(0, 12)}...${text.slice(-10)}`;
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function formatDate(iso) {
  if (!iso) return '';
  return format(new Date(iso), 'yyyy-MM-dd');
}

function formatDateTime(iso) {
  if (!iso) return '';
  return format(new Date(iso), 'yyyy-MM-dd HH:mm:ss');
}

export default App;
