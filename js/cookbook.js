'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.recipe-book .book-content');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (!container) {
    console.error('Missing .recipe-book .book-content container');
    return;
  }

  fetch('data/cookbook.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      const recipes = Array.isArray(data?.recipes) ? data.recipes : [];
      if (!recipes.length) {
        container.innerHTML = `<p style="color:#c00">No recipes found</p>`;
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
      }

      const slugFromHash = window.location.hash.slice(1).toLowerCase();
      const toSlug = s => String(s).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      let recipeIndex = slugFromHash ? recipes.findIndex(r => toSlug(r.name) === slugFromHash) : 0;
      if (recipeIndex < 0) recipeIndex = 0;

      const recipe = recipes[recipeIndex];

      const spreads = buildSpreadsForRecipe(recipe);

      let currentSpreadIndex = 0;

      const showSpread = i => {
        currentSpreadIndex = i;
        renderSpread(container, spreads[currentSpreadIndex]);
        if (prevBtn) prevBtn.disabled = currentSpreadIndex === 0;
        if (nextBtn) nextBtn.disabled = currentSpreadIndex >= spreads.length - 1;
      };

      showSpread(0);

      if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentSpreadIndex > 0) showSpread(currentSpreadIndex - 1);
      });
      if (nextBtn) nextBtn.addEventListener('click', () => {
        if (currentSpreadIndex < spreads.length - 1) showSpread(currentSpreadIndex + 1);
      });
    })
    .catch(err => {
      console.error('Error loading recipes:', err);
      container.innerHTML = `<p style="color:#c00">Error loading recipes</p>`;
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
    });
});

/* -------- Pagination with continuous flow -------- */

function buildSpreadsForRecipe(recipe) {
  const pages = generateContinuousPages(recipe);
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      left: pages[i],
      right: pages[i + 1] || renderBlankPage(),
    });
  }
  return spreads;
}

function generateContinuousPages(recipe) {
  // Combine all content into one large block array for continuous flow
  const blocks = [];

  blocks.push(`<h2 class="recipe-title">${escapeHtml(recipe?.name ?? 'Untitled Recipe')}</h2>`);
  if (recipe?.description) {
    blocks.push(`<p class="recipe-desc">${escapeHtml(recipe.description)}</p>`);
  }

  // Ingredients combined as list items in one <ul>
  if (Array.isArray(recipe?.ingredients) && recipe.ingredients.length) {
    blocks.push('<h3 class="section-title">Ingredients</h3>');
    blocks.push('<ul class="ingredients">');
    recipe.ingredients.forEach(ing => {
      blocks.push(`<li>${escapeHtml(formatIngredient(ing))}</li>`);
    });
    blocks.push('</ul>');
  }

  // Instructions combined as numbered steps, all in one <ol>
  if (Array.isArray(recipe?.instructions) && recipe.instructions.length) {
    blocks.push('<h3 class="section-title">Instructions</h3>');
    blocks.push('<ol class="instructions">');
    recipe.instructions.forEach(step => {
      blocks.push(`<li>${escapeHtml(step)}</li>`);
    });
    blocks.push('</ol>');
  }

  // Notes combined in one <ul>
  if (Array.isArray(recipe?.extra_notes) && recipe.extra_notes.length) {
    blocks.push('<h3 class="section-title">Notes</h3>');
    blocks.push('<ul class="notes">');
    recipe.extra_notes.forEach(note => {
      blocks.push(`<li>${escapeHtml(note)}</li>`);
    });
    blocks.push('</ul>');
  }

  // Pagination variables and setup
  const pageInnerHeight = 600; // matches your CSS page height
  const paddingY = 2 * 16; // padding top + bottom (2em = 32px approx)
  const maxContentHeight = pageInnerHeight - paddingY;

  const measurer = document.createElement('div');
  measurer.style.cssText = `
    position:absolute;
    left:-9999px;
    top:-9999px;
    width:450px;
    padding:2em;
    box-sizing:border-box;
    font-family:'Playfair Display', serif;
    font-size:1.1em;
    line-height:1.4;
    visibility:hidden;
  `;
  document.body.appendChild(measurer);

  const pages = [];
  let currentPageContent = '';

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const tentative = currentPageContent + block;
    measurer.innerHTML = tentative;
    if (measurer.offsetHeight <= maxContentHeight) {
      currentPageContent = tentative;
    } else {
      if (currentPageContent) pages.push(`<section class="page">${currentPageContent}</section>`);
      currentPageContent = block;
    }
  }
  if (currentPageContent) pages.push(`<section class="page">${currentPageContent}</section>`);

  document.body.removeChild(measurer);
  return pages;
}

function renderSpread(container, spread) {
  container.innerHTML = `
    <div class="page-spread active">
      <div class="page left-page">${spread.left}</div>
      <div class="page right-page">${spread.right}</div>
    </div>
  `;
}

/* ---------- Helpers ---------- */
function renderBlankPage() {
  return `<section class="page page-blank"></section>`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatIngredient(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const qty = item.quantity ?? item.qty ?? item.amount ?? '';
  const unit = item.unit ?? '';
  const name = item.name ?? item.ingredient ?? item.item ?? '';
  return [qty, unit, name].filter(Boolean).join(' ');
}
