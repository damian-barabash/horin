/* HORIN — contact page interactions */

(() => {
  const form = document.getElementById('contact-form');
  const rows = [...form.querySelectorAll('.f-row')];
  const pills = [...form.querySelectorAll('.f-pill')];
  const submit = form.querySelector('.f-submit');
  const success = document.querySelector('.c-success');

  /* row focus / filled states */
  rows.forEach((row) => {
    const field = row.querySelector('input, textarea');
    if (!field) return;
    field.addEventListener('focus', () => row.classList.add('is-active'));
    field.addEventListener('blur', () => {
      row.classList.remove('is-active');
      row.classList.toggle('is-filled', field.value.trim() !== '');
    });
  });

  /* auto-grow textarea */
  const msg = document.getElementById('f-msg');
  msg.addEventListener('input', () => {
    msg.style.height = 'auto';
    msg.style.height = `${msg.scrollHeight}px`;
  });

  /* subject pills */
  let topic = 'Collaboration';
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((b) => b.classList.remove('is-on'));
      pill.classList.add('is-on');
      topic = pill.dataset.topic;
    });
  });

  /* magnetic submit button */
  const magnet = 0.35;
  submit.addEventListener('pointermove', (e) => {
    const r = submit.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    submit.style.transform = `translate(${x * magnet}px, ${y * magnet}px)`;
  });
  submit.addEventListener('pointerleave', () => {
    submit.style.transform = '';
  });

  /* shake invalid rows instead of native bubbles */
  const shake = (row) => {
    row.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-7px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 360, easing: 'ease-out' }
    );
    row.classList.add('is-active');
    setTimeout(() => row.classList.remove('is-active'), 600);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('f-name');
    const email = document.getElementById('f-email');
    let bad = null;
    if (!name.value.trim()) bad = name;
    else if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) bad = email;
    else if (!msg.value.trim()) bad = msg;
    if (bad) {
      shake(bad.closest('.f-row'));
      bad.focus();
      return;
    }

    // TODO: подключить реальную отправку (endpoint / Supabase / Resend) —
    // пока письмо собирается, показываем подтверждение.
    const payload = {
      name: name.value.trim(),
      email: email.value.trim(),
      topic,
      message: msg.value.trim(),
      at: new Date().toISOString(),
    };
    console.log('HORIN contact form:', payload);

    success.classList.add('is-on');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        success.querySelector('.pl-fill').style.height = '100%';
      });
    });
  });
})();
