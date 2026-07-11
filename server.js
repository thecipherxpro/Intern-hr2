import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';

const app = express();
const port = process.env.PORT || 8787;
const root = process.cwd();
const dataDir = path.join(root, 'data');
const uploadDir = path.join(root, 'uploads');
const templatePath = path.join(root, 'public', 'templates', 'cipherx-roe-2026.pdf');
const professionalTemplatePath = path.join(root, 'public', 'templates', 'cipherx-roe-professional-2026.pdf');
const storePath = path.join(dataDir, 'documents.json');
const defaultTemplateKey = 'minimal';

const documentTemplates = {
  minimal: {
    key: 'minimal',
    label: 'Minimal Blank Approvals',
    title: 'CipherX-HR Rules of Engagement - DEV.CPXS.CA Red Team Internship',
    reference: 'CX-HR-ROE-DEV-CPXS-2026-001',
    version: '1.2 - Minimal Blank Approvals',
    pdfPath: templatePath,
    originalFileName: 'CipherX_Full_RoE_Minimal_Blank_Approvals_2026.pdf',
    signers: 'minimal',
  },
  professional: {
    key: 'professional',
    label: 'Professional Signature Pages',
    title: 'CipherX-HR Professional Rules of Engagement - DEV.CPXS.CA',
    reference: 'CX-ROE-2026-DEV-CPXS-CA-001',
    version: '1.0 - Corrected Blank Fields',
    pdfPath: professionalTemplatePath,
    originalFileName: 'CipherX_HR_Professional_Rules_of_Engagement_DEV_CPXS_CA_CORRECTED_BLANK_FIELDS-1.pdf',
    signers: 'professional',
  },
};

const upload = multer({ dest: uploadDir });

app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use('/uploads', express.static(uploadDir));

const defaultAuthorities = [
  {
    id: 'ceo',
    type: 'authority',
    role: 'Chief Executive Officer',
    name: 'Gouran Moh, Eng.',
    email: 'ceo@cpxs.ca',
    pageIndex: 10,
    block: 'ceo',
    organization: 'CipherX Security Solutions',
    jobTitle: 'Chief Executive Officer',
    requiresSignature: true,
    signatureDataUrl: '',
    signedAt: '',
    auditStatus: 'PENDING',
    token: '',
    tokenExpiresAt: '',
  },
  {
    id: 'ciso',
    type: 'authority',
    role: 'Chief Information Security Officer',
    name: '',
    email: '',
    pageIndex: 10,
    block: 'ciso',
    organization: 'CipherX Security Solutions',
    jobTitle: 'Chief Information Security Officer',
    requiresSignature: true,
    signatureDataUrl: '',
    signedAt: '',
    auditStatus: 'PENDING',
    token: '',
    tokenExpiresAt: '',
  },
  {
    id: 'red-team-lead',
    type: 'authority',
    role: 'Red Team Lead',
    name: '',
    email: '',
    pageIndex: 11,
    block: 'redTeamLead',
    organization: 'CipherX Security Solutions',
    jobTitle: 'Red Team Lead / Reviewer',
    requiresSignature: true,
    signatureDataUrl: '',
    signedAt: '',
    auditStatus: 'PENDING',
    token: '',
    tokenExpiresAt: '',
  },
  {
    id: 'hr-authority',
    type: 'authority',
    role: 'Platform or Organization Administrator',
    name: '',
    email: '',
    pageIndex: 11,
    block: 'hrAuthority',
    organization: 'CipherX Security Solutions',
    jobTitle: 'Platform Administrator',
    requiresSignature: true,
    signatureDataUrl: '',
    signedAt: '',
    auditStatus: 'PENDING',
    token: '',
    tokenExpiresAt: '',
  },
];

