document.addEventListener('DOMContentLoaded', function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  $$('.topbar').forEach(function (el) { el.style.display = 'none'; });
  var title = $('#library .section-title');
  if (title) title.style.display = 'none';
  var edit = $('.edit-content');
  if (edit) edit.style.display = 'none';

  $$('.page').forEach(function (p) { p.classList.remove('active'); });
  var home = document.getElementById('home');
  if (home) home.classList.add('active');
  $$('.nav').forEach(function (n) { n.classList.remove('active'); });
  var homeNav = $('.nav[data-page="home"]');
  if (homeNav) homeNav.classList.add('active');

  var tabs = $('#library .tabs');
  var roles = document.getElementById('roles');
  var artifacts = document.getElementById('artifacts');
  if (tabs && roles && artifacts) {
    tabs.innerHTML =
      '<button class="tab active" data-lib="roles"><span class="tab-ico">🃏</span><span class="tab-copy"><b>LÁ BÀI</b></span></button>' +
      '<button class="tab" data-lib="artifacts"><span class="tab-ico">✦</span><span class="tab-copy"><b>LÁ ARTIFACT</b></span></button>' +
      '<button class="tab" data-lib="actions"><span class="tab-ico">⚡</span><span class="tab-copy"><b>HÀNH ĐỘNG</b></span></button>' +
      '<button class="tab" data-lib="effects"><span class="tab-ico">◉</span><span class="tab-copy"><b>HIỆU ỨNG</b></span></button>';

    var actions = document.createElement('div');
    actions.id = 'actions';
    actions.className = 'library-panel';
    actions.innerHTML =
      '<div class="library-page-head"><h3>Hành Động</h3><span>Dùng lại theo ID</span></div>' +
      '<div class="action-type-tabs"><button class="action-type-btn active" data-action-kind="role">Lá Bài</button><button class="action-type-btn" data-action-kind="artifact">Lá Artifact</button></div>' +
      '<div id="roleActionList">' +
        '<div class="lib-editor-card" data-action-id="action_exile"><h4>ĐUỔI</h4><div class="lib-editor-grid">' +
          '<div class="lib-field full"><label>ID</label><input value="action_exile" readonly></div>' +
          '<div class="lib-field"><label>Tên</label><input data-k="name" value="Đuổi"></div>' +
          '<div class="lib-field"><label>Thời điểm</label><select data-k="when"><option selected>Ban đêm</option><option>Ban ngày</option><option>Cả ngày và đêm</option></select></div>' +
          '<div class="lib-field"><label>Số lần</label><input data-k="uses" value="Mỗi đêm"></div>' +
          '<div class="lib-field"><label>Số mục tiêu</label><input data-k="targets" value="1"></div>' +
          '<div class="lib-field"><label>Chọn bản thân</label><select data-k="self"><option selected>Không</option><option>Có</option></select></div>' +
          '<div class="lib-field"><label>Hiệu lực</label><select data-k="timing"><option selected>Ngay lập tức</option><option>Sáng hôm sau</option><option>Đêm hôm sau</option></select></div>' +
          '<div class="lib-field full"><label>Đối tượng hợp lệ</label><input data-k="valid" value="Người chơi đang sống khác bản thân"></div>' +
          '<div class="lib-field full"><label>Hiệu ứng</label><select data-k="effect"><option value="effect_exile" selected>Đuổi</option><option value="effect_revive">Hồi Sinh</option></select></div>' +
        '</div><div class="lib-save"><button data-save-action="action_exile">Lưu Hành Động</button></div></div>' +
        '<div class="lib-editor-card" data-action-id="action_revive"><h4>HỒI SINH</h4><div class="lib-editor-grid">' +
          '<div class="lib-field full"><label>ID</label><input value="action_revive" readonly></div>' +
          '<div class="lib-field"><label>Tên</label><input data-k="name" value="Hồi Sinh"></div>' +
          '<div class="lib-field"><label>Thời điểm</label><select data-k="when"><option selected>Ban đêm</option><option>Ban ngày</option><option>Cả ngày và đêm</option></select></div>' +
          '<div class="lib-field"><label>Số lần</label><input data-k="uses" value="1 lần / suốt ván"></div>' +
          '<div class="lib-field"><label>Số mục tiêu</label><input data-k="targets" value="1"></div>' +
          '<div class="lib-field"><label>Chọn bản thân</label><select data-k="self"><option selected>Không</option><option>Có</option></select></div>' +
          '<div class="lib-field"><label>Hiệu lực</label><select data-k="timing"><option selected>Ngay lập tức</option><option>Sáng hôm sau</option><option>Đêm hôm sau</option></select></div>' +
          '<div class="lib-field full"><label>Đối tượng hợp lệ</label><input data-k="valid" value="Người chết từ ngày hoặc đêm hôm trước"></div>' +
          '<div class="lib-field full"><label>Hiệu ứng</label><select data-k="effect"><option value="effect_exile">Đuổi</option><option value="effect_revive" selected>Hồi Sinh</option></select></div>' +
        '</div><div class="lib-save"><button data-save-action="action_revive">Lưu Hành Động</button></div></div>' +
      '</div>' +
      '<div id="artifactActionList" style="display:none"><div class="lib-empty"><b>Chưa có Hành Động Artifact mẫu</b><br>Hành Động Artifact dùng cùng cấu trúc nhưng được quản lý riêng.</div></div>';

    var effects = document.createElement('div');
    effects.id = 'effects';
    effects.className = 'library-panel';
    effects.innerHTML =
      '<div class="library-page-head"><h3>Hiệu Ứng</h3><span>Dùng chung</span></div>' +
      '<div class="lib-editor-card" data-effect-id="effect_exile"><h4>ĐUỔI</h4><div class="lib-editor-grid">' +
        '<div class="lib-field full"><label>ID</label><input value="effect_exile" readonly></div>' +
        '<div class="lib-field full"><label>Tên</label><input data-k="name" value="Đuổi"></div>' +
        '<div class="lib-field full"><label>Mô tả xử lý</label><textarea data-k="rule">Người bị Đuổi ra khỏi làng. Tất cả các tác động lên người đó đều không có tác dụng.</textarea></div>' +
      '</div><div class="lib-save"><button data-save-effect="effect_exile">Lưu Hiệu Ứng</button></div></div>' +
      '<div class="lib-editor-card" data-effect-id="effect_revive"><h4>HỒI SINH</h4><div class="lib-editor-grid">' +
        '<div class="lib-field full"><label>ID</label><input value="effect_revive" readonly></div>' +
        '<div class="lib-field full"><label>Tên</label><input data-k="name" value="Hồi Sinh"></div>' +
        '<div class="lib-field full"><label>Mô tả xử lý</label><textarea data-k="rule">Chuyển mục tiêu hợp lệ từ trạng thái Chết về Sống.</textarea></div>' +
      '</div><div class="lib-save"><button data-save-effect="effect_revive">Lưu Hiệu Ứng</button></div></div>';

    artifacts.parentNode.appendChild(actions);
    artifacts.parentNode.appendChild(effects);

    $$('#library .tab').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#library .tab').forEach(function (x) { x.classList.toggle('active', x === b); });
        $$('#library .library-panel').forEach(function (p) { p.classList.toggle('active', p.id === b.getAttribute('data-lib')); });
        var lp = document.getElementById('library');
        if (lp) lp.scrollTop = 0;
      });
    });

    $$('.action-type-btn', actions).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.action-type-btn', actions).forEach(function (x) { x.classList.toggle('active', x === b); });
        var roleList = document.getElementById('roleActionList');
        var artifactList = document.getElementById('artifactActionList');
        var isRole = b.getAttribute('data-action-kind') === 'role';
        if (roleList) roleList.style.display = isRole ? 'block' : 'none';
        if (artifactList) artifactList.style.display = isRole ? 'none' : 'block';
      });
    });
  }

  var settings = $('.settings');
  if (settings) {
    var link = document.createElement('div');
    link.className = 'card-link-editor';
    link.innerHTML =
      '<div class="card-link-row"><label>Loại</label><select id="cardTypeV204"><option>Lá Bài</option><option>Lá Artifact</option></select></div>' +
      '<div class="card-link-row"><label>Action 1</label><select id="cardAction1"><option value="action_exile">Đuổi</option><option value="action_revive">Hồi Sinh</option></select></div>' +
      '<div class="card-link-row"><label>Action 2</label><select id="cardAction2"><option value="action_revive">Hồi Sinh</option><option value="action_exile">Đuổi</option></select></div>' +
      '<div class="card-link-row"><label>Rule chung</label><textarea id="cardRuleV204">Mỗi đêm chỉ được chọn sử dụng 1 trong 2 Action: Đuổi HOẶC Hồi Sinh. Không thể sử dụng cả hai trong cùng một đêm.</textarea></div>' +
      '<p class="card-link-note">Lá Bài chỉ tham chiếu Action theo ID. Chi tiết Action chỉnh tại trang Hành Động; Action tham chiếu Hiệu Ứng dùng chung theo ID.</p>';
    var h3 = settings.querySelector('h3');
    if (h3) h3.insertAdjacentElement('afterend', link); else settings.prepend(link);
  }


  function restoreEditorCards() {
    $('[data-action-id]').forEach(function (card) {
      try {
        var saved = JSON.parse(localStorage.getItem('gmww-v204-' + card.getAttribute('data-action-id')) || 'null');
        if (saved) $('[data-k]', card).forEach(function (x) { var k = x.getAttribute('data-k'); if (saved[k] != null) x.value = saved[k]; });
      } catch (_) {}
    });
    $('[data-effect-id]').forEach(function (card) {
      try {
        var saved = JSON.parse(localStorage.getItem('gmww-v204-' + card.getAttribute('data-effect-id')) || 'null');
        if (saved) $('[data-k]', card).forEach(function (x) { var k = x.getAttribute('data-k'); if (saved[k] != null) x.value = saved[k]; });
      } catch (_) {}
    });
  }

  function syncPreviewFromActionLibrary() {
    var skills = $('.skill');
    var exile = $('[data-action-id="action_exile"]');
    var revive = $('[data-action-id="action_revive"]');
    if (exile && skills[0]) {
      var n1 = $('[data-k="name"]', exile), u1 = $('[data-k="uses"]', exile);
      if (n1) skills[0].querySelector('b').textContent = '① ' + n1.value.toUpperCase();
      if (u1) skills[0].querySelector('span').textContent = u1.value;
    }
    if (revive && skills[1]) {
      var n2 = $('[data-k="name"]', revive), u2 = $('[data-k="uses"]', revive);
      if (n2) skills[1].querySelector('b').textContent = '② ' + n2.value.toUpperCase();
      if (u2) skills[1].querySelector('span').textContent = u2.value;
    }
  }

  function saveCardLinks() {
    var data = {
      type: $('#cardTypeV204') ? $('#cardTypeV204').value : 'Lá Bài',
      action1: $('#cardAction1') ? $('#cardAction1').value : 'action_exile',
      action2: $('#cardAction2') ? $('#cardAction2').value : 'action_revive',
      rule: $('#cardRuleV204') ? $('#cardRuleV204').value : ''
    };
    localStorage.setItem('gmww-v204-card-links', JSON.stringify(data));
  }
  ['cardTypeV204','cardAction1','cardAction2','cardRuleV204'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', saveCardLinks);
  });
  var cr = document.getElementById('cardRuleV204');
  if (cr) cr.addEventListener('input', saveCardLinks);

  try {
    var saved = JSON.parse(localStorage.getItem('gmww-v204-card-links') || 'null');
    if (saved) {
      if ($('#cardTypeV204')) $('#cardTypeV204').value = saved.type || 'Lá Bài';
      if ($('#cardAction1')) $('#cardAction1').value = saved.action1 || 'action_exile';
      if ($('#cardAction2')) $('#cardAction2').value = saved.action2 || 'action_revive';
      if ($('#cardRuleV204')) $('#cardRuleV204').value = saved.rule || '';
    }
  } catch (_) {}

  restoreEditorCards();
  syncPreviewFromActionLibrary();
  $('[data-action-id] [data-k]').forEach(function (el) { el.addEventListener('input', syncPreviewFromActionLibrary); });

  $('[data-save-action]').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = b.closest('[data-action-id]');
      if (!card) return;
      var obj = {};
      $$('[data-k]', card).forEach(function (x) { obj[x.getAttribute('data-k')] = x.value; });
      localStorage.setItem('gmww-v204-' + card.getAttribute('data-action-id'), JSON.stringify(obj));
      syncPreviewFromActionLibrary();
    });
  });
  $$('[data-save-effect]').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = b.closest('[data-effect-id]');
      if (!card) return;
      var obj = {};
      $$('[data-k]', card).forEach(function (x) { obj[x.getAttribute('data-k')] = x.value; });
      localStorage.setItem('gmww-v204-' + card.getAttribute('data-effect-id'), JSON.stringify(obj));
    });
  });

  $$('.nav').forEach(function (n) {
    n.addEventListener('click', function () {
      var p = document.getElementById(n.getAttribute('data-page'));
      if (p) p.scrollTop = 0;
    }, true);
  });
});