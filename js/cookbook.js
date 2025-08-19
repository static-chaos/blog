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
    .then(r => r.json())
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
      console.error(err);
      container.innerHTML = `<p style="color:#c00">Error loading recipes</p>`;
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
    });
});

/* ---------- Pagination logic ---------- */

function buildSpreadsForRecipe(recipe) {
  const pages = generatePages(recipe);
  const spreads = [];
  
  let leftPageContent = '';
  let rightPageContent = '';
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (leftPageContent.length <= rightPageContent.length) {
      leftPageContent += page;
    } else {
      rightPageContent += page;
    }
    
    // If both pages have content, push as a spread
    if (leftPageContent.length && rightPageContent.length) {
      spreads.push({
        left:  leftPageContent,
        right: rightPageContent
      });
      leftPageContent = '';
      rightPageContent = '';
    }
  }

  // If there are remaining content for one page
  if (leftPageContent.length || rightPageContent.length) {
    spreads.push({
      left:  leftPageContent,
      right: rightPageContent
    });
  }

  return spreads;
}

function generatePages(recipe) {
  const name        = recipe?.name ?? 'Untitled Recipe';
  const description = recipe?.description ?? '';
  const ingredients = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients.map(formatIngredient)
    : [];
  const steps = Array.isArray(recipe?.instructions)
    ? [...recipe.instructions]
    : [];
  const notes = Array.isArray(recipe?.extra_notes)
    ? [...recipe.extra_notes]
    : (recipe?.extra_notes ? [recipe.extra_notes] : []);

  const pageInnerHeight  = 600;
  const paddingY         = 2 * 32;
  const maxContentHeight = pageInnerHeight - paddingY;

  const measurer = document.createElement('div');
  measurer.style.cssText = `
    position:absolute;
    visibility:hidden;
    pointer-events:none;
    left:-9999px; top:-9999px;
    width:450px;
    padding:2em 3em;
    box-sizing:border-box;
    font-family:'Playfair Display', serif;
    font-size:1.1em;
    line-height:1.5;
  `;
  document.body.appendChild(measurer);

  let stepCounter = 1;
  const allPages = [];

  const headerHtml = `<header class="page-header">
    <h2 class="recipe-title">${escapeHtml(name)}</h2>
    ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
  </header>`;
  allPages.push(`<section class="page">${headerHtml}</section>`);

  // Combine sections (Ingredients, Instructions, Notes)
  function paginateList(items, isOrdered, sectionTitle) {
    let pageContent = '';
    let firstPage = true;

    const openWrapper = () => {
      const title = firstPage ? `<h3 class="section-title">${escapeHtml(sectionTitle)}</h3>` : '';
      return isOrdered
        ? `${title}<ol class="step-list" start="${stepCounter}">`
        : `${title}<ul class="ingredient-list">`;
    };
    const closeTag = isOrdered ? '</ol>' : '</ul>';

    pageContent += openWrapper();

    items.forEach(item => {
      const li = `<li>${escapeHtml(item)}</li>`;
      measurer.innerHTML = pageContent + li + closeTag;
      if (measurer.offsetHeight <= maxContentHeight) {
        pageContent += li;
        if (isOrdered) stepCounter++;
      } else {
        allPages.push(`<section class="page">${pageContent + closeTag}</section>`);
        pageContent = openWrapper() + li; // Start new page with current item
        if (isOrdered) stepCounter++;
      }
    });

    if (pageContent) {
      allPages.push(`<section class="page">${pageContent + closeTag}</section>`);
    }
  }

  if (ingredients.length) paginateList(ingredients, false, 'Ingredients');
  if (steps.length)       paginateList(steps, true,  'Instructions');
  if (notes.length)       paginateList(notes, false, 'Notes');

  document.body.removeChild(measurer);
  return allPages;
}

function renderSpread(container, spread) {
  const left  = spread?.left  || renderBlankPage();
  const right = spread?.right || renderBlankPage();

  container.innerHTML = `<div class="page-spread active">
    ${left}
    ${right}
  </div>`;

  const pages = container.querySelectorAll('.page-spread .page');
  pages.forEach(p => p.setAttribute('aria-hidden', 'false'));
}

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
  if (item == null) return '';
  if (typeof item === 'string') return item;

  const qty = item.quantity ?? item.qty ?? item.amount ?? '';
  const unit = item.unit ?? '';
  const name = item.name ?? item.ingredient ?? item.item ?? '';

  const parts = [];
  if (qty)  parts.push(String(qty));
  if (unit) parts.push(String(unit));
  if (name) parts.push(String(name));

  const line = parts.join(' ').trim();
  return line || JSON.stringify(item);
}
