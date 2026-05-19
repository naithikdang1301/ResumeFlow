'use strict';

const STORAGE_KEY  = 'srb_resume_data';
const AUTH_KEY     = 'srb_auth_user';
const USERS_KEY    = 'srb_users';

const getResumesKey = (email) => `srb_resumes_${email}`;

const validators = {
  
  required:  (val) => val.trim().length > 0,
  
  email:     (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
  
  phone:     (val) => /^[0-9]{10}$/.test(val.replace(/\D/g, '')),
  
  minLength: (val, min) => val.trim().length >= min,
  
  year:      (val) => /^(20[0-9]{2})$/.test(val.trim()) && +val >= 2000 && +val <= 2035,
};

const showToast = (message, type = 'info') => {
  document.querySelector('.toast')?.remove();
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = Object.assign(document.createElement('div'), {
    className: `toast ${type}`,
    innerHTML: `<span>${icons[type] ?? 'ℹ️'}</span> ${message}`,
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; toast.style.transition = 'all 0.4s'; }, 2600);
  setTimeout(() => toast.parentNode?.removeChild(toast), 3100);
};

const $ = (id) => document.getElementById(id);

const $q  = (sel, ctx = document) => ctx.querySelector(sel);

const $qa = (sel, ctx = document) => ctx.querySelectorAll(sel);

const val = (id) => $(id)?.value?.trim() ?? '';

const showFieldError = (input, msg) => {
  input.classList.add('input-error');
  input.classList.remove('input-ok');
  const err = input.parentElement.querySelector('.err-msg, .field-error');
  if (err) { err.textContent = msg; err.classList.add('show'); }
};

const clearFieldError = (input) => {
  input.classList.remove('input-error');
  input.classList.add('input-ok');
  const err = input.parentElement.querySelector('.err-msg, .field-error');
  if (err) err.classList.remove('show');
};

const getAuthUser = () => {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
};

const setAuthUser = (user) => localStorage.setItem(AUTH_KEY, JSON.stringify(user));

const logoutUser = () => {
  localStorage.removeItem(AUTH_KEY);
  showToast('Logged out successfully', 'info');
  setTimeout(() => { window.location.href = 'login.html'; }, 1000);
};

const logActivity = (type, details) => {
  const user = getAuthUser();
  if (!user) return;
  const key = `srb_activity_${user.email}`;
  const activities = JSON.parse(localStorage.getItem(key) || '[]');
  const dateStr = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  activities.unshift({ type, details, date: dateStr });
  localStorage.setItem(key, JSON.stringify(activities.slice(0, 10)));
};

const renderRecentActivity = () => {
  const container = $('activityList');
  if (!container) return;

  const user = getAuthUser();
  if (!user) return;

  const key = `srb_activity_${user.email}`;
  const activities = JSON.parse(localStorage.getItem(key) || '[]');

  if (activities.length === 0) {
    container.innerHTML = `<p style="color: var(--muted); text-align: center; padding: 20px 0; font-size: 14px;">No recent activity yet.</p>`;
    return;
  }

  const dotClasses = {
    created: 'orange-dot',
    edited: 'blue-dot',
    downloaded: 'green-dot',
    deleted: 'orange-dot'
  };

  const typeLabels = {
    created: 'Resume created',
    edited: 'Resume edited',
    downloaded: 'Resume downloaded',
    deleted: 'Resume deleted'
  };

  container.innerHTML = activities.map(act => {
    const dotClass = dotClasses[act.type] || 'blue-dot';
    const label = typeLabels[act.type] || act.type;
    return `
      <div class="activity-item">
        <span class="activity-dot ${dotClass}"></span>
        <p><strong>${label}</strong> — ${act.details} · ${act.date}</p>
      </div>
    `;
  }).join('');
};

const downloadResume = (resId) => {
  const currentDl = parseInt(localStorage.getItem('dl_count') || '0', 10);
  localStorage.setItem('dl_count', (currentDl + 1).toString());

  let title = 'My Main Resume';
  const user = getAuthUser();
  if (user) {
    const resumes = JSON.parse(localStorage.getItem(getResumesKey(user.email)) || '[]');
    const res = resumes.find(r => r.id === resId);
    if (res) title = res.title;
  }
  logActivity('downloaded', title);

  showToast('Preparing download...', 'info');
  setTimeout(() => {
    window.print();
    if (typeof renderDashboardCards === 'function' && document.getElementById('resumeCardList')) {
      renderDashboardCards();
    }
  }, 800);
};

const enforcePhoneOnly = (input) => {
  const cursor = input.selectionStart;
  input.value  = input.value.replace(/[^\d]/g, '').slice(0, 10);
  try { input.setSelectionRange(cursor, cursor); } catch (_) {}
};

const initNavbarScroll = () => {
  const navbar = $q('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.scrollY > 20
      ? '0 4px 24px rgba(109,40,217,.18)'
      : '0 1px 12px rgba(0,0,0,.06)';
  }, { passive: true });

  const user       = getAuthUser();
  const loginLink  = $('navLoginLink');
  const logoutLink = $('navLogoutLink');
  if (loginLink)  loginLink.style.display  = user ? 'none'  : 'block';
  if (logoutLink) logoutLink.style.display = user ? 'block' : 'none';
};

