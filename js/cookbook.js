// Select the page spreads and navigation buttons
const spreads = document.querySelectorAll('.page-spread');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');

// Initializing variables for navigation
let currentIndex = 0;
let isAnimating = false;

// Function to update the spread and handle animation
function updateSpread(nextIndex, direction) {
  // Preventing animation if already animating or out of bounds
  if (isAnimating || nextIndex < 0 || nextIndex >= spreads.length) return;
  isAnimating = true;

  const current = spreads[currentIndex];
  const next = spreads[nextIndex];

  // Set up animations for next/prev page transitions
  current.classList.add(direction === 'next' ? 'slide-out-left' : 'slide-out-right');
  next.classList.add('page-spread', 'active', direction === 'next' ? 'slide-in-right' : 'slide-in-left');

  // Reset animation after the transition completes
  setTimeout(() => {
    current.classList.remove('active', 'slide-out-left', 'slide-out-right');
    next.classList.remove('slide-in-left', 'slide-in-right');
    currentIndex = nextIndex;
    isAnimating = false;
    updateNav();
  }, 600); // Duration to match animation timing
}

// Function to update the navigation buttons based on the current page index
function updateNav() {
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === spreads.length - 1;
}

// Add event listeners to the next/prev buttons
nextBtn.addEventListener('click', () => {
  updateSpread(currentIndex + 1, 'next');
});

prevBtn.addEventListener('click', () => {
  updateSpread(currentIndex - 1, 'prev');
});

// Function to go back to the recipe list page
function goBack() {
  window.location.href = 'recipe.html'; // Adjust the path if needed
}

// Set up initial spread states
spreads.forEach((spread, i) => {
  spread.style.zIndex = spreads.length - i; // Stack higher index below
});
spreads[0].classList.add('active');
updateNav();

// Optional: Add event listener for the back button
document.getElementById('backBtn').addEventListener('click', goBack);
