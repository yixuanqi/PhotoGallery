// Commercial Compliance Shell & Save-Code Backup UI (v50.0)
// Includes: Health Gaming Advisory, CADPA 12+ Age Rating Modal, Unchecked First-Run Privacy/Agreement Consent,
// Credits Screen, Save-Code Export/Import & TapTap Cloud Sync Status Pill.
import { G } from '../state.js';
import { storage } from '../storage.js';
import { exportSaveCode, importSaveCode, syncCloudSaveSlots, readSaveSlot } from '../save.js';
import { t } from '../i18n.js';
import { openModal, closeModal, uiHooks } from './uiShared.js';

const CONSENT_STORAGE_KEY = 'ashen_bell_vow_consent_v1';
const CONSENT_POLICY_VERSION = '2026-11';

export const COMPLIANCE_META = {
  version: 'v50.0',
  ageRating: '12+',
  developer: '灰钟残誓独立制作组 / Ashen Bell Studio',
  copyrightNo: '', // e.g. '软著登字第 XXXXXXX 号'
  icpNo: '',       // e.g. '粤ICP备XXXXXXXX号-1X'
  isbnNo: '',      // e.g. 'ISBN 978-7-XXXX-XXXX-X'
  contactInfo: 'TapTap 社区官方主页 / GitHub: yixuanqi'
};

let _activeLegalTab = 'privacy';
let _saveCodeMode = 'export';
let _complianceWired = false;

export function hasAcceptedComplianceConsent() {
  const rec = storage.getJSON(CONSENT_STORAGE_KEY);
  return !!(rec && rec.accepted === true && rec.policyVersion === CONSENT_POLICY_VERSION);
}

export function setComplianceConsent(accepted) {
  if (accepted) {
    storage.setJSON(CONSENT_STORAGE_KEY, {
      accepted: true,
      policyVersion: CONSENT_POLICY_VERSION,
      acceptedAt: Date.now()
    });
  } else {
    storage.remove(CONSENT_STORAGE_KEY);
  }
}

export function getFilingFooterText() {
  const parts = [];
  if (COMPLIANCE_META.copyrightNo) parts.push(COMPLIANCE_META.copyrightNo);
  if (COMPLIANCE_META.icpNo) parts.push(COMPLIANCE_META.icpNo);
  if (COMPLIANCE_META.isbnNo) parts.push(COMPLIANCE_META.isbnNo);
  if (parts.length > 0) return parts.join(' · ');
  return t('legal.indieNotice', COMPLIANCE_META.version);
}

export function renderLegalModal(tab = _activeLegalTab) {
  _activeLegalTab = ['cadpa', 'privacy', 'credits'].includes(tab) ? tab : 'privacy';
  const tabsEl = document.getElementById('legal-tabs');
  const bodyEl = document.getElementById('legal-body');
  const titleEl = document.getElementById('legal-modal-title');
  const subEl = document.getElementById('legal-modal-sub');
  if (!bodyEl) return;

  const tabs = [
    { id: 'cadpa', label: t('legal.tabCadpa') },
    { id: 'privacy', label: t('legal.tabPrivacy') },
    { id: 'credits', label: t('legal.tabCredits') }
  ];
  if (tabsEl) {
    tabsEl.innerHTML = '';
    for (const item of tabs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `codex-tab${_activeLegalTab === item.id ? ' active' : ''}`;
      btn.textContent = item.label;
      btn.addEventListener('click', () => renderLegalModal(item.id));
      tabsEl.appendChild(btn);
    }
  }

  if (titleEl) titleEl.textContent = t(`legal.title.${_activeLegalTab}`);
  if (subEl) subEl.textContent = t(`legal.sub.${_activeLegalTab}`);
  bodyEl.innerHTML = '';

  const addBlock = (heading, lines) => {
    const sec = document.createElement('div');
    sec.className = 'legal-block';
    const h = document.createElement('div');
    h.className = 'legal-block-title';
    h.textContent = heading;
    sec.appendChild(h);
    for (const line of lines) {
      const p = document.createElement('p');
      p.className = 'legal-p';
      p.textContent = line;
      sec.appendChild(p);
    }
    bodyEl.appendChild(sec);
  };

  if (_activeLegalTab === 'cadpa') {
    addBlock(t('legal.cadpaH1'), [t('legal.cadpaP1'), t('legal.cadpaP2')]);
    addBlock(t('legal.cadpaH2'), [t('legal.cadpaP3'), t('legal.cadpaP4')]);
    addBlock(t('legal.cadpaH3'), [t('legal.cadpaP5')]);
  } else if (_activeLegalTab === 'privacy') {
    addBlock(t('legal.privH1'), [t('legal.privP1'), t('legal.privP2')]);
    addBlock(t('legal.privH2'), [t('legal.privP3'), t('legal.privP4')]);
    addBlock(t('legal.privH3'), [t('legal.privP5', COMPLIANCE_META.contactInfo)]);
    if (hasAcceptedComplianceConsent()) {
      const revokeWrap = document.createElement('div');
      revokeWrap.className = 'legal-revoke-row';
      const revBtn = document.createElement('button');
      revBtn.type = 'button';
      revBtn.className = 'seg-btn';
      revBtn.textContent = t('legal.revokeBtn');
      revBtn.addEventListener('click', () => {
        if (window.confirm(t('legal.revokeConfirm'))) {
          setComplianceConsent(false);
          closeModal('legal');
          showConsentModal();
        }
      });
      revokeWrap.appendChild(revBtn);
      bodyEl.appendChild(revokeWrap);
    }
  } else {
    addBlock(t('legal.credH1'), [t('legal.credP1', COMPLIANCE_META.developer), t('legal.credP2')]);
    addBlock(t('legal.credH2'), [t('legal.credP3'), t('legal.credP4')]);
    addBlock(t('legal.credH3'), [t('legal.credP5', COMPLIANCE_META.version), getFilingFooterText()]);
  }
}

