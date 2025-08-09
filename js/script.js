// Select all picture items
const pictureItems = document.querySelectorAll('.picture-item');

// Select lightbox elements
const lightbox = document.querySelector('.lightbox');
const lightboxImage = document.querySelector('#lightbox-img');
const lightboxStory = document.querySelector('#story');
const closeButton = document.querySelector('.close-btn');
const prevButton = document.querySelector('.prev-btn');
const nextButton = document.querySelector('.next-btn');

// Store the image data (src and story) for each picture
const imagesData = [];
let currentIndex = -1;  // To keep track of the currently displayed image

// Populate the image data (src and caption)
pictureItems.forEach((item, index) => {
  const imageSrc = item.querySelector('.preview-img').src;
  const story = item.querySelector('.caption').innerHTML;
  imagesData.push({ imageSrc, story });

  // Add click event listener to each picture item
  item.addEventListener('click', () => {
    currentIndex = index;  // Set the current image index
    showPicture(currentIndex);  // Show the clicked image
  });
});

// Function to display the image in the lightbox
function showPicture(index) {
  const { imageSrc, story } = imagesData[index];
  lightboxImage.src = imageSrc;  // Update the lightbox image
  lightboxStory.innerHTML = story;  // Update the caption

  lightbox.style.display = 'flex'; // Show the lightbox
  document.body.classList.add('modal-open'); // this locks scroll
  updateNavigationButtons();  // Make sure buttons are visible and correctly positioned
}

// Function to show the next image
function showNextPicture() {
  if (currentIndex < imagesData.length - 1) {
    currentIndex++;  // Increment index for next picture
  } else {
    currentIndex = 0;  // Loop back to the first picture
  }
  showPicture(currentIndex);  // Display the next picture
}

// Function to show the previous image
function showPrevPicture() {
  if (currentIndex > 0) {
    currentIndex--;  // Decrement index for previous picture
  } else {
    currentIndex = imagesData.length - 1;  // Loop back to the last picture
  }
  showPicture(currentIndex);  // Display the previous picture
}

// Function to handle the navigation buttons visibility and position
function updateNavigationButtons() {
  // Make sure navigation buttons are visible when the lightbox is open
  prevButton.style.display = 'inline-block';
  nextButton.style.display = 'inline-block';
}

// Add event listeners for Next and Previous buttons
prevButton.addEventListener('click', (e) => {
  e.stopPropagation();  // Prevent the click event from closing the lightbox
  showPrevPicture();
});

nextButton.addEventListener('click', (e) => {
  e.stopPropagation();  // Prevent the click event from closing the lightbox
  showNextPicture();
});

// Close lightbox functionality
closeButton.addEventListener('click', () => {
  lightbox.style.display = 'none';  // Close the lightbox
});

// Close lightbox when clicking outside the content
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    lightbox.style.display = 'none'; 
   document.body.classList.remove('modal-open'); // Close if clicked outside content
  }
});
// Parallax effect for picture wall images
window.addEventListener('scroll', function() {
  const images = document.querySelectorAll('.preview-img');
  const winH = window.innerHeight;
  images.forEach((img, idx) => {
    const rect = img.getBoundingClientRect();
    if (rect.top < winH && rect.bottom > 0) {
      // Parallax offset: varies slightly per image for layered look
      const offset = (rect.top - winH/2) * (0.055 + idx * 0.005);
      img.style.transform = `scale(1.06) translateY(${offset}px)`;
    } else {
      img.style.transform = "scale(1)";
    }
  });
});
// Add random rotation to each picture-item for more natural randomness
document.querySelectorAll('.picture-item').forEach(item => {
  // Random rotation between -8deg and +8deg
  const randomRotate = (Math.random() * 16) - 8; // -8 to +8 degrees
  // Optional: small random vertical shift between -10px and +10px
  const randomTranslateY = (Math.random() * 20) - 10; // -10 to +10 px

  // Apply transform style
  item.style.transform = `rotate(${randomRotate.toFixed(2)}deg) translateY(${randomTranslateY.toFixed(2)}px)`;
});
// for key board navigation
document.addEventListener('keydown', (e) => {
  if (lightbox.style.display === 'flex') {
    if (e.key === 'ArrowRight') {
      showNextPicture();
    }
    if (e.key === 'ArrowLeft') {
      showPrevPicture();
    }
    if (e.key === 'Escape') {
      lightbox.style.display = 'none';
      document.body.classList.remove('modal-open'); // We'll add this class in Step 2
    }
  }
});

