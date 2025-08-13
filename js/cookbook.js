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

      // pick recipe by URL-hash slug or default to first
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
  const pages  = generatePages(recipe);
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
  const pages  = [];
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
    : recipe?.extra_notes
      ? [recipe.extra_notes]
      : [];

  let stepCounter = 1;
  const pageInnerHeight = 600;       // px
  const paddingY       = 2 * 32;     // ~2em top+bottom
  const maxContentHeight = pageInnerHeight - paddingY;

  // hidden element to measure height
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

  // push blocks into a <section class="page"> wrapper
  function flushPage(blocks) {
    pages.push(`<section class="page">${blocks.join('')}</section>`);
  }

  // try adding one HTML chunk to current page; returns true if fits
  function addBlock(blocks, html, usedHeightRef) {
    measurer.innerHTML = blocks.join('') + html;
    if (measurer.offsetHeight <= maxContentHeight) {
      blocks.push(html);
      usedHeightRef.value = measurer.offsetHeight;
      return true;
    }
    return false;
  }

  // paginates a list (ingredients, steps or notes)
  function paginateList(items, type, sectionTitle) {
    let firstPageOfSection = true;
    const pagesForThis = [];
    let blocks = [];
    let usedHeightRef = { value: 0 };

    // open tag builder
    function openTag() {
      return type === 'ol'
        ? `<h3 class="section-title">Instructions</h3>
           <ol class="step-list" start="${stepCounter}">`
        : `<h3 class="section-title">${sectionTitle}</h3>
           <ul class="ingredient-list">`;
    }

    let listOpen = openTag();
    let listItems = '';

    for (let i = 0; i < items.length; i++) {
      const itemHtml = `<li>${escapeHtml(items[i])}</li>`;
      const candidate = (firstPageOfSection ? listOpen : '') +
                        listItems +
                        itemHtml +
                        (type === 'ol' ? '</ol>' : '</ul>');

      if (addBlock(blocks, candidate, usedHeightRef)) {
        // it fits — store just the new <li> chunk
        listItems += itemHtml;
        if (type === 'ol') stepCounter++;
      } else {
        // flush current page
        const toPush = (firstPageOfSection ? listOpen : '') +
                       listItems +
                       (type === 'ol' ? '</ol>' : '</ul>');
        blocks.push(toPush);
        flushPage(blocks);

        // start a fresh page
        blocks = [];
        measurer.innerHTML = '';
        firstPageOfSection = false;

        // reset listOpen & listItems for next page
        listOpen  = openTag();
        listItems = itemHtml;
        if (type === 'ol') stepCounter++;
      }
    }

    // push what's left
    if (listItems) {
      const toPush = (firstPageOfSection ? listOpen : '') +
                     listItems +
                     (type === 'ol' ? '</ol>' : '</ul>');
      blocks.push(toPush);
    }
    flushPage(blocks);

    return pagesForThis;
  }

  //-------------------
  // 1) HEADER PAGE
  //-------------------
  const headerHtml = `<header class="page-header">
    <h2 class="recipe-title">${escapeHtml(name)}</h2>
    ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
  </header>`;
  let blocks = [headerHtml];
  measurer.innerHTML = headerHtml;
  flushPage(blocks);

  //-------------------
  // 2) INGREDIENTS
  //-------------------
  if (ingredients.length) {
    const ingPages = paginateList(ingredients, 'ul',   'Ingredients');
    pages.push(...ingPages);
  }

  //-------------------
  // 3) INSTRUCTIONS
  //-------------------
  if (steps.length) {
    const stepPages = paginateList(steps,       'ol', 'Instructions');
    pages.push(...stepPages);
  }

  //-------------------
  // 4) NOTES
  //-------------------
  if (notes.length) {
    const notePages = paginateList(notes,       'ul',  'Notes');
    pages.push(...notePages);
  }

  document.body.removeChild(measurer);
  return pages;
}

function renderSpread(container, spread) {
  container.innerHTML = `<div class="page-spread active">
    ${spread.left || ''}
    ${spread.right || ''}
  </div>`;
  const pages = container.querySelectorAll('.page');
  if (pages[0]) pages[0].classList.add('left-page');
  if (pages[1]) pages[1].classList.add('right-page');
}

function formatIngredient(obj) {
  if (!obj) return '';
  const item = obj.item     != null ? String(obj.item)     : '';
  const qty  = obj.quantity != null ? String(obj.quantity) : '';
  return item && qty ? `${item} — ${qty}` : (item || qty || '');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderBlankPage() {
  return `<section class="page blank">
    <div class="blank-content"></div>
  </section>`;
}