const initScrollReveal = () => {
  const SELECTORS = [
    '.feature-card', '.step-card', '.testimonial-card', '.pricing-card',
    '.template-card', '.tcard', '.team-card', '.offer-row', '.tip-item',
    '.faq-item', '.dash-stat-box', '.info-card', '.contact-card',
  ].join(',');

  const els = $qa(SELECTORS);
  els.forEach(el => el.classList.add('reveal'));

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) { target.classList.add('visible'); obs.unobserve(target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => obs.observe(el));
};

const initCounters = () => {
  const section = $q('.stats-section, .dash-stats-row');
  if (!section) return;

  const run = () => {
    $qa('.stat-num, .dsb-num').forEach(counter => {
      const target = parseInt(counter.textContent.replace(/[^0-9]/g, ''), 10);
      if (!target || target < 5) return;
      const suffix = counter.textContent.replace(/[\d,]/g, '');
      let current  = 0;
      const step   = Math.ceil(target / 60);
      const timer  = setInterval(() => {
        current = Math.min(current + step, target);
        counter.textContent = current.toLocaleString() + suffix;
        if (current >= target) clearInterval(timer);
      }, 22);
    });
  };

  const obs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { run(); obs.disconnect(); }
  }, { threshold: 0.3 });
  obs.observe(section);
};



const confirmDelete = () => {
  if (confirm('⚠️ Delete this resume?\n\nThis cannot be undone.')) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    showToast('Resume deleted', 'error');
    
    renderDashboardCards?.();
  }
};

const validateStep = (stepId) => {
  const step = $(stepId);
  if (!step) return true;
  let allValid = true;

  $qa('input[required], textarea[required]', step).forEach(input => {
    if (!validators.required(input.value)) {
      showFieldError(input, 'This field is required');
      allValid = false;
    } else {
      clearFieldError(input);
    }
  });

  const emailEl = $q('input[type="email"]', step);
  if (emailEl?.value && !validators.email(emailEl.value)) {
    showFieldError(emailEl, 'Enter a valid email address');
    allValid = false;
  }

  const phoneEl = $q('input[type="tel"]', step);
  if (phoneEl?.value && !validators.phone(phoneEl.value)) {
    showFieldError(phoneEl, 'Phone must be exactly 10 digits');
    allValid = false;
  }

  const yearEl = $q('input[type="number"]', step);
  if (yearEl?.value && !validators.year(yearEl.value)) {
    showFieldError(yearEl, 'Enter a valid year (2000–2035)');
    allValid = false;
  }

  if (!allValid) showToast('Please fix the errors above before continuing', 'error');
  return allValid;
};

const initStepNavigation = () => {
  if (!$q('.builder-layout')) return;

  const STEP_GATE = {
    'step-education': 'step-personal',
    'step-skills':    'step-education',
    'step-preview':   'step-skills',
  };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#step-"]');
    if (!link) return;

    const targetStep = link.getAttribute('href').slice(1); 
    const gateStep   = STEP_GATE[targetStep];

    if (gateStep && !validateStep(gateStep)) {
      e.preventDefault();
      return;
    }

    $qa('.step-pill').forEach(p => p.classList.remove('active-step'));
    const matchingPill = $q(`.step-pill[href="#${targetStep}"]`);
    if (matchingPill) matchingPill.classList.add('active-step');

    updateProgressBar(targetStep);
  });
};

