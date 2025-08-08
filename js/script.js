// Select all picture items
const pictureItems = document.querySelectorAll('.picture-item');

// Select lightbox elements
const lightbox = document.querySelector('.lightbox');
const lightboxImage = document.querySelector('#lightbox-img');
const lightboxStory = document.querySelector('#story');

// Add click event listeners to each picture item
pictureItems.forEach(item => {
  item.addEventListener('click', () => {
    const imageSrc = item.querySelector('.preview-img').src; // Get image src
    const story = item.querySelector('.caption').innerHTML; // Get caption/story

    lightboxImage.src = imageSrc;  // Set the image in the lightbox
    lightboxStory.innerHTML = story;  // Set the caption in the lightbox

    lightbox.style.display = 'flex'; // Show the lightbox
  });
});

// Close lightbox functionality
const closeButton = document.querySelector('.close-btn');
closeButton.addEventListener('click', () => {
  lightbox.style.display = 'none'; // Close the lightbox
});

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    lightbox.style.display = 'none'; // Close if clicked outside content
  }
});
