<script>
    // Sticky Navigation Bar and Active Link Highlighting
    const navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.forEach(link => link.classList.remove('active'));
        link.classList.add('active');
      });
    });

    const currentPage = window.location.pathname;
    navLinks.forEach(link => {
      if (link.href.includes(currentPage)) {
        link.classList.add('active');
      }
    });

    // Picture Lightbox Functionality
    const pictureItems = document.querySelectorAll('.picture-item');
    const lightbox = document.querySelector('.lightbox');
    const lightboxContent = document.querySelector('.lightbox-content');
    const fullImage = document.querySelector('.full-img');
    const storyText = document.querySelector('.story-text');
    const closeButton = document.querySelector('.close-btn');

    pictureItems.forEach(item => {
      item.addEventListener('click', () => {
        const imageSrc = item.querySelector('.preview-img').src; // Get the image source
        const story = item.querySelector('.caption').innerHTML; // Get the caption/story

        fullImage.src = imageSrc;
        storyText.innerHTML = story;

        lightbox.style.display = 'flex'; // Show the lightbox
      });
    });

    closeButton.addEventListener('click', () => {
      lightbox.style.display = 'none'; // Close the lightbox
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        lightbox.style.display = 'none'; // Close if clicked outside content
      }
    });
  </script>
</body>
</html>
