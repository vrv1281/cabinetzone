/* CabinetZone — contact form logic
   Called by site.js after the contact-form partial is injected. */
window.initContactForm = function () {
  var form = document.getElementById('quote-form');
  if (!form) return;

  var _firstInteract = 0;
  var MAX_SUBS = 3;
  var COOLDOWN  = 60000;

  form.addEventListener('focusin', function init() {
    if (!_firstInteract) _firstInteract = Date.now();
    form.removeEventListener('focusin', init);
  });

  document.getElementById('msg').addEventListener('input', function () {
    var len = this.value.length;
    var c = document.getElementById('msg-count');
    c.textContent = len + ' / 2000';
    c.style.color = len < 20 ? 'rgba(220,90,90,0.7)' : len > 1800 ? 'rgba(220,180,80,0.7)' : 'rgba(255,255,255,0.25)';
  });

  function sanitize(s) { return s.replace(/<[^>]*>/g, '').trim(); }

  function showErr(errId, msg) {
    var el = document.getElementById(errId);
    el.textContent = msg; el.classList.add('visible');
    var inp = document.getElementById(errId.replace('err-', ''));
    if (inp) { inp.classList.remove('valid'); inp.classList.add('invalid'); }
  }

  function clearErr(errId) {
    var el = document.getElementById(errId);
    el.textContent = ''; el.classList.remove('visible');
    var inp = document.getElementById(errId.replace('err-', ''));
    if (inp) { inp.classList.remove('invalid'); inp.classList.add('valid'); }
  }

  function clearAll() {
    ['fname','lname','email','phone','ptype','msg'].forEach(function (f) {
      var e = document.getElementById('err-' + f);
      if (e) { e.textContent = ''; e.classList.remove('visible'); }
      var i = document.getElementById(f);
      if (i) i.classList.remove('invalid', 'valid');
    });
    var b = document.getElementById('form-banner');
    b.textContent = ''; b.className = 'form-banner';
  }

  function setBanner(type, msg) {
    var b = document.getElementById('form-banner');
    b.textContent = msg; b.className = 'form-banner ' + type;
    b.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function vName(val, label, id) {
    if (!val) { showErr(id, label + ' is required.'); return false; }
    if (val.length < 2) { showErr(id, label + ' must be at least 2 characters.'); return false; }
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/.test(val)) { showErr(id, 'Please enter a valid ' + label.toLowerCase() + '.'); return false; }
    clearErr(id); return true;
  }

  function vEmail(val) {
    if (!val) { showErr('err-email', 'Email is required.'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) { showErr('err-email', 'Please enter a valid email address.'); return false; }
    clearErr('err-email'); return true;
  }

  function vPhone(val) {
    if (!val) { document.getElementById('phone').classList.remove('valid','invalid'); return true; }
    var d = val.replace(/[\s\-().+]/g, '');
    if (!/^(04\d{8}|614\d{8})$/.test(d)) {
      showErr('err-phone', 'Please enter a valid Australian mobile number (e.g. 0412 345 678).');
      return false;
    }
    clearErr('err-phone'); return true;
  }

  function vPtype(val) {
    if (!val) { showErr('err-ptype', 'Please select a project type.'); return false; }
    clearErr('err-ptype'); return true;
  }

  function vMsg(val) {
    if (!val || val.length < 20) { showErr('err-msg', 'Please describe your project (min. 20 characters).'); return false; }
    clearErr('err-msg'); return true;
  }

  window.handleSubmit = function (e) {
    e.preventDefault();
    clearAll();

    if (document.getElementById('hp_website').value) return;

    if (!_firstInteract || (Date.now() - _firstInteract) < 3000) {
      setBanner('error', 'Please take a moment to fill in all the details before submitting.');
      return;
    }

    var now = Date.now();
    var rd = JSON.parse(sessionStorage.getItem('czform') || '{"count":0,"last":0}');
    if (rd.count >= MAX_SUBS && (now - rd.last) < COOLDOWN) {
      var wait = Math.ceil((COOLDOWN - (now - rd.last)) / 1000);
      setBanner('error', 'Too many submissions — please wait ' + wait + ' seconds before trying again.');
      return;
    }
    if ((now - rd.last) >= COOLDOWN) rd = { count: 0, last: 0 };

    var fname = sanitize(document.getElementById('fname').value);
    var lname = sanitize(document.getElementById('lname').value);
    var email = sanitize(document.getElementById('email').value);
    var phone = sanitize(document.getElementById('phone').value);
    var ptype = document.getElementById('ptype').value;
    var msg   = sanitize(document.getElementById('msg').value);

    var ok = [
      vName(fname, 'First Name', 'err-fname'),
      vName(lname, 'Last Name',  'err-lname'),
      vEmail(email),
      vPhone(phone),
      vPtype(ptype),
      vMsg(msg),
    ].every(Boolean);

    if (!ok) {
      setBanner('error', 'Please fix the errors above before submitting.');
      var firstErr = document.querySelector('.field-error.visible');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var btn = document.getElementById('submit-btn');
    btn.textContent = 'Sending…';
    btn.disabled = true;
    rd.count++; rd.last = now;
    sessionStorage.setItem('czform', JSON.stringify(rd));

    var payload = {
      _subject: 'New Consultation Request — CabinetZone',
      name: fname + ' ' + lname,
      email: email,
      phone: phone || 'Not provided',
      project_type: ptype,
      message: msg
    };

    fetch('https://formspree.io/f/mgoqvldq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.ok) {
        setBanner('success', "Thank you! We'll be in touch within 1–2 business days.");
        btn.textContent = 'Request Sent';
        btn.style.cssText += ';background:rgba(80,180,120,0.18);border-color:rgba(80,180,120,0.4);color:#70c090;';
        e.target.reset();
        document.getElementById('msg-count').textContent = '0 / 2000';
        document.getElementById('msg-count').style.color = 'rgba(255,255,255,0.25)';
        ['fname','lname','email','phone','ptype','msg'].forEach(function (f) {
          var el = document.getElementById(f); if (el) el.classList.remove('valid');
        });
        setTimeout(function () { btn.textContent = 'Send Request'; btn.disabled = false; btn.style.cssText = ''; }, 6000);
      } else {
        throw new Error(data.error || 'Submission failed');
      }
    })
    .catch(function () {
      setBanner('error', 'Something went wrong. Please email us directly at info@cabinetzone.com.au');
      btn.textContent = 'Send Request';
      btn.disabled = false;
    });
  };

  document.getElementById('fname').addEventListener('blur', function () { vName(sanitize(this.value), 'First Name', 'err-fname'); });
  document.getElementById('lname').addEventListener('blur', function () { vName(sanitize(this.value), 'Last Name',  'err-lname'); });
  document.getElementById('email').addEventListener('blur', function () { vEmail(sanitize(this.value)); });
  document.getElementById('phone').addEventListener('blur', function () { vPhone(sanitize(this.value)); });
  document.getElementById('ptype').addEventListener('change', function () { vPtype(this.value); });
  document.getElementById('msg').addEventListener('blur',  function () { vMsg(sanitize(this.value)); });
};