const defaultInterns = [
  ['abinash-anton-rajkumar', 'Abinash Anton Rajkumar', '5624998', 'abinasha@student.computek.edu'],
  ['mohammed-ferdous-ahmed', 'Mohammed Ferdous Ahmed', '5684390', 'mohammedah@student.computek.edu'],
  ['ninorta-markhy', 'Ninorta Markhy', '5642200', 'ninortam@student.computek.edu'],
  ['obehi-ebhomielen', 'Obehi Ebhomielen', '5684424', 'obehie@student.computek.edu'],
].map(([id, name, internId, email], index) => ({
  id,
  type: 'intern',
  role: 'Intern - Penetration Tester',
  name,
  email,
  internId,
  pageIndex: 13,
  row: index,
  group: 'CipherX Red Team',
  jobTitle: 'Intern / Penetration Tester',
  requiresSignature: true,
  signatureDataUrl: '',
  signedAt: '',
  auditStatus: 'PENDING',
  token: '',
  tokenExpiresAt: '',
}));

const defaultAdmin = {
  documentHash: 'PLATFORM-GENERATED SHA-256',
  finalState: 'DRAFT',
  engagementState: 'INACTIVE',
  activationTimestamp: '',
};

const defaultAdminFields = [];

function signersForTemplate(templateKey) {
  const authorities = templateKey === 'professional'
    ? defaultAuthorities.filter((signer) => signer.id !== 'hr-authority')
    : defaultAuthorities;
  return [...authorities, ...defaultInterns].map((signer) => ({ ...signer }));
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });
  if (!existsSync(storePath)) {
    await fs.writeFile(storePath, JSON.stringify({ documents: [] }, null, 2));
  }
}

async function readStore() {
  await ensureStore();
  return JSON.parse(await fs.readFile(storePath, 'utf8'));
}

async function writeStore(store) {
  await ensureStore();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
}

function inferTemplateKey(doc) {
  if (doc.templateKey && documentTemplates[doc.templateKey]) return doc.templateKey;
  if (doc.reference === documentTemplates.professional.reference || doc.originalFileName?.includes('Professional')) return 'professional';
  return 'minimal';
}

function normalizeDocument(doc) {
  const templateKey = inferTemplateKey(doc);
  const template = documentTemplates[templateKey];
  doc.templateKey = templateKey;
  doc.templateLabel = template.label;
  if (templateKey === 'professional') {
    doc.title = template.title;
    doc.reference = template.reference;
    doc.version = template.version;
    doc.originalFileName = template.originalFileName;
    if (!doc.pdfPath || doc.pdfPath === templatePath) doc.pdfPath = template.pdfPath;
  }
  doc.pdfPath ||= template.pdfPath;
  doc.admin ||= { ...defaultAdmin };
  doc.adminFields = [];
  if (templateKey === 'professional') {
    const existing = doc.signers || [];
    doc.signers = signersForTemplate(templateKey).map((defaultSigner) => ({
      ...defaultSigner,
      ...(existing.find((signer) => signer.id === defaultSigner.id) || {}),
      pageIndex: defaultSigner.pageIndex,
      block: defaultSigner.block,
      row: defaultSigner.row,
    }));
  } else {
    doc.signers ||= signersForTemplate(templateKey);
  }
  return doc;
}

function createTemplateDocument(templateKey = defaultTemplateKey) {
  const template = documentTemplates[templateKey] || documentTemplates[defaultTemplateKey];
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    templateKey: template.key,
    templateLabel: template.label,
    title: template.title,
    reference: template.reference,
    version: template.version,
    pdfPath: template.pdfPath,
    originalFileName: template.originalFileName,
    createdAt: now,
    updatedAt: now,
    status: 'DRAFT',
    admin: { ...defaultAdmin },
    adminFields: [...defaultAdminFields],
    signers: signersForTemplate(template.key),
  };
}

function publicDocument(doc, req) {
  return {
    ...doc,
    pdfUrl: `${baseUrl(req)}/api/documents/${doc.id}/pdf`,
    pdfPath: undefined,
  };
}

function signerDocument(doc, req) {
  return {
    id: doc.id,
    templateKey: doc.templateKey,
    templateLabel: doc.templateLabel,
    title: doc.title,
    reference: doc.reference,
    version: doc.version,
    originalFileName: doc.originalFileName,
    updatedAt: doc.updatedAt,
    admin: doc.admin,
    pdfUrl: `${baseUrl(req)}/api/documents/${doc.id}/pdf`,
  };
}

