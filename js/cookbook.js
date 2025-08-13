/****************************************************
 * js/cookbook.js — No Images, Auto Pagination, No Scroll
 ****************************************************/

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.recipe-book .book-content');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  fetch('data/cookbook.json')
    .then(r => r.json())
    .then(data => {
      const recipes = Array.isArray(data?.recipes) ? data.recipes : [];
      if (recipes.length === 0) {
        container.innerHTML = `<p style="color:#c00">No recipes found</p>`;
        return;
      }

      const slugFromHash = window.location.hash.slice(1).toLowerCase();
      const toSlug = s => String(s).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      let recipeIndex = slugFromHash
        ? recipes.findIndex(r => toSlug(r.name) === slugFromHash)
        : 0;
      if (recipeIndex === -1) recipeIndex = 0;

      const recipe = recipes[recipeIndex];
      const spreads = buildSpreadsForRecipe(recipe);
      console.log("DEBUG SPREADS:", spreads); // ✅ Debug log

      let currentSpreadIndex = 0;
      renderSpread(container, spreads[currentSpreadIndex]);

      prevBtn.addEventListener('click', () => {
        if (currentSpreadIndex > 0) {
          currentSpreadIndex--;
          renderSpread(container, spreads[currentSpreadIndex]);
        }
      });
      nextBtn.addEventListener('click', () => {
        if (currentSpreadIndex < spreads.length - 1) {
          currentSpreadIndex++;
          renderSpread(container, spreads[currentSpreadIndex]);
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
  return pairPagesIntoSpreads(pages);
}

function generatePages(recipe) {
  const pages = [];
  const name = recipe?.name ?? 'Untitled Recipe';
  const description = recipe?.description ?? '';

  const ingredients = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients.map(formatIngredient)
    : [];
  const steps = Array.isArray(recipe?.instructions) ? [...recipe.instructions] : [];
  const notes = Array.isArray(recipe?.extra_notes)
    ? [...recipe.extra_notes]
    : recipe?.extra_notes ? [recipe.extra_notes] : [];

  const totalSteps = steps.length;
  let stepCounter = 1;

  // Create a hidden measurer
  const measurer = document.createElement('div');
  measurer.style.cssText = `
    position:absolute;visibility:hidden;pointer-events:none;
    width:450px;height:auto;padding:2em 3em;box-sizing:border-box;
    font-family:'Playfair Display', serif;font-size:1.1em;line-height:1.5;
  `;
  document.body.appendChild(measurer);

  function flushPage(blocks) {
    pages.push(`<section class="page">${blocks.join('')}</section>`);
  }

  // First page: title + optional description
  let blocks = [];
  measurer.innerHTML = '';
  measurer.innerHTML += `<header class="page-header">
    <h2 class="recipe-title">${escapeHtml(name)}</h2>
    ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
  </header>`;

  let usedHeight = measurer.offsetHeight;

  const pageInnerHeight = 600; // container height in px
  const paddingY = 2 * 32; // 2em top & bottom (~32px each)
  const maxContentHeight = pageInnerHeight - paddingY;

  // ✅ Fixed addBlock
  const addBlock = html => {
    measurer.innerHTML = blocks.join('') + html;
    if (measurer.offsetHeight <= maxContentHeight) {
      blocks.push(html);
      usedHeight = measurer.offsetHeight;
      return true;
    } else {
      measurer.innerHTML = blocks.join('');
      return false;
    }
  };

  const addListItems = (items, type, sectionTitle = '') => {
    let firstPage = true; // track if still on first page of this list
    let listOpen = type === 'ol'
      ? `<ol class="step-list" start="${stepCounter}">`
      : `<ul class="ingredient-list">`;
    let currentList = listOpen;

    for (let i = 0; i < items.length;) {
      const itemHtml = `<li>${escapeHtml(items[i])}</li>`;
      const testBlock = (firstPage ? sectionTitle : '') +
                        currentList + itemHtml +
                        (type==='ol' ? '</ol>' : '</ul>');

      if (addBlock(testBlock)) {
        currentList += itemHtml;
        i++;
        if (type === 'ol') stepCounter++;
      } else {
        currentList += type==='ol' ? '</ol>' : '</ul>';
        blocks.push(firstPage ? sectionTitle + currentList : currentList);
        console.log("DEBUG PAGE ADDED:", blocks); // ✅ Debug log
        flushPage(blocks);

        blocks = [];
        measurer.innerHTML = '';
        currentList = listOpen;
        firstPage = false;
        continue;
      }
    }

    if (currentList !== listOpen) {
      currentList += type==='ol' ? '</ol>' : '</ul>';
      blocks.push(firstPage ? sectionTitle + currentList : currentList);
    }
  };

  // Ingredients
  if (ingredients.length) {
    console.log("DEBUG INGREDIENTS:", ingredients);
    addListItems(ingredients, 'ul', `<h3 class="section-title">Ingredients</h3>`);
  }

  if (steps.length) {
    console.log("DEBUG STEPS:", steps);
    addListItems(steps, 'ol', `<h3 class="section-title">Instructions</h3>`);
  }

  if (notes.length) {
    console.log("DEBUG NOTES:", notes);
    addListItems(notes, 'ul', `<h3 class="section-title">Notes</h3>`);
  }

  flushPage(blocks);

  document.body.removeChild(measurer);
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
  const item = obj.item != null ? String(obj.item) : '';
  const qty = obj.quantity != null ? String(obj.quantity) : '';
  return item && qty ? `${item} — ${qty}` : item || qty || '';
}
function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function renderBlankPage() {
  return `<section class="page blank"><div class="blank-content"></div></section>`;
}
