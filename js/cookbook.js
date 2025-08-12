/****************************************************
 * cookbook.js — Two-Page Spread Builder with JSON
 ****************************************************/

// Tunables: adjust after testing your fixed page height
const INGREDIENTS_PER_PAGE = 8;
const STEPS_PER_PAGE = 5;

/**
 * Entry point — fetch the JSON and render spreads
 */
document.addEventListener('DOMContentLoaded', () => {
  fetch('data/cookbook.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(recipeData => {
      // If your JSON has multiple recipes, pick the first:
      // const recipe = recipeData[0];
      const recipe = recipeData; 
      initCookbook(recipe);
    })
    .catch(err => {
      console.error('Error loading recipe JSON:', err);
      const leftEl = document.getElementById('leftPage');
      if (leftEl) {
        leftEl.innerHTML = `<p style="color:red;">Failed to load recipe data.</p>`;
      }
    });
});

/**
 * Initialize UI and navigation for a recipe
 */
function initCookbook(recipe) {
  const spreads = generateSpreads(recipe);
  let currentSpread = 0;

  const leftEl = document.getElementById('leftPage');
  const rightEl = document.getElementById('rightPage');

  function renderSpread(index) {
    const spread = spreads[index];
    if (leftEl) leftEl.innerHTML = spread.left;
    if (rightEl) rightEl.innerHTML = spread.right;
  }

  renderSpread(currentSpread);

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentSpread > 0) {
        currentSpread--;
        renderSpread(currentSpread);
      }
    });
    nextBtn.addEventListener('click', () => {
      if (currentSpread < spreads.length - 1) {
        currentSpread++;
        renderSpread(currentSpread);
      }
    });
  }
}

/* -------------------- Paging Core -------------------- */

function generateSpreads(recipe) {
  const pages = generatePages(recipe);
  return pairPagesIntoSpreads(pages);
}

function generatePages(recipe) {
  const pages = [];

  const title = recipe?.title ?? 'Untitled Recipe';
  const imageUrl = recipe?.image ?? '';
  const ing = Array.isArray(recipe?.ingredients) ? [...recipe.ingredients] : [];
  const steps = Array.isArray(recipe?.instructions) ? [...recipe.instructions] : [];
  const notes = Array.isArray(recipe?.notes)
    ? [...recipe.notes]
    : recipe?.notes
    ? [recipe.notes]
    : [];

  // Page 1
  const page1Ingredients = ing.splice(0, INGREDIENTS_PER_PAGE);
  pages.push(renderTitleImageIngredients(title, imageUrl, page1Ingredients));

  // Page 2
  const startSteps = steps.splice(0, STEPS_PER_PAGE);
  if (ing.length > 0) {
    const page2Ingredients = ing.splice(0, INGREDIENTS_PER_PAGE);
    pages.push(renderIngredientsAndInstructions(page2Ingredients, startSteps));
  } else {
    pages.push(renderInstructions(startSteps));
  }

  // Page 3+
  while (steps.length > 0) {
    pages.push(renderInstructions(steps.splice(0, STEPS_PER_PAGE)));
  }

  // Notes pages
  while (notes.length > 0) {
    pages.push(renderNotes(notes.splice(0, STEPS_PER_PAGE)));
  }

  return pages;
}

function pairPagesIntoSpreads(pages) {
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      left: pages[i],
      right: pages[i + 1] || renderBlankPage(),
    });
  }
  return spreads;
}

/* -------------------- Render Helpers -------------------- */

function renderTitleImageIngredients(title, imageUrl, ingredients) {
  return `
    <section class="page">
      <header class="page-header">
        <h1 class="recipe-title">${escapeHtml(title)}</h1>
      </header>
      ${imageUrl ? `<figure class="recipe-figure"><img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(title)}"></figure>` : ''}
      ${renderIngredientsBlock(ingredients)}
    </section>
  `;
}

function renderIngredientsAndInstructions(ingredients, steps) {
  return `
    <section class="page">
      ${renderIngredientsBlock(ingredients)}
      ${renderInstructionsBlock(steps)}
    </section>
  `;
}

function renderInstructions(steps) {
  return `
    <section class="page">
      ${renderInstructionsBlock(steps)}
    </section>
  `;
}

function renderNotes(notes) {
  if (!notes || notes.length === 0) return renderBlankPage();
  return `
    <section class="page">
      <h3 class="section-title">Notes</h3>
      <ul class="notes">
        ${notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
      </ul>
    </section>
  `;
}

function renderIngredientsBlock(ingredients) {
  if (!ingredients || ingredients.length === 0) {
    return `
      <div class="ingredients">
        <h3 class="section-title">Ingredients</h3>
        <p class="empty">No ingredients listed.</p>
      </div>
    `;
  }
  return `
    <div class="ingredients">
      <h3 class="section-title">Ingredients</h3>
      <ul class="ingredient-list">
        ${ingredients.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderInstructionsBlock(steps) {
  if (!steps || steps.length === 0) {
    return `
      <div class="instructions">
        <h3 class="section-title">Instructions</h3>
        <p class="empty">Continue to the next page.</p>
      </div>
    `;
  }
  return `
    <div class="instructions">
      <h3 class="section-title">Instructions</h3>
      <ol class="step-list">
        ${steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
      </ol>
    </div>
  `;
}

function renderBlankPage() {
  return `<section class="page blank"><div class="blank-content"></div></section>`;
}

/* -------------------- Utils -------------------- */

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
