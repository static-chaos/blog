// ----- Lightbox DOM elements -----
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-img');
const lightboxStory = document.getElementById('story');
const closeButton = document.querySelector('.close-btn');
const prevButton = document.querySelector('.prev-btn');
const nextButton = document.querySelector('.next-btn');

// ----- Cached image set & visibility tracking -----
const parallaxImgs = Array.from(document.querySelectorAll('.preview-img'));
const pictureItems = document.querySelectorAll('.picture-item');
const visibleImgs = new Set();
let ticking = false;

// ----- Picture-item random rotation -----
pictureItems.forEach(item => {
  const randomRotate = (Math.random() * 16) - 8; // -8deg to +8deg
  const randomTranslateY = (Math.random() * 20) - 10; // -10px to +10px
  item.style.setProperty('--rot', `${randomRotate.toFixed(2)}deg`);
  item.style.setProperty('--ty', `${randomTranslateY.toFixed(2)}px`);
});

// ----- Parallax visibility observer -----
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      visibleImgs.add(entry.target);
    } else {
      visibleImgs.delete(entry.target);
      entry.target.style.transform = 'scale(1)';
    }
  });
}, { threshold: 0 });

parallaxImgs.forEach(img => io.observe(img));

// ----- Smooth parallax animation -----
function animateParallax() {
  const winH = window.innerHeight;
  parallaxImgs.forEach((img, idx) => {
    if (!visibleImgs.has(img)) return;
    const rect = img.getBoundingClientRect();
    const offset = (rect.top - winH / 2) * (0.055 + idx * 0.005);
    img.style.transform = `scale(1.06) translateY(${offset}px)`;
  });
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => {
      animateParallax();
      ticking = false;
    });
  }
}

window.addEventListener('scroll', onScroll, { passive: true });

// ----- Scrollbar width compensation for lightbox -----
function getScrollbarWidth() {
  const div = document.createElement('div');
  div.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;';
  document.body.appendChild(div);
  const width = div.offsetWidth - div.clientWidth;
  div.remove();
  return width;
}

function lockScroll() {
  document.body.classList.add('modal-open');
  document.body.style.paddingRight = `${getScrollbarWidth()}px`;
}

function unlockScroll() {
  document.body.classList.remove('modal-open');
  document.body.style.paddingRight = '';
}

// ----- Lightbox image data and interaction -----
const imagesData = [];
let currentIndex = -1;

pictureItems.forEach((item, index) => {
  const imageSrc = item.querySelector('.preview-img').src;
  const story = item.querySelector('.caption').innerHTML;
  imagesData.push({ imageSrc, story });

  item.addEventListener('click', () => {
    currentIndex = index;
    showPicture(currentIndex);
  });
});

function showPicture(index) {
  const { imageSrc, story } = imagesData[index];
  lightboxImage.src = imageSrc;
  lightboxStory.innerHTML = story;
  lightbox.style.display = 'flex';
  lockScroll();
  updateNavigationButtons();
}

function closeLightbox() {
  lightbox.style.display = 'none';
  unlockScroll();
}

function showNextPicture() {
  currentIndex = (currentIndex + 1) % imagesData.length;
  showPicture(currentIndex);
}

function showPrevPicture() {
  currentIndex = (currentIndex - 1 + imagesData.length) % imagesData.length;
  showPicture(currentIndex);
}

function updateNavigationButtons() {
  prevButton.style.display = 'inline-block';
  nextButton.style.display = 'inline-block';
}

// ----- Lightbox controls -----
prevButton.addEventListener('click', (e) => {
  e.stopPropagation();
  showPrevPicture();
});

nextButton.addEventListener('click', (e) => {
  e.stopPropagation();
  showNextPicture();
});

closeButton.addEventListener('click', closeLightbox);

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    closeLightbox();
  }
});

// ----- Keyboard navigation -----
document.addEventListener('keydown', (e) => {
  if (lightbox.style.display === 'flex') {
    if (e.key === 'ArrowRight') showNextPicture();
    if (e.key === 'ArrowLeft') showPrevPicture();
    if (e.key === 'Escape') closeLightbox();
  }
});
