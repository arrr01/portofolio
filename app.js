/**
 * APPLICATION UI, ANIMATIONS & INTERACTION CONTROLLER (app.js)
 * Mengelola:
 * - Efek animasi gerak (3D Tilt, Parallax Glare, Floating & Breathing) pada setiap gambar
 * - Animasi Typewriter / Rotating Titles untuk peran & gelar di Hero Section
 * - Scroll-Reveal natural dengan IntersectionObserver
 * - Render dinamis Proyek, Sertifikat, Bidang Minat, Timeline, & Digital CV
 */

(function () {
  let currentProjectCategory = 'All';
  let currentProjectSearch = '';
  let showOnlyActiveInterests = false;
  let currentExpFilter = 'All';

  // Typewriter state
  let typewriterTimer = null;
  let currentTitleIndex = 0;
  let currentCharIndex = 0;
  let isDeletingText = false;

  const SUN_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  const MOON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3000);
  }

  window.showToast = showToast;
  window.escapeHtml = escapeHtml;

  // ================= 1. THEME & LIVE CLOCK =================
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(savedTheme);

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem(THEME_KEY, next);
        showToast(next === 'dark' ? 'Mode Gelap diaktifkan' : 'Mode Terang diaktifkan');
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.innerHTML = theme === 'dark' ? SUN_SVG : MOON_SVG;
    }
  }

  function initLiveClock() {
    const clockEl = document.getElementById('headerClock');
    if (!clockEl) return;
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      clockEl.textContent = `${timeStr} WIB`;
    };
    updateClock();
    setInterval(updateClock, 20000);
  }

  // ================= 2. TYPEWRITER / ROTATING TITLES =================
  function startRotatingTitles(titlesList) {
    if (typewriterTimer) clearTimeout(typewriterTimer);
    const targetEl = document.getElementById('dynamicRoleTitle');
    if (!targetEl) return;

    const titles = Array.isArray(titlesList) && titlesList.length > 0
      ? titlesList
      : ['Mahasiswa Teknik Informatika', 'Junior Web Developer', 'Creator of BengkelPro POS'];

    function tick() {
      const fullText = titles[currentTitleIndex % titles.length];

      if (isDeletingText) {
        currentCharIndex = Math.max(0, currentCharIndex - 1);
      } else {
        currentCharIndex = Math.min(fullText.length, currentCharIndex + 1);
      }

      targetEl.textContent = fullText.substring(0, currentCharIndex);

      let speed = isDeletingText ? 36 : 68;

      if (!isDeletingText && currentCharIndex === fullText.length) {
        speed = 2200; // Jeda saat teks selesai diketik
        isDeletingText = true;
      } else if (isDeletingText && currentCharIndex === 0) {
        isDeletingText = false;
        currentTitleIndex = (currentTitleIndex + 1) % titles.length;
        speed = 380;
      }

      typewriterTimer = setTimeout(tick, speed);
    }

    tick();
  }

  // ================= 3. 3D TILT & MOTION EFFECT PADA SETIAP GAMBAR =================
  function bindInteractiveMediaTilt() {
    const mediaElements = document.querySelectorAll('.tilt-media');
    mediaElements.forEach(el => {
      if (el.dataset.tiltBound === 'true') return;
      el.dataset.tiltBound = 'true';

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -6.5;
        const rotateY = ((x - centerX) / centerX) * 6.5;

        el.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
        el.style.setProperty('--glare-x', `${((x / rect.width) * 100).toFixed(1)}%`);
        el.style.setProperty('--glare-y', `${((y / rect.height) * 100).toFixed(1)}%`);
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  // ================= 4. SCROLL REVEAL OBSERVER =================
  function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal-up');
    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    elements.forEach(el => observer.observe(el));
  }

  // ================= 5. RENDER SELURUH BAGIAN WEBSITE =================
  function renderAll() {
    const data = PortfolioStore.getData();
    renderHeroAndBranding(data);
    renderAbout(data);
    renderSkills(data);
    renderProjects(data);
    renderCertificates(data);
    renderInterests(data);
    renderExperience(data);
    renderDigitalCV(data);
    renderContact(data);

    // Pasang ulang animasi gerak gambar & reveal pada elemen yang baru di-render
    bindInteractiveMediaTilt();
    initScrollReveal();
  }

  // --- A. Branding & Hero ---
  function renderHeroAndBranding(data) {
    const p = data.profile || {};
    const initials = (p.initials || getInitials(p.name || 'NA')).toUpperCase();

    document.title = `Portofolio & Digital CV — ${p.name || 'Nama Anda'}`;
    setText('navBrandInitials', initials);
    setText('footerInitials', initials);
    setText('heroInitials', initials);
    setText('navBrandSub', (p.major || 'Teknik Informatika').toUpperCase());

    setText('heroStatusBadge', p.statusBadge || 'Tersedia untuk Magang & Kolaborasi Proyek');
    setText('heroName', p.name || 'Nama Anda');
    setText('heroStudentId', p.studentId || 'Mahasiswa S1 Teknik Informatika');
    setText('heroMajor', p.major || 'Teknik Informatika');
    setText('heroUniversity', p.university || 'Nama Universitas Anda');
    setText('heroRole', p.role || 'Mahasiswa Teknik Informatika & Junior Web Developer');
    setText('heroTagline', p.tagline ? `“${p.tagline.replace(/^["“]|["”]$/g, '')}”` : '');
    setText('heroBio', p.shortBio || '');
    setText('heroLearningFocus', p.learningFocus || '');

    // Rotating Titles & Chips
    const titles = Array.isArray(p.rotatingTitles) && p.rotatingTitles.length > 0
      ? p.rotatingTitles
      : [p.role || 'Mahasiswa Teknik Informatika', 'Junior Web Developer', 'Creator of BengkelPro POS'];

    startRotatingTitles(titles);

    const chipsContainer = document.getElementById('heroTitleTags');
    if (chipsContainer) {
      chipsContainer.innerHTML = titles.map((t, i) => `
        <span class="title-chip">0${i + 1} / ${escapeHtml(t)}</span>
      `).join('');
    }

    setText('cardProfileName', p.name || 'Nama Anda');
    setText('cardProfileMajor', `${p.major || 'Teknik Informatika'} • ${p.university || ''}`);
    setText('cardProfileLocation', (p.location || 'INDONESIA').toUpperCase());
    setText('placeholderRoleTitle', (p.major || 'INFORMATICS STUDENT').toUpperCase());

    setText('footerName', p.name || 'Nama Anda');
    setText('footerCopyName', p.name || 'Nama Anda');
    setText('currentYear', new Date().getFullYear());

    const hardCount = (data.skills?.hardSkills || []).length;
    setText('statSkillCount', `${hardCount} Hard Skills`);

    // Foto Profil vs Placeholder Inisial
    const imgEl = document.getElementById('heroProfileImg');
    const placeholderEl = document.getElementById('heroProfilePlaceholder');
    if (imgEl && placeholderEl) {
      if (p.photoUrl && p.photoUrl.trim() !== '') {
        imgEl.src = p.photoUrl;
        imgEl.alt = `Foto Profil ${p.name || ''}`;
        imgEl.classList.remove('hidden');
        placeholderEl.classList.add('hidden');
      } else {
        imgEl.src = '';
        imgEl.classList.add('hidden');
        placeholderEl.classList.remove('hidden');
      }
    }
  }

  // --- B. About Me ---
  function renderAbout(data) {
    const a = data.about || {};
    setText('aboutLead', a.lead || '');
    setText('aboutDescription', a.description || '');
    setText('aboutEducation', a.educationBackground || '');
    setText('aboutCareerGoal', a.careerGoal || '');
    setText('aboutLearningExp', a.learningExperience || '');
    setText('aboutVision', a.vision || '');
    setText('aboutValuesPrinciple', a.valuesPrinciple || '');

    const missionsList = document.getElementById('aboutMissionsList');
    if (missionsList) {
      const missions = Array.isArray(a.missions) ? a.missions : [];
      missionsList.innerHTML = missions
        .map(m => `<li>${escapeHtml(m)}</li>`)
        .join('');
    }

    const strengthsGrid = document.getElementById('aboutStrengthsGrid');
    if (strengthsGrid) {
      const strengths = Array.isArray(a.strengths) ? a.strengths : [];
      strengthsGrid.innerHTML = strengths
        .map((s, idx) => `
          <div class="strength-pill">
            <span class="strength-num">0${idx + 1}</span>
            <div>${escapeHtml(s)}</div>
          </div>
        `)
        .join('');
    }
  }

  // --- C. Skills & Technology ---
  function renderSkills(data) {
    const hardSkills = data.skills?.hardSkills || [];
    const softSkills = data.skills?.softSkills || [];

    setText('hardSkillsCount', `${hardSkills.length} Keahlian`);
    setText('softSkillsCount', `${softSkills.length} Karakter`);

    const hardContainer = document.getElementById('hardSkillsContainer');
    if (hardContainer) {
      hardContainer.innerHTML = hardSkills.map(skill => {
        const level = Math.min(100, Math.max(10, Number(skill.level) || 80));
        return `
          <article class="hard-skill-card">
            <div class="hs-top">
              <span class="hs-name">${escapeHtml(skill.name)}</span>
              <span class="hs-cat">${escapeHtml(skill.category || 'TECH')}</span>
            </div>
            <p class="hs-desc">${escapeHtml(skill.description || '')}</p>
            <div class="skill-bar-meta">
              <span>TINGKAT PENGUASAAN</span>
              <span>${level}%</span>
            </div>
            <div class="skill-bar-track">
              <div class="skill-bar-fill" style="width: ${level}%"></div>
            </div>
          </article>
        `;
      }).join('');
    }

    const softContainer = document.getElementById('softSkillsContainer');
    if (softContainer) {
      softContainer.innerHTML = softSkills.map((skill, idx) => `
        <article class="soft-skill-card">
          <div class="ss-icon">${escapeHtml(skill.icon || `0${idx + 1}`)}</div>
          <div class="ss-body">
            <h4>${escapeHtml(skill.name)}</h4>
            <p>${escapeHtml(skill.description || '')}</p>
          </div>
        </article>
      `).join('');
    }
  }

  // --- D. Projects / GitHub Portfolio ---
  function renderProjects(data) {
    const projects = data.projects || [];
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    const query = currentProjectSearch.trim().toLowerCase();
    const filtered = projects.filter(proj => {
      const matchCat =
        currentProjectCategory === 'All' ||
        proj.category === currentProjectCategory ||
        proj.secondaryCategory === currentProjectCategory;

      if (!matchCat) return false;
      if (!query) return true;

      const haystack = [
        proj.title,
        proj.subtitle,
        proj.category,
        proj.secondaryCategory,
        proj.description,
        proj.purpose,
        ...(proj.technologies || []),
        ...(proj.features || [])
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="bento-card" style="grid-column: 1 / -1; text-align: center; padding: 48px 24px;">
          <h3 style="margin-bottom: 8px;">Proyek tidak ditemukan</h3>
          <p class="bento-text">Tidak ada proyek yang sesuai dengan kata kunci atau filter kategori tersebut.</p>
          <button type="button" class="btn btn-sm btn-secondary" id="resetProjectFilterBtn">Tampilkan Semua Proyek</button>
        </div>
      `;
      document.getElementById('resetProjectFilterBtn')?.addEventListener('click', () => {
        currentProjectCategory = 'All';
        currentProjectSearch = '';
        const searchInput = document.getElementById('projectSearchInput');
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('#projectCategoryFilters .filter-chip').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.category === 'All');
        });
        renderProjects(PortfolioStore.getData());
      });
      return;
    }

    grid.innerHTML = filtered.map((proj, index) => {
      const isFeatured = Boolean(proj.featured) && currentProjectCategory === 'All' && !query;
      const techs = (proj.technologies || []).map(t => `<span class="tech-pill">${escapeHtml(t)}</span>`).join('');
      const features = (proj.features || []).slice(0, 4).map(f => `<li>${escapeHtml(f)}</li>`).join('');
      const imgSrc = proj.image || 'assets/img/portfolio-web.svg';
      const subtitle = proj.subtitle || `${proj.category || 'Web Application'} — Studi Kasus & Implementasi`;

      return `
        <article class="bento-card project-card ${isFeatured ? 'featured-project' : ''} reveal-up">
          <div class="project-thumb tilt-media float-media" style="animation-delay: ${index * 0.4}s">
            <div class="media-glare"></div>
            <img src="${escapeHtml(imgSrc)}" alt="Visual Proyek ${escapeHtml(proj.title)}" class="animated-img" loading="lazy">
            <div class="project-badges-top">
              ${proj.featured ? '<span class="badge-featured">FEATURED PROJECT // UNGGULAN</span>' : '<span></span>'}
              <span class="badge-date">${escapeHtml(proj.date || '2026')}</span>
            </div>
          </div>
          <div class="project-body">
            <div class="project-cat-row">
              <span class="card-tag" style="margin-bottom:0">${escapeHtml(proj.category || 'Web Development')}</span>
              ${proj.secondaryCategory ? `<span class="badge-tag">${escapeHtml(proj.secondaryCategory)}</span>` : ''}
            </div>
            <h3 class="project-title">${escapeHtml(proj.title)}</h3>
            <p class="project-subtitle">${escapeHtml(subtitle)}</p>
            <p class="project-desc">${escapeHtml(proj.description)}</p>
            ${features ? `
              <div class="project-features-preview">
                <strong>FITUR &amp; MODUL UTAMA:</strong>
                <ul>${features}</ul>
              </div>
            ` : ''}
            <div class="tech-stack-pills">${techs}</div>
            <div class="project-actions">
              <button type="button" class="btn btn-sm btn-primary" data-view-project="${escapeHtml(proj.id)}">
                <span>View Project</span>
              </button>
              <a href="${escapeHtml(proj.repoUrl || 'https://github.com/')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary">
                <span>View Source Code ↗</span>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('[data-view-project]').forEach(btn => {
      btn.addEventListener('click', () => {
        openProjectDetailModal(btn.getAttribute('data-view-project'));
      });
    });

    bindInteractiveMediaTilt();
    initScrollReveal();
  }

  function openProjectDetailModal(projectId) {
    const data = PortfolioStore.getData();
    const proj = (data.projects || []).find(p => p.id === projectId);
    if (!proj) return;

    setText('projectModalCategory', `${proj.category || 'PROJECT'} // ${proj.date || '2026'}`);
    setText('projectModalTitle', proj.title);

    const body = document.getElementById('projectModalBody');
    if (body) {
      const featuresHtml = (proj.features || []).map(f => `<li>${escapeHtml(f)}</li>`).join('');
      const techHtml = (proj.technologies || []).map(t => `<span class="tech-pill">${escapeHtml(t)}</span>`).join('');
      body.innerHTML = `
        <div class="modal-image-showcase tilt-media">
          <div class="media-glare"></div>
          <img src="${escapeHtml(proj.image || 'assets/img/portfolio-web.svg')}" alt="${escapeHtml(proj.title)}" class="animated-img" style="width:100%; max-height: 360px; object-fit: contain;">
        </div>
        ${proj.subtitle ? `<p class="project-subtitle" style="font-size:13px; margin-bottom:14px;">${escapeHtml(proj.subtitle)}</p>` : ''}
        <div class="stack-block">
          <h4>Deskripsi Proyek</h4>
          <p class="bento-text">${escapeHtml(proj.description || '')}</p>
        </div>
        <div class="stack-block">
          <h4>Tujuan Pengembangan</h4>
          <p class="bento-text">${escapeHtml(proj.purpose || proj.description || '')}</p>
        </div>
        ${proj.role ? `
          <div class="stack-block">
            <h4>Peran Pengerjaan</h4>
            <p class="bento-text">${escapeHtml(proj.role)}</p>
          </div>
        ` : ''}
        <div class="stack-block">
          <h4>Fitur Utama</h4>
          <ul class="check-list">${featuresHtml}</ul>
        </div>
        <div class="stack-block">
          <h4>Teknologi yang Digunakan</h4>
          <div class="tech-stack-pills" style="margin-top:8px;">${techHtml}</div>
        </div>
        <div class="project-actions" style="margin-top: 20px;">
          <a href="${escapeHtml(proj.repoUrl || 'https://github.com/')}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            View Source Code di GitHub ↗
          </a>
          ${proj.demoUrl && proj.demoUrl !== '#projects' ? `
            <a href="${escapeHtml(proj.demoUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
              Buka Live Demo ↗
            </a>
          ` : ''}
        </div>
      `;
    }

    openModal('projectModal');
    bindInteractiveMediaTilt();
  }

  // --- E. Certificates / Sertifikat ---
  function renderCertificates(data) {
    const certs = data.certificates || [];
    const grid = document.getElementById('certificatesGrid');
    if (!grid) return;

    if (certs.length === 0) {
      grid.innerHTML = `
        <div class="bento-card" style="grid-column: 1 / -1; text-align: center; padding: 40px 24px;">
          <h3>Belum ada sertifikat yang ditambahkan</h3>
          <p class="bento-text">Klik tombol "+ Kelola Sertifikat" untuk menambahkan dokumentasi sertifikat pelatihan Anda.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = certs.map((cert, index) => {
      const imgSrc = cert.image || 'assets/img/cert-template.svg';
      const downloadHref = cert.fileUrl || imgSrc;
      return `
        <article class="bento-card cert-card reveal-up">
          <div class="cert-thumb tilt-media float-media" style="animation-delay: ${index * 0.35}s">
            <div class="media-glare"></div>
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(cert.title)}" class="animated-img" loading="lazy">
          </div>
          <div class="cert-body">
            <div class="cert-meta">
              <span>CREDENTIAL // SERTIFIKAT</span>
              <span>${escapeHtml(cert.date || '-')}</span>
            </div>
            <h3 class="cert-title">${escapeHtml(cert.title)}</h3>
            <p class="cert-issuer">Penyelenggara: <strong>${escapeHtml(cert.issuer || '-')}</strong></p>
            <div class="cert-number">
              ID / Nomor: ${escapeHtml(cert.credentialId || 'Tersedia pada dokumen')}
            </div>
            ${cert.note ? `<p class="bento-text" style="font-size:12px;">${escapeHtml(cert.note)}</p>` : ''}
            <div class="project-actions" style="margin-top: auto;">
              <button type="button" class="btn btn-sm btn-primary" data-view-cert="${escapeHtml(cert.id)}">
                View Certificate
              </button>
              <a href="${escapeHtml(downloadHref)}" download="${escapeHtml((cert.title || 'sertifikat').replace(/\s+/g, '-'))}" class="btn btn-sm btn-secondary">
                Download Certificate
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('[data-view-cert]').forEach(btn => {
      btn.addEventListener('click', () => {
        openCertificateModal(btn.getAttribute('data-view-cert'));
      });
    });

    bindInteractiveMediaTilt();
    initScrollReveal();
  }

  function openCertificateModal(certId) {
    const data = PortfolioStore.getData();
    const cert = (data.certificates || []).find(c => c.id === certId);
    if (!cert) return;

    setText('certModalTitle', cert.title);
    const body = document.getElementById('certModalBody');
    const imgSrc = cert.image || 'assets/img/cert-template.svg';
    const downloadHref = cert.fileUrl || imgSrc;

    if (body) {
      body.innerHTML = `
        <div class="modal-image-showcase tilt-media">
          <div class="media-glare"></div>
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(cert.title)}" class="animated-img" style="width: 100%; max-height: 420px; object-fit: contain;">
        </div>
        <div class="info-callout" style="margin-top:0; margin-bottom: 18px;">
          <div class="callout-title-row">
            <span class="callout-dot"></span>
            <strong>Detail Sertifikasi &amp; Pelatihan</strong>
          </div>
          <p><strong>Nama Pelatihan:</strong> ${escapeHtml(cert.title)}</p>
          <p><strong>Penyelenggara:</strong> ${escapeHtml(cert.issuer || '-')}</p>
          <p><strong>Tanggal Diperoleh:</strong> ${escapeHtml(cert.date || '-')}</p>
          <p><strong>Nomor Sertifikat:</strong> ${escapeHtml(cert.credentialId || '-')}</p>
        </div>
        <div class="project-actions">
          <a href="${escapeHtml(downloadHref)}" download="${escapeHtml((cert.title || 'sertifikat').replace(/\s+/g, '-'))}" class="btn btn-primary">
            Download Certificate
          </a>
          <button type="button" class="btn btn-secondary" data-edit-cert-from-modal="${escapeHtml(cert.id)}">
            Edit Data Sertifikat
          </button>
        </div>
      `;

      body.querySelector('[data-edit-cert-from-modal]')?.addEventListener('click', () => {
        closeModal('certificateModal');
        if (window.openAdminPanel) window.openAdminPanel('certificates');
      });
    }
    openModal('certificateModal');
    bindInteractiveMediaTilt();
  }

  // --- F. My Interests / Bidang Minat ---
  function renderInterests(data) {
    const interests = data.interests || [];
    const grid = document.getElementById('interestsGrid');
    if (!grid) return;

    const list = showOnlyActiveInterests ? interests.filter(i => i.active) : interests;

    grid.innerHTML = list.map((item, idx) => `
      <article class="bento-card interest-card ${item.active ? 'active-interest' : ''} reveal-up" data-toggle-interest="${escapeHtml(item.id)}" title="Klik untuk memilih / mengubah status fokus minat">
        <div class="interest-top">
          <div class="interest-icon">${escapeHtml(item.icon || `0${idx + 1}`)}</div>
          <span class="interest-status-badge">
            ${item.active ? 'FOKUS DIPILIH' : 'KLIK UNTUK PILIH'}
          </span>
        </div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description || '')}</p>
      </article>
    `).join('');

    grid.querySelectorAll('[data-toggle-interest]').forEach(card => {
      card.addEventListener('click', async () => {
        const id = card.getAttribute('data-toggle-interest');
        const currentData = PortfolioStore.getData();
        const target = (currentData.interests || []).find(i => i.id === id);
        if (target) {
          target.active = !target.active;
          await PortfolioStore.saveData(currentData);
          showToast(
            target.active
              ? `"${target.name}" ditandai sebagai Fokus Minat Utama`
              : `"${target.name}" diubah ke minat eksplorasi`
          );
        }
      });
    });

    initScrollReveal();
  }

  // --- G. Education & Experience Timeline ---
  function renderExperience(data) {
    const items = data.experience || [];
    const container = document.getElementById('experienceTimeline');
    if (!container) return;

    const filtered = currentExpFilter === 'All'
      ? items
      : items.filter(item => (item.type || '').toLowerCase() === currentExpFilter.toLowerCase());

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="bento-card">
          <p class="bento-text" style="margin:0;">Belum ada riwayat pada kategori ini.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => `
      <article class="bento-card timeline-item reveal-up">
        <div class="tl-header">
          <span class="tl-type">${escapeHtml((item.type || 'Riwayat').toUpperCase())}</span>
          <span class="tl-period">${escapeHtml(item.period || '')}</span>
        </div>
        <h3 class="tl-title">${escapeHtml(item.title)}</h3>
        <p class="tl-org">${escapeHtml(item.organization || '')}</p>
        <p class="tl-desc">${escapeHtml(item.description || '')}</p>
      </article>
    `).join('');

    initScrollReveal();
  }

  // --- H. Digital CV / Resume ---
  function renderDigitalCV(data) {
    const p = data.profile || {};
    const a = data.about || {};
    const c = data.contact || {};

    setText('cvName', p.name || 'Nama Anda');
    setText('cvRole', p.role || 'Mahasiswa Teknik Informatika & Junior Web Developer');
    setText('cvEduHeader', `Program Studi ${p.major || 'Teknik Informatika'} — ${p.university || 'Nama Universitas Anda'}`);
    setText('cvSummary', `${a.lead || ''} ${a.description || ''} ${a.careerGoal || ''}`);

    const contactList = document.getElementById('cvContactList');
    if (contactList) {
      contactList.innerHTML = `
        <span>EMAIL: ${escapeHtml(c.email || '-')}</span>
        <span>WA: ${escapeHtml(c.whatsapp || '-')}</span>
        <span>GITHUB: ${escapeHtml((c.github || '').replace(/^https?:\/\//, ''))}</span>
        <span>LINKEDIN: ${escapeHtml((c.linkedin || '').replace(/^https?:\/\//, ''))}</span>
        <span>LOKASI: ${escapeHtml(p.location || c.location || 'Indonesia')}</span>
      `;
    }

    const expList = document.getElementById('cvExperienceList');
    if (expList) {
      expList.innerHTML = (data.experience || []).map(e => `
        <div class="cv-item">
          <h5>${escapeHtml(e.title)}</h5>
          <div class="cv-item-meta">${escapeHtml(e.type)} // ${escapeHtml(e.organization)} (${escapeHtml(e.period)})</div>
          <p>${escapeHtml(e.description)}</p>
        </div>
      `).join('');
    }

    const projList = document.getElementById('cvProjectsList');
    if (projList) {
      projList.innerHTML = (data.projects || []).map(pr => `
        <div class="cv-item">
          <h5>${escapeHtml(pr.title)} (${escapeHtml(pr.date || '2026')})</h5>
          <div class="cv-item-meta">${escapeHtml(pr.category)} // Stack: ${escapeHtml((pr.technologies || []).join(', '))}</div>
          <p>${escapeHtml(pr.description)}</p>
        </div>
      `).join('');
    }

    const hsContainer = document.getElementById('cvHardSkills');
    if (hsContainer) {
      hsContainer.innerHTML = (data.skills?.hardSkills || [])
        .map(s => `<span class="cv-tag">${escapeHtml(s.name)}</span>`)
        .join('');
    }

    const ssContainer = document.getElementById('cvSoftSkills');
    if (ssContainer) {
      ssContainer.innerHTML = (data.skills?.softSkills || [])
        .map(s => `<span class="cv-tag">${escapeHtml(s.name)}</span>`)
        .join('');
    }

    const certContainer = document.getElementById('cvCertificatesList');
    if (certContainer) {
      certContainer.innerHTML = (data.certificates || []).map(cert => `
        <div class="cv-item" style="margin-bottom:10px;">
          <h5 style="font-size:14px;">${escapeHtml(cert.title)}</h5>
          <div class="cv-item-meta">${escapeHtml(cert.issuer)} (${escapeHtml(cert.date)})</div>
        </div>
      `).join('');
    }

    const intContainer = document.getElementById('cvInterestsList');
    if (intContainer) {
      const selectedInterests = (data.interests || []).filter(i => i.active);
      const listToShow = selectedInterests.length > 0 ? selectedInterests : (data.interests || []);
      intContainer.innerHTML = listToShow
        .map(i => `<span class="cv-tag">${escapeHtml(i.name)}</span>`)
        .join('');
    }
  }

  // --- I. Contact Channels ---
  function renderContact(data) {
    const c = data.contact || {};
    const container = document.getElementById('contactChannelsContainer');
    if (!container) return;

    const cleanWa = (c.whatsapp || '').replace(/[^0-9]/g, '');
    const waHref = cleanWa ? `https://wa.me/${cleanWa}` : '#contact';

    const channels = [
      { code: 'MAIL', label: 'SURAT ELEKTRONIK (EMAIL)', value: c.email || 'emailanda@example.com', href: `mailto:${c.email || 'emailanda@example.com'}` },
      { code: 'WA', label: 'WHATSAPP LANGSUNG', value: c.whatsapp || '+62 812-0000-0000', href: waHref },
      { code: 'IN', label: 'LINKEDIN PROFILE', value: (c.linkedin || 'linkedin.com/in/username').replace(/^https?:\/\//, ''), href: c.linkedin || 'https://linkedin.com/' },
      { code: 'GIT', label: 'GITHUB REPOSITORY', value: (c.github || 'github.com/username').replace(/^https?:\/\//, ''), href: c.github || 'https://github.com/' },
      { code: 'IG', label: 'INSTAGRAM / SOSIAL MEDIA', value: (c.instagram || 'instagram.com/username').replace(/^https?:\/\//, ''), href: c.instagram || 'https://instagram.com/' }
    ];

    container.innerHTML = channels.map(ch => `
      <a href="${escapeHtml(ch.href)}" target="${ch.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener noreferrer" class="contact-channel-item">
        <div class="channel-icon">${escapeHtml(ch.code)}</div>
        <div class="channel-info">
          <small>${escapeHtml(ch.label)}</small>
          <strong>${escapeHtml(ch.value)}</strong>
        </div>
        <span>↗</span>
      </a>
    `).join('');
  }

  // ================= 6. EVENT LISTENERS & FORM VALIDATION =================
  function initListeners() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.getElementById('mainNav');
    if (mobileBtn && mainNav) {
      mobileBtn.addEventListener('click', () => {
        const isOpen = mainNav.classList.toggle('open');
        mobileBtn.setAttribute('aria-expanded', String(isOpen));
      });
      mainNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => mainNav.classList.remove('open'));
      });
    }

    const searchInput = document.getElementById('projectSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentProjectSearch = e.target.value || '';
        renderProjects(PortfolioStore.getData());
      });
    }

    document.querySelectorAll('#projectCategoryFilters .filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        currentProjectCategory = btn.dataset.category || 'All';
        document.querySelectorAll('#projectCategoryFilters .filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProjects(PortfolioStore.getData());
      });
    });

    const allIntBtn = document.getElementById('filterAllInterestsBtn');
    const activeIntBtn = document.getElementById('filterActiveInterestsBtn');
    if (allIntBtn && activeIntBtn) {
      allIntBtn.addEventListener('click', () => {
        showOnlyActiveInterests = false;
        allIntBtn.classList.add('active');
        activeIntBtn.classList.remove('active');
        renderInterests(PortfolioStore.getData());
      });
      activeIntBtn.addEventListener('click', () => {
        showOnlyActiveInterests = true;
        activeIntBtn.classList.add('active');
        allIntBtn.classList.remove('active');
        renderInterests(PortfolioStore.getData());
      });
    }

    document.querySelectorAll('#experienceFilterTabs .filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        currentExpFilter = btn.dataset.expType || 'All';
        document.querySelectorAll('#experienceFilterTabs .filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderExperience(PortfolioStore.getData());
      });
    });

    const triggerCvPrint = () => {
      showToast('Menyiapkan dokumen Digital CV (Pilih "Save as PDF" pada jendela cetak)');
      setTimeout(() => window.print(), 250);
    };

    document.getElementById('downloadCvBtn')?.addEventListener('click', triggerCvPrint);
    document.getElementById('printCvBtn')?.addEventListener('click', triggerCvPrint);
    document.getElementById('heroDownloadCvBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('cv')?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(triggerCvPrint, 500);
    });

    document.getElementById('contactForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleContactSubmit('email');
    });

    document.getElementById('sendWhatsappBtn')?.addEventListener('click', () => {
      handleContactSubmit('whatsapp');
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal(btn.getAttribute('data-close-modal'));
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.add('hidden');
        }
      });
    });

    window.addEventListener('portfolioDataUpdated', () => {
      renderAll();
    });

    window.addEventListener('scroll', handleScrollSpy, { passive: true });
  }

  function handleContactSubmit(channel) {
    const nameEl = document.getElementById('senderName');
    const emailEl = document.getElementById('senderEmail');
    const categoryEl = document.getElementById('messageCategory');
    const subjectEl = document.getElementById('messageSubject');
    const bodyEl = document.getElementById('messageBody');
    const statusEl = document.getElementById('contactFormStatus');

    setText('errSenderName', '');
    setText('errSenderEmail', '');
    setText('errMessageSubject', '');
    setText('errMessageBody', '');
    if (statusEl) statusEl.classList.add('hidden');

    const name = (nameEl?.value || '').trim();
    const email = (emailEl?.value || '').trim();
    const category = (categoryEl?.value || 'Umum').trim();
    const subject = (subjectEl?.value || '').trim();
    const message = (bodyEl?.value || '').trim();

    let valid = true;

    if (name.length < 2) {
      setText('errSenderName', 'Nama lengkap wajib diisi (minimal 2 karakter).');
      valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setText('errSenderEmail', 'Masukkan alamat email yang valid (contoh: nama@domain.com).');
      valid = false;
    }

    if (subject.length < 3) {
      setText('errMessageSubject', 'Subjek pesan wajib diisi (minimal 3 karakter).');
      valid = false;
    }

    if (message.length < 10) {
      setText('errMessageBody', 'Isi pesan terlalu singkat (minimal 10 karakter).');
      valid = false;
    }

    if (!valid) {
      showToast('Mohon periksa kembali kolom formulir yang belum sesuai.');
      return;
    }

    PortfolioStore.saveMessage({ name, email, category, subject, message });

    const contactData = PortfolioStore.getData().contact || {};
    if (channel === 'whatsapp') {
      const cleanWa = (contactData.whatsapp || '').replace(/[^0-9]/g, '');
      const text = encodeURIComponent(
        `Halo, saya *${name}* (${email}).\n*Topik:* ${category}\n*Subjek:* ${subject}\n\n${message}`
      );
      if (cleanWa) {
        window.open(`https://wa.me/${cleanWa}?text=${text}`, '_blank', 'noopener');
      }
    } else {
      const targetEmail = contactData.email || 'emailanda@example.com';
      const mailtoSubject = encodeURIComponent(`[${category}] ${subject} — dari ${name}`);
      const mailtoBody = encodeURIComponent(
        `Nama Pengirim: ${name}\nEmail Pengirim: ${email}\nTopik: ${category}\n\nPesan:\n${message}`
      );
      window.location.href = `mailto:${targetEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;
    }

    if (statusEl) {
      statusEl.textContent = `Terima kasih, ${name}. Pesan Anda telah tervalidasi dan dicatat.`;
      statusEl.classList.remove('hidden');
    }
    document.getElementById('contactForm')?.reset();
    showToast('Pesan berhasil divalidasi & disiapkan.');
  }

  function handleScrollSpy() {
    const sections = ['home', 'about', 'skills', 'projects', 'certificates', 'interests', 'experience', 'cv', 'contact'];
    const scrollPos = window.scrollY + 160;
    let activeId = 'home';

    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= scrollPos) {
        activeId = id;
      }
    }

    document.querySelectorAll('.main-nav .nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
    });
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getInitials(name) {
    return String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('') || 'NA';
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('hidden');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
  }

  window.openModal = openModal;
  window.closeModal = closeModal;

  document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initLiveClock();
    await PortfolioStore.init();
    renderAll();
    initListeners();
  });
})();