export function openLegalModal(tab = 'privacy') {
  renderLegalModal(tab);
  openModal('legal');
}

export function showConsentModal() {
  const modal = document.getElementById('compliance-consent-modal');
  if (!modal) return;
  const chk = document.getElementById('consent-checkbox');
  const acceptBtn = document.getElementById('btn-consent-accept');
  const declineMsg = document.getElementById('consent-decline-msg');
  if (chk) chk.checked = false;
  if (acceptBtn) acceptBtn.disabled = true;
  if (declineMsg) declineMsg.classList.add('hidden');
  modal.classList.remove('hidden');
}

export function ensureComplianceConsent() {
  if (G.isEditorPreview) return true;
  if (hasAcceptedComplianceConsent()) return true;
  showConsentModal();
  return false;
}

export function renderSaveCodeModal(mode = _saveCodeMode) {
  _saveCodeMode = mode === 'import' ? 'import' : 'export';
  const tabsEl = document.getElementById('savecode-tabs');
  const descEl = document.getElementById('savecode-desc');
  const taEl = document.getElementById('savecode-textarea');
  const statusEl = document.getElementById('savecode-status');
  const actBtn = document.getElementById('btn-savecode-action');
  if (!taEl || !actBtn) return;

  const slotNum = G.activeSaveSlot + 1;
  if (tabsEl) {
    tabsEl.innerHTML = '';
    for (const item of [
      { id: 'export', label: t('backup.tabExport') },
      { id: 'import', label: t('backup.tabImport') }
    ]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `codex-tab${_saveCodeMode === item.id ? ' active' : ''}`;
      b.textContent = item.label;
      b.addEventListener('click', () => renderSaveCodeModal(item.id));
      tabsEl.appendChild(b);
    }
  }

  if (statusEl) {
    statusEl.textContent = '';
    statusEl.className = 'savecode-status';
  }

  if (_saveCodeMode === 'export') {
    const code = exportSaveCode(G.activeSaveSlot);
    taEl.readOnly = true;
    taEl.placeholder = t('backup.emptySlot', slotNum);
    taEl.value = code || '';
    if (descEl) descEl.textContent = code ? t('backup.exportDesc', slotNum) : t('backup.emptySlot', slotNum);
    actBtn.textContent = t('backup.copyBtn');
    actBtn.disabled = !code;
  } else {
    const existing = readSaveSlot(G.activeSaveSlot);
    taEl.readOnly = false;
    taEl.value = '';
    taEl.placeholder = t('backup.importPlaceholder');
    if (descEl) {
      descEl.textContent = existing ? t('backup.importWarnOverwrite', slotNum) : t('backup.importDesc', slotNum);
    }
    actBtn.textContent = t('backup.importBtn', slotNum);
    actBtn.disabled = false;
  }
}

export function openSaveCodeModal(mode = 'export') {
  renderSaveCodeModal(mode);
  openModal('savecode');
}

export function updateCloudStatusPills() {
  const st = storage.getCloudStatus();
  const textKey = st.provider === 'taptap'
    ? (st.state === 'syncing' ? 'cloud.syncing' : st.state === 'synced' ? 'cloud.synced' : st.state === 'error' ? 'cloud.error' : 'cloud.ready')
    : 'cloud.localOnly';
  const label = t(textKey);
  const pill = document.getElementById('slot-cloud-status');
  if (pill) {
    pill.textContent = label;
    pill.dataset.state = st.state;
  }
  const syncBtn = document.getElementById('btn-slot-cloud-sync');
  if (syncBtn) {
    syncBtn.classList.toggle('hidden', !st.cloudAvailable);
    syncBtn.disabled = st.state === 'syncing';
  }
  const filingEl = document.getElementById('title-filing-line');
  if (filingEl) filingEl.textContent = getFilingFooterText();
}

