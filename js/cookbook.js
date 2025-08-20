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

  // Constants for layout and height limits
  const pageInnerHeight  = 600;
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

  // Helper: split text into sentences for fine pagination
  function splitToSentences(text) {
    return text.match(/[^\.!\?]+[\.!\?]+|\s*$/g).filter(Boolean).map(s => s.trim());
  }

  // Build flat array of HTML blocks for all content
  const blocks = [];

  blocks.push(`<h2 class="recipe-title">${escapeHtml(name)}</h2>`);
  if (description) {
    splitToSentences(description).forEach(s => {
      blocks.push(`<p class="recipe-desc">${escapeHtml(s)}</p>`);
    });
  }

  if (ingredients.length) {
    blocks.push(`<h3 class="section-title">Ingredients</h3>`);
    // Ingredients list opening tag
    blocks.push('<ul class="ingredient-list">');
    ingredients.forEach(ing => {
      blocks.push(`<li>${escapeHtml(ing)}</li>`);
    });
    blocks.push('</ul>');
  }

  if (steps.length) {
    blocks.push(`<h3 class="section-title">Instructions</h3>`);
    // We'll split instructions across pages with proper numbering
    // So instructions go as separate <li> blocks
  }

  // Split instructions into sentence-level <li> to allow smooth pagination
  let instructionLiBlocks = [];
  let instructionIndex = 1;
  steps.forEach(step => {
    splitToSentences(step).forEach(sentence => {
      instructionLiBlocks.push({ text: sentence, index: instructionIndex++ });
    });
  });

  // We'll paginate instructions in a separate function to handle numbering continuation
  function paginateInstructions(blocks) {
    let pages = [];       // store page blocks as strings
    let currentPage = ''; // current page content
    let olStart = 1;      // current ordered list start index
    let isListOpen = false;

    for (let i = 0; i < blocks.length; i++) {
      const liHtml = `<li>${escapeHtml(blocks[i].text)}</li>`;

      let tentativeContent;
      if (!isListOpen) {
        tentativeContent = currentPage + `<ol class="step-list" start="${olStart}">` + liHtml;
      } else {
        tentativeContent = currentPage + liHtml;
      }
      // When adding the last li on page, close the list tentatively for measurement
      tentativeContent += '</ol>';

      measurer.innerHTML = tentativeContent;
      if (measurer.offsetHeight <= maxContentHeight) {
        if (!isListOpen) {
          currentPage += `<ol class="step-list" start="${olStart}">` + liHtml;
          isListOpen = true;
        } else {
          currentPage += liHtml;
        }
        olStart++;
      } else {
        if (isListOpen) {
          currentPage += '</ol>';
        }
        pages.push(`<section class="page">${currentPage}</section>`);
        // Start new page with this li
        currentPage = `<ol class="step-list" start="${olStart}">${liHtml}`;
        isListOpen = true;
        olStart++;
      }
    }
    if (isListOpen) {
      currentPage += '</ol>';
    }
    if (currentPage) {
      pages.push(`<section class="page">${currentPage}</section>`);
    }
    return pages;
  }

  // Paginate blocks other than instructions
  let currentPageContent = '';
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const tentativeContent = currentPageContent + block;
    measurer.innerHTML = tentativeContent;
    if (measurer.offsetHeight <= maxContentHeight) {
      currentPageContent = tentativeContent;
    } else {
      if (currentPageContent) {
        allPages.push(`<section class="page">${currentPageContent}</section>`);
      }
      currentPageContent = block;
    }
  }
  if (currentPageContent) {
    allPages.push(`<section class="page">${currentPageContent}</section>`);
  }

  // Paginate instructions separately with proper numbering continuation
  const instructionPages = paginateInstructions(instructionLiBlocks);

  // Add notes section at the end after instructions
  let notesPages = [];
  if (notes.length) {
    // Similar to ingredients - use sentence splitting for notes
    const noteBlocks = [];
    noteBlocks.push(`<h3 class="section-title">Notes</h3>`);
    noteBlocks.push('<ul class="note-list">');
    notes.forEach(note => {
      splitToSentences(note).forEach(sentence => {
        noteBlocks.push(`<li>${escapeHtml(sentence)}</li>`);
      });
    });
    noteBlocks.push('</ul>');

    // Paginate notes blocks
    let notesPageContent = '';
    for (let i = 0; i < noteBlocks.length; i++) {
      const block = noteBlocks[i];
      const tentativeContent = notesPageContent + block;
      measurer.innerHTML = tentativeContent;
      if (measurer.offsetHeight <= maxContentHeight) {
        notesPageContent = tentativeContent;
      } else {
        if (notesPageContent) {
          notesPages.push(`<section class="page">${notesPageContent}</section>`);
        }
        notesPageContent = block;
      }
    }
    if (notesPageContent) {
      notesPages.push(`<section class="page">${notesPageContent}</section>`);
    }
  }

  document.body.removeChild(measurer);

  // Combine pages: before instructions + instructionPages + notesPages
  return [...allPages, ...instructionPages, ...notesPages];
}

function renderSpread(container, spread) {
  const left  = spread?.left  || renderBlankPage();
  const right = spread?.right || renderBlankPage();

  container.innerHTML = `<div class="page-spread active">
    ${left}
    ${right}
  </div>`;

  // Ensure both pages have .page class
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

  // Handle common shapes like { quantity, unit, name } or { amount, unit, ingredient }
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
