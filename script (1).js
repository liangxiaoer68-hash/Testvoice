(() => {
  const PIPER_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/dist/piper-tts-web.js';
  const SILENCE_MS = 350; // khoảng ngắt cố định giữa các câu, luôn dưới 0.5 giây
  const STORAGE_KEY = 'doctruyen:text';
  const SETTINGS_KEY = 'doctruyen:settings';

  const editArea = document.getElementById('editArea');
  const readArea = document.getElementById('readArea');
  const voiceSelect = document.getElementById('voiceSelect');
  const rateRange = document.getElementById('rateRange');
  const volumeRange = document.getElementById('volumeRange');
  const rateValue = document.getElementById('rateValue');
  const volumeValue = document.getElementById('volumeValue');
  const playBtn = document.getElementById('playBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const stopBtn = document.getElementById('stopBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const clearBtn = document.getElementById('clearBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const wordCount = document.getElementById('wordCount');
  const chunkPosition = document.getElementById('chunkPosition');
  const playerStatus = document.getElementById('playerStatus');
  const genProgress = document.getElementById('genProgress');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadHint = document.getElementById('downloadHint');

  const SAMPLE_TEXT = `Ngày xưa, ở một ngôi làng nhỏ ven sông, có một cô bé tên là Lam sống cùng bà ngoại trong căn nhà lá đơn sơ. Mỗi buổi chiều, Lam thường ra bờ sông ngồi nhìn hoàng hôn buông xuống, nghe tiếng gió lùa qua rặng tre xào xạc.

Một hôm, khi mặt trời sắp lặn, Lam bỗng thấy một con thuyền nhỏ trôi dạt vào bờ. Trên thuyền không có ai, chỉ có một chiếc hộp gỗ cũ kỹ được khắc đầy hoa văn lạ mắt. Cô bé tò mò mở chiếc hộp ra, và một luồng ánh sáng dịu dàng toả ra từ bên trong.`;

  // ---------- Trạng thái ----------
  let sentences = [];
  let audioBuffers = [];      // AudioBuffer đã tạo, song song với sentences
  let generatedKey = null;    // "voiceId::text" ứng với audioBuffers hiện có
  let isGenerating = false;
  let cancelRequested = false;

  let audioCtx = null;
  let gainNode = null;
  let activeSources = [];
  let schedule = [];          // [{time, duration, index}]
  let rafId = null;
  let currentIndex = -1;
  let piperModule = null;
  const sessions = new Map(); // voiceId -> TtsSession

  // ---------- Lưu tạm ----------
  function loadSaved() {
    const savedText = localStorage.getItem(STORAGE_KEY);
    if (savedText) editArea.value = savedText;

    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (s.rate) rateRange.value = s.rate;
    if (s.volume !== undefined) volumeRange.value = s.volume;
    if (s.voiceId) voiceSelect.value = s.voiceId;
    updateSliderLabels();
  }

  function saveText() { localStorage.setItem(STORAGE_KEY, editArea.value); }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      rate: rateRange.value,
      volume: volumeRange.value,
      voiceId: voiceSelect.value
    }));
  }

  // ---------- Văn bản ----------
  function splitIntoSentences(text) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    const matches = normalized.match(/[^.!?…]+[.!?…]*/g) || [];
    return matches.map(s => s.trim()).filter(Boolean);
  }

  function updateWordCount() {
    const words = editArea.value.trim().split(/\s+/).filter(Boolean);
    wordCount.textContent = `${words.length} từ`;
  }

  function buildReadView() {
    readArea.innerHTML = '';
    sentences.forEach((s, i) => {
      const span = document.createElement('span');
      span.className = 'sentence';
      span.dataset.index = i;
      span.textContent = s + ' ';
      readArea.appendChild(span);
    });
  }

  function highlightSentence(index) {
    const prev = readArea.querySelector('.sentence.active');
    if (prev) prev.classList.remove('active');
    const el = readArea.querySelector(`.sentence[data-index="${index}"]`);
    if (el) {
      el.classList.add('active');
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    chunkPosition.textContent = sentences.length ? `Câu ${index + 1}/${sentences.length}` : '';
  }

  function enterReadingMode() { editArea.hidden = true; readArea.hidden = false; }
  function exitReadingMode() { editArea.hidden = false; readArea.hidden = true; chunkPosition.textContent = ''; }

  // ---------- Piper TTS ----------
  async function loadPiper() {
    if (!piperModule) piperModule = await import(PIPER_MODULE_URL);
    return piperModule;
  }

  async function getSession(voiceId) {
    if (sessions.has(voiceId)) return sessions.get(voiceId);
    const tts = await loadPiper();
    const session = await tts.TtsSession.create({
      voiceId,
      progress: (p) => {
        const pct = p.total ? Math.round((p.loaded * 100) / p.total) : 0;
        playerStatus.textContent = `Đang tải mô hình giọng đọc lần đầu… ${pct}%`;
        genProgress.hidden = false;
        genProgress.value = pct;
      }
    });
    sessions.set(voiceId, session);
    return session;
  }

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = parseFloat(volumeRange.value);
      gainNode.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  async function generateAudio() {
    const voiceId = voiceSelect.value;
    sentences = splitIntoSentences(editArea.value);
    if (!sentences.length) {
      playerStatus.textContent = 'Chưa có nội dung để đọc.';
      return false;
    }

    isGenerating = true;
    cancelRequested = false;
    setControlsDuringGeneration(true);
    buildReadView();
    enterReadingMode();

    const ctx = getAudioCtx();
    const session = await getSession(voiceId);

    audioBuffers = [];
    genProgress.hidden = false;
    genProgress.max = sentences.length;

    for (let i = 0; i < sentences.length; i++) {
      if (cancelRequested) { isGenerating = false; setControlsDuringGeneration(false); return false; }
      playerStatus.textContent = `Đang tạo giọng đọc… câu ${i + 1}/${sentences.length}`;
      genProgress.value = i;
      const blob = await session.predict(sentences[i]);
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      audioBuffers.push(audioBuffer);
    }

    genProgress.value = sentences.length;
    genProgress.hidden = true;
    isGenerating = false;
    generatedKey = `${voiceId}::${editArea.value}`;
    setControlsDuringGeneration(false);
    downloadBtn.disabled = false;
    downloadHint.textContent = 'File sẽ có cùng giọng đọc và khoảng ngắt như bạn nghe ở trên.';
    return true;
  }

  function setControlsDuringGeneration(active) {
    playBtn.disabled = false; // vẫn cho bấm để có thể "Dừng"
    voiceSelect.disabled = active;
    sampleBtn.disabled = active;
    clearBtn.disabled = active;
  }

  // ---------- Lịch phát (Web Audio) ----------
  function stopAllSources() {
    activeSources.forEach(s => { try { s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} });
    activeSources = [];
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function schedulePlayback(fromIndex) {
    stopAllSources();
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const rate = parseFloat(rateRange.value);
    const gapSeconds = SILENCE_MS / 1000;

    let t = ctx.currentTime + 0.08;
    schedule = [];
    for (let i = fromIndex; i < audioBuffers.length; i++) {
      const buffer = audioBuffers[i];
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      source.connect(gainNode);
      source.start(t);
      activeSources.push(source);
      const duration = buffer.duration / rate;
      schedule.push({ time: t, duration, index: i });
      t += duration + gapSeconds;
    }

    const endTime = t;
    currentIndex = fromIndex;
    watchPlayback(endTime);
  }

  function watchPlayback(endTime) {
    function tick() {
      if (!audioCtx || audioCtx.state !== 'running') { rafId = requestAnimationFrame(tick); return; }
      const now = audioCtx.currentTime;
      const entry = schedule.find(e => now >= e.time && now < e.time + e.duration);
      if (entry && entry.index !== currentIndex) {
        currentIndex = entry.index;
        highlightSentence(currentIndex);
      }
      if (now >= endTime) {
        finishPlayback();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  }

  async function startFromIndex(index) {
    if (generatedKey !== `${voiceSelect.value}::${editArea.value}`) {
      const ok = await generateAudio();
      if (!ok) return;
    }
    setPlayingIcon(true);
    playerStatus.textContent = 'Đang đọc…';
    schedulePlayback(index);
  }

  async function togglePlayPause() {
    if (isGenerating) { cancelRequested = true; return; }

    // Tạo/khôi phục AudioContext ngay trong sự kiện click (bắt buộc trên Safari/iOS)
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    if (activeSources.length === 0) {
      await startFromIndex(0);
      return;
    }
    if (audioCtx.state === 'running') {
      audioCtx.suspend();
      setPlayingIcon(false);
      playerStatus.textContent = 'Đã tạm dừng.';
    } else {
      audioCtx.resume();
      setPlayingIcon(true);
      playerStatus.textContent = 'Đang đọc…';
    }
  }

  function stopPlayback() {
    cancelRequested = true;
    stopAllSources();
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.suspend();
    setPlayingIcon(false);
    exitReadingMode();
    currentIndex = -1;
    playerStatus.textContent = audioBuffers.length ? 'Đã dừng.' : 'Sẵn sàng.';
  }

  function finishPlayback() {
    stopAllSources();
    setPlayingIcon(false);
    playerStatus.textContent = 'Đọc xong.';
    currentIndex = -1;
  }

  async function jump(offset) {
    if (!audioBuffers.length) return;
    const nextIdx = Math.min(Math.max((currentIndex < 0 ? 0 : currentIndex) + offset, 0), audioBuffers.length - 1);
    setPlayingIcon(true);
    playerStatus.textContent = 'Đang đọc…';
    schedulePlayback(nextIdx);
  }

  function setPlayingIcon(isPlaying) {
    playIcon.hidden = isPlaying;
    pauseIcon.hidden = !isPlaying;
  }

  // ---------- Xuất MP3 ----------
  function loadLamejs() {
    return new Promise((resolve, reject) => {
      if (window.lamejs) return resolve(window.lamejs);
      const check = setInterval(() => {
        if (window.lamejs) { clearInterval(check); resolve(window.lamejs); }
      }, 100);
      setTimeout(() => { clearInterval(check); if (!window.lamejs) reject(new Error('lamejs chưa tải xong')); }, 8000);
    });
  }

  function concatenateBuffers() {
    const sampleRate = audioBuffers[0].sampleRate;
    const gapSamples = Math.round((SILENCE_MS / 1000) * sampleRate);
    let totalLength = 0;
    audioBuffers.forEach(b => { totalLength += b.length + gapSamples; });

    const out = new Float32Array(totalLength);
    let offset = 0;
    audioBuffers.forEach(b => {
      out.set(b.getChannelData(0), offset);
      offset += b.length + gapSamples; // khoảng lặng để giá trị 0 mặc định
    });
    return { samples: out, sampleRate };
  }

  function floatTo16BitPCM(float32) {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  async function exportMp3() {
    if (!audioBuffers.length) return;
    downloadBtn.disabled = true;
    playerStatus.textContent = 'Đang tạo file MP3…';

    await loadLamejs();
    const { samples, sampleRate } = concatenateBuffers();
    const pcm16 = floatTo16BitPCM(samples);

    const encoder = new window.lamejs.Mp3Encoder(1, sampleRate, 128);
    const blockSize = 1152;
    const chunks = [];
    for (let i = 0; i < pcm16.length; i += blockSize) {
      const chunk = pcm16.subarray(i, i + blockSize);
      const encoded = encoder.encodeBuffer(chunk);
      if (encoded.length > 0) chunks.push(encoded);
    }
    const flushed = encoder.flush();
    if (flushed.length > 0) chunks.push(flushed);

    const blob = new Blob(chunks, { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'doc-truyen.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    downloadBtn.disabled = false;
    playerStatus.textContent = 'Đã tải file MP3.';
  }

  // ---------- Sự kiện ----------
  editArea.addEventListener('input', () => {
    updateWordCount();
    saveText();
    downloadBtn.disabled = true;
    downloadHint.textContent = 'Bấm "Đọc" trước để tạo giọng đọc, xong mới tải MP3 được.';
  });

  clearBtn.addEventListener('click', () => {
    editArea.value = '';
    updateWordCount();
    saveText();
    editArea.focus();
  });

  sampleBtn.addEventListener('click', () => {
    editArea.value = SAMPLE_TEXT;
    updateWordCount();
    saveText();
  });

  playBtn.addEventListener('click', togglePlayPause);
  stopBtn.addEventListener('click', stopPlayback);
  prevBtn.addEventListener('click', () => jump(-1));
  nextBtn.addEventListener('click', () => jump(1));
  downloadBtn.addEventListener('click', exportMp3);

  function updateSliderLabels() {
    rateValue.textContent = `${parseFloat(rateRange.value).toFixed(1)}×`;
    volumeValue.textContent = `${Math.round(parseFloat(volumeRange.value) * 100)}%`;
  }

  rateRange.addEventListener('input', () => { updateSliderLabels(); saveSettings(); });
  volumeRange.addEventListener('input', () => {
    updateSliderLabels();
    saveSettings();
    if (gainNode) gainNode.gain.value = parseFloat(volumeRange.value);
  });
  voiceSelect.addEventListener('change', () => {
    saveSettings();
    downloadBtn.disabled = true;
    downloadHint.textContent = 'Đổi giọng rồi — bấm "Đọc" để tạo lại.';
  });

  // ---------- Khởi tạo ----------
  loadSaved();
  updateWordCount();
  updateSliderLabels();
})();
