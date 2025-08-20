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

  // Layout constants (tune to match your CSS)
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

  let stepCounter = 1;
  const allPages = [];

  // Header page
  const headerHtml = `<header class="page-header">
    <h2 class="recipe-title">${escapeHtml(name)}</h2>
    ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
  </header>`;
  allPages.push(`<section class="page">${headerHtml}</section>`);

  // We'll accumulate all content blocks for ingredients, steps, and notes
  const blocks = [];

  if (ingredients.length) {
    blocks.push({
      type: "ul",
      title: "Ingredients",
      items: ingredients.map(escapeHtml)
    });
  }
  if (steps.length) {
    blocks.push({
      type: "ol",
      title: "Instructions",
      items: steps.map(escapeHtml),
      start: stepCounter
    });
  }
  if (notes.length) {
    blocks.push({
      type: "ul",
      title: "Notes",
      items: notes.map(escapeHtml)
    });
  }

  // 'Smart' pagination: fill each page to the max, section content flows together!
  let currentPage = '';
  let openList = false;
  let currentListTag = '';
  let olStart = stepCounter;

  for (const block of blocks) {
    let blockOpened = false;
    for (let i = 0; i < block.items.length; i++) {
      const isFirstItem = i === 0;
      // Open new list and section title if needed.
      if (!openList) {
        let titleHtml = '';
        if (isFirstItem && block.title) {
          titleHtml = `<h3 class="section-title">${escapeHtml(block.title)}</h3>`;
        }
        if (block.type === "ol") {
          currentPage += `${titleHtml}<ol class="step-list" start="${olStart}">`;
          currentListTag = "ol";
        } else {
          currentPage += `${titleHtml}<ul class="ingredient-list">`;
          currentListTag = "ul";
        }
        openList = true;
        blockOpened = true;
      }

      // Try to add list item
      currentPage += `<li>${block.items[i]}</li>`;
      measurer.innerHTML = currentPage + (currentListTag === "ol" ? "</ol>" : "</ul>");
      if (measurer.offsetHeight > maxContentHeight) {
        // Remove oversized <li> and close the list, push page, start new.
        const removeLi = currentPage.lastIndexOf('<li>');
        currentPage = currentPage.substring(0, removeLi);
        currentPage += (currentListTag === "ol" ? "</ol>" : "</ul>");
        allPages.push(`<section class="page">${currentPage}</section>`);
        // Start new list on new page
        let titleHtml = '';
        if (block.title && (isFirstItem || blockOpened === false)) {
          titleHtml = `<h3 class="section-title">${escapeHtml(block.title)}</h3>`;
        }
        if (block.type === "ol") {
          currentPage = `${titleHtml}<ol class="step-list" start="${olStart}">`;
          currentListTag = "ol";
        } else {
          currentPage = `${titleHtml}<ul class="ingredient-list">`;
          currentListTag = "ul";
        }
        openList = true;
        // Add back the item
        currentPage += `<li>${block.items[i]}</li>`;
      }
      if (block.type === "ol") {
        olStart++;
      }
    }
    // If we finish the block, close list but stay on the page for flowing sections
    if (openList) {
      currentPage += (currentListTag === "ol" ? "</ol>" : "</ul>");
      openList = false;
      currentListTag = '';
    }
  }
  // Push any trailing content
  if (currentPage) {
    allPages.push(`<section class="page">${currentPage}</section>`);
  }

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

  // Optional: ensure both pages have .page class (in case upstream HTML differs)
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