function baseUrl(req) {
  const origin = req.headers.origin;
  if (origin) return origin;
  return `${req.protocol}://${req.get('host')}`;
}

function findByToken(store, token) {
  for (const doc of store.documents) {
    const signer = doc.signers.find((item) => item.token === token);
    if (signer) return { doc, signer };
  }
  return {};
}

function signedCount(doc) {
  return doc.signers.filter((item) => item.requiresSignature !== false && item.auditStatus === 'SIGNED').length;
}

function nextSigningState(doc, fallback = 'SENT') {
  const required = doc.signers.filter((item) => item.requiresSignature !== false);
  const count = signedCount(doc);
  if (count === required.length) return 'FULLY SIGNED';
  if (count > 0) return 'PARTIALLY SIGNED';
  return fallback;
}

function applySignerUpdate(signer, update) {
  const next = { ...signer, ...update };
  if (signer.auditStatus === 'SIGNED') {
    next.signatureDataUrl = signer.signatureDataUrl;
    next.signedAt = signer.signedAt;
    next.auditStatus = 'SIGNED';
    next.audit = signer.audit;
  }
  return next;
}

app.get('/api/documents/active', async (req, res) => {
  const store = await readStore();
  if (!store.documents.length) {
    store.documents.push(createTemplateDocument());
    await writeStore(store);
  }
  store.documents = store.documents.map(normalizeDocument);
  await writeStore(store);
  res.json(publicDocument(store.documents[0], req));
});

app.get('/api/documents/templates', async (req, res) => {
  const store = await readStore();
  store.documents = store.documents.map(normalizeDocument);
  await writeStore(store);
  res.json(Object.values(documentTemplates).map((template) => {
    const doc = store.documents.find((item) => item.templateKey === template.key);
    return {
      key: template.key,
      label: template.label,
      reference: template.reference,
      originalFileName: template.originalFileName,
      active: store.documents[0]?.templateKey === template.key,
      documentId: doc?.id || '',
      status: doc?.admin?.finalState || 'DRAFT',
      signed: doc ? signedCount(doc) : 0,
      required: doc ? doc.signers.filter((item) => item.requiresSignature !== false).length : 0,
    };
  }));
});

app.post('/api/documents/active-template', async (req, res) => {
  const templateKey = documentTemplates[req.body.templateKey]?.key || defaultTemplateKey;
  const store = await readStore();
  store.documents = store.documents.map(normalizeDocument);
  let doc = store.documents.find((item) => item.templateKey === templateKey);
  if (!doc) {
    doc = createTemplateDocument(templateKey);
    store.documents.unshift(doc);
  } else {
    store.documents = [doc, ...store.documents.filter((item) => item.id !== doc.id)];
  }
  await writeStore(store);
  res.json(publicDocument(doc, req));
});

