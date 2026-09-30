document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.topbar').forEach(function (el) { el.style.display = 'none'; });
  var title = document.querySelector('#library .section-title');
  if (title) title.style.display = 'none';
  var edit = document.querySelector('.edit-content');
  if (edit) edit.style.display = 'none';
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  var home = document.getElementById('home');
  if (home) home.classList.add('active');
  document.querySelectorAll('.nav').forEach(function (n) { n.classList.remove('active'); });
  var homeNav = document.querySelector('.nav[data-page="home"]');
  if (homeNav) homeNav.classList.add('active');
});