'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.recipe-book .book-content');
  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');

  if (!container) {
    console.error('Missing .recipe-book .book-content container');
    return;
  }

  fetch('data/cookbook.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
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
      const toSlug = s => String(s)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      let recipeIndex = slugFromHash
        ? recipes.findIndex(r => toSlug(r.name) === slugFromHash)
        : 0;
      if (recipeIndex < 0) recipeIndex = 0;

      const recipe = recipes[recipeIndex];
      const spreads = buildSpreadsForRecipe(recipe);

      let currentSpreadIndex = 0;

      const showSpread = (i) => {
        currentSpreadIndex = i;
        renderSpread(container, spreads[currentSpreadIndex]);
        if (prevBtn) prevBtn.disabled = currentSpreadIndex === 0;
        if (nextBtn) nextBtn.disabled = currentSpreadIndex >= spreads.length - 1;
      };

      showSpread(0);

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (currentSpreadIndex > 0) showSpread(currentSpreadIndex - 1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (currentSpreadIndex < spreads.length - 1) showSpread(currentSpreadIndex + 1);
        });
      }
    })
    .catch(err => {
      console.error('Error loading recipes:', err);
      container.innerHTML = `<p style="color:#c00">Error loading recipes</p>`;
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
    });
});

/* ---------- Updated pagination logic for continuous flow ---------- */

function buildSpreadsForRecipe(recipe) {
  const pages = generateContinuousPages(recipe);
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      left:  pages[i],
      right: pages[i + 1] || renderBlankPage()
    });
  }
  return spreads;
}

function generateContinuousPages(recipe) {
  // accumulates all content as a single continuous flow of blocks for pagination
  const blocks = [];

  blocks.push(`<h2 class="recipe-title">${escapeHtml(recipe?.name ?? 'Untitled Recipe')}</h2>`);
  if (recipe?.description) {
    blocks.push(`<p class="recipe-desc">${escapeHtml(recipe.description)}</p>`);
  }

  if (Array.isArray(recipe?.ingredients) && recipe.ingredients.length) {
    blocks.push('<h3 class="section-title">Ingredients</h3>');
    blocks.push('<ul class="ingredients">');
    recipe.ingredients.forEach(ing => {
      blocks.push(`<li>${escapeHtml(formatIngredient(ing))}</li>`);
    });
    blocks.push('</ul>');
  }

  if (Array.isArray(recipe?.instructions) && recipe.instructions.length) {
    blocks.push('<h3 class="section-title">Instructions</h3>');
    blocks.push('<ol class="instructions">');
    recipe.instructions.forEach(step => {
      blocks.push(`<li>${escapeHtml(step)}</li>`);
    });
    blocks.push('</ol>');
  }

  if (Array.isArray(recipe?.extra_notes) && recipe.extra_notes.length) {
    blocks.push('<h3 class="section-title">Notes</h3>');
    blocks.push('<ul class="notes">');
    recipe.extra_notes.forEach(note => {
      blocks.push(`<li>${escapeHtml(note)}</li>`);
    });
    blocks.push('</ul>');
  }

  const pageInnerHeight  = 600;
  const paddingY         = 2 * 16; // 2em vertical padding approx
  const maxContentHeight = pageInnerHeight - paddingY;

  const measurer = document.createElement('div');
  measurer.style.cssText = `
    position:absolute;
    visibility:hidden;
    pointer-events:none;
    left:-9999px; top:-9999px;
    width:450px;
    padding:2em;
    box-sizing:border-box;
    font-family:'Playfair Display', serif;
    font-size:1.1em;
    line-height:1.4;
  `;
  document.body.appendChild(measurer);

  const pages = [];
  let currentContent = '';

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const testContent = currentContent + block;
    measurer.innerHTML = testContent;
    if (measurer.offsetHeight <= maxContentHeight) {
      currentContent = testContent;
    } else {
      if(currentContent) pages.push(`<section class="page">${currentContent}</section>`);
      currentContent = block;
    }
  }
  if(currentContent) pages.push(`<section class="page">${currentContent}</section>`);

  document.body.removeChild(measurer);

  return pages;
}

function renderSpread(container, spread) {
  const left = spread?.left || renderBlankPage();
  const right = spread?.right || renderBlankPage();

  container.innerHTML = `<div class="page-spread active">
    <div class="page left-page">${left}</div>
    <div class="page right-page">${right}</div>
  </div>`;

  const pages = container.querySelectorAll('.page-spread .page');
  pages.forEach(p => p.setAttribute('aria-hidden', 'false'));
}

/* ---------- Helpers ---------- */

function renderBlankPage() {
  return `<section class="page page-blank"></section>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