export function refreshComplianceI18n() {
  updateCloudStatusPills();
  if (G.activeModal === 'legal') renderLegalModal(_activeLegalTab);
  if (G.activeModal === 'savecode') renderSaveCodeModal(_saveCodeMode);
}

export function initComplianceUI() {
  if (_complianceWired) return;
  _complianceWired = true;

  storage.onCloudStatusChange(() => updateCloudStatusPills());
  updateCloudStatusPills();

  const cadpaBtn = document.getElementById('btn-cadpa-badge');
  if (cadpaBtn) cadpaBtn.addEventListener('click', () => openLegalModal('cadpa'));

  const bindLegal = (id, tab) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => openLegalModal(tab));
  };
  bindLegal('btn-footer-cadpa', 'cadpa');
  bindLegal('btn-footer-privacy', 'privacy');
  bindLegal('btn-footer-credits', 'credits');
  bindLegal('btn-settings-cadpa', 'cadpa');
  bindLegal('btn-settings-privacy', 'privacy');
  bindLegal('btn-settings-credits', 'credits');

  const consentChk = document.getElementById('consent-checkbox');
  const acceptBtn = document.getElementById('btn-consent-accept');
  const declineBtn = document.getElementById('btn-consent-decline');
  const declineMsg = document.getElementById('consent-decline-msg');
  const consentModal = document.getElementById('compliance-consent-modal');
  const consentReadBtn = document.getElementById('btn-consent-read-policy');

  if (consentChk && acceptBtn) {
    consentChk.addEventListener('change', () => {
      acceptBtn.disabled = !consentChk.checked;
      if (consentChk.checked && declineMsg) declineMsg.classList.add('hidden');
    });
  }
  if (acceptBtn && consentModal) {
    acceptBtn.addEventListener('click', () => {
      if (consentChk && !consentChk.checked) return;
      setComplianceConsent(true);
      consentModal.classList.add('hidden');
    });
  }
  if (declineBtn && declineMsg) {
    declineBtn.addEventListener('click', () => {
      declineMsg.classList.remove('hidden');
    });
  }
  if (consentReadBtn) {
    consentReadBtn.addEventListener('click', () => {
      const box = document.getElementById('consent-policy-preview');
      if (box) box.classList.toggle('hidden');
    });
  }

  const btnSlotExport = document.getElementById('btn-slot-export');
  const btnSlotImport = document.getElementById('btn-slot-import');
  const btnSlotCloud = document.getElementById('btn-slot-cloud-sync');
  const btnSettingsBackup = document.getElementById('btn-settings-backup');
  if (btnSlotExport) btnSlotExport.addEventListener('click', () => openSaveCodeModal('export'));
  if (btnSlotImport) btnSlotImport.addEventListener('click', () => openSaveCodeModal('import'));
  if (btnSettingsBackup) btnSettingsBackup.addEventListener('click', () => openSaveCodeModal('export'));
  if (btnSlotCloud) {
    btnSlotCloud.addEventListener('click', async () => {
      await syncCloudSaveSlots();
      updateCloudStatusPills();
    });
  }

  const actBtn = document.getElementById('btn-savecode-action');
  const taEl = document.getElementById('savecode-textarea');
  const statusEl = document.getElementById('savecode-status');
  if (actBtn && taEl) {
    actBtn.addEventListener('click', async () => {
      if (_saveCodeMode === 'export') {
        const val = taEl.value;
        if (!val) return;
        let copied = false;
        try {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(val);
            copied = true;
          }
        } catch {}
        if (!copied) {
          taEl.focus();
          taEl.select();
          try { copied = document.execCommand('copy'); } catch {}
        }
        if (statusEl) {
          statusEl.textContent = copied ? t('backup.copiedOk') : t('backup.copyManual');
          statusEl.className = `savecode-status ${copied ? 'ok' : ''}`;
        }
      } else {
        const existing = readSaveSlot(G.activeSaveSlot);
        if (existing && !window.confirm(t('backup.confirmImportOverwrite', G.activeSaveSlot + 1))) {
          return;
        }
        const res = importSaveCode(taEl.value, G.activeSaveSlot);
        if (res.ok) {
          if (statusEl) {
            statusEl.textContent = t('backup.importOk', res.slot + 1);
            statusEl.className = 'savecode-status ok';
          }
          taEl.value = '';
          uiHooks.refreshTitleSaveUI();
        } else if (statusEl) {
          statusEl.textContent = t('backup.importErr');
          statusEl.className = 'savecode-status err';
        }
      }
    });
  }

  const btnCloseLegal = document.getElementById('btn-close-legal');
  if (btnCloseLegal) btnCloseLegal.addEventListener('click', () => closeModal('legal'));
  const btnCloseSaveCode = document.getElementById('btn-close-savecode');
  if (btnCloseSaveCode) btnCloseSaveCode.addEventListener('click', () => closeModal('savecode'));
}
