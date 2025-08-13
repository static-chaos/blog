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
  const pages = [];
  const name        = recipe?.name ?? 'Untitled Recipe';
  const description = recipe?.description ?? '';

  // prepare flat arrays of strings
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
  const pageInnerHeight  = 600;     // px
  const paddingY         = 2 * 32;  // ~2em top & bottom
  const maxContentHeight = pageInnerHeight - paddingY;

  // hidden element to measure
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

  // 1) guard against empty or duplicate pages
  function flushPage(blocks) {
    if (!blocks.length) return;
    const html = `<section class="page">${blocks.join('')}</section>`;
    if (pages[pages.length - 1] !== html) {
      pages.push(html);
    }
  }

  // 2) measure & push a single chunk if it fits
  function addBlock(blocks, html, usedHeightRef) {
    measurer.innerHTML = blocks.join('') + html;
    if (measurer.offsetHeight <= maxContentHeight) {
      blocks.push(html);
      usedHeightRef.value = measurer.offsetHeight;
      return true;
    }
    return false;
  }

  // 3) paginate an array of items (ingredients, steps, notes)
  function paginateList(items, isOrdered, sectionTitle) {
    let firstPage = true;
    let blocks = [];
    let usedHeightRef = { value: 0 };

    function openWrapper() {
      if (isOrdered) {
        return `<h3 class="section-title">${sectionTitle}</h3>
                <ol class="step-list" start="${stepCounter}">`;
      } else {
        return `<h3 class="section-title">${sectionTitle}</h3>
                <ul class="ingredient-list">`;
      }
    }

    let wrapperOpen = openWrapper();
    let wrappedItems = '';

    items.forEach(item => {
      const li = `<li>${escapeHtml(item)}</li>`;
      const closingTag = isOrdered ? '</ol>' : '</ul>';
      const candidate = (firstPage ? wrapperOpen : '') +
                        wrappedItems +
                        li +
                        closingTag;

      if (addBlock(blocks, candidate, usedHeightRef)) {
        wrappedItems += li;
        if (isOrdered) stepCounter++;
      } else {
        // flush current page
        const toPush = (firstPage ? wrapperOpen : '') +
                       wrappedItems +
                       closingTag;
        blocks.push(toPush);
        flushPage(blocks);

        // start fresh
        blocks = [];
        measurer.innerHTML = '';
        firstPage = false;

        wrapperOpen  = openWrapper();
        wrappedItems = li;
        if (isOrdered) stepCounter++;
      }
    });

    // flush remaining items
    if (wrappedItems) {
      const closingTag = isOrdered ? '</ol>' : '</ul>';
      const toPush = (firstPage ? wrapperOpen : '') +
                     wrappedItems +
                     closingTag;
      blocks.push(toPush);
    }
    flushPage(blocks);
  }

  // --- HEADER PAGE ---
  const headerHtml = `<header class="page-header">
    <h2 class="recipe-title">${escapeHtml(name)}</h2>
    ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
  </header>`;
  let introBlocks = [headerHtml];
  measurer.innerHTML = headerHtml;
  flushPage(introBlocks);

  // --- INGREDIENTS ---
  if (ingredients.length) {
    paginateList(ingredients, false, 'Ingredients');
  }

  // --- INSTRUCTIONS ---
  if (steps.length) {
    paginateList(steps, true, 'Instructions');
  }

  // --- NOTES ---
  if (notes.length) {
    paginateList(notes, false, 'Notes');
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
