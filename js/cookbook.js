// cookbook.js

// Load the cookbook data from the JSON file
fetch('data/cookbook.json')
  .then(response => response.json())
  .then(data => {
    const recipeList = data.recipes;
    const recipeContainer = document.querySelector('.book-content');
    let currentRecipeIndex = 0;

    // Check for a fragment identifier in the URL and load the corresponding recipe
    function getRecipeFromURL() {
      const urlFragment = window.location.hash.replace('#', '');
      if (urlFragment) {
        const recipeIndex = recipeList.findIndex(recipe => recipe.name.toLowerCase().replace(/\s+/g, '-') === urlFragment);
        if (recipeIndex !== -1) {
          return recipeIndex;
        }
      }
      return 0; // Default to the first recipe if no valid fragment is found
    }

    currentRecipeIndex = getRecipeFromURL();

    // Function to generate and display a recipe spread (pages)
    function displayRecipe(recipeIndex) {
      const recipe = recipeList[recipeIndex];
      recipeContainer.innerHTML = ''; // Clear the container

      const pages = generatePages(recipe);
      pages.forEach((pageContent, index) => {
        const page = document.createElement('div');
        page.classList.add('page-spread');
        page.classList.add(index === 0 ? 'active' : 'inactive');
        page.innerHTML = pageContent;
        recipeContainer.appendChild(page);
      });

      updateNav();
    }

    // Function to generate the pages based on recipe content
    function generatePages(recipe) {
      const content = `
        <div class="page left-page">
          <h1 class="recipe-title">${recipe.name}</h1>
          <img src="${recipe.image}" alt="${recipe.name}" class="recipe-image">
          <h2>Ingredients</h2>
          <ul class="ingredients">
            ${recipe.ingredients.map(ingredient => `
              <li>
                <input type="checkbox" id="${ingredient.item}">
                <label for="${ingredient.item}">${ingredient.item} - ${ingredient.quantity}</label>
              </li>`).join('')}
          </ul>
        </div>
        <div class="page right-page">
          <h2>Instructions</h2>
          <ol class="instructions">
            ${recipe.instructions.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>
      `;

      // Split content into pages if needed
      const pages = [];
      const pageLimit = 1500; // Approx character limit for each page
      let currentPage = '';
      let totalLength = 0;

      while (totalLength < content.length) {
        let nextContent = content.slice(totalLength, totalLength + pageLimit);
        currentPage += nextContent;
        totalLength += nextContent.length;

        if (currentPage.length >= pageLimit) {
          pages.push(currentPage);
          currentPage = '';
        }
      }

      if (currentPage) {
        pages.push(currentPage); // Push the final page
      }

      return pages;
    }

    // Navigation buttons for flipping pages
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.addEventListener('click', () => {
      if (currentRecipeIndex > 0) {
        currentRecipeIndex--;
        displayRecipe(currentRecipeIndex);
        window.location.hash = recipeList[currentRecipeIndex].name.toLowerCase().replace(/\s+/g, '-');
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentRecipeIndex < recipeList.length - 1) {
        currentRecipeIndex++;
        displayRecipe(currentRecipeIndex);
        window.location.hash = recipeList[currentRecipeIndex].name.toLowerCase().replace(/\s+/g, '-');
      }
    });

    // Update navigation buttons based on current recipe index
    function updateNav() {
      prevBtn.disabled = currentRecipeIndex === 0;
      nextBtn.disabled = currentRecipeIndex === recipeList.length - 1;
    }

    // Initial load of the recipe based on URL or default first recipe
    displayRecipe(currentRecipeIndex);

  })
  .catch(error => console.error('Error loading recipe data:', error));
