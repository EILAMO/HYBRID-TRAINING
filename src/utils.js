function showToast(msg, dur=2200) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// Chart.js defaults
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#4a4845';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = "'DM Mono', monospace";
  Chart.defaults.font.size = 10;
}

function makeLineChart(canvasId, labels, datasets, yLabel='') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets: datasets.map(d => ({
      borderColor: d.color || '#c8a96a',
      backgroundColor: d.color ? d.color.replace(')',',0.08)').replace('rgb','rgba') : 'rgba(200,169,106,0.08)',
      borderWidth: 1.5,
      pointRadius: 3,
      pointBackgroundColor: d.color || '#c8a96a',
      tension: 0.35,
      fill: true,
      ...d,
    }))},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: datasets.length > 1, labels: { color:'#8c8880', font:{size:10}, boxWidth:10 } } },
      scales: {
        x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#4a4845',maxRotation:0,maxTicksLimit:6} },
        y: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#4a4845'}, title:{display:!!yLabel,text:yLabel,color:'#4a4845'} }
      }
    }
  });
}
