
const video = document.getElementById('video');
const canvas = document.getElementById('photoCanvas');
const ctx = canvas.getContext('2d');
const cameraWrap = document.getElementById('cameraWrap');
const startCameraBtn = document.getElementById('startCamera');
const captureBtn = document.getElementById('captureBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const filterSelect = document.getElementById('filterSelect');
const timerSelect = document.getElementById('timerSelect');
const captionInput = document.getElementById('captionInput');
const countdown = document.getElementById('countdown');
const gallery = document.getElementById('polaroidGallery');
const emptyGallery = document.getElementById('emptyGallery');
const shotCount = document.getElementById('shotCount');
const frameCounter = document.getElementById('frameCounter');
const cameraStatus = document.getElementById('cameraStatus');

let stream = null;
let photos = [];
let busy = false;

const filters = {
  none: 'none',
  warm: 'sepia(.22) saturate(1.25) contrast(1.04)',
  bw: 'grayscale(1) contrast(1.08)',
  soft: 'brightness(1.08) saturate(.82)',
  sage: 'sepia(.16) saturate(.8) hue-rotate(25deg) brightness(1.04)',
  vintage: 'sepia(.38) contrast(.92) saturate(.8)'
};

// Update the live camera preview when a filter is selected.
filterSelect.addEventListener('change', () => {
  video.style.filter = filters[filterSelect.value];
});

startCameraBtn.addEventListener('click', async () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    cameraWrap.classList.remove('active');
    captureBtn.disabled = true;
    startCameraBtn.innerHTML = 'Turn on camera <span>↗</span>';
    cameraStatus.textContent = 'CAMERA NOT STARTED';
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 960 }
      },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    cameraWrap.classList.add('active');
    captureBtn.disabled = false;
    startCameraBtn.innerHTML = 'Turn off camera <span>×</span>';
    cameraStatus.textContent = 'CAMERA READY';
    video.style.filter = filters[filterSelect.value];

  } catch (error) {
    cameraStatus.textContent = 'CAMERA UNAVAILABLE';
    alert('Could not access your camera. Check browser permissions. Camera access usually requires localhost or HTTPS.');
  }
});

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCountdown() {
  const seconds = Number(timerSelect.value);

  for (let n = seconds; n > 0; n--) {
    countdown.textContent = n;
    await wait(850);
  }

  countdown.textContent = '';
}

// Capture the photo with the selected filter permanently applied.
captureBtn.addEventListener('click', async () => {
  if (!stream || busy) return;

  busy = true;
  captureBtn.disabled = true;

  await runCountdown();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.save();

  // Apply the selected filter directly to the captured image.
  ctx.filter = filters[filterSelect.value];

  // Mirror the image like the camera preview.
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  ctx.restore();

  photos.push({
    src: canvas.toDataURL('image/jpeg', .94),
    caption: captionInput.value.trim() || 'a lovely moment',
    filter: filterSelect.value
  });

  renderGallery();

  captureBtn.innerHTML = 'Take another photo <span>✳</span>';

  busy = false;
  captureBtn.disabled = false;
});

// Display each photo as its own Polaroid.
function renderGallery() {
  gallery.innerHTML = '';

  photos.forEach((photo, index) => {
    const card = document.createElement('article');
    card.className = 'polaroid';
    card.style.setProperty(
      '--tilt',
      `${index % 2 === 0 ? -2 : 2}deg`
    );

    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = `Polaroid photo ${index + 1}`;

    const caption = document.createElement('div');
    caption.className = 'polaroid-caption';
    caption.textContent = photo.caption;

    const number = document.createElement('div');
    number.className = 'polaroid-number';
    number.textContent =
      `LITTLE MOMENTS  •  ${String(index + 1).padStart(2, '0')}`;

    // Individual download button for every Polaroid.
    const saveButton = document.createElement('button');
    saveButton.className = 'polaroid-download';
    saveButton.type = 'button';
    saveButton.textContent = '↓ Save photo';
    saveButton.setAttribute(
      'aria-label',
      `Download photo ${index + 1}`
    );

    saveButton.addEventListener('click', () => {
      downloadPhoto(photo, index);
    });

    card.append(img, caption, number, saveButton);
    gallery.appendChild(card);
  });

  emptyGallery.hidden = photos.length > 0;
  downloadBtn.disabled = photos.length === 0;

  shotCount.textContent =
    `${photos.length} PHOTO${photos.length === 1 ? '' : 'S'} TAKEN`;

  frameCounter.textContent =
    `${photos.length} PHOTO${photos.length === 1 ? '' : 'S'}`;
}

