(() => {
  const synth = window.speechSynthesis;

  const editArea = document.getElementById('editArea');
  const readArea = document.getElementById('readArea');
  const voiceSelect = document.getElementById('voiceSelect');
  const voiceWarning = document.getElementById('voiceWarning');
  const rateRange = document.getElementById('rateRange');
  const pitchRange = document.getElementById('pitchRange');
  const volumeRange = document.getElementById('volumeRange');
  const rateValue = document.getElementById('rateValue');
  const pitchValue = document.getElementById('pitchValue');
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

  const STORAGE_KEY = 'doctruyen:text';
  const SETTINGS_KEY = 'doctruyen:settings';

  const SAMPLE_TEXT = `Ngày xưa, ở một ngôi làng nhỏ ven sông, có một cô bé tên là Lam sống cùng bà ngoại trong căn nhà lá đơn sơ. Mỗi buổi chiều, Lam thường ra bờ sông ngồi nhìn hoàng hôn buông xuống, nghe tiếng gió lùa qua rặng tre xào xạc.

Một hôm, khi mặt trời sắp lặn, Lam bỗng thấy một con thuyền nhỏ trôi dạt vào bờ. Trên thuyền không có ai, chỉ có một chiếc hộp gỗ cũ kỹ được khắc đầy hoa văn lạ mắt. Cô bé tò mò mở chiếc hộp ra, và một luồng ánh sáng dịu dàng toả ra từ bên trong.`;

  let sentences = [];
  let currentIndex = -1;
  let isPaused = false;
  let voices = [];

  // ---------- Persistence ----------
  function loadSaved() {
    const savedText = localStorage.getItem(STORAGE_KEY);
    if (savedText) editArea.value = savedText;

    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (savedSettings.rate) rateRange.value = savedSettings.rate;
    if (savedSettings.pitch) pitchRange.value = savedSettings.pitch;
    if (savedSettings.volume !== undefined) volumeRange.value = savedSettings.volume;
    updateSliderLabels();
  }

  function saveText() {
    localStorage.setItem(STORAGE_KEY, editArea.value);
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      rate: rateRange.value,
      pitch: pitchRange.value,
      volume: volumeRange.value,
      voiceURI: voiceSelect.value
    }));
  }

  // ---------- Voices ----------
  function populateVoices() {
    voices = synth.getVoices();
    if (!voices.length) return;

    const vi = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('vi'));
    const others = voices.filter(v => !(v.lang && v.lang.toLowerCase().startsWith('vi')));
    const ordered = [...vi, ...others];

    voiceSelect.innerHTML = '';
    ordered.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      voiceSelect.appendChild(opt);
    });

    voiceWarning.hidden = vi.length > 0;

    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (savedSettings.voiceURI && ordered.some(v => v.voiceURI === savedSettings.voiceURI)) {
      voiceSelect.value = savedSettings.voiceURI;
    }
  }

  function getSelectedVoice() {
    return voices.find(v => v.voiceURI === voiceSelect.value) || null;
  }

  // ---------- Text handling ----------
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
    chunkPosition.textContent = sentences.length
      ? `Câu ${index + 1}/${sentences.length}`
      : '';
  }

  function enterReadingMode() {
    editArea.hidden = true;
    readArea.hidden = false;
  }

  function exitReadingMode() {
    editArea.hidden = false;
    readArea.hidden = true;
    chunkPosition.textContent = '';
  }

  // ---------- Playback ----------
  function speakSentence(index) {
    if (index < 0 || index >= sentences.length) {
      finishPlayback();
      return;
    }
    currentIndex = index;
    highlightSentence(index);

    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    const voice = getSelectedVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = parseFloat(rateRange.value);
    utterance.pitch = parseFloat(pitchRange.value);
    utterance.volume = parseFloat(volumeRange.value);

    utterance.onend = () => {
      if (!isPaused) speakSentence(currentIndex + 1);
    };
    utterance.onerror = () => {
      finishPlayback();
    };

    synth.speak(utterance);
  }

  function startPlayback() {
    sentences = splitIntoSentences(editArea.value);
    if (!sentences.length) {
      playerStatus.textContent = 'Chưa có nội dung để đọc.';
      return;
    }
    buildReadView();
    enterReadingMode();
    setPlayingIcon(true);
    playerStatus.textContent = 'Đang đọc…';
    isPaused = false;
    speakSentence(0);
  }

  function togglePlayPause() {
    if (!synth.speaking && !isPaused) {
      startPlayback();
      return;
    }
    if (synth.speaking && !isPaused) {
      synth.pause();
      isPaused = true;
      setPlayingIcon(false);
      playerStatus.textContent = 'Đã tạm dừng.';
    } else if (isPaused) {
      synth.resume();
      isPaused = false;
      setPlayingIcon(true);
      playerStatus.textContent = 'Đang đọc…';
    }
  }

  function stopPlayback() {
    synth.cancel();
    isPaused = false;
    setPlayingIcon(false);
    exitReadingMode();
    currentIndex = -1;
    playerStatus.textContent = 'Đã dừng.';
  }

  function finishPlayback() {
    isPaused = false;
    setPlayingIcon(false);
    playerStatus.textContent = 'Đọc xong.';
    currentIndex = -1;
  }

  function jump(offset) {
    if (!sentences.length) return;
    const nextIdx = Math.min(Math.max(currentIndex + offset, 0), sentences.length - 1);
    synth.cancel();
    isPaused = false;
    setPlayingIcon(true);
    playerStatus.textContent = 'Đang đọc…';
    speakSentence(nextIdx);
  }

  function setPlayingIcon(isPlaying) {
    playIcon.hidden = isPlaying;
    pauseIcon.hidden = !isPlaying;
  }

  // ---------- Events ----------
  editArea.addEventListener('input', () => {
    updateWordCount();
    saveText();
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

  function updateSliderLabels() {
    rateValue.textContent = `${parseFloat(rateRange.value).toFixed(1)}×`;
    pitchValue.textContent = parseFloat(pitchRange.value).toFixed(1);
    volumeValue.textContent = `${Math.round(parseFloat(volumeRange.value) * 100)}%`;
  }

  [rateRange, pitchRange, volumeRange].forEach(el => {
    el.addEventListener('input', () => {
      updateSliderLabels();
      saveSettings();
    });
  });

  voiceSelect.addEventListener('change', saveSettings);

  if (typeof synth.onvoiceschanged !== 'undefined') {
    synth.onvoiceschanged = populateVoices;
  }

  // ---------- Init ----------
  if (!('speechSynthesis' in window)) {
    playerStatus.textContent = 'Trình duyệt này không hỗ trợ đọc văn bản. Hãy thử Chrome, Edge hoặc Safari mới.';
    playBtn.disabled = true;
  } else {
    loadSaved();
    updateWordCount();
    populateVoices();
  }
})();