const updateProgressBar = (stepId) => {
  const STEP_PERCENT = {
    'step-personal':  25,
    'step-education': 50,
    'step-skills':    75,
    'step-preview':   100,
  };
  const bar = $('formProgressBar');
  if (!bar) return;
  const pct = STEP_PERCENT[stepId] ?? 25;
  bar.style.width = `${pct}%`;
  bar.setAttribute('aria-valuenow', pct);
  
  const pctText = $('formProgressPct');
  if (pctText) {
    pctText.textContent = `${pct}% complete`;
  }
  
  bar.style.setProperty('--pct', pct);
  bar.style.background = pct === 100
    ? 'var(--green)'
    : 'var(--grad-main)';
};

const buildResumePreview = () => {
  
  const g = (id) => $(id)?.value?.trim() ?? '';

  const nameEl = $('prev-name');
  if (nameEl) nameEl.textContent = g('fullName') || 'Your Full Name';
  const roleEl = $('prev-role');
  if (roleEl) roleEl.textContent = g('jobTitle') || 'Job Title / Target Role';

  const contactEl = $('prev-contact');
  if (contactEl) {
    const li = g('linkedin') ? `<span>🔗 ${g('linkedin')}</span>` : '';
    contactEl.innerHTML =
      `<span>📧 ${g('email') || 'your@email.com'}</span>` +
      `<span>📱 ${g('phone') || '9876543210'}</span>` +
      `<span>📍 ${g('location') || 'City, State'}</span>${li}`;
  }

  const sumEl = $('prev-summary');
  if (sumEl) sumEl.textContent = g('summary') || 'Your career objective will appear here.';

  if ($('prev-degree'))  $('prev-degree').textContent  = g('degree')  || 'Degree / Course';
  if ($('prev-college')) $('prev-college').textContent = g('college') ? ` · ${g('college')}` : '';
  if ($('prev-year'))    $('prev-year').textContent    = g('gradYear') || '';
  if ($('prev-cgpa'))    $('prev-cgpa').textContent    = g('cgpa') ? `CGPA / %: ${g('cgpa')}` : '';

  const skillsList = g('techSkills').split(',').map(s => s.trim()).filter(Boolean);
  const skillsEl   = $('prev-skills');
  if (skillsEl) skillsEl.textContent = skillsList.length ? skillsList.join(' · ') : 'Your technical skills here';
  const softEl = $('prev-soft');
  if (softEl) softEl.textContent = g('softSkills') ? `Soft Skills: ${g('softSkills')}` : '';

  const p1El = $('prev-p1');
  if (p1El && g('p1title')) {
    p1El.innerHTML = `<strong>${g('p1title')}</strong><p>${g('p1desc') || ''}</p>`;
    p1El.style.display = 'block';
  }
  const p2El = $('prev-p2');
  if (p2El) {
    if (g('p2title')) {
      p2El.innerHTML = `<strong>${g('p2title')}</strong><p>${g('p2desc') || ''}</p>`;
      p2El.style.display = 'block';
    } else { p2El.style.display = 'none'; }
  }

  const certsVal = g('certs');
  const certsSec = $('certsSection');
  const certsDiv = $('certsDivider');
  if (certsSec) certsSec.style.display = certsVal ? 'block' : 'none';
  if (certsDiv) certsDiv.style.display = certsVal ? 'block' : 'none';
  if ($('prev-certs')) $('prev-certs').textContent = certsVal;

  try {
    const keys = ['fullName','jobTitle','email','phone','location','linkedin',
      'summary','degree','college','gradYear','cgpa','class12','class10',
      'techSkills','softSkills','p1title','p1desc','p2title','p2desc','certs','activities'];
    const data = Object.fromEntries(keys.map(k => [k, g(k)]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
};

const calcATSScore = () => {
  const g = (id) => $(id)?.value?.trim() ?? '';
  let score = 0;
  if (validators.required(g('fullName')))                           score += 10;
  if (validators.email(g('email')))                                 score += 10;
  if (validators.phone(g('phone')))                                 score += 10;
  if (g('summary').length > 30)                                     score += 10;
  if (validators.required(g('degree')))                             score += 10;
  if (validators.required(g('college')))                            score +=  5;
  if (validators.year(g('gradYear')))                               score +=  5;
  if (g('techSkills').split(',').filter(Boolean).length >= 3)       score += 20;
  if (validators.required(g('p1title')))                            score += 10;
  if (g('p1desc').length > 20)                                      score += 10;

  const badge = $('atsScoreBadge');
  if (!badge) return;

  const { label, bg, color, border } =
    score >= 80 ? { label: 'Excellent ⭐', bg: '#f0fdf4', color: '#059669', border: '#bbf7d0' } :
    score >= 60 ? { label: 'Good 🟡',      bg: '#fffbeb', color: '#d97706', border: '#fde68a' } :
                  { label: 'Needs Work 🔴', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };

  badge.textContent           = `📊 ATS: ${score}% — ${label}`;
  badge.style.background      = bg;
  badge.style.color           = color;
  badge.style.border          = `1px solid ${border}`;
  badge.style.padding         = '4px 14px';
  badge.style.borderRadius    = '20px';
  badge.style.fontWeight      = '700';
  badge.style.fontSize        = '12px';
  badge.style.transition      = 'all 0.3s';
};

const saveResumeToList = () => {
  const user = getAuthUser();
  if (!user) {
    
    showToast('Login to save your resume permanently', 'info');
    return;
  }

  const rawData = localStorage.getItem(STORAGE_KEY);
  if (!rawData) return;
  let data = {};
  try { data = JSON.parse(rawData); } catch(_) { return; }

  const resumesKey = getResumesKey(user.email);
  const resumes    = JSON.parse(localStorage.getItem(resumesKey) || '[]');
  
  const params = new URLSearchParams(window.location.search);
  const resId  = params.get('id');

  const dateStr = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const scoreBadge = $('atsScoreBadge');
  const scoreText  = scoreBadge?.textContent || '0%';
  const score      = parseInt((scoreText.match(/\d+/) || ['0'])[0], 10);

  if (resId) {
    const idx = resumes.findIndex(r => r.id === resId);
    if (idx !== -1) {
      resumes[idx] = { ...resumes[idx], title: data.fullName || 'Untitled', role: data.jobTitle || 'Resume', lastEdited: dateStr, atsScore: score, data };
      logActivity('edited', data.fullName || 'Untitled');
    } else {
      resumes.unshift({ id: Date.now().toString(), title: data.fullName || 'Untitled', role: data.jobTitle || 'Resume', lastEdited: dateStr, atsScore: score, data });
      logActivity('created', data.fullName || 'Untitled');
    }
  } else {
    resumes.unshift({ id: Date.now().toString(), title: data.fullName || 'Untitled', role: data.jobTitle || 'Resume', lastEdited: dateStr, atsScore: score, data });
    logActivity('created', data.fullName || 'Untitled');
  }

  localStorage.setItem(resumesKey, JSON.stringify(resumes));
  showToast('Resume saved to dashboard! 🎉', 'success');
};

const initBuilderPage = () => {
  if (!$q('.builder-layout')) return;

  const params = new URLSearchParams(window.location.search);
  const resId  = params.get('id');
  const user   = getAuthUser();

  try {
    let raw = null;
    if (resId && user) {
      
      const resumes = JSON.parse(localStorage.getItem(getResumesKey(user.email)) || '[]');
      const found   = resumes.find(r => r.id === resId);
      if (found) raw = JSON.stringify(found.data);
    } 
    
    if (!raw) {
      
      raw = localStorage.getItem(STORAGE_KEY);
    }

    if (raw) {
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([k, v]) => { const el = $(k); if (el && v) el.value = v; });
    }
  } catch (_) {}
  buildResumePreview();
  calcATSScore();

  const formCol = $q('.builder-form-col');
  if (formCol) {
    formCol.addEventListener('input', (e) => {
      const { target } = e;

      if (target.id === 'phone' || target.type === 'tel') {
        enforcePhoneOnly(target);
        const len = target.value.length;
        const err = target.parentElement.querySelector('.err-msg');
        if (err) {
          err.textContent = len > 0 && len < 10 ? `${len}/10 digits entered` : '';
          err.className   = len > 0 && len < 10 ? 'err-msg show' : 'err-msg';
        }
      }

      if (target.id === 'summary') {
        const len = target.value.length;
        const counterEl = $q('.char-count');
        if (counterEl) {
          counterEl.textContent = `${len}/400 characters`;
          counterEl.style.color = len > 350 ? 'var(--orange)' : 'var(--muted)';
        }
      }

      buildResumePreview();
      calcATSScore();
    });

    formCol.addEventListener('focusout', (e) => {
      const { target } = e;
      if (target.type === 'email' && target.value) {
        validators.email(target.value)
          ? clearFieldError(target)
          : showFieldError(target, 'Enter a valid email address');
      }
      if ((target.id === 'phone' || target.type === 'tel') && target.value) {
        validators.phone(target.value)
          ? clearFieldError(target)
          : showFieldError(target, 'Phone must be exactly 10 digits');
      }
    });
  }

  $('saveResumeBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    buildResumePreview();
    saveResumeToList();
  });

  initStepNavigation();
  updateProgressBar('step-personal');
};

const renderDashboardCards = () => {
  const container = $('resumeCardList');
  if (!container) return;

  const user = getAuthUser();
  if (!user) {
    container.innerHTML = `
      <div class="resume-card-row dashed-card" role="listitem">
        <div class="rc-file-icon" aria-hidden="true">📝</div>
        <div class="rc-info"><h4>Login to view your resumes</h4><p>Sign in to access your saved resumes and track ATS scores.</p></div>
        <a href="login.html" class="act-btn edit-act">Login Now →</a>
      </div>`;
    return;
  }

  const resumesKey = getResumesKey(user.email);
  const resumes    = JSON.parse(localStorage.getItem(resumesKey) || '[]');

  if (resumes.length > 0) {
    
    container.innerHTML = resumes.map(res => `
      <div class="resume-card-row" data-id="${res.id}" role="listitem">
        <div class="rc-file-icon" aria-hidden="true">📄</div>
        <div class="rc-info">
          <h4>${res.title || 'Untitled Resume'}</h4>
          <p>${res.role || 'Resume'} · Last edited ${res.lastEdited} · ATS: ${res.atsScore || 0}%</p>
        </div>
        <div class="rc-actions">
          <a href="build-resume.html?id=${res.id}" class="act-btn edit-act" aria-label="Edit resume">✏️ Edit</a>
          <button class="act-btn dl-act" data-id="${res.id}" aria-label="Download resume">⬇️ Download</button>
          <button class="act-btn del-act" data-id="${res.id}" aria-label="Delete resume">🗑️ Delete</button>
        </div>
      </div>`).join('') + `
      <div class="resume-card-row dashed-card" role="listitem">
        <div class="rc-file-icon" aria-hidden="true">➕</div>
        <div class="rc-info"><h4>Create New Resume</h4><p>Start from scratch with a new template</p></div>
        <a href="build-resume.html" class="act-btn edit-act">Start →</a>
      </div>`;
  } else {
    
    container.innerHTML = `
      <div class="resume-card-row dashed-card" role="listitem">
        <div class="rc-file-icon" aria-hidden="true">📝</div>
        <div class="rc-info"><h4>No Resume Yet</h4><p>Build your first resume to get started</p></div>
        <a href="build-resume.html" class="act-btn edit-act">Build Now →</a>
      </div>`;
  }

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.act-btn');
    if (!btn) return;
    const resId = btn.dataset.id;
    
    if (btn.classList.contains('dl-act')) {
      e.preventDefault();
      downloadResume(resId);
    }
    if (btn.classList.contains('del-act')) {
      e.preventDefault();
      if (confirm('⚠️ Delete this resume?\n\nThis cannot be undone.')) {
        const deletedRes = resumes.find(r => r.id === resId);
        const title = deletedRes ? deletedRes.title : 'Resume';
        logActivity('deleted', title);
        const updated = resumes.filter(r => r.id !== resId);
        localStorage.setItem(resumesKey, JSON.stringify(updated));
        showToast('Resume deleted', 'error');
        renderDashboardCards();
      }
    }
  });

  const statResumes = $('stat-resumes');
  if (statResumes) statResumes.textContent = resumes.length;

  const statLimit = $('stat-limit');
  if (statLimit) statLimit.textContent = `${resumes.length}/1`;

  const statAts = $('stat-ats');
  const avgAts = resumes.length ? Math.round(resumes.reduce((sum, r) => sum + (r.atsScore || 0), 0) / resumes.length) : 0;
  if (statAts) statAts.textContent = `${avgAts}%`;

  const statDownloads = $('stat-downloads');
  const dlCount = parseInt(localStorage.getItem('dl_count') || '0', 10);
  if (statDownloads) statDownloads.textContent = dlCount;

  const usageText = $('usage-text');
  if (usageText) usageText.textContent = `${resumes.length} out of 1`;
  
  const usageBar = $('usage-bar');
  if (usageBar) usageBar.style.width = resumes.length > 0 ? '100%' : '0%';

  const usageNote = $('usage-note');
  if (usageNote) usageNote.style.display = resumes.length >= 1 ? 'block' : 'none';

  renderRecentActivity();
};

