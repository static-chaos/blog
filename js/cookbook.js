// cookbook.js

// Load the cookbook data from the JSON file
fetch('data/cookbook.json')
  .then(response => response.json())
  .then(data => {
    const recipeList = data.recipes;
    const recipeContainer = document.querySelector('.book-content');
    let currentRecipeIndex = 0;
    
    // Function to generate and display a recipe spread
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
                <input type="checkbox" id="${ingredient}">
                <label for="${ingredient}">${ingredient}</label>
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
      // Split content into separate pages if it overflows
      const pages = [];
      const pageLimit = 1500; // Approx character limit for each page
      let currentPage = '';
      let totalLength = 0;

      // Split content into pages based on character limit
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
        pages.push(currentPage); // Push remaining content to a final page
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
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentRecipeIndex < recipeList.length - 1) {
        currentRecipeIndex++;
        displayRecipe(currentRecipeIndex);
      }
    });

    // Initial load of the first recipe
    displayRecipe(currentRecipeIndex);

    // Update the navigation buttons state
    function updateNav() {
      prevBtn.disabled = currentRecipeIndex === 0;
      nextBtn.disabled = currentRecipeIndex === recipeList.length - 1;
    }
  })
  .catch(error => console.error('Error loading recipe data:', error));
