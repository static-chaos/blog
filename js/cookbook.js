/****************************************************
 * js/cookbook.js — Two-Page Spreads, Single Recipe
 ****************************************************/

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
 * New generator with:
 * - Continuous flow (no clipping, no scroll required)
 * - Section headings once per page
 * - Continuous numbering for instructions across pages
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

  // 1) First page — title/desc/image + first chunk of ingredients and/or steps
  {
    let html = `
      <header class="page-header">
        <h2 class="recipe-title">${escapeHtml(name)}</h2>
        ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
      </header>
      ${imageUrl ? `<figure class="recipe-figure"><img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(name)}"></figure>` : ''}
    `;

    const ingSlice = ingredients.splice(0, INGREDIENTS_PER_PAGE);
    if (ingSlice.length) {
      html += `
        <div class="ingredients">
          <h3 class="section-title">Ingredients</h3>
          <ul class="ingredient-list">
            ${ingSlice.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
          </ul>
        </div>`;
    }

    // First page steps slice
    const stepSlice = steps.splice(0, STEPS_PER_PAGE);
    if (stepSlice.length) {
      html += renderInstructionsBlockWithStart(stepSlice, 1); // start numbering at 1
    }

    pages.push(wrapPage(html));
  }

  // 2) Keep adding pages until both arrays are empty
  let stepStart = 1 + 0; // we don't know how many were on first page yet
  // We'll recompute based on what we already used (the first slice above)
  // Easiest way: count how many steps remain vs original length
  // But we already consumed stepSlice; so compute start index now:
  stepStart = 1 + (0); // placeholder, we'll increment below as we place slices
  let stepsPlacedSoFar = 0;

  // We already placed some steps on page 1; increase stepsPlacedSoFar accordingly
  // Since we don't have the exact slice length here, recalc from recipe length:
  // Not available directly; simpler fix: keep a local tracker.
  // Refactor: we track slices explicitly.

  // To get exact count, we can derive it:
  // totalSteps = (recipe?.instructions || []).length
  const totalSteps = Array.isArray(recipe?.instructions) ? recipe.instructions.length : 0;
  const remainingSteps = steps.length;
  stepsPlacedSoFar = totalSteps - remainingSteps;
  stepStart = stepsPlacedSoFar + 1;

  while (ingredients.length || steps.length) {
    let html = '';

    const ingSlice = ingredients.splice(0, INGREDIENTS_PER_PAGE);
    if (ingSlice.length) {
      html += `
        <div class="ingredients">
          <h3 class="section-title">Ingredients</h3>
          <ul class="ingredient-list">
            ${ingSlice.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
          </ul>
        </div>`;
    }

    const stepSlice = steps.splice(0, STEPS_PER_PAGE);
    if (stepSlice.length) {
      html += renderInstructionsBlockWithStart(stepSlice, stepStart);
      stepsPlacedSoFar += stepSlice.length;
      stepStart = stepsPlacedSoFar + 1;
    }

    // Edge case: if nothing was added (shouldn't happen), add a blank
    if (!ingSlice.length && !stepSlice.length) {
      html += `<div class="blank-content"></div>`;
    }

    pages.push(wrapPage(html));
  }

  // 3) Notes after everything
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

function renderInstructionsBlockWithStart(steps, startIndex) {
  // Uses the HTML5 start attribute to continue numbering across pages
  return `
    <div class="instructions">
      <h3 class="section-title">Instructions</h3>
      <ol class="step-list" start="${startIndex}">
        ${steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
      </ol>
    </div>
  `;
}

// Keeping your original helpers for compatibility (not used by the new generator for steps)
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

function renderBlankPage() {
  return `<section class="page blank"><div class="blank-content"></div></section>`;
}

/* -------------------- DOM render -------------------- */

function renderSpread(container, spread) {
  container.innerHTML = `
    <div class="page-spread active">
      ${spread.left || ''}
      ${spread.right || ''}
    </div>
  `;

  const spreadEl = container.querySelector('.page-spread');
  if (!spreadEl) return;

  const pages = spreadEl.querySelectorAll('.page');
  if (pages[0]) pages[0].classList.add('left-page');
  if (pages[1]) pages[1].classList.add('right-page');
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

function wrapPage(inner) {
  return `<section class="page">${inner}</section>`;
}