app.patch('/api/documents/:id', async (req, res) => {
  const store = await readStore();
  const doc = store.documents.find((item) => item.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  if (req.body.admin) doc.admin = { ...doc.admin, ...req.body.admin };
  if (req.body.adminFields) {
    doc.adminFields = (doc.adminFields || []).map((field) => {
      const update = req.body.adminFields.find((item) => item.id === field.id);
      return update ? { ...field, ...update, rect: field.rect, pageIndex: field.pageIndex } : field;
    });
  }
  if (req.body.signers) {
    doc.signers = doc.signers.map((signer) => {
      const update = req.body.signers.find((item) => item.id === signer.id);
      return update ? applySignerUpdate(signer, update) : signer;
    });
  }
  if (req.body.status) doc.status = req.body.status;
  doc.updatedAt = new Date().toISOString();
  await writeStore(store);
  res.json(publicDocument(doc, req));
});

app.post('/api/documents/:id/upload', upload.single('pdf'), async (req, res) => {
  const store = await readStore();
  const doc = store.documents.find((item) => item.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!req.file) return res.status(400).json({ error: 'PDF file is required' });

  const safeName = `${doc.id}-${Date.now()}-${req.file.originalname.replace(/[^a-z0-9._-]/gi, '_')}`;
  const nextPath = path.join(uploadDir, safeName);
  await fs.rename(req.file.path, nextPath);
  doc.pdfPath = nextPath;
  doc.originalFileName = req.file.originalname;
  doc.updatedAt = new Date().toISOString();
  await writeStore(store);
  res.json(publicDocument(doc, req));
});

app.get('/api/documents/:id/pdf', async (req, res) => {
  const store = await readStore();
  const doc = store.documents.find((item) => item.id === req.params.id);
  if (!doc || !existsSync(doc.pdfPath)) return res.status(404).json({ error: 'PDF not found' });
  res.setHeader('Content-Type', 'application/pdf');
  createReadStream(doc.pdfPath).pipe(res);
});

app.post('/api/documents/:id/sign-links', async (req, res) => {
  const store = await readStore();
  const doc = store.documents.find((item) => item.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const signer = doc.signers.find((item) => item.id === req.body.signerId);
  if (!signer) return res.status(404).json({ error: 'Signer not found' });
  if (signer.requiresSignature === false) return res.status(400).json({ error: 'This role does not require a signature' });

  if (signer.auditStatus === 'SIGNED') {
    return res.json({
      token: signer.token,
      expiresAt: signer.tokenExpiresAt,
      url: signer.token ? `${baseUrl(req)}/sign/${signer.token}` : '',
      retained: true,
      document: publicDocument(doc, req),
    });
  }

  signer.token = crypto.randomBytes(24).toString('base64url');
  const days = Number(req.body.expiresInDays || 7);
  signer.tokenExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  doc.status = nextSigningState(doc, 'SENT');
  doc.admin.finalState = doc.status;
  doc.updatedAt = new Date().toISOString();
  await writeStore(store);

  res.json({
    token: signer.token,
    expiresAt: signer.tokenExpiresAt,
    url: `${baseUrl(req)}/sign/${signer.token}`,
    document: publicDocument(doc, req),
  });
});

app.get('/api/signing/:token', async (req, res) => {
  const store = await readStore();
  const { doc, signer } = findByToken(store, req.params.token);
  if (!doc || !signer) return res.status(404).json({ error: 'Signing link not found' });
  if (signer.auditStatus !== 'SIGNED' && new Date(signer.tokenExpiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Signing link has expired' });
  }
  res.json({
    document: signerDocument(doc, req),
    signer,
  });
});

app.post('/api/signing/:token', async (req, res) => {
  const store = await readStore();
  const { doc, signer } = findByToken(store, req.params.token);
  if (!doc || !signer) return res.status(404).json({ error: 'Signing link not found' });
  if (signer.auditStatus === 'SIGNED') {
    return res.json({ document: signerDocument(doc, req), signer, retained: true });
  }
  if (new Date(signer.tokenExpiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Signing link has expired' });
  }
  if (!req.body.signatureDataUrl) {
    return res.status(400).json({ error: 'Signature is required' });
  }

  signer.name = req.body.name || signer.name;
  signer.email = req.body.email || signer.email;
  signer.organization = req.body.organization || signer.organization;
  signer.internId = req.body.internId || signer.internId;
  signer.jobTitle = req.body.jobTitle || signer.jobTitle;
  signer.group = req.body.group || signer.group;
  signer.signatureDataUrl = req.body.signatureDataUrl;
  const signedAt = new Date().toISOString();
  signer.signedAt = signedAt;
  signer.auditStatus = 'SIGNED';
  signer.audit = {
    signatureId: `SIG-${crypto.randomUUID()}`,
    signedAtUtc: signedAt,
    displayedTime: req.body.displayedTime || '',
    timeZone: req.body.timeZone || 'UTC',
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
    consentVersion: req.body.consentVersion || 'CX-ROE-CONSENT-v1',
    consent: 'Signed Rules of Engagement acknowledgement',
  };
  doc.admin.finalState = nextSigningState(doc);
  doc.status = doc.admin.finalState;
  doc.updatedAt = new Date().toISOString();
  await writeStore(store);
  res.json({ document: signerDocument(doc, req), signer });
});

if (existsSync(path.join(root, 'dist'))) {
  app.use(express.static(path.join(root, 'dist')));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(root, 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`CipherX HR Docs API running on http://localhost:${port}`);
});
