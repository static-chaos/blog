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
  // 1) flatten recipe data
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

  // 2) shared measurement setup
  const pageInnerHeight  = 600;     // px container height
  const paddingY         = 2 * 32;  // ~2em top+bottom
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

  // HEADER PAGE (always first)
  (function flushHeader() {
    const headerHtml = `<header class="page-header">
      <h2 class="recipe-title">${escapeHtml(name)}</h2>
      ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
    </header>`;
    measurer.innerHTML = headerHtml;
    allPages.push(`<section class="page">${headerHtml}</section>`);
  })();


  // GENERIC list-pagination function
  function paginateList(items, isOrdered, sectionTitle) {
    const pagesForThis = [];
    let firstPage = true;
    let blocks = [];
    let usedHeight = 0;

    function openTag() {
      return isOrdered
        ? `<h3 class="section-title">${sectionTitle}</h3>
           <ol class="step-list" start="${stepCounter}">`
        : `<h3 class="section-title">${sectionTitle}</h3>
           <ul class="ingredient-list">`;
    }
    const closeTag = isOrdered ? '</ol>' : '</ul>';
    let wrapperOpen = openTag();
    let itemsHtml   = '';

    function fits(html) {
      measurer.innerHTML = blocks.join('') + html;
      if (measurer.offsetHeight <= maxContentHeight) {
        blocks.push(html);
        usedHeight = measurer.offsetHeight;
        return true;
      }
      return false;
    }

    function flushLocal() {
      if (!blocks.length) return;
      const html = `<section class="page">${blocks.join('')}</section>`;
      if (pagesForThis[pagesForThis.length - 1] !== html) {
        pagesForThis.push(html);
      }
    }

    for (let i = 0; i < items.length; i++) {
      const li = `<li>${escapeHtml(items[i])}</li>`;
      const candidate = (firstPage ? wrapperOpen : '') +
                        itemsHtml +
                        li +
                        closeTag;

      if (fits(candidate)) {
        itemsHtml += li;
        if (isOrdered) stepCounter++;
      } else {
        const pageHtml = (firstPage ? wrapperOpen : '') +
                         itemsHtml +
                         closeTag;
        blocks.push(pageHtml);
        flushLocal();

        firstPage = false;
        blocks = [];
        measurer.innerHTML = '';

        wrapperOpen = openTag();
        itemsHtml   = li;
        if (isOrdered) stepCounter++;
      }
    }

    if (itemsHtml) {
      const pageHtml = (firstPage ? wrapperOpen : '') +
                       itemsHtml +
                       closeTag;
      blocks.push(pageHtml);
      flushLocal();
    }

    return pagesForThis;
  }


  // 3) INGREDIENTS
  if (ingredients.length) {
    const ingPages = paginateList(ingredients, false, 'Ingredients');
    allPages.push(...ingPages);
  }

  // 4) INSTRUCTIONS
  if (steps.length) {
    const stepPages = paginateList(steps, true, 'Instructions');
    allPages.push(...stepPages);
  }

  // 5) NOTES
  if (notes.length) {
    const notePages = paginateList(notes, false, 'Notes');
    allPages.push(...notePages);
  }


  // simple debug to catch parse errors
  console.log("total pages:", allPages.length);
  allPages.forEach((html, i) => console.log(i, html));


  document.body.removeChild(measurer);
  return allPages;
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
});  // ← closes the DOMContentLoaded callback and addEventListener call
