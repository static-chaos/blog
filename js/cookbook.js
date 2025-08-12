// cookbook.js

// Load the cookbook data from the JSON file
fetch('data/cookbook.json')
  .then(response => response.json())
  .then(data => {
    const recipeList = data.recipes;
    const recipeContainer = document.querySelector('.book-content');
    let currentRecipeIndex = 0;
    let currentPageIndex = 0;

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
      if (currentPageIndex > 0) {
        currentPageIndex--;
        displayPage(currentPageIndex);
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentPageIndex < getCurrentRecipePages().length - 1) {
        currentPageIndex++;
        displayPage(currentPageIndex);
      }
    });

    function displayPage(pageIndex) {
      const pages = getCurrentRecipePages();
      const currentPage = pages[pageIndex];

      recipeContainer.innerHTML = '';
      const pageElement = document.createElement('div');
      pageElement.classList.add('page-spread');
      pageElement.innerHTML = currentPage;

      recipeContainer.appendChild(pageElement);
      updateNav();
    }

    // Fetch the current recipe pages
    function getCurrentRecipePages() {
      return generatePages(recipeList[currentRecipeIndex]);
    }

    // Update navigation buttons
    function updateNav() {
      prevBtn.disabled = currentPageIndex === 0;
      nextBtn.disabled = currentPageIndex === getCurrentRecipePages().length - 1;
    }

    // Initial load of the first recipe
    displayRecipe(currentRecipeIndex);

  })
  .catch(error => console.error('Error loading recipe data:', error));
