// js/cookbook.js — No Images, Auto Pagination, No Scroll

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.recipe-book .book-content');
  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');

  fetch('data/cookbook.json')
    .then(r => r.json())
    .then(data => {
      const recipes = Array.isArray(data?.recipes) ? data.recipes : [];
      if (!recipes.length) {
        container.innerHTML = `<p style="color:#c00">No recipes found</p>`;
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

      let currentSpreadIndex = 0;
      renderSpread(container, spreads[currentSpreadIndex]);

      prevBtn.addEventListener('click', () => {
        if (currentSpreadIndex > 0) {
          renderSpread(container, spreads[--currentSpreadIndex]);
        }
      });
      nextBtn.addEventListener('click', () => {
        if (currentSpreadIndex < spreads.length - 1) {
          renderSpread(container, spreads[++currentSpreadIndex]);
        }
      });
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = `<p style="color:#c00">Error loading recipes</p>`;
    });
});


/* ---------- Pagination logic ---------- */

function buildSpreadsForRecipe(recipe) {
  const pages = generatePages(recipe);
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      left:  pages[i],
      right: pages[i + 1] || renderBlankPage()
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

  // Header page
  const headerHtml = `<header class="page-header">
    <h2 class="recipe-title">${escapeHtml(name)}</h2>
    ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
  </header>`;
  allPages.push(`<section class="page">${headerHtml}</section>`);

  // Improved paginateList to avoid duplication
  function paginateList(items, isOrdered, sectionTitle) {
    let firstPage = true;
    let pageBlocks = [];
    let listItems = '';

    const openWrapper = () => {
      const title = firstPage ? `<h3 class="section-title">${sectionTitle}</h3>` : '';
      return isOrdered
        ? `${title}<ol class="step-list" start="${stepCounter}">`
        : `${title}<ul class="ingredient-list">`;
    };
    const closeTag = isOrdered ? '</ol>' : '</ul>';

    const startNewPage = () => {
      pageBlocks = [openWrapper()];
      listItems = '';
    };

    const flushPageNow = () => {
      if (!pageBlocks.length) return;
      const html = `<section class="page">${pageBlocks.join('')}${listItems}${closeTag}</section>`;
      if (allPages[allPages.length - 1] !== html) {
        allPages.push(html);
      }
      firstPage = false;
      pageBlocks = [];
      listItems = '';
    };

    startNewPage();

    for (let i = 0; i < items.length; i++) {
      const li = `<li>${escapeHtml(items[i])}</li>`;
      const candidate = pageBlocks.join('') + listItems + li + closeTag;

      measurer.innerHTML = candidate;
      if (measurer.offsetHeight <= maxContentHeight) {
        listItems += li;
        if (isOrdered) stepCounter++;
      } else {
        flushPageNow();
        startNewPage();
        listItems = li;
        if (isOrdered) stepCounter++;
        measurer.innerHTML = pageBlocks.join('') + listItems + closeTag;
        if (measurer.offsetHeight > maxContentHeight) {
          flushPageNow();
          startNewPage();
        }
      }
    }

    if (listItems) {
      flushPageNow();
    }
  }

  if (ingredients.length) paginateList(ingredients, false, 'Ingredients');
  if (steps.length)       paginateList(steps, true,  'Instructions');
  if (notes.length)       paginateList(notes, false, 'Notes');

  document.body.removeChild(measurer);
  return allPages;
}

function renderSpread(container, spread) {
  container.innerHTML = `<div class="page-spread active">
    ${spread.left || ''}
    ${spread.right || ''}
  </div>`;
  const pages = container.querySelectorAll
