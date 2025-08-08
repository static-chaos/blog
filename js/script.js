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
    lightbox.style.display = 'none';  // Close if clicked outside content
  }
});
