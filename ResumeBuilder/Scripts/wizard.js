(function () {
    var cfg = window.RB;
    var panels = document.querySelectorAll('.step-panel');
    var dots = document.querySelectorAll('.stepper .st');
    var bar = document.getElementById('bar');
    var btnBack = document.getElementById('btnBack');
    var btnNext = document.getElementById('btnNext');
    var toastEl = document.getElementById('toast');
    var total = panels.length, current = 0, maxVisited = 0, toastTimer;

    /* ---------- helpers ---------- */
    function toast(msg, type) {
        toastEl.textContent = msg;
        toastEl.className = 'toast show' + (type === 'error' ? ' error' : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.className = 'toast'; }, 2800);
    }

    function val(id) { return document.getElementById(id).value.trim(); }

    function post(url, body) {
        return fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (r) {
            if (!r.ok) throw new Error('http');
            return r.json();
        }).then(function (res) {
            if (!res.success) return Promise.reject({ msg: res.message || 'Could not save.' });
            return res;
        });
    }

    /* ---------- dynamic rows ---------- */
    window.addRow = function (key) {
        var tpl = document.getElementById('tpl-' + key);
        var list = document.getElementById('list-' + key);
        list.appendChild(tpl.content.cloneNode(true));
        var rows = list.querySelectorAll('.row-item');
        var first = rows[rows.length - 1].querySelector('input, textarea');
        if (first) first.focus();
    };

    window.removeRow = function (btn) {
        var row = btn.closest('.row-item');
        var list = row.parentNode;
        list.removeChild(row);
        if (list.querySelectorAll('.row-item').length === 0) {
            window.addRow(list.id.replace('list-', ''));
        }
    };

    function collectRows(key) {
        var out = [];
        document.querySelectorAll('#list-' + key + ' .row-item').forEach(function (row) {
            var obj = {}, fields = row.querySelectorAll('[data-f]');
            fields.forEach(function (f) { obj[f.getAttribute('data-f')] = f.value.trim(); });
            if (fields.length && fields[0].value.trim() !== '') out.push(obj); // skip empty rows
        });
        return out;
    }

    // make sure every list starts with at least one row
    ['education', 'experience', 'skills', 'projects', 'certifications', 'languages', 'hobbies'].forEach(function (k) {
        if (document.querySelectorAll('#list-' + k + ' .row-item').length === 0) window.addRow(k);
    });
    document.activeElement && document.activeElement.blur();

    /* ---------- savers (one per step) ---------- */
    function savePersonal() {
        var ids = ['FullName', 'Email'];
        var ok = true;
        ids.forEach(function (id) {
            var el = document.getElementById(id);
            var bad = el.value.trim() === '';
            el.classList.toggle('invalid', bad);
            if (bad) ok = false;
        });
        if (!ok) return Promise.reject({ msg: 'Full name and email are required.' });
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val('Email'))) {
            document.getElementById('Email').classList.add('invalid');
            return Promise.reject({ msg: 'Please enter a valid email address.' });
        }
        return post(cfg.urls.personal, {
            resumeId: cfg.id,
            title: val('Title'),
            data: {
                FullName: val('FullName'), JobTitle: val('JobTitle'),
                Email: val('Email'), Phone: val('Phone'),
                Address: val('Address'), PhotoPath: val('PhotoPath'),
                Summary: val('Summary')
            }
        });
    }

    function listSaver(key) {
        return function () { return post(cfg.urls[key], { resumeId: cfg.id, items: collectRows(key) }); };
    }

    var savers = [
        savePersonal,
        listSaver('education'), listSaver('experience'), listSaver('skills'),
        listSaver('projects'), listSaver('certifications'), listSaver('languages'), listSaver('hobbies')
    ];

    /* ---------- step display ---------- */
    function show(i) {
        current = i;
        if (i > maxVisited) maxVisited = i;
        panels.forEach(function (p, idx) { p.classList.toggle('active', idx === i); });
        dots.forEach(function (d, idx) {
            d.classList.toggle('active', idx === i);
            d.classList.toggle('done', idx < i);
            d.classList.toggle('visited', idx <= maxVisited);
        });
        bar.style.width = ((i + 1) / total * 100) + '%';
        btnBack.disabled = (i === 0);
        btnNext.innerHTML = (i === total - 1) ? 'Save &amp; Finish ✓' : 'Save &amp; Next →';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function setBusy(busy) {
        btnNext.disabled = busy;
        btnBack.disabled = busy || current === 0;
        if (busy) btnNext.textContent = 'Saving...';
        else btnNext.innerHTML = (current === total - 1) ? 'Save &amp; Finish ✓' : 'Save &amp; Next →';
    }

    btnNext.addEventListener('click', function () {
        setBusy(true);
        savers[current]().then(function () {
            if (current === total - 1) {
                toast('Resume saved successfully!');
                setTimeout(function () { window.location.href = cfg.finishUrl; }, 900);
            } else {
                show(current + 1);
            }
        }).catch(function (e) {
            toast(e && e.msg ? e.msg : 'Something went wrong. Please try again.', 'error');
        }).then(function () { setBusy(false); });
    });

    btnBack.addEventListener('click', function () { if (current > 0) show(current - 1); });

    dots.forEach(function (d, idx) {
        d.addEventListener('click', function () { if (idx <= maxVisited) show(idx); });
    });

    document.querySelectorAll('#step-personal input').forEach(function () { });
    ['FullName', 'Email'].forEach(function (id) {
        document.getElementById(id).addEventListener('input', function () { this.classList.remove('invalid'); });
    });

    /* ---------- photo upload ---------- */
    document.getElementById('photoFile').addEventListener('change', function () {
        var file = this.files[0];
        if (!file) return;
        var fd = new FormData();
        fd.append('resumeId', cfg.id);
        fd.append('file', file);
        toast('Uploading photo...');
        fetch(cfg.urls.photo, { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (!res.success) { toast(res.message, 'error'); return; }
                document.getElementById('PhotoPath').value = res.path;
                document.getElementById('photoBox').innerHTML = '<img src="' + res.url + '" alt="Photo" />';
                toast('Photo uploaded.');
            })
            .catch(function () { toast('Photo upload failed.', 'error'); });
    });

    show(0);
})();