const initDashboardPage = () => {
  if (!$q('.dash-main')) return;

  const user = getAuthUser();

  const usernameEl = $q('.dash-username');
  if (usernameEl && user?.name) usernameEl.textContent = user.name;

  setTimeout(() => {
    showToast(user?.name ? `👋 Welcome back, ${user.name}!` : '👋 Welcome back!', 'info');
  }, 800);

  renderDashboardCards();

  const bar = $q('.usage-bar-fill');
  if (bar) setTimeout(() => { bar.style.width = '100%'; }, 600);

  $q('.dash-sidebar')?.addEventListener('click', (e) => {
    if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
      e.preventDefault();
      logoutUser();
    }
  });

  if (user && user.email) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const fullUser = users.find(u => u.email === user.email) || user;
    const phone = fullUser.phone || 'N/A';

    const accSumName = $('acc-sum-name');
    if (accSumName) accSumName.textContent = user.name;
    
    const accSumContact = $('acc-sum-contact');
    if (accSumContact) accSumContact.innerHTML = `${user.email} &nbsp;·&nbsp; ${phone}`;

    const accTblName = $('acc-tbl-name');
    if (accTblName) accTblName.textContent = user.name;

    const accTblEmail = $('acc-tbl-email');
    if (accTblEmail) accTblEmail.textContent = user.email;

    const accTblPhone = $('acc-tbl-phone');
    if (accTblPhone) accTblPhone.textContent = phone;

    const editName = $('edit-name');
    if (editName) editName.value = user.name;

    const editEmail = $('edit-email');
    if (editEmail) editEmail.value = user.email;

    const editPhone = $('edit-phone');
    if (editPhone) editPhone.value = phone;
  }

  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('a[href="build-resume.html"], a[href="build-resume.html?"]');
    if (link && !link.search.includes('id=')) {
      if (user) {
        const resumes = JSON.parse(localStorage.getItem(getResumesKey(user.email)) || '[]');
        if (resumes.length >= 1) {
          e.preventDefault();
          if (confirm('Plan Limit Reached! 🚀\n\nYou have reached the limit of 1 resume on the Free Plan. Would you like to upgrade your plan to create more?')) {
            window.location.href = 'pricing.html';
          }
        }
      }
    }
  });
};

