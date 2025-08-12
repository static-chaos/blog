/****************************************************
 * js/cookbook.js — Two-Page Spreads, Single Recipe
 ****************************************************/

// You can keep these as conceptual limits for roughly how much to place per page.
// Actual layout now flows without clipping; these act as "budget" counters.
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
      const slugFromHash = window.location.hash.slice(1);
      const toSlug = s => String(s)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      let recipeIndex = slugFromHash
        ? recipes.findIndex(r => toSlug(r.name) === slugFromHash)
        : -1;

      if (recipeIndex === -1) recipeIndex = 0;

      const recipe = recipes[recipeIndex];
      const spreads = buildSpreadsForRecipe(recipe);
      let currentSpreadIndex = 0;

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

/**
 * Unified flow generator:
 * - Starts with title/description/image on the first page.
 * - Fills remaining space with ingredients first, then instructions.
 * - Subsequent pages continue placing remaining ingredients and instructions in order,
 *   so nothing is clipped and no internal scrolling is required.
 */
function generatePages(recipe) {
  const pages = [];

  const name = recipe?.name ?? 'Untitled Recipe';
  const description = recipe?.description ?? '';
  const imageUrl = recipe?.image ?? '';

  const ingObjs = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const ingredients = [...ingObjs.map(formatIngredient)];
  const steps = Array.isArray(recipe?.instructions) ? [...recipe.instructions] : [];

  const notes = Array.isArray(recipe?.extra_notes)
    ? [...recipe.extra_notes]
    : recipe?.extra_notes
    ? [recipe.extra_notes]
    : [];

  // First page: header + image, then content
  let first = renderTitleImageHeader(name, description, imageUrl); // { html, countIngs, countSteps }
  // Fill with ingredients up to budget
  while (ingredients.length && first.countIngs < INGREDIENTS_PER_PAGE) {
    first.html += renderIngredientItem(ingredients.shift());
    first.countIngs++;
  }
  // Then fill remaining "budget" with steps
  while (steps.length && first.countSteps < STEPS_PER_PAGE) {
    first.html += renderInstructionItem(steps.shift());
    first.countSteps++;
  }
  pages.push(wrapPage(first.html));

  // Subsequent pages: continue mixing remaining ingredients and steps
  while (ingredients.length || steps.length) {
    let page = { html: '', countIngs: 0, countSteps: 0 };

    while (ingredients.length && page.countIngs < INGREDIENTS_PER_PAGE) {
      page.html += renderIngredientItem(ingredients.shift());
      page.countIngs++;
    }
    while (steps.length && page.countSteps < STEPS_PER_PAGE) {
      page.html += renderInstructionItem(steps.shift());
      page.countSteps++;
    }

    // If one list is empty but there is still room and the other has items, keep filling.
    while (ingredients.length && (page.countIngs + page.countSteps) < (INGREDIENTS_PER_PAGE + STEPS_PER_PAGE)) {
      page.html += renderIngredientItem(ingredients.shift());
      page.countIngs++;
    }
    while (steps.length && (page.countIngs + page.countSteps) < (INGREDIENTS_PER_PAGE + STEPS_PER_PAGE)) {
      page.html += renderInstructionItem(steps.shift());
      page.countSteps++;
    }

    pages.push(wrapPage(page.html));
  }

  // Notes at the end (optional)
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

// New: header builder for unified flow
function renderTitleImageHeader(title, description, imageUrl) {
  const html = `
    <header class="page-header">
      <h2 class="recipe-title">${escapeHtml(title)}</h2>
      ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
    </header>
    ${imageUrl ? `<figure class="recipe-figure"><img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(title)}"></figure>` : ''}
  `;
  return { html, countIngs: 0, countSteps: 0 };
}

// New: atomic item renderers for unified flow
function renderIngredientItem(text) {
  return `
    <div class="ingredients">
      <h3 class="section-title">Ingredients</h3>
      <ul class="ingredient-list">
        <li>${escapeHtml(text)}</li>
      </ul>
    </div>
  `;
}
function renderInstructionItem(step) {
  return `
    <div class="instructions">
      <h3 class="section-title">Instructions</h3>
      <ol class="step-list">
        <li>${escapeHtml(step)}</li>
      </ol>
    </div>
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
  // Ensure visibility with active class
  container.innerHTML = `
    <div class="page-spread active">
      ${spread.left || ''}
      ${spread.right || ''}
    </div>
  `;

  const spreadEl = container.querySelector('.page-spread');
  if (!spreadEl) {
    console.error('No .page-spread rendered');
    return;
  }

  const pages = spreadEl.querySelectorAll('.page');
  if (pages[0]) pages[0].classList.add('left-page');
  if (pages[1]) pages[1].classList.add('right-page');

  if (!pages.length) {
    console.warn('No .page elements found inside .page-spread.', {
      left: spread.left,
      right: spread.right
    });
  }
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

// Helper to wrap arbitrary inner HTML into a page
function wrapPage(inner) {
  return `<section class="page">${inner}</section>`;
}
