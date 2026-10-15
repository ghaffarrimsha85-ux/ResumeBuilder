(function () {
    var cfg = window.DZ;
    var doc = document.getElementById('resumeDoc');
    var box = document.getElementById('scaleBox');
    var stageT = document.getElementById('stageTemplates');
    var stageE = document.getElementById('stageEditor');
    var toastEl = document.getElementById('toast');
    var secList = document.getElementById('secList');
    var toastTimer;

    var DEF_ORDER = ['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'languages', 'hobbies'];
    var TITLES = { summary: 'Summary', experience: 'Experience', education: 'Education', projects: 'Projects', skills: 'Skills', certifications: 'Certifications', languages: 'Languages', hobbies: 'Hobbies' };
    var FONTS = { 'Arial': 'Arial,Helvetica,sans-serif', 'Roboto': "'Roboto',Arial,sans-serif", 'Poppins': "'Poppins',Arial,sans-serif", 'Times New Roman': "'Times New Roman',Times,serif" };
    var SIZES = { Small: '12px', Medium: '13.5px', Large: '15px' };
    var GAPS = { Compact: '10px', Normal: '16px', Spacious: '24px' };

    /* ---------- state ---------- */
    function normalizeOrder(str) {
        var saved = str ? str.split(',').filter(function (k) { return DEF_ORDER.indexOf(k) > -1; }) : [];
        DEF_ORDER.forEach(function (k) { if (saved.indexOf(k) === -1) saved.push(k); });
        return saved;
    }
    var s = cfg.s;
    var S = {
        template: s.template, pri: s.pri, sec: s.sec, txt: s.txt, bg: s.bg,
        font: s.font, size: s.size, theme: s.theme, spacing: s.spacing,
        order: normalizeOrder(s.order),
        hidden: s.hidden ? s.hidden.split(',') : []
    };
    function isAvail(k) { return cfg.available.indexOf(k) > -1; }

    /* ---------- helpers ---------- */
    function toast(msg, type) {
        toastEl.textContent = msg;
        toastEl.className = 'toast show' + (type === 'error' ? ' error' : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.className = 'toast'; }, 2600);
    }

    function scale() {
        var avail = box.parentNode.clientWidth - 44;
        if (window.innerWidth <= 960) avail = box.parentNode.clientWidth - 24;
        var k = Math.min(1, avail / 794);
        doc.style.transform = 'scale(' + k + ')';
        box.style.width = (794 * k) + 'px';
        box.style.height = (doc.offsetHeight * k) + 'px';
    }

    /* ---------- apply settings ---------- */
    function styleDoc(el, tplName) {
        el.className = 'doc tpl-' + tplName;
        el.setAttribute('data-theme', S.theme.toLowerCase());
        el.style.setProperty('--pri', S.pri);
        el.style.setProperty('--sec', S.sec);
        el.style.setProperty('--txt', S.txt);
        el.style.setProperty('--bg', S.bg);
        el.style.setProperty('--fs', SIZES[S.size]);
        el.style.setProperty('--gap', GAPS[S.spacing]);
        el.style.fontFamily = FONTS[S.font];
        el.querySelectorAll('.sec').forEach(function (sec) {
            var key = sec.getAttribute('data-sec');
            sec.style.order = S.order.indexOf(key);
            sec.style.display = S.hidden.indexOf(key) > -1 ? 'none' : '';
        });
    }

    function apply() {
        styleDoc(doc, S.template || 'classic');
        scale();
    }

    // live thumbnails: the user's own resume shown in every template
    function buildThumbs() {
        document.querySelectorAll('.tpl-card').forEach(function (card) {
            var th = card.querySelector('.thumb');
            th.innerHTML = '';
            var w = th.clientWidth;
            if (!w) return;
            var k = w / 794;
            var c = doc.cloneNode(true);
            c.removeAttribute('id');
            styleDoc(c, card.getAttribute('data-tpl'));
            c.style.transformOrigin = 'top left';
            c.style.transform = 'scale(' + k + ')';
            th.style.height = (1123 * k) + 'px';
            th.appendChild(c);
        });
    }

    /* ---------- control panel ---------- */
    function syncControls() {
        document.getElementById('c-pri').value = S.pri;
        document.getElementById('c-sec').value = S.sec;
        document.getElementById('c-txt').value = S.txt;
        document.getElementById('c-bg').value = S.bg;
        document.getElementById('fontSel').value = S.font;
        ['size', 'theme', 'spacing'].forEach(function (g) {
            document.querySelectorAll('.seg[data-group="' + g + '"] button').forEach(function (b) {
                b.classList.toggle('on', b.getAttribute('data-v') === S[g]);
            });
        });
    }

    function buildSecList() {
        secList.innerHTML = '';
        S.order.filter(isAvail).forEach(function (k) {
            var li = document.createElement('li');
            li.setAttribute('data-key', k);
            li.innerHTML =
                '<label><input type="checkbox" ' + (S.hidden.indexOf(k) === -1 ? 'checked' : '') + ' /> ' + TITLES[k] + '</label>' +
                '<button type="button" class="mv" data-dir="-1" title="Move up">▲</button>' +
                '<button type="button" class="mv" data-dir="1" title="Move down">▼</button>';
            secList.appendChild(li);
        });
    }

    secList.addEventListener('change', function (e) {
        if (e.target.type !== 'checkbox') return;
        var k = e.target.closest('li').getAttribute('data-key');
        var i = S.hidden.indexOf(k);
        if (e.target.checked) { if (i > -1) S.hidden.splice(i, 1); }
        else if (i === -1) { S.hidden.push(k); }
        apply();
    });

    secList.addEventListener('click', function (e) {
        var btn = e.target.closest('.mv');
        if (!btn) return;
        var k = btn.closest('li').getAttribute('data-key');
        var dir = parseInt(btn.getAttribute('data-dir'), 10);
        var list = S.order.filter(isAvail);
        var i = list.indexOf(k), j = i + dir;
        if (j < 0 || j >= list.length) return;
        var a = S.order.indexOf(list[i]), b = S.order.indexOf(list[j]);
        var tmp = S.order[a]; S.order[a] = S.order[b]; S.order[b] = tmp;
        buildSecList();
        apply();
    });

    [['c-pri', 'pri'], ['c-sec', 'sec'], ['c-txt', 'txt'], ['c-bg', 'bg']].forEach(function (p) {
        document.getElementById(p[0]).addEventListener('input', function () { S[p[1]] = this.value; apply(); });
    });

    document.getElementById('fontSel').addEventListener('change', function () { S.font = this.value; apply(); });

    document.querySelectorAll('.seg button').forEach(function (b) {
        b.addEventListener('click', function () {
            var g = this.parentNode.getAttribute('data-group');
            S[g] = this.getAttribute('data-v');
            if (g === 'theme') {
                if (S.theme === 'Dark') { S.bg = '#1e293b'; S.txt = '#e2e8f0'; }
                else { S.bg = '#ffffff'; S.txt = '#334155'; }
            }
            syncControls();
            apply();
        });
    });

    document.querySelectorAll('.sw').forEach(function (b) {
        b.addEventListener('click', function () {
            S.pri = this.getAttribute('data-pri');
            S.sec = this.getAttribute('data-sec');
            syncControls();
            apply();
        });
    });

    /* ---------- save / pdf ---------- */
    function save() {
        return fetch(cfg.saveUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resumeId: cfg.id,
                data: {
                    TemplateName: S.template, PrimaryColor: S.pri, SecondaryColor: S.sec,
                    TextColor: S.txt, BackgroundColor: S.bg, FontFamily: S.font,
                    FontSize: S.size, Theme: S.theme, Spacing: S.spacing,
                    SectionOrder: S.order.join(','), HiddenSections: S.hidden.join(',')
                }
            })
        }).then(function (r) {
            if (!r.ok) throw new Error('http');
            return r.json();
        }).then(function (res) {
            if (!res.success) return Promise.reject({ msg: res.message });
            return res;
        });
    }

    function fail(e) { toast(e && e.msg ? e.msg : 'Something went wrong. Please try again.', 'error'); }

    document.getElementById('btnSave').addEventListener('click', function () {
        save().then(function () { toast('Resume saved successfully!'); }).catch(fail);
    });

    document.getElementById('btnPdf').addEventListener('click', function () {
        save().then(function () {
            var oldTitle = document.title;
            document.title = 'MyResume';
            window.onafterprint = function () { document.title = oldTitle; window.onafterprint = null; };
            window.print();
        }).catch(fail);
    });

    /* ---------- stages ---------- */
    function markSelected() {
        document.querySelectorAll('.tpl-card').forEach(function (c) {
            c.classList.toggle('selected', c.getAttribute('data-tpl') === S.template);
        });
    }

    function showEditor() {
        stageT.classList.add('hidden');
        stageE.classList.remove('hidden');
        window.scrollTo(0, 0);
        apply();
    }

    function showTemplates() {
        stageE.classList.add('hidden');
        stageT.classList.remove('hidden');
        buildThumbs();                       // stage must be visible first, then build
        markSelected();
        window.scrollTo(0, 0);
    }

    document.querySelectorAll('.tpl-card').forEach(function (c) {
        c.addEventListener('click', function () {
            S.template = this.getAttribute('data-tpl');
            markSelected();
            showEditor();
            save().catch(function () { });
        });
    });

    document.getElementById('btnChange').addEventListener('click', showTemplates);

    window.addEventListener('resize', function () {
        if (!stageE.classList.contains('hidden')) scale(); else buildThumbs();
    });

    /* ---------- init ---------- */
    syncControls();
    buildSecList();
    markSelected();
    if (S.template) {
        showEditor();
    } else {
        stageT.classList.remove('hidden');
        buildThumbs();
    }
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
            if (!stageE.classList.contains('hidden')) scale(); else buildThumbs();
        });
    }
})();