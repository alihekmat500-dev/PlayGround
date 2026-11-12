(() => {
  const $ = (id) => document.getElementById(id);
  const teacher = $('teacher');
  const player = $('player');
  const sceneWrap = document.querySelector('.scene-wrap');
  const cheatButton = $('cheatButton');
  const cheatLabel = $('cheatLabel');
  const hint = $('statusHint');
  const watchIndicator = $('watchIndicator');
  const startOverlay = $('startOverlay');
  const endOverlay = $('endOverlay');
  const answersGoal = 5;
  const timeLimit = 45;
  let running = false;
  let facingPlayer = true;
  let holding = false;
  let seconds = timeLimit;
  let suspicion = 0;
  let progress = 0;
  let answers = 0;
  let turnIn = 1.7;
  let lastTime = 0;
  let soundOn = true;
  let audioContext = null;
  let hintTimer = 0;

  const digits = (value) => String(value).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  function updateTimer() {
    const sec = Math.max(0, Math.ceil(seconds));
    $('timerValue').textContent = `٠٠:${digits(String(sec).padStart(2, '0'))}`;
    $('timerBar').style.width = `${Math.max(0, (seconds / timeLimit) * 100)}%`;
    $('timerBar').style.background = seconds < 10 ? '#d36d5f' : '';
  }
  function updateSuspicion() {
    const value = Math.round(suspicion);
    $('suspicionNumber').textContent = `${digits(value)}٪`;
    $('suspicionBar').style.width = `${value}%`;
    $('suspicionBar').classList.toggle('warn', value >= 45 && value < 75);
    $('suspicionBar').classList.toggle('danger', value >= 75);
    $('suspicionText').textContent = value >= 75 ? 'شكّان بيك!' : value >= 45 ? 'بدأ يشك' : value >= 20 ? 'منتبه شوي' : 'مرتاح';
    $('suspicionText').style.color = value >= 75 ? '#c56558' : value >= 45 ? '#b68950' : '';
  }
  function updateAnswers() {
    $('answerCount').textContent = digits(answers);
    [...$('answerDots').children].forEach((dot, i) => dot.classList.toggle('filled', i < answers));
  }
  function updateHold() {
    $('holdPercent').textContent = `${digits(Math.floor(progress / 3 * 100))}٪`;
    if (!running) return;
    if (holding && facingPlayer) {
      cheatLabel.textContent = 'يا ساتر! شافك!';
      cheatButton.classList.add('is-holding');
      $('sceneShade').style.opacity = Math.min(.5, .15 + suspicion / 180);
    } else if (holding) {
      cheatLabel.textContent = 'كمّل… لا ترفع عينك';
      cheatButton.classList.add('is-holding');
    } else {
      cheatButton.classList.remove('is-holding');
      cheatLabel.textContent = progress > 0 ? 'كمّل من وين وصلت' : 'اضغط مطوّلًا وخذ الأجوبة';
    }
  }
  function playTick() {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine'; osc.frequency.value = facingPlayer ? 420 : 290;
      gain.gain.setValueAtTime(.035, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .12);
      osc.connect(gain); gain.connect(audioContext.destination);
      osc.start(); osc.stop(audioContext.currentTime + .13);
    } catch (_) { /* Audio is optional. */ }
  }
  function changeDirection() {
    facingPlayer = !facingPlayer;
    teacher.classList.toggle('looking-you', facingPlayer);
    teacher.classList.toggle('looking-away', !facingPlayer);
    sceneWrap.classList.toggle('is-watched', facingPlayer);
    watchIndicator.classList.toggle('visible', facingPlayer);
    hint.textContent = facingPlayer ? 'الأستاذ دا يراقب… انتبه!' : 'هسه! الأستاذ ملتفت للسبورة!';
    hint.style.color = facingPlayer ? '#b4865e' : '#628366';
    $('soundCaption').textContent = facingPlayer ? 'خطواته قربت… لا تتحرك' : 'فرصتك! بسرعة قبل لا يلتفت';
    playTick();
    turnIn = facingPlayer ? 2.2 + Math.random() * 2.1 : 2.7 + Math.random() * 2.5;
  }
  function setHolding(value) {
    if (!running || holding === value) return;
    holding = value;
    player.classList.toggle('cheating', value);
    cheatButton.classList.toggle('is-holding', value);
    updateHold();
  }
  function finish(won, reason) {
    running = false;
    holding = false;
    player.classList.remove('cheating');
    cheatButton.classList.remove('is-holding');
    cheatButton.disabled = true;
    $('finalScore').textContent = digits(answers);
    if (won) {
      $('endEmoji').textContent = '🏆';
      $('endKicker').textContent = 'مهمّة ناجحة';
      $('endTitle').textContent = 'فلّيتها!';
      $('endMessage').textContent = 'جمعت كل الأجوبة وما انكشفت. هسه روح ادرس للامتحان الحقيقي 😄';
    } else if (reason === 'caught') {
      $('endEmoji').textContent = '😵';
      $('endKicker').textContent = 'انكشفت السالفة';
      $('endTitle').textContent = 'الأستاذ مسكك!';
      $('endMessage').textContent = 'لا تستعجل… انتظر من يلتفت بعيد وجرّب مرة ثانية.';
    } else {
      $('endEmoji').textContent = '⌛';
      $('endKicker').textContent = 'خلص الوقت';
      $('endTitle').textContent = 'الجرس دگ!';
      $('endMessage').textContent = 'ما لحگت تجمع كل الأجوبة. حاول تستغل الفرص بسرعة.';
    }
    endOverlay.classList.remove('hidden');
  }
  function reset() {
    running = false; facingPlayer = true; holding = false;
    seconds = timeLimit; suspicion = 0; progress = 0; answers = 0; turnIn = 1.7;
    teacher.classList.remove('looking-away');
    teacher.classList.add('looking-you');
    sceneWrap.classList.add('is-watched');
    watchIndicator.classList.remove('visible');
    player.classList.remove('cheating');
    cheatButton.disabled = true;
    cheatButton.classList.remove('is-holding');
    cheatLabel.textContent = 'انتظر اللحظة المناسبة';
    hint.textContent = 'الأستاذ دا يراقب… انتبه!'; hint.style.color = '';
    $('soundCaption').textContent = 'اسمع خطواته… وخلك هادي';
    $('sceneShade').style.opacity = '';
    startOverlay.classList.remove('hidden');
    endOverlay.classList.add('hidden');
    $('tipText').textContent = 'من يلتفت الأستاذ للسبورة، هاي فرصتك!';
    updateTimer(); updateSuspicion(); updateAnswers(); updateHold();
  }
  function start() {
    if (running) return;
    startOverlay.classList.add('hidden');
    endOverlay.classList.add('hidden');
    running = true; seconds = timeLimit; suspicion = 0; progress = 0; answers = 0;
    facingPlayer = true; turnIn = 1.5;
    cheatButton.disabled = false;
    lastTime = performance.now();
    updateTimer(); updateSuspicion(); updateAnswers(); updateHold();
  }
  function tick(now) {
    const dt = Math.min(.12, (now - lastTime) / 1000 || 0);
    lastTime = now;
    if (running) {
      seconds -= dt;
      turnIn -= dt;
      if (turnIn <= 0) changeDirection();
      if (holding && facingPlayer) {
        suspicion += 38 * dt;
        if (suspicion > 54 && Math.random() < dt * .38) changeDirection();
      } else if (holding) {
        progress += dt;
        suspicion = Math.max(0, suspicion - 4 * dt);
        if (progress >= 3) {
          progress -= 3;
          answers++;
          updateAnswers();
          $('tipText').textContent = answers >= 4 ? 'باقي جواب واحد… لا تضيع الفرصة!' : ['زين! بعدك ما انكشفت.','استمر… الأستاذ بعده مو منتبه.','شاطر! ركّز على حركته.'][Math.floor(Math.random() * 3)];
          const sheet = $('answerSheet');
          sheet.style.transform = `translate(${(Math.random() * 16 - 8).toFixed(0)}px,${(Math.random() * 8 - 4).toFixed(0)}px) rotate(${(Math.random() * 10 - 5).toFixed(0)}deg)`;
          if (answers >= answersGoal) { finish(true); }
        }
      } else {
        suspicion = Math.max(0, suspicion - 11 * dt);
      }
      if (suspicion >= 100) finish(false, 'caught');
      if (seconds <= 0 && running) finish(false, 'time');
      updateTimer(); updateSuspicion(); updateHold();
    }
    requestAnimationFrame(tick);
  }
  $('startButton').addEventListener('click', start);
  $('restartButton').addEventListener('click', reset);
  $('resetButton').addEventListener('click', reset);
  cheatButton.addEventListener('pointerdown', (event) => { event.preventDefault(); setHolding(true); cheatButton.setPointerCapture?.(event.pointerId); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => cheatButton.addEventListener(type, () => setHolding(false)));
  window.addEventListener('pointerup', () => setHolding(false));
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !event.repeat) { event.preventDefault(); setHolding(true); }
    if (event.code === 'Enter' && !running && !startOverlay.classList.contains('hidden')) start();
  });
  window.addEventListener('keyup', (event) => { if (event.code === 'Space') setHolding(false); });
  window.addEventListener('blur', () => setHolding(false));
  $('soundToggle').addEventListener('click', () => {
    soundOn = !soundOn;
    $('soundToggle').innerHTML = `${soundOn ? '♪' : '×'}<span>${soundOn ? 'الصوت' : 'صامت'}</span>`;
    $('soundCaption').textContent = soundOn ? 'اسمع خطواته… وخلك هادي' : 'الصوت مكتوم';
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setHolding(false); });
  updateTimer(); updateSuspicion(); updateAnswers();
  requestAnimationFrame((now) => { lastTime = now; requestAnimationFrame(tick); });
})();
