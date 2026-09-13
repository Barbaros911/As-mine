(() => {
  const panel = document.querySelector('.panel');
  const durations = document.querySelector('#durations');
  const request = document.querySelector('#request');
  if (!panel || !durations || !request) return;

  let chosenDuration = 3;
  const durationValues = [3,4,5,6,7,8,9,10];

  // La durée commerciale correspond à toute la mise à disposition :
  // elle démarre à la prise en charge et se termine à l'arrivée finale,
  // arrêts et circulation compris.
  durations.innerHTML = durationValues.map(h =>
    `<button type="button" class="dur${h === chosenDuration ? ' on' : ''}" data-duration-hours="${h}" aria-pressed="${h === chosenDuration}">${h} h</button>`
  ).join('');

  const note = document.createElement('div');
  note.className = 'duration-rule';
  note.innerHTML = '<strong>Durée totale de la prestation</strong><span>De la prise en charge jusqu’à l’arrivée finale, arrêts compris.</span><small>Minimum 3 h · maximum 10 h</small>';
  durations.insertAdjacentElement('afterend', note);

  const style = document.createElement('style');
  style.textContent = `
    #durations{grid-template-columns:repeat(4,minmax(0,1fr))}
    .duration-rule{margin-top:10px;padding:11px 12px;border:1px solid #dce7ef;border-radius:10px;background:#f7fbfe;display:grid;gap:3px;color:#102f4b}
    .duration-rule strong{font-size:12px}.duration-rule span{font-size:12px;line-height:1.35}.duration-rule small{font-size:11px;color:#637a8d}
    @media(max-width:520px){#durations{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.dur{padding:10px 3px;font-size:13px}}
  `;
  document.head.appendChild(style);

  function setDuration(hours) {
    chosenDuration = Math.min(10, Math.max(3, Number(hours) || 3));
    durations.querySelectorAll('.dur').forEach(btn => {
      const active = Number(btn.dataset.durationHours) === chosenDuration;
      btn.classList.toggle('on', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  durations.addEventListener('click', event => {
    const btn = event.target.closest('[data-duration-hours]');
    if (!btn) return;
    setDuration(btn.dataset.durationHours);
  });

  // Les packs pré-règlent une durée, mais le client reste libre de choisir
  // n'importe quelle durée entière entre 3 et 10 heures.
  document.querySelectorAll('[data-pack]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.pack === 'essential') setDuration(3);
      else if (btn.dataset.pack === 'discovery') setDuration(5);
      else setDuration(3);
    });
  });

  // Rend la promesse « sur mesure » explicite dans la carte commerciale.
  const customCard = document.querySelector('[data-pack="custom"]')?.closest('.card');
  const customDurationChip = customCard?.querySelector('.chip');
  if (customDurationChip) customDurationChip.textContent = '3 à 10 heures';

  // On prend la main avant l'ancien handler afin que le message WhatsApp
  // reflète toujours la règle 3–10 h et la définition exacte de la durée.
  request.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const route = [...document.querySelectorAll('#route .stop span')]
      .map(el => el.textContent.trim())
      .filter(Boolean);
    if (!route.length) {
      const toast = document.querySelector('#toast');
      if (toast) {
        toast.textContent = 'Choisissez au moins un monument';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1800);
      }
      return;
    }

    const start = document.querySelector('#start')?.value.trim() || 'À préciser';
    const pax = document.querySelector('#pax')?.textContent.trim() || '2';
    const msg = [
      'Bonjour ELA Transfer, je souhaite demander un parcours Paris.',
      '',
      `Prise en charge : ${start}`,
      `Durée totale : ${chosenDuration} h`,
      'Durée comptée de la prise en charge jusqu’à l’arrivée finale, arrêts compris.',
      `Passagers : ${pax}`,
      `Parcours : ${route.join(' → ')}`,
      '',
      'Merci de me confirmer la disponibilité et le tarif.'
    ].join('\n');
    location.href = 'https://wa.me/33759312433?text=' + encodeURIComponent(msg);
  }, true);
})();