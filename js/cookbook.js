'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.recipe-book .book-content');
  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');
    const isMobile = window.innerWidth <= 768;


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
        if (isMobile) {
          // On mobile: show ALL spreads stacked in one long scroll
          container.innerHTML = spreads.map(spread => `
            <div class="page-spread active">
              ${spread.left}
              ${spread.right}
            </div>
          `).join('');

          if (prevBtn) prevBtn.style.display = "none";
          if (nextBtn) nextBtn.style.display = "none";
        } else {
          // Desktop: normal paginated flip
          currentSpreadIndex = i;
          renderSpread(container, spreads[currentSpreadIndex]);
          if (prevBtn) prevBtn.disabled = currentSpreadIndex === 0;
          if (nextBtn) nextBtn.disabled = currentSpreadIndex >= spreads.length - 1;
        }
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
  const paddingY         = 2 * 16;
  const maxContentHeight = pageInnerHeight - paddingY;

  const measurer = document.createElement('div');
  measurer.style.cssText = `
    position:absolute;
    visibility:hidden;
    pointer-events:none;
    left:-9999px; top:-9999px;
    width:450px;
    padding:1em 3em;
    box-sizing:border-box;
    font-family:'Playfair Display', serif;
    font-size:1.1em;
    line-height:1.6;
  `;
  document.body.appendChild(measurer);

  function splitToSentences(text) {
    if (!text) return [];
    return text.match(/[^\.!\?]+[\.!\?]+|[^\.!\?]+$/g)?.map(s => s.trim()) || [text];
  }

  const blocks = [];

  blocks.push(`<h2 class="recipe-title">${escapeHtml(name)}</h2>`);
  if (description) {
    splitToSentences(description).forEach(s => {
      blocks.push(`<p class="recipe-desc">${escapeHtml(s)}</p>`);
    });
  }

  if (ingredients.length) {
    blocks.push(`<h3 class="section-title">Ingredients</h3>`);
    blocks.push('<ul class="ingredient-list">');
    ingredients.forEach(ing => {
      blocks.push(`<li>${escapeHtml(ing)}</li>`);
    });
    blocks.push('</ul>');
  }

  // Add instructions heading and ordered list for numbered steps
  if (steps.length) {
    blocks.push(`<h3 class="section-title">Instructions</h3>`);
    blocks.push('<ol class="instructions-list">');
    steps.forEach(step => {
      splitToSentences(step).forEach(sentence => {
        blocks.push(`<li>${escapeHtml(sentence)}</li>`);
      });
    });
    blocks.push('</ol>');
  }

  if (notes.length) {
    blocks.push(`<h3 class="section-title">Notes</h3>`);
    blocks.push('<ul class="note-list">');
    notes.forEach(note => {
      splitToSentences(note).forEach(sentence => {
        blocks.push(`<li>${escapeHtml(sentence)}</li>`);
      });
    });
    blocks.push('</ul>');
  }

  const allPages = [];
  let currentPageContent = '';

  for(let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const tentativeContent = currentPageContent + block;
    measurer.innerHTML = tentativeContent;
    if(measurer.offsetHeight <= maxContentHeight) {
      currentPageContent = tentativeContent;
    } else {
      if(currentPageContent) allPages.push(`<section class="page">${currentPageContent}</section>`);
      currentPageContent = block;
    }
  }
  if(currentPageContent) allPages.push(`<section class="page">${currentPageContent}</section>`);

  document.body.removeChild(measurer);

  return allPages;
}

function paginateInstructions(blocks, measurer, maxContentHeight) {
  let pages = [];
  let currentPage = '';
  let olStart = 1;
  let isListOpen = false;
  let firstPage = true;

  for (let i = 0; i < blocks.length; i++) {
    const liHtml = `<li>${escapeHtml(blocks[i].text)}</li>`;
    let tentativeContent;

    if (!isListOpen) {
      const heading = firstPage ? `<h3 class="section-title">Instructions</h3>` : '';
      tentativeContent = currentPage + heading + `<ol class="step-list" start="${olStart}">` + liHtml + '</ol>';
    } else {
      tentativeContent = currentPage.replace(/<\/ol>$/, '') + liHtml + '</ol>';
    }

    measurer.innerHTML = tentativeContent;
    if (measurer.offsetHeight <= maxContentHeight) {
      if (!isListOpen) {
        const heading = firstPage ? `<h3 class="section-title">Instructions</h3>` : '';
        currentPage += heading + `<ol class="step-list" start="${olStart}">` + liHtml;
        isListOpen = true;
        firstPage = false;
      } else {
        currentPage = currentPage.replace(/<\/ol>$/, '') + liHtml;
      }
      olStart++;
    } else {
      if (isListOpen) currentPage += '</ol>';
      pages.push(`<section class="page">${currentPage}</section>`);
      currentPage = `<ol class="step-list" start="${olStart}">${liHtml}`;
      isListOpen = true;
      olStart++;
      firstPage = false;
    }
  }

  if (isListOpen) currentPage += '</ol>';
  if (currentPage) pages.push(`<section class="page">${currentPage}</section>`);

  // Merge last page with previous if it’s too empty to avoid blank space
  if (pages.length > 1) {
    const lastPageContent = pages[pages.length - 1];
    measurer.innerHTML = lastPageContent;
    const lastPageHeight = measurer.offsetHeight;
    if (lastPageHeight < maxContentHeight * 0.4) { // threshold 40% height
      const prevPageContent = pages[pages.length - 2];
      measurer.innerHTML = prevPageContent + lastPageContent;
      if (measurer.offsetHeight <= maxContentHeight) {
        pages[pages.length - 2] = prevPageContent + lastPageContent;
        pages.pop();
      }
    }
  }

  return pages;
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
