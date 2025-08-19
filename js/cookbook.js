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

      // choose via hash-slug or default to 0
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

      let currentPageIndex = 0;

      const showPage = (i) => {
        currentPageIndex = i;
        renderSpread(container, spreads[currentPageIndex]);
        if (prevBtn) prevBtn.disabled = currentPageIndex === 0;
        if (nextBtn) nextBtn.disabled = currentPageIndex >= spreads.length - 1;
      };

      showPage(0);

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (currentPageIndex > 0) showPage(currentPageIndex - 1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (currentPageIndex < spreads.length - 1) showPage(currentPageIndex + 1);
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

function buildSpreadsForRecipe(recipe) {
  const pages = generatePages(recipe);
  const spreads = [];
  let currentPageContent = '';

  // Combine pages to spreads, only create a new spread when necessary
  for (let i = 0; i < pages.length; i++) {
    currentPageContent += pages[i];

    // If the current page content exceeds the max content height, push to spreads and reset
    const measurer = document.createElement('div');
    measurer.style.cssText = `position:absolute; visibility:hidden; left:-9999px; top:-9999px; width:450px; padding:2em 3em; box-sizing:border-box; font-family:'Playfair Display', serif; font-size:1.1em; line-height:1.5;`;
    document.body.appendChild(measurer);
    
    measurer.innerHTML = currentPageContent;
    
    const pageInnerHeight = 600;
    const paddingY = 2 * 32;
    const maxContentHeight = pageInnerHeight - paddingY;

    if (measurer.offsetHeight > maxContentHeight) {
      // Page content overflows, push current content to spreads and start new spread
      spreads.push({ left: currentPageContent });
      currentPageContent = pages[i];
    }
    
    document.body.removeChild(measurer);
  }

  // Push the remaining content if any
  if (currentPageContent) {
    spreads.push({ left: currentPageContent });
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

  // Layout constants (adjust as needed)
  const pageInnerHeight  = 600;   // total inner height for .page content
  const paddingY         = 2 * 32;
  const maxContentHeight = pageInnerHeight - paddingY;

  // Hidden measurer for pagination
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

  const allPages = [];
  let stepCounter = 1;

  // Header page
  const headerHtml = `<header class="page-header">
    <h2 class="recipe-title">${escapeHtml(name)}</h2>
    ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
  </header>`;
  allPages.push(`<section class="page">${headerHtml}</section>`);

  // Paginate the recipe sections (ingredients, instructions, notes)
  if (ingredients.length) paginateList(ingredients, false, 'Ingredients');
  if (steps.length)       paginateList(steps, true, 'Instructions');
  if (notes.length)       paginateList(notes, false, 'Notes');

  // Remove measurer after use
  document.body.removeChild(measurer);
  return allPages;

  // Function to paginate a list into multiple pages
  function paginateList(items, isOrdered, sectionTitle) {
    let listItems = '';
    let firstPage = true;
    let pageBlocks = [];

    const openWrapper = () => {
      const title = firstPage ? `<h3 class="section-title">${escapeHtml(sectionTitle)}</h3>` : '';
      return isOrdered ? `${title}<ol class="step-list" start="${stepCounter}">` : `${title}<ul class="ingredient-list">`;
    };

    const closeTag = isOrdered ? '</ol>' : '</ul>';
    
    const startNewPage = () => {
      pageBlocks = [openWrapper()];
      listItems = '';
    };

    const pushPageIfHasItems = () => {
      if (pageBlocks.length && listItems) {
        const pageHtml = `<section class="page">${pageBlocks.join('')}${listItems}${closeTag}</section>`;
        if (allPages[allPages.length - 1] !== pageHtml) {
          allPages.push(pageHtml);
        }
      }
      firstPage = false;
      pageBlocks = [];
      listItems = '';
    };

    startNewPage();

    for (let i = 0; i < items.length; i++) {
      const li = `<li>${escapeHtml(items[i])}</li>`;

      // Try adding to current page
      measurer.innerHTML = pageBlocks.join('') + listItems + li + closeTag;
      if (measurer.offsetHeight <= maxContentHeight) {
        listItems += li;
        if (isOrdered) stepCounter++;
        continue;
      }

      // Current page is full, push and start a new page
      pushPageIfHasItems();
      startNewPage();

      // Force item onto the new page
      measurer.innerHTML = pageBlocks.join('') + li + closeTag;
      listItems = li;
      if (isOrdered) stepCounter++;
      if (measurer.offsetHeight > maxContentHeight) {
        pushPageIfHasItems();
        startNewPage();
      }
    }

    pushPageIfHasItems();
  }
}

function renderSpread(container, spread) {
  const left  = spread?.left  || renderBlankPage();
  const right = spread?.right || renderBlankPage();

  container.innerHTML = `<div class="page-spread active">
    ${left}
    ${right}
  </div>`;

  // Optional: ensure both pages have .page class (in case upstream HTML differs)
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
  if (qty) parts.push(String(qty));
  if (unit) parts.push(String(unit));
  if (name) parts.push(String(name));

  return parts.join(' ').trim() || JSON.stringify(item);
}
