// Get all picture items and lightbox elements
const pictureItems = document.querySelectorAll('.picture-item');
const lightbox = document.querySelector('.lightbox');
const lightboxContent = document.querySelector('.lightbox-content');
const fullImage = document.querySelector('.full-img');
const storyText = document.querySelector('.story-text');
const closeButton = document.querySelector('.close-btn');

// Handle the click event on each picture item
pictureItems.forEach(item => {
  item.addEventListener('click', () => {
    const imageSrc = item.querySelector('.preview-img').src; // Get the image source
    const story = item.querySelector('.caption').innerHTML; // Get the caption/story

    // Set the image source and story in the lightbox
    fullImage.src = imageSrc;
    storyText.innerHTML = story;

    // Show the lightbox
    lightbox.style.display = 'flex';
  });
});

// Close the lightbox when the close button is clicked
closeButton.addEventListener('click', () => {
  lightbox.style.display = 'none'; // Hide the lightbox
});

// Close the lightbox if clicked outside of the content
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    lightbox.style.display = 'none'; // Hide the lightbox if clicking outside content
  }
});