// Create and download one separate Polaroid JPG.
function downloadPhoto(photo, index) {
  const width = 720;
  const height = 600;

  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;

  const c = output.getContext('2d');

  // Background around the Polaroid.
  c.fillStyle = '#edf1e8';
  c.fillRect(0, 0, width, height);

  const img = new Image();

  img.onload = () => {
    c.save();

    c.translate(width / 2, height / 2);
    c.rotate(index % 2 === 0 ? -.012 : .012);

    // Polaroid shadow and white frame.
    c.shadowColor = '#263b2b30';
    c.shadowBlur = 18;
    c.shadowOffsetY = 6;

    c.fillStyle = '#fffefa';
    c.fillRect(-300, -260, 600, 520);

    c.shadowColor = 'transparent';

    // The selected filter is already baked into this image.
    c.drawImage(img, -270, -230, 540, 405);

    // Caption.
    c.fillStyle = '#657262';
    c.textAlign = 'center';
    c.font = 'italic 27px Georgia';
    c.fillText(photo.caption.slice(0, 36), 0, 215);

    // Photo number.
    c.fillStyle = '#a1aa9b';
    c.font = '12px monospace';
    c.fillText(
      `LITTLE MOMENTS  •  ${String(index + 1).padStart(2, '0')}`,
      0,
      244
    );

    c.restore();

    // Download this photo as its own JPG.
    const link = document.createElement('a');
    link.download =
      `little-moment-${String(index + 1).padStart(2, '0')}.jpg`;

    link.href = output.toDataURL('image/jpeg', .95);
    link.click();
  };

  img.src = photo.src;
}

// Download every photo separately, not as one combined image.
downloadBtn.addEventListener('click', async () => {
  if (!photos.length) return;

  for (let index = 0; index < photos.length; index++) {
    downloadPhoto(photos[index], index);
    await wait(450);
  }
});

// Clear the photo gallery.
resetBtn.addEventListener('click', () => {
  photos = [];

  renderGallery();

  captureBtn.disabled = !stream;
  captureBtn.innerHTML = 'Take a photo <span>✳</span>';

  cameraStatus.textContent =
    stream ? 'CAMERA READY' : 'CAMERA NOT STARTED';
});

// Display current date.
document.getElementById('todayLabel').textContent =
  new Date().toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  }).toUpperCase() + ' PHOTO STUDIO';

// Surprise button functionality.
const secretTrigger = document.getElementById('secretTrigger');
const surpriseOverlay = document.getElementById('surpriseOverlay');
const closeSurprise = document.getElementById('closeSurprise');
const confettiLayer = document.getElementById('confettiLayer');

function launchConfetti() {
  confettiLayer.innerHTML = '';

  const colors = [
    '#8fa889',
    '#c4d2b9',
    '#e7c98e',
    '#f2eee2',
    '#b6c6a9',
    '#d6a18c'
  ];

  for (let i = 0; i < 115; i++) {
    const piece = document.createElement('span');

    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    piece.style.borderRadius =
      Math.random() > .5 ? '50%' : '2px';

    piece.style.setProperty(
      '--drift',
      `${Math.random() * 220 - 110}px`
    );

    piece.style.setProperty(
      '--fall-time',
      `${2.3 + Math.random() * 2.1}s`
    );

    piece.style.animationDelay = `${Math.random() * .65}s`;

    confettiLayer.appendChild(piece);
  }
}

function openSurprise() {
  surpriseOverlay.classList.add('show');
  surpriseOverlay.setAttribute('aria-hidden', 'false');

  document.body.classList.add('surprise-open');

  launchConfetti();
  closeSurprise.focus();
}

function hideSurprise() {
  surpriseOverlay.classList.remove('show');
  surpriseOverlay.setAttribute('aria-hidden', 'true');

  document.body.classList.remove('surprise-open');
  confettiLayer.innerHTML = '';

  secretTrigger.focus();
}

secretTrigger.addEventListener('click', openSurprise);
closeSurprise.addEventListener('click', hideSurprise);

surpriseOverlay.addEventListener('click', event => {
  if (event.target === surpriseOverlay) {
    hideSurprise();
  }
});

document.addEventListener('keydown', event => {
  if (
    event.key === 'Escape' &&
    surpriseOverlay.classList.contains('show')
  ) {
    hideSurprise();
  }
});
