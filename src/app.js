const VIEWS = ['home','workout','run','nutrition','progress','body'];
let currentView = 'home';

function switchView(name) {
  if (!VIEWS.includes(name)) return;
  currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + name)?.classList.add('active');
  document.querySelector(`.nav-btn[data-view="${name}"]`)?.classList.add('active');
  renderView(name);
}

function renderView(name) {
  switch(name) {
    case 'home':      renderHome(); break;
    case 'workout':   renderWorkout(); break;
    case 'run':       renderRun(); break;
    case 'nutrition': renderNutrition(); break;
    case 'progress':  renderProgress(); break;
    case 'body':      renderBody(); break;
  }
}

// Nav click handlers
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Init — hide splash and render home
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('splash').classList.add('gone');
    renderHome();
  }, 1800);
});
