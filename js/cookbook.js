/****************************************************
 * js/cookbook.js — Two-Page Spreads, Single Recipe
 ****************************************************/

// Adjust to match your chosen fixed page height
const INGREDIENTS_PER_PAGE = 8;
const STEPS_PER_PAGE = 5;

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.recipe-book .book-content');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (!container) return console.error('Missing .recipe-book .book-content element');

  fetch('data/cookbook.json')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      const recipes = Array.isArray(data?.recipes) ? data.recipes : [];
      if (recipes.length === 0) {
        container.innerHTML = `<p style="color:#c00">No recipes found in data/cookbook.json</p>`;
        return;
      }

     // --- Choose recipe based on URL hash, fallback to first ---
const slugFromHash = window.location.hash.slice(1); // after the '#'
const toSlug = s => String(s)
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')       // spaces → dash
  .replace(/[^a-z0-9-]/g, ''); // strip symbols

let recipeIndex = -1;
if (slugFromHash) {
  recipeIndex = recipes.findIndex(r => toSlug(r.name) === slugFromHash);
}
if (recipeIndex === -1) {
  recipeIndex = 0; // fallback if no hash or not found
}

const recipe = recipes[recipeIndex];
const spreads = buildSpreadsForRecipe(recipe);
let currentSpreadIndex = 0;
renderSpread(container, spreads[currentSpreadIndex]);


      renderSpread(container, spreads[currentSpreadIndex]);

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (currentSpreadIndex > 0) {
            currentSpreadIndex--;
            renderSpread(container, spreads[currentSpreadIndex]);
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (currentSpreadIndex < spreads.length - 1) {
            currentSpreadIndex++;
            renderSpread(container, spreads[currentSpreadIndex]);
          }
        });
      }
    })
    .catch(err => {
      console.error('Failed to load cookbook JSON:', err);
      container.innerHTML = `<p style="color:#c00">Failed to load data/cookbook.json</p>`;
    });
});

/* -------------------- Build spreads per recipe -------------------- */

function buildSpreadsForRecipe(recipe) {
  const pages = generatePages(recipe);
  return pairPagesIntoSpreads(pages);
}

function generatePages(recipe) {
  const pages = [];

  const name = recipe?.name ?? 'Untitled Recipe';
  const description = recipe?.description ?? '';
  const imageUrl = recipe?.image ?? '';

  const ingObjs = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const ingredients = ingObjs.map(formatIngredient);
  const steps = Array.isArray(recipe?.instructions) ? [...recipe.instructions] : [];
  const notes = Array.isArray(recipe?.extra_notes)
    ? [...recipe.extra_notes]
    : recipe?.extra_notes
    ? [recipe.extra_notes]
    : [];

  // Page 1: Title + description + image + some ingredients
  const page1Ingredients = ingredients.splice(0, INGREDIENTS_PER_PAGE);
  pages.push(renderTitleImageIngredients(name, description, imageUrl, page1Ingredients));

  // Page 2: remaining ingredients + start of instructions OR just start instructions
  const startSteps = steps.splice(0, STEPS_PER_PAGE);
  if (ingredients.length > 0) {
    const page2Ingredients = ingredients.splice(0, INGREDIENTS_PER_PAGE);
    pages.push(renderIngredientsAndInstructions(page2Ingredients, startSteps));
  } else {
    pages.push(renderInstructions(startSteps));
  }

  // Page 3+: continue instructions
  while (steps.length > 0) {
    pages.push(renderInstructions(steps.splice(0, STEPS_PER_PAGE)));
  }

  // Notes pages (optional)
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

/* -------------------- Render helpers -------------------- */

function renderTitleImageIngredients(title, description, imageUrl, ingredients) {
  return `
    <section class="page">
      <header class="page-header">
        <h2 class="recipe-title">${escapeHtml(title)}</h2>
        ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
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

/* -------------------- DOM render -------------------- */

function renderSpread(container, spread) {
  // Add proper classes for CSS layout
  const leftHtml  = spread.left.replace('class="page"', 'class="page left-page"');
  const rightHtml = spread.right.replace('class="page"', 'class="page right-page"');

  container.innerHTML = `
    <div class="page-spread">
      ${leftHtml}
      ${rightHtml}
    </div>
  `;
}


/* -------------------- Utilities -------------------- */

function formatIngredient(obj) {
  if (!obj) return '';
  const item = obj.item != null ? String(obj.item) : '';
  const qty = obj.quantity != null ? String(obj.quantity) : '';
  if (item && qty) return `${item} — ${qty}`;
  return item || qty || '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}