const initLoginPage = () => {
  const loginForm  = $('loginForm');
  const signupForm = $('signupForm');
  if (!loginForm && !signupForm) return;

  $q('.login-tabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.login-tab');
    if (!tab) return;
    $qa('.login-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.id === 'tabLogin';
    if (loginForm)  loginForm.style.display  = isLogin ? 'flex' : 'none';
    if (signupForm) signupForm.style.display  = isLogin ? 'none' : 'flex';
  });

  const forgotPwLink = $('forgotPwLink');
  if (forgotPwLink) {
    forgotPwLink.addEventListener('click', (e) => {
      e.preventDefault();
      const email = prompt('Enter your registered email address to reset your password:');
      if (!email) return;
      if (!validators.email(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
      }
      
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      const userIndex = users.findIndex(u => u.email === email);
      
      if (userIndex === -1) {
        showToast('No account found with this email', 'error');
        return;
      }
      
      const newPassword = prompt(`Account found for ${users[userIndex].name}.\n\nEnter your new password (min. 8 characters):`);
      if (!newPassword) return;
      
      if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters long', 'error');
        return;
      }
      
      users[userIndex].password = newPassword;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      showToast('Password reset successfully! You can now log in.', 'success');
      
      const loginEmailInput = $('loginEmail');
      if (loginEmailInput) loginEmailInput.value = email;
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('toggle-pw')) return;
    const inp = e.target.previousElementSibling;
    if (!inp) return;
    const showing  = inp.type === 'text';
    inp.type       = showing ? 'password' : 'text';
    e.target.textContent = showing ? '👁️' : '🙈';
  });

  const pwInput     = $('signupPw');
  const strengthBar = $('strengthBar');
  if (pwInput && strengthBar) {
    pwInput.addEventListener('input', () => {
      const v = pwInput.value;
      const score = [v.length >= 8, /[A-Z]/.test(v), /[0-9]/.test(v), /[^A-Za-z0-9]/.test(v)]
        .filter(Boolean).length;
      const colors = ['#ef4444','#f97316','#eab308','#22c55e'];
      const widths = ['25%','50%','75%','100%'];
      strengthBar.style.width      = score ? widths[score - 1] : '0%';
      strengthBar.style.background = score ? colors[score - 1] : 'transparent';
    });
  }

  const signupPhone = $('signupPhone');
  if (signupPhone) {
    signupPhone.addEventListener('input', () => enforcePhoneOnly(signupPhone));
    signupPhone.addEventListener('blur',  () => {
      validators.phone(signupPhone.value)
        ? clearFieldError(signupPhone)
        : showFieldError(signupPhone, 'Enter a valid 10-digit phone number');
    });
  }

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailEl = $('loginEmail'), pwEl = $('loginPw');
    let ok = true;
    if (!validators.email(emailEl.value))       { showFieldError(emailEl, 'Enter a valid email'); ok = false; } else clearFieldError(emailEl);
    if (!validators.minLength(pwEl.value, 6))   { showFieldError(pwEl, 'Minimum 6 characters');  ok = false; } else clearFieldError(pwEl);
    if (!ok) return;

    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      const found = users.find(u => u.email === emailEl.value && u.password === pwEl.value);
      if (!found) { showToast('Invalid email or password', 'error'); return; }
      setAuthUser({ name: found.name, email: found.email });
      
      const resumesKey = getResumesKey(found.email);
      const resumes    = JSON.parse(localStorage.getItem(resumesKey) || '[]');
      if (resumes.length > 0) {
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes[0].data));
      } else {
        
        localStorage.removeItem(STORAGE_KEY);
      }
      showToast(`Welcome back, ${found.name}! 🎉`, 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
    } catch (_) { showToast('Something went wrong. Try again.', 'error'); }
  });

  signupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl  = $('signupName'), emailEl = $('signupEmail');
    const pwEl    = $('signupPw'),   phoneEl = $('signupPhone');
    let ok = true;

    if (!validators.required(nameEl.value))     { showFieldError(nameEl,  'Full name is required');          ok = false; } else clearFieldError(nameEl);
    if (!validators.email(emailEl.value))        { showFieldError(emailEl, 'Enter a valid email');            ok = false; } else clearFieldError(emailEl);
    if (!validators.minLength(pwEl.value, 8))    { showFieldError(pwEl,    'Minimum 8 characters');           ok = false; } else clearFieldError(pwEl);
    if (!validators.phone(phoneEl.value))        { showFieldError(phoneEl, 'Enter exactly 10 digits');        ok = false; } else clearFieldError(phoneEl);
    if (!ok) return;

    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      if (users.find(u => u.email === emailEl.value)) { showToast('Email already registered', 'error'); return; }
      users.push({ name: nameEl.value, email: emailEl.value, password: pwEl.value, phone: phoneEl.value });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      setAuthUser({ name: nameEl.value, email: emailEl.value });
      
      localStorage.removeItem(STORAGE_KEY);
      showToast(`Account created! Welcome, ${nameEl.value} 🎉`, 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
    } catch (_) { showToast('Something went wrong. Try again.', 'error'); }
  });
};

const initContactForm = () => {
  const form = $('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl    = $('contactName');
    const emailEl   = $('contactEmail');
    const msgEl     = $('contactMsg');
    let ok = true;

    if (!validators.required(nameEl?.value ?? ''))  { showFieldError(nameEl, 'Name is required'); ok = false; } else clearFieldError(nameEl);
    if (!validators.email(emailEl?.value ?? ''))     { showFieldError(emailEl, 'Valid email required'); ok = false; } else clearFieldError(emailEl);
    if (!validators.minLength(msgEl?.value ?? '', 10)){ showFieldError(msgEl, 'Message too short'); ok = false; } else clearFieldError(msgEl);
    if (!ok) return;

    showToast('Message sent! We will reply within 24 hours ✉️', 'success');
    form.reset();
  });
};

window.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initScrollReveal();
  initCounters();
  initLoginPage();
  initBuilderPage();
  initDashboardPage();
  initContactForm();
});