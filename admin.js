/**
 * WEBSITE CONTENT MANAGEMENT SYSTEM (admin.js)
 * Menyediakan dashboard pengelolaan konten (CMS) dengan autentikasi aman:
 * - Tidak menyimpan kata sandi di kode sumber JavaScript publik.
 * - Mendukung autentikasi Server-Side (bila dijalankan dengan server.js)
 *   atau Web Crypto API SHA-256 Passkey Setup pada peramban lokal.
 */

(function () {
  const AUTH_HASH_KEY = 'portfolio_admin_sha256_v2026';
  const AUTH_SALT_KEY = 'portfolio_admin_salt_v2026';
  const SESSION_KEY = 'portfolio_admin_session_v2026';

  let currentAdminTab = 'profile';
  let pendingTargetTab = 'profile';
  let sessionToken = sessionStorage.getItem(SESSION_KEY) || null;

  let editingProjectId = null;
  let editingCertId = null;
  let editingInterestId = null;
  let editingExpId = null;
  let editingHardSkillId = null;
  let editingSoftSkillId = null;

  async function hashWithSalt(password, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${password}`);
    if (window.crypto && window.crypto.subtle) {
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    let hash = 0;
    const str = `${salt}:${password}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'fb_' + Math.abs(hash).toString(16);
  }

  function generateSalt() {
    const arr = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
      return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function isAuthenticated() {
    return Boolean(sessionToken);
  }

  function requestOpenAdmin(tab = 'profile') {
    pendingTargetTab = tab || 'profile';
    if (isAuthenticated()) {
      currentAdminTab = pendingTargetTab;
      renderAdminPanel();
      window.openModal('adminModal');
    } else {
      prepareAuthModal();
      window.openModal('authModal');
    }
  }

  window.openAdminPanel = requestOpenAdmin;

  function prepareAuthModal() {
    const existingHash = localStorage.getItem(AUTH_HASH_KEY);
    const titleEl = document.getElementById('authModalTitle');
    const descEl = document.getElementById('authModalDesc');
    const confirmGroup = document.getElementById('authConfirmGroup');
    const submitBtn = document.getElementById('authSubmitBtn');
    const errEl = document.getElementById('authErrorMsg');
    const form = document.getElementById('authForm');

    if (form) form.reset();
    if (errEl) errEl.textContent = '';

    if (PortfolioStore.backendAvailable) {
      if (titleEl) titleEl.textContent = 'Login Pengelola (Server Auth)';
      if (descEl) descEl.textContent = 'Masukkan kata sandi pengelola server untuk mengakses dashboard manajemen konten.';
      if (confirmGroup) confirmGroup.classList.add('hidden');
      if (submitBtn) submitBtn.textContent = 'Masuk ke Panel Kelola';
    } else if (!existingHash) {
      if (titleEl) titleEl.textContent = 'Buat Passkey Pengelola Baru';
      if (descEl) descEl.textContent = 'Untuk keamanan, buat kata sandi pengelola Anda sendiri. Kata sandi dienkripsi dengan SHA-256 dan tidak disimpan dalam kode sumber publik.';
      if (confirmGroup) confirmGroup.classList.remove('hidden');
      if (submitBtn) submitBtn.textContent = 'Simpan Passkey & Buka Panel';
    } else {
      if (titleEl) titleEl.textContent = 'Autentikasi Pengelola';
      if (descEl) descEl.textContent = 'Masukkan kata sandi pengelola yang telah Anda buat pada perangkat ini.';
      if (confirmGroup) confirmGroup.classList.add('hidden');
      if (submitBtn) submitBtn.textContent = 'Buka Panel Kelola';
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const passInput = document.getElementById('adminPasswordInput');
    const confirmInput = document.getElementById('adminPasswordConfirm');
    const errEl = document.getElementById('authErrorMsg');
    const password = (passInput?.value || '').trim();

    if (errEl) errEl.textContent = '';
    if (password.length < 4) {
      if (errEl) errEl.textContent = 'Kata sandi minimal terdiri dari 4 karakter.';
      return;
    }

    if (PortfolioStore.backendAvailable) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (!res.ok || !data.token) {
          if (errEl) errEl.textContent = data.error || 'Kata sandi pengelola tidak sesuai.';
          return;
        }
        sessionToken = data.token;
        sessionStorage.setItem(SESSION_KEY, sessionToken);
        window.closeModal('authModal');
        currentAdminTab = pendingTargetTab;
        renderAdminPanel();
        window.openModal('adminModal');
        window.showToast('Autentikasi server berhasil.');
        return;
      } catch (err) {
        if (errEl) errEl.textContent = 'Gagal menghubungi server autentikasi.';
        return;
      }
    }

    const existingHash = localStorage.getItem(AUTH_HASH_KEY);
    const existingSalt = localStorage.getItem(AUTH_SALT_KEY);

    if (!existingHash || !existingSalt) {
      const confirmVal = (confirmInput?.value || '').trim();
      if (password !== confirmVal) {
        if (errEl) errEl.textContent = 'Konfirmasi kata sandi tidak cocok.';
        return;
      }
      const newSalt = generateSalt();
      const newHash = await hashWithSalt(password, newSalt);
      localStorage.setItem(AUTH_SALT_KEY, newSalt);
      localStorage.setItem(AUTH_HASH_KEY, newHash);
      sessionToken = 'local_' + Date.now();
      sessionStorage.setItem(SESSION_KEY, sessionToken);
      window.closeModal('authModal');
      currentAdminTab = pendingTargetTab;
      renderAdminPanel();
      window.openModal('adminModal');
      window.showToast('Passkey berhasil dibuat & panel dibuka.');
    } else {
      const candidateHash = await hashWithSalt(password, existingSalt);
      if (candidateHash !== existingHash) {
        if (errEl) errEl.textContent = 'Kata sandi tidak sesuai. Silakan coba lagi.';
        return;
      }
      sessionToken = 'local_' + Date.now();
      sessionStorage.setItem(SESSION_KEY, sessionToken);
      window.closeModal('authModal');
      currentAdminTab = pendingTargetTab;
      renderAdminPanel();
      window.openModal('adminModal');
      window.showToast('Panel pengelolaan dibuka.');
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ================= RENDER ADMIN TABS =================
  function renderAdminPanel() {
    document.querySelectorAll('.admin-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.adminTab === currentAdminTab);
    });

    const container = document.getElementById('adminContentArea');
    if (!container) return;
    const data = PortfolioStore.getData();

    switch (currentAdminTab) {
      case 'profile':
        renderProfileTab(container, data);
        break;
      case 'about':
        renderAboutTab(container, data);
        break;
      case 'skills':
        renderSkillsTab(container, data);
        break;
      case 'projects':
        renderProjectsTab(container, data);
        break;
      case 'certificates':
        renderCertificatesTab(container, data);
        break;
      case 'interests':
        renderInterestsTab(container, data);
        break;
      case 'experience':
        renderExperienceTab(container, data);
        break;
      case 'contact':
        renderContactTab(container, data);
        break;
      default:
        renderProfileTab(container, data);
    }
  }

  // --- TAB 1: PROFILE, TITLES & PHOTO ---
  function renderProfileTab(container, data) {
    const p = data.profile || {};
    const esc = window.escapeHtml;
    const rotatingStr = Array.isArray(p.rotatingTitles) ? p.rotatingTitles.join('\n') : '';

    container.innerHTML = `
      <form id="adminProfileForm" class="admin-section-box">
        <h4>01 // Identitas Pribadi, Daftar Title &amp; Hero Section</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Nama Lengkap</label>
            <input type="text" id="admName" value="${esc(p.name)}" required>
          </div>
          <div class="form-group">
            <label>Inisial Logo (2-3 Huruf)</label>
            <input type="text" id="admInitials" value="${esc(p.initials)}" maxlength="3">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Identitas Mahasiswa / NIM</label>
            <input type="text" id="admStudentId" value="${esc(p.studentId)}">
          </div>
          <div class="form-group">
            <label>Jurusan / Program Studi</label>
            <input type="text" id="admMajor" value="${esc(p.major)}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Nama Universitas / Institusi</label>
            <input type="text" id="admUniversity" value="${esc(p.university)}">
          </div>
          <div class="form-group">
            <label>Lokasi / Domisili</label>
            <input type="text" id="admLocation" value="${esc(p.location)}">
          </div>
        </div>
        <div class="form-group">
          <label>Title / Headline Profesi Utama</label>
          <input type="text" id="admRole" value="${esc(p.role)}">
        </div>
        <div class="form-group">
          <label>Daftar Title Animasi Bergantian / Rotating Titles (Pisahkan dengan baris baru / Enter)</label>
          <textarea id="admRotatingTitles" rows="4" placeholder="Mahasiswa Teknik Informatika&#10;Junior Web Developer&#10;Pengembang Aplikasi BengkelPro POS">${esc(rotatingStr)}</textarea>
        </div>
        <div class="form-group">
          <label>Kutipan Tagline Singkat</label>
          <input type="text" id="admTagline" value="${esc(p.tagline || '')}">
        </div>
        <div class="form-group">
          <label>Bidang Teknologi yang Sedang Dipelajari</label>
          <input type="text" id="admLearningFocus" value="${esc(p.learningFocus)}">
        </div>
        <div class="form-group">
          <label>Label Status Ketersediaan (Badge Atas)</label>
          <input type="text" id="admStatusBadge" value="${esc(p.statusBadge)}">
        </div>
        <div class="form-group">
          <label>Perkenalan Singkat (Hero Bio)</label>
          <textarea id="admShortBio" rows="3">${esc(p.shortBio)}</textarea>
        </div>

        <hr style="border:none; border-top:1px solid var(--border-subtle); margin: 20px 0;">
        <h4>Foto Profil (Otomatis Diberi Efek Animasi Gerak &amp; 3D Tilt)</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Upload Foto Profil dari Perangkat</label>
            <input type="file" id="admPhotoFile" accept="image/*">
          </div>
          <div class="form-group">
            <label>Atau Masukkan URL Foto / Path Gambar</label>
            <input type="text" id="admPhotoUrl" value="${esc(p.photoUrl)}" placeholder="Kosongkan untuk menampilkan avatar inisial">
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Simpan Identitas &amp; Daftar Title</button>
          <button type="button" id="admRemovePhotoBtn" class="btn btn-ghost">Hapus Foto (Gunakan Inisial)</button>
        </div>
      </form>
    `;

    document.getElementById('admPhotoFile')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const dataUrl = await readFileAsDataUrl(file);
        document.getElementById('admPhotoUrl').value = dataUrl;
        window.showToast('Foto siap disimpan. Klik "Simpan Identitas & Daftar Title".');
      }
    });

    document.getElementById('admRemovePhotoBtn')?.addEventListener('click', () => {
      document.getElementById('admPhotoUrl').value = '';
      window.showToast('Foto dikosongkan. Klik Simpan untuk menerapkan.');
    });

    document.getElementById('adminProfileForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = PortfolioStore.getData();
      const rotList = document.getElementById('admRotatingTitles').value
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      d.profile = {
        ...d.profile,
        name: document.getElementById('admName').value.trim(),
        initials: document.getElementById('admInitials').value.trim().toUpperCase(),
        studentId: document.getElementById('admStudentId').value.trim(),
        major: document.getElementById('admMajor').value.trim(),
        university: document.getElementById('admUniversity').value.trim(),
        location: document.getElementById('admLocation').value.trim(),
        role: document.getElementById('admRole').value.trim(),
        rotatingTitles: rotList.length > 0 ? rotList : ['Mahasiswa Teknik Informatika'],
        tagline: document.getElementById('admTagline').value.trim(),
        learningFocus: document.getElementById('admLearningFocus').value.trim(),
        statusBadge: document.getElementById('admStatusBadge').value.trim(),
        shortBio: document.getElementById('admShortBio').value.trim(),
        photoUrl: document.getElementById('admPhotoUrl').value.trim()
      };
      await PortfolioStore.saveData(d, sessionToken);
      window.showToast('Identitas, Daftar Title & Foto Profil berhasil diperbarui.');
    });
  }

  // --- TAB 2: ABOUT ME ---
  function renderAboutTab(container, data) {
    const a = data.about || {};
    const esc = window.escapeHtml;
    container.innerHTML = `
      <form id="adminAboutForm" class="admin-section-box">
        <h4>02 // Pengelolaan Bagian Tentang Saya (About Me)</h4>
        <div class="form-group">
          <label>Kalimat Pembuka Utama (Lead)</label>
          <textarea id="admAboutLead" rows="2">${esc(a.lead)}</textarea>
        </div>
        <div class="form-group">
          <label>Deskripsi Diri Lengkap</label>
          <textarea id="admAboutDesc" rows="3">${esc(a.description)}</textarea>
        </div>
        <div class="form-group">
          <label>Latar Belakang Pendidikan</label>
          <textarea id="admAboutEdu" rows="2">${esc(a.educationBackground)}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Tujuan Karier</label>
            <textarea id="admCareerGoal" rows="3">${esc(a.careerGoal)}</textarea>
          </div>
          <div class="form-group">
            <label>Pengalaman Belajar</label>
            <textarea id="admLearningExp" rows="3">${esc(a.learningExperience)}</textarea>
          </div>
        </div>
        <div class="form-group">
          <label>Visi dalam Bidang Teknologi</label>
          <textarea id="admVision" rows="2">${esc(a.vision)}</textarea>
        </div>
        <div class="form-group">
          <label>Misi Pengembangan (Pisahkan setiap poin dengan baris baru / Enter)</label>
          <textarea id="admMissions" rows="4">${esc((a.missions || []).join('\n'))}</textarea>
        </div>
        <div class="form-group">
          <label>Prinsip &amp; Nilai Profesional</label>
          <textarea id="admValuesPrinciple" rows="2">${esc(a.valuesPrinciple)}</textarea>
        </div>
        <div class="form-group">
          <label>Keunggulan Utama (Pisahkan setiap keunggulan dengan baris baru / Enter)</label>
          <textarea id="admStrengths" rows="4">${esc((a.strengths || []).join('\n'))}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">Simpan Perubahan About Me</button>
      </form>
    `;

    document.getElementById('adminAboutForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = PortfolioStore.getData();
      d.about = {
        lead: document.getElementById('admAboutLead').value.trim(),
        description: document.getElementById('admAboutDesc').value.trim(),
        educationBackground: document.getElementById('admAboutEdu').value.trim(),
        careerGoal: document.getElementById('admCareerGoal').value.trim(),
        learningExperience: document.getElementById('admLearningExp').value.trim(),
        vision: document.getElementById('admVision').value.trim(),
        missions: document.getElementById('admMissions').value.split('\n').map(s => s.trim()).filter(Boolean),
        valuesPrinciple: document.getElementById('admValuesPrinciple').value.trim(),
        strengths: document.getElementById('admStrengths').value.split('\n').map(s => s.trim()).filter(Boolean)
      };
      await PortfolioStore.saveData(d, sessionToken);
      window.showToast('Bagian Tentang Saya berhasil diperbarui.');
    });
  }

  // --- TAB 3: SKILLS & TECHNOLOGY ---
  function renderSkillsTab(container, data) {
    const hardSkills = data.skills?.hardSkills || [];
    const softSkills = data.skills?.softSkills || [];
    const esc = window.escapeHtml;

    const editingHs = hardSkills.find(h => h.id === editingHardSkillId) || {};
    const editingSs = softSkills.find(s => s.id === editingSoftSkillId) || {};

    container.innerHTML = `
      <div class="admin-section-box">
        <h4>${editingHardSkillId ? 'Edit Hard Skill' : '+ Tambah Hard Skill Baru'}</h4>
        <form id="admHardSkillForm">
          <div class="form-row">
            <div class="form-group">
              <label>Nama Keahlian / Teknologi</label>
              <input type="text" id="hsName" value="${esc(editingHs.name || '')}" placeholder="Contoh: HTML5, Python, SQL" required>
            </div>
            <div class="form-group">
              <label>Kategori</label>
              <input type="text" id="hsCategory" value="${esc(editingHs.category || 'PROGRAMMING')}" placeholder="Contoh: FRONTEND, DATA">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Indikator Penguasaan (10 - 100%)</label>
              <input type="number" id="hsLevel" min="10" max="100" value="${esc(editingHs.level || 80)}">
            </div>
            <div class="form-group">
              <label>Deskripsi Singkat</label>
              <input type="text" id="hsDesc" value="${esc(editingHs.description || '')}" placeholder="Penjelasan singkat kemampuan">
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-sm btn-primary">${editingHardSkillId ? 'Simpan Perubahan' : '+ Tambah Hard Skill'}</button>
            ${editingHardSkillId ? '<button type="button" id="cancelEditHs" class="btn btn-sm btn-ghost">Batal</button>' : ''}
          </div>
        </form>
        <div style="margin-top: 18px;">
          ${hardSkills.map(hs => `
            <div class="admin-list-item">
              <div>
                <strong>${esc(hs.name)}</strong> <small class="badge-tag">${esc(hs.category)} • ${esc(hs.level)}%</small>
                <div style="font-size:12px; color:var(--text-muted);">${esc(hs.description || '')}</div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-sm btn-secondary" data-edit-hs="${esc(hs.id)}">Edit</button>
                <button type="button" class="btn btn-sm btn-danger" data-del-hs="${esc(hs.id)}">Hapus</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="admin-section-box">
        <h4>${editingSoftSkillId ? 'Edit Soft Skill' : '+ Tambah Soft Skill Baru'}</h4>
        <form id="admSoftSkillForm">
          <div class="form-row">
            <div class="form-group">
              <label>Nama Soft Skill</label>
              <input type="text" id="ssName" value="${esc(editingSs.name || '')}" placeholder="Contoh: Problem Solving" required>
            </div>
            <div class="form-group">
              <label>Kode / Nomor Urut (2-3 Karakter)</label>
              <input type="text" id="ssIcon" value="${esc(editingSs.icon || '01')}" maxlength="4">
            </div>
          </div>
          <div class="form-group">
            <label>Deskripsi</label>
            <input type="text" id="ssDesc" value="${esc(editingSs.description || '')}" required>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-sm btn-primary">${editingSoftSkillId ? 'Simpan Perubahan' : '+ Tambah Soft Skill'}</button>
            ${editingSoftSkillId ? '<button type="button" id="cancelEditSs" class="btn btn-sm btn-ghost">Batal</button>' : ''}
          </div>
        </form>
        <div style="margin-top: 18px;">
          ${softSkills.map(ss => `
            <div class="admin-list-item">
              <div>
                <strong>[${esc(ss.icon || '01')}] ${esc(ss.name)}</strong>
                <div style="font-size:12px; color:var(--text-muted);">${esc(ss.description || '')}</div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-sm btn-secondary" data-edit-ss="${esc(ss.id)}">Edit</button>
                <button type="button" class="btn btn-sm btn-danger" data-del-ss="${esc(ss.id)}">Hapus</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('cancelEditHs')?.addEventListener('click', () => {
      editingHardSkillId = null;
      renderAdminPanel();
    });
    document.getElementById('cancelEditSs')?.addEventListener('click', () => {
      editingSoftSkillId = null;
      renderAdminPanel();
    });

    document.getElementById('admHardSkillForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = PortfolioStore.getData();
      const item = {
        id: editingHardSkillId || ('hs-' + Date.now()),
        name: document.getElementById('hsName').value.trim(),
        category: document.getElementById('hsCategory').value.trim() || 'TECH',
        level: Number(document.getElementById('hsLevel').value) || 80,
        description: document.getElementById('hsDesc').value.trim()
      };
      if (editingHardSkillId) {
        const idx = d.skills.hardSkills.findIndex(x => x.id === editingHardSkillId);
        if (idx > -1) d.skills.hardSkills[idx] = item;
        editingHardSkillId = null;
      } else {
        d.skills.hardSkills.push(item);
      }
      await PortfolioStore.saveData(d, sessionToken);
      renderAdminPanel();
      window.showToast('Daftar Hard Skills berhasil diperbarui.');
    });

    document.getElementById('admSoftSkillForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = PortfolioStore.getData();
      const item = {
        id: editingSoftSkillId || ('ss-' + Date.now()),
        name: document.getElementById('ssName').value.trim(),
        icon: document.getElementById('ssIcon').value.trim() || '01',
        description: document.getElementById('ssDesc').value.trim()
      };
      if (editingSoftSkillId) {
        const idx = d.skills.softSkills.findIndex(x => x.id === editingSoftSkillId);
        if (idx > -1) d.skills.softSkills[idx] = item;
        editingSoftSkillId = null;
      } else {
        d.skills.softSkills.push(item);
      }
      await PortfolioStore.saveData(d, sessionToken);
      renderAdminPanel();
      window.showToast('Daftar Soft Skills berhasil diperbarui.');
    });

    container.querySelectorAll('[data-edit-hs]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingHardSkillId = btn.getAttribute('data-edit-hs');
        renderAdminPanel();
      });
    });
    container.querySelectorAll('[data-del-hs]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-hs');
        const d = PortfolioStore.getData();
        d.skills.hardSkills = d.skills.hardSkills.filter(x => x.id !== id);
        await PortfolioStore.saveData(d, sessionToken);
        renderAdminPanel();
        window.showToast('Hard Skill dihapus.');
      });
    });
    container.querySelectorAll('[data-edit-ss]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingSoftSkillId = btn.getAttribute('data-edit-ss');
        renderAdminPanel();
      });
    });
    container.querySelectorAll('[data-del-ss]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-ss');
        const d = PortfolioStore.getData();
        d.skills.softSkills = d.skills.softSkills.filter(x => x.id !== id);
        await PortfolioStore.saveData(d, sessionToken);
        renderAdminPanel();
        window.showToast('Soft Skill dihapus.');
      });
    });
  }

  // --- TAB 4: PROJECTS & GITHUB INTEGRATION ---
  function renderProjectsTab(container, data) {
    const projects = data.projects || [];
    const editingProj = projects.find(p => p.id === editingProjectId) || {};
    const esc = window.escapeHtml;
    const ghUser = data.contact?.githubUsername || '';

    const categories = [
      'Web Development',
      'Sistem Informasi',
      'Mobile Application',
      'Data Science',
      'Artificial Intelligence',
      'UI/UX Design'
    ];

    container.innerHTML = `
      <div class="admin-section-box">
        <h4>04.1 // Integrasi Repository GitHub</h4>
        <p class="bento-text">
          Hubungkan username GitHub Anda untuk menarik daftar repository publik secara otomatis dan menambahkannya ke portofolio proyek.
        </p>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:0;">
            <input type="text" id="admGithubUsername" value="${esc(ghUser)}" placeholder="Masukkan username GitHub (contoh: octocat)">
          </div>
          <div class="form-actions">
            <button type="button" id="fetchGithubReposBtn" class="btn btn-secondary">Ambil Repository dari GitHub</button>
          </div>
        </div>
        <div id="githubReposResult" style="margin-top: 14px;"></div>
      </div>

      <form id="admProjectForm" class="admin-section-box">
        <h4>${editingProjectId ? 'Edit Proyek: ' + esc(editingProj.title) : '04.2 // + Tambah Proyek Baru'}</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Nama Proyek <span class="req">*</span></label>
            <input type="text" id="projTitle" value="${esc(editingProj.title || '')}" placeholder="Contoh: BengkelPro POS" required>
          </div>
          <div class="form-group">
            <label>Sub-Title Proyek</label>
            <input type="text" id="projSubtitle" value="${esc(editingProj.subtitle || '')}" placeholder="Contoh: Sistem Kasir & Manajemen Bengkel">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Kategori Utama</label>
            <select id="projCategory">
              ${categories.map(c => `<option value="${c}" ${editingProj.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Kategori Kedua &amp; Tahun Pengerjaan</label>
            <div style="display:grid; grid-template-columns:1fr 110px; gap:8px;">
              <input type="text" id="projSecCategory" value="${esc(editingProj.secondaryCategory || '')}" placeholder="Web Development">
              <input type="text" id="projDate" value="${esc(editingProj.date || '2026')}" placeholder="2026">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Deskripsi Proyek <span class="req">*</span></label>
          <textarea id="projDesc" rows="2" required>${esc(editingProj.description || '')}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Tujuan Pembuatan Proyek</label>
            <textarea id="projPurpose" rows="2">${esc(editingProj.purpose || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Peran Pengerjaan</label>
            <textarea id="projRole" rows="2">${esc(editingProj.role || 'Pengembang Proyek')}</textarea>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Teknologi yang Digunakan (Pisahkan dengan koma)</label>
            <input type="text" id="projTechs" value="${esc((editingProj.technologies || []).join(', '))}" placeholder="HTML5, CSS3, JavaScript, Local Storage">
          </div>
          <div class="form-group">
            <label>URL Source Code (Repository GitHub)</label>
            <input type="text" id="projRepoUrl" value="${esc(editingProj.repoUrl || 'https://github.com/username')}" placeholder="https://github.com/username/repo">
          </div>
        </div>

        <div class="form-group">
          <label>Fitur Utama Proyek (Pisahkan setiap fitur dengan baris baru / Enter)</label>
          <textarea id="projFeatures" rows="3" placeholder="Pencatatan transaksi kasir&#10;Manajemen stok sparepart">${esc((editingProj.features || []).join('\n'))}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Upload Gambar / Screenshot Proyek (Otomatis Diberi Efek Animasi)</label>
            <input type="file" id="projImageFile" accept="image/*">
          </div>
          <div class="form-group">
            <label>Atau Path / URL Gambar</label>
            <input type="text" id="projImageUrl" value="${esc(editingProj.image || 'assets/img/portfolio-web.svg')}">
          </div>
        </div>

        <div class="form-group" style="flex-direction: row; align-items: center; gap: 10px;">
          <input type="checkbox" id="projFeatured" style="width: auto;" ${editingProj.featured ? 'checked' : ''}>
          <label for="projFeatured" style="margin:0;">Jadikan sebagai Proyek Unggulan (Featured Project)</label>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editingProjectId ? 'Simpan Perubahan Proyek' : '+ Tambahkan Proyek'}</button>
          ${editingProjectId ? '<button type="button" id="cancelEditProjBtn" class="btn btn-ghost">Batal Edit</button>' : ''}
        </div>
      </form>

      <div class="admin-section-box">
        <h4>Daftar Proyek Saat Ini (${projects.length})</h4>
        ${projects.map(p => `
          <div class="admin-list-item">
            <div>
              <strong>${esc(p.title)}</strong> ${p.featured ? '<span class="badge-tag">Unggulan</span>' : ''}
              <div style="font-size:12px; color:var(--text-muted);">${esc(p.subtitle || p.category)} • ${esc(p.date)}</div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-sm btn-secondary" data-edit-proj="${esc(p.id)}">Edit</button>
              <button type="button" class="btn btn-sm btn-danger" data-del-proj="${esc(p.id)}">Hapus</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('projImageFile')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const dataUrl = await readFileAsDataUrl(file);
        document.getElementById('projImageUrl').value = dataUrl;
        window.showToast('Screenshot proyek siap disimpan.');
      }
    });

    document.getElementById('cancelEditProjBtn')?.addEventListener('click', () => {
      editingProjectId = null;
      renderAdminPanel();
    });

    document.getElementById('admProjectForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = PortfolioStore.getData();
      const newProj = {
        id: editingProjectId || ('proj-' + Date.now()),
        title: document.getElementById('projTitle').value.trim(),
        subtitle: document.getElementById('projSubtitle').value.trim(),
        date: document.getElementById('projDate').value.trim() || '2026',
        category: document.getElementById('projCategory').value,
        secondaryCategory: document.getElementById('projSecCategory').value.trim(),
        description: document.getElementById('projDesc').value.trim(),
        purpose: document.getElementById('projPurpose').value.trim(),
        role: document.getElementById('projRole').value.trim(),
        technologies: document.getElementById('projTechs').value.split(',').map(s => s.trim()).filter(Boolean),
        repoUrl: document.getElementById('projRepoUrl').value.trim(),
        demoUrl: '#projects',
        features: document.getElementById('projFeatures').value.split('\n').map(s => s.trim()).filter(Boolean),
        image: document.getElementById('projImageUrl').value.trim() || 'assets/img/portfolio-web.svg',
        featured: document.getElementById('projFeatured').checked
      };

      if (editingProjectId) {
        const idx = d.projects.findIndex(x => x.id === editingProjectId);
        if (idx > -1) d.projects[idx] = newProj;
        editingProjectId = null;
      } else {
        d.projects.push(newProj);
      }

      await PortfolioStore.saveData(d, sessionToken);
      renderAdminPanel();
      window.showToast('Data proyek berhasil disimpan.');
    });

    container.querySelectorAll('[data-edit-proj]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingProjectId = btn.getAttribute('data-edit-proj');
        renderAdminPanel();
      });
    });

    container.querySelectorAll('[data-del-proj]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-proj');
        const d = PortfolioStore.getData();
        d.projects = d.projects.filter(x => x.id !== id);
        await PortfolioStore.saveData(d, sessionToken);
        renderAdminPanel();
        window.showToast('Proyek dihapus.');
      });
    });

    document.getElementById('fetchGithubReposBtn')?.addEventListener('click', async () => {
      const username = document.getElementById('admGithubUsername').value.trim();
      const resBox = document.getElementById('githubReposResult');
      if (!username) {
        window.showToast('Masukkan username GitHub terlebih dahulu.');
        return;
      }
      resBox.innerHTML = `<p class="bento-text">Mengambil daftar repository publik dari GitHub @${esc(username)}...</p>`;
      try {
        const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=8`);
        if (!response.ok) throw new Error('User tidak ditemukan atau batas API tercapai.');
        const repos = await response.json();

        const d = PortfolioStore.getData();
        d.contact.githubUsername = username;
        d.contact.github = `https://github.com/${username}`;
        await PortfolioStore.saveData(d, sessionToken);

        if (!Array.isArray(repos) || repos.length === 0) {
          resBox.innerHTML = `<p class="bento-text">Tidak ditemukan repository publik pada akun @${esc(username)}.</p>`;
          return;
        }

        resBox.innerHTML = repos.map(r => `
          <div class="admin-list-item">
            <div>
              <strong>${esc(r.name)}</strong> <span class="badge-tag">${esc(r.language || 'Repo')}</span>
              <div style="font-size:12px; color:var(--text-muted);">${esc(r.description || 'Repository GitHub')}</div>
            </div>
            <button type="button" class="btn btn-sm btn-primary" data-import-gh='${esc(JSON.stringify({
              name: r.name,
              desc: r.description || 'Proyek pengembangan perangkat lunak pada repository GitHub.',
              lang: r.language || 'Web Development',
              url: r.html_url,
              year: new Date(r.updated_at || Date.now()).getFullYear()
            }))}'>+ Impor ke Proyek</button>
          </div>
        `).join('');

        resBox.querySelectorAll('[data-import-gh]').forEach(importBtn => {
          importBtn.addEventListener('click', async () => {
            const info = JSON.parse(importBtn.getAttribute('data-import-gh'));
            const cur = PortfolioStore.getData();
            cur.projects.push({
              id: 'proj-gh-' + Date.now(),
              title: info.name,
              subtitle: `GitHub Repository — ${info.lang}`,
              category: 'Web Development',
              secondaryCategory: info.lang,
              featured: false,
              date: String(info.year),
              image: 'assets/img/portfolio-web.svg',
              description: info.desc,
              purpose: 'Dokumentasi source code dan pengembangan proyek pada GitHub Repository.',
              technologies: [info.lang, 'GitHub', 'Source Code'],
              features: ['Source code terstruktur pada GitHub Repository', 'Dokumentasi & version control Git'],
              demoUrl: info.url,
              repoUrl: info.url,
              role: 'Author / Developer'
            });
            await PortfolioStore.saveData(cur, sessionToken);
            renderAdminPanel();
            window.showToast(`Repository "${info.name}" berhasil ditambahkan ke Proyek.`);
          });
        });
      } catch (err) {
        resBox.innerHTML = `<p class="error-msg">Gagal memuat dari GitHub API (${esc(err.message)}). Pastikan terkoneksi ke internet dan username benar.</p>`;
      }
    });
  }

  // --- TAB 5: CERTIFICATES / SERTIFIKAT ---
  function renderCertificatesTab(container, data) {
    const certs = data.certificates || [];
    const editingCert = certs.find(c => c.id === editingCertId) || {};
    const esc = window.escapeHtml;

    container.innerHTML = `
      <form id="admCertForm" class="admin-section-box">
        <h4>${editingCertId ? 'Edit Sertifikat' : '05 // + Tambah Sertifikat Baru'}</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Nama Pelatihan / Sertifikasi <span class="req">*</span></label>
            <input type="text" id="certTitle" value="${esc(editingCert.title || '')}" placeholder="Contoh: Pelatihan Dasar Pemrograman Web" required>
          </div>
          <div class="form-group">
            <label>Nama Penyelenggara <span class="req">*</span></label>
            <input type="text" id="certIssuer" value="${esc(editingCert.issuer || '')}" placeholder="Contoh: Lembaga Pelatihan / Kampus" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Tanggal / Tahun Diperoleh</label>
            <input type="text" id="certDate" value="${esc(editingCert.date || '2026')}" placeholder="Contoh: Mei 2026">
          </div>
          <div class="form-group">
            <label>Nomor Sertifikat (Jika Tersedia)</label>
            <input type="text" id="certCredId" value="${esc(editingCert.credentialId || '')}" placeholder="Contoh: NO-CERT-2026-01">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Upload Gambar Sertifikat (Otomatis Diberi Efek Animasi)</label>
            <input type="file" id="certImageFile" accept="image/*">
          </div>
          <div class="form-group">
            <label>Atau Path / URL Gambar Sertifikat</label>
            <input type="text" id="certImageUrl" value="${esc(editingCert.image || 'assets/img/cert-template.svg')}">
          </div>
        </div>
        <div class="form-group">
          <label>Catatan Tambahan (Opsional)</label>
          <input type="text" id="certNote" value="${esc(editingCert.note || '')}" placeholder="Keterangan kompetensi yang dipelajari">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editingCertId ? 'Simpan Perubahan Sertifikat' : '+ Tambahkan Sertifikat'}</button>
          ${editingCertId ? '<button type="button" id="cancelEditCertBtn" class="btn btn-ghost">Batal</button>' : ''}
        </div>
      </form>

      <div class="admin-section-box">
        <h4>Daftar Sertifikat (${certs.length})</h4>
        ${certs.map(c => `
          <div class="admin-list-item">
            <div>
              <strong>${esc(c.title)}</strong>
              <div style="font-size:12px; color:var(--text-muted);">${esc(c.issuer)} • ${esc(c.date)} • No: ${esc(c.credentialId || '-')}</div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-sm btn-secondary" data-edit-cert="${esc(c.id)}">Edit</button>
              <button type="button" class="btn btn-sm btn-danger" data-del-cert="${esc(c.id)}">Hapus</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('certImageFile')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const dataUrl = await readFileAsDataUrl(file);
        document.getElementById('certImageUrl').value = dataUrl;
        window.showToast('Gambar sertifikat siap disimpan.');
      }
    });

    document.getElementById('cancelEditCertBtn')?.addEventListener('click', () => {
      editingCertId = null;
      renderAdminPanel();
    });

    document.getElementById('admCertForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = PortfolioStore.getData();
      const imgVal = document.getElementById('certImageUrl').value.trim() || 'assets/img/cert-template.svg';
      const newCert = {
        id: editingCertId || ('cert-' + Date.now()),
        title: document.getElementById('certTitle').value.trim(),
        issuer: document.getElementById('certIssuer').value.trim(),
        date: document.getElementById('certDate').value.trim(),
        credentialId: document.getElementById('certCredId').value.trim(),
        image: imgVal,
        fileUrl: imgVal,
        note: document.getElementById('certNote').value.trim()
      };

      if (editingCertId) {
        const idx = d.certificates.findIndex(x => x.id === editingCertId);
        if (idx > -1) d.certificates[idx] = newCert;
        editingCertId = null;
      } else {
        d.certificates.push(newCert);
      }

      await PortfolioStore.saveData(d, sessionToken);
      renderAdminPanel();
      window.showToast('Data sertifikat berhasil disimpan.');
    });

    container.querySelectorAll('[data-edit-cert]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingCertId = btn.getAttribute('data-edit-cert');
        renderAdminPanel();
      });
    });

    container.querySelectorAll('[data-del-cert]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-cert');
        const d = PortfolioStore.getData();
        d.certificates = d.certificates.filter(x => x.id !== id);
        await PortfolioStore.saveData(d, sessionToken);
        renderAdminPanel();
        window.showToast('Sertifikat dihapus.');
      });
    });
  }

  // --- TAB 6: INTERESTS / BIDANG MINAT ---
  function renderInterestsTab(container, data) {
    const interests = data.interests || [];
    const editingInt = interests.find(i => i.id === editingInterestId) || {};
    const esc = window.escapeHtml;

    container.innerHTML = `
      <form id="admInterestForm" class="admin-section-box">
        <h4>${editingInterestId ? 'Edit Bidang Minat' : '06 // + Tambah Bidang Minat Teknologi'}</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Nama Bidang Teknologi <span class="req">*</span></label>
            <input type="text" id="intName" value="${esc(editingInt.name || '')}" placeholder="Contoh: Cloud Computing" required>
          </div>
          <div class="form-group">
            <label>Kode Label Singkat (3-4 Huruf)</label>
            <input type="text" id="intIcon" value="${esc(editingInt.icon || 'DEV')}" maxlength="4">
          </div>
        </div>
        <div class="form-group">
          <label>Deskripsi Minat &amp; Tujuan Pembelajaran</label>
          <textarea id="intDesc" rows="2" required>${esc(editingInt.description || '')}</textarea>
        </div>
        <div class="form-group" style="flex-direction:row; align-items:center; gap:10px;">
          <input type="checkbox" id="intActive" style="width:auto;" ${editingInt.active !== false ? 'checked' : ''}>
          <label for="intActive" style="margin:0;">Tandai sebagai Fokus Minat Utama Saya</label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editingInterestId ? 'Simpan Perubahan' : '+ Tambah Bidang Minat'}</button>
          ${editingInterestId ? '<button type="button" id="cancelEditIntBtn" class="btn btn-ghost">Batal</button>' : ''}
        </div>
      </form>

      <div class="admin-section-box">
        <h4>Daftar Bidang Minat (${interests.length})</h4>
        ${interests.map(item => `
          <div class="admin-list-item">
            <div>
              <strong>[${esc(item.icon)}] ${esc(item.name)}</strong>
              ${item.active ? '<span class="badge-tag">Fokus Dipilih</span>' : ''}
              <div style="font-size:12px; color:var(--text-muted);">${esc(item.description)}</div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-sm btn-secondary" data-edit-int="${esc(item.id)}">Edit</button>
              <button type="button" class="btn btn-sm btn-danger" data-del-int="${esc(item.id)}">Hapus</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('cancelEditIntBtn')?.addEventListener('click', () => {
      editingInterestId = null;
      renderAdminPanel();
    });

    document.getElementById('admInterestForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = PortfolioStore.getData();
      const newItem = {
        id: editingInterestId || ('int-' + Date.now()),
        name: document.getElementById('intName').value.trim(),
        icon: document.getElementById('intIcon').value.trim().toUpperCase() || 'DEV',
        description: document.getElementById('intDesc').value.trim(),
        active: document.getElementById('intActive').checked,
        category: document.getElementById('intActive').checked ? 'Fokus Utama' : 'Minat Pengembangan'
      };

      if (editingInterestId) {
        const idx = d.interests.findIndex(x => x.id === editingInterestId);
        if (idx > -1) d.interests[idx] = newItem;
        editingInterestId = null;
      } else {
        d.interests.push(newItem);
      }

      await PortfolioStore.saveData(d, sessionToken);
      renderAdminPanel();
      window.showToast('Bidang minat berhasil diperbarui.');
    });

    container.querySelectorAll('[data-edit-int]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingInterestId = btn.getAttribute('data-edit-int');
        renderAdminPanel();
      });
    });

    container.querySelectorAll('[data-del-int]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-int');
        const d = PortfolioStore.getData();
        d.interests = d.interests.filter(x => x.id !== id);
        await PortfolioStore.saveData(d, sessionToken);
        renderAdminPanel();
        window.showToast('Bidang minat dihapus.');
      });
    });
  }

  // --- TAB 7: EDUCATION & EXPERIENCE TIMELINE ---
  function renderExperienceTab(container, data) {
    const expList = data.experience || [];
    const editingExp = expList.find(e => e.id === editingExpId) || {};
    const esc = window.escapeHtml;
    const types = ['Pendidikan', 'Proyek', 'Pelatihan', 'Organisasi'];

    container.innerHTML = `
      <form id="admExpForm" class="admin-section-box">
        <h4>${editingExpId ? 'Edit Riwayat Timeline' : '07 // + Tambah Riwayat Pendidikan / Pengalaman'}</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Kategori Riwayat</label>
            <select id="expType">
              ${types.map(t => `<option value="${t}" ${editingExp.type === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Periode / Tahun</label>
            <input type="text" id="expPeriod" value="${esc(editingExp.period || '2026')}" placeholder="Contoh: 2024 — Sekarang">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Judul Pendidikan / Posisi / Kegiatan <span class="req">*</span></label>
            <input type="text" id="expTitle" value="${esc(editingExp.title || '')}" required>
          </div>
          <div class="form-group">
            <label>Nama Institusi / Organisasi / Proyek <span class="req">*</span></label>
            <input type="text" id="expOrg" value="${esc(editingExp.organization || '')}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Deskripsi Perjalanan / Tugas</label>
          <textarea id="expDesc" rows="3" required>${esc(editingExp.description || '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editingExpId ? 'Simpan Perubahan' : '+ Tambahkan ke Timeline'}</button>
          ${editingExpId ? '<button type="button" id="cancelEditExpBtn" class="btn btn-ghost">Batal</button>' : ''}
        </div>
      </form>

      <div class="admin-section-box">
        <h4>Daftar Timeline (${expList.length})</h4>
        ${expList.map(item => `
          <div class="admin-list-item">
            <div>
              <span class="badge-tag">${esc(item.type)}</span> <strong>${esc(item.title)}</strong>
              <div style="font-size:12px; color:var(--text-muted);">${esc(item.organization)} • ${esc(item.period)}</div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-sm btn-secondary" data-edit-exp="${esc(item.id)}">Edit</button>
              <button type="button" class="btn btn-sm btn-danger" data-del-exp="${esc(item.id)}">Hapus</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('cancelEditExpBtn')?.addEventListener('click', () => {
      editingExpId = null;
      renderAdminPanel();
    });

    document.getElementById('admExpForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = PortfolioStore.getData();
      const newItem = {
        id: editingExpId || ('exp-' + Date.now()),
        type: document.getElementById('expType').value,
        period: document.getElementById('expPeriod').value.trim(),
        title: document.getElementById('expTitle').value.trim(),
        organization: document.getElementById('expOrg').value.trim(),
        description: document.getElementById('expDesc').value.trim()
      };

      if (editingExpId) {
        const idx = d.experience.findIndex(x => x.id === editingExpId);
        if (idx > -1) d.experience[idx] = newItem;
        editingExpId = null;
      } else {
        d.experience.push(newItem);
      }

      await PortfolioStore.saveData(d, sessionToken);
      renderAdminPanel();
      window.showToast('Timeline berhasil diperbarui.');
    });

    container.querySelectorAll('[data-edit-exp]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingExpId = btn.getAttribute('data-edit-exp');
        renderAdminPanel();
      });
    });

    container.querySelectorAll('[data-del-exp]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-exp');
        const d = PortfolioStore.getData();
        d.experience = d.experience.filter(x => x.id !== id);
        await PortfolioStore.saveData(d, sessionToken);
        renderAdminPanel();
        window.showToast('Item timeline dihapus.');
      });
    });
  }

  // --- TAB 8: CONTACT, MESSAGES & JSON BACKUP ---
  function renderContactTab(container, data) {
    const c = data.contact || {};
    const messages = PortfolioStore.getMessages();
    const esc = window.escapeHtml;

    container.innerHTML = `
      <form id="admContactForm" class="admin-section-box">
        <h4>08.1 // Pengelolaan Informasi Kontak</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Alamat Email</label>
            <input type="email" id="cntEmail" value="${esc(c.email)}">
          </div>
          <div class="form-group">
            <label>Nomor WhatsApp</label>
            <input type="text" id="cntWhatsapp" value="${esc(c.whatsapp)}" placeholder="+62 812-xxxx-xxxx">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>URL Profil LinkedIn</label>
            <input type="text" id="cntLinkedin" value="${esc(c.linkedin)}">
          </div>
          <div class="form-group">
            <label>URL Profil GitHub</label>
            <input type="text" id="cntGithub" value="${esc(c.github)}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>URL Instagram / Media Sosial Profesional</label>
            <input type="text" id="cntInstagram" value="${esc(c.instagram)}">
          </div>
          <div class="form-group">
            <label>Username GitHub</label>
            <input type="text" id="cntGithubUser" value="${esc(c.githubUsername || '')}">
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Simpan Informasi Kontak</button>
      </form>

      <div class="admin-section-box">
        <h4>08.2 // Ekspor, Impor &amp; Cadangan Data Konten (JSON)</h4>
        <p class="bento-text">
          Data konten dipisahkan dari tampilan. Anda dapat mengunduh file <code>portfolio-data.json</code> untuk disimpan ke folder proyek atau mengimpornya kembali kapan saja.
        </p>
        <div class="form-actions">
          <button type="button" id="exportJsonBtn" class="btn btn-secondary">Download portfolio-data.json</button>
          <label class="btn btn-secondary" style="cursor:pointer;">
            Impor File JSON
            <input type="file" id="importJsonFile" accept=".json" class="hidden">
          </label>
          <button type="button" id="resetDefaultDataBtn" class="btn btn-danger">Reset ke Data Default</button>
        </div>
      </div>

      <div class="admin-section-box">
        <h4>08.3 // Pesan Masuk dari Formulir Kontak (${messages.length})</h4>
        ${messages.length === 0 ? '<p class="bento-text">Belum ada pesan yang dikirim melalui formulir kontak.</p>' : messages.map(m => `
          <div class="admin-list-item">
            <div>
              <strong>${esc(m.subject)}</strong> <span class="badge-tag">${esc(m.category)}</span>
              <div style="font-size:12px; color:var(--text-muted);">Dari: ${esc(m.name)} (${esc(m.email)})</div>
              <p style="font-size:13px; margin-top:4px;">${esc(m.message)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('admContactForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = PortfolioStore.getData();
      d.contact = {
        ...d.contact,
        email: document.getElementById('cntEmail').value.trim(),
        whatsapp: document.getElementById('cntWhatsapp').value.trim(),
        linkedin: document.getElementById('cntLinkedin').value.trim(),
        github: document.getElementById('cntGithub').value.trim(),
        instagram: document.getElementById('cntInstagram').value.trim(),
        githubUsername: document.getElementById('cntGithubUser').value.trim()
      };
      await PortfolioStore.saveData(d, sessionToken);
      window.showToast('Informasi kontak berhasil diperbarui.');
    });

    document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
      const jsonStr = JSON.stringify(PortfolioStore.getData(), null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'portfolio-data.json';
      a.click();
      URL.revokeObjectURL(url);
      window.showToast('File portfolio-data.json berhasil diunduh.');
    });

    document.getElementById('importJsonFile')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!parsed.profile || !parsed.projects) {
            throw new Error('Struktur JSON tidak sesuai format portofolio.');
          }
          await PortfolioStore.saveData(parsed, sessionToken);
          renderAdminPanel();
          window.showToast('Data JSON berhasil diimpor.');
        } catch (err) {
          window.showToast('Gagal mengimpor JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('resetDefaultDataBtn')?.addEventListener('click', async () => {
      if (confirm('Apakah Anda yakin ingin mengembalikan seluruh data ke pengaturan awal (default)?')) {
        await PortfolioStore.resetToDefault(sessionToken);
        renderAdminPanel();
        window.showToast('Data dikembalikan ke pengaturan awal.');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('openAdminBtn')?.addEventListener('click', () => requestOpenAdmin('profile'));
    document.getElementById('footerAdminBtn')?.addEventListener('click', () => requestOpenAdmin('profile'));
    document.getElementById('quickChangePhotoBtn')?.addEventListener('click', () => requestOpenAdmin('profile'));
    document.getElementById('syncGithubBtn')?.addEventListener('click', () => requestOpenAdmin('projects'));

    document.querySelectorAll('[data-open-admin]').forEach(btn => {
      btn.addEventListener('click', () => {
        requestOpenAdmin(btn.getAttribute('data-open-admin'));
      });
    });

    document.querySelectorAll('.admin-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        currentAdminTab = tabBtn.dataset.adminTab || 'profile';
        renderAdminPanel();
      });
    });

    document.getElementById('authForm')?.addEventListener('submit', handleAuthSubmit);

    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
      sessionToken = null;
      sessionStorage.removeItem(SESSION_KEY);
      window.closeModal('adminModal');
      window.showToast('Sesi pengelolaan telah dikunci.');
    });
  });
})();
