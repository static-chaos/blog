// js/cookbook.js — Continuous flow across pages, no scroll, no duplicates
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.recipe-book .book-content');
  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');

  if (!container) {
    console.error('Missing .recipe-book .book-content container');
    return;
  }

  // Use your local path or raw GitHub URL if needed
  const DATA_URL = 'data/cookbook.json';

  fetch(DATA_URL)
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


/* ---------- Pagination: continuous flow across sections ---------- */

function buildSpreadsForRecipe(recipe) {
  const pages = generatePagesContinuous(recipe);
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    const left  = addSideClass(pages[i]     || renderBlankPage(), 'left');
    const right = addSideClass(pages[i + 1] || renderBlankPage(), 'right');
    spreads.push({ left, right });
  }
  return spreads;
}

function generatePagesContinuous(recipe) {
  const name        = recipe?.name ?? 'Untitled Recipe';
  const description = recipe?.description ?? '';
  const ingredients = Array.isArray(recipe?.ingredients)  ? recipe.ingredients.map(formatIngredient) : [];
  const steps       = Array.isArray(recipe?.instructions) ? [...recipe.instructions] : [];
  const notes       = Array.isArray(recipe?.extra_notes)  ? [...recipe.extra_notes]
                     : (recipe?.extra_notes ? [recipe.extra_notes] : []);

  const pageInnerHeight  = 600; // match your CSS height
  const maxContentHeight = pageInnerHeight; // padding is already in measurer

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
    background:#fffdfa;
  `;
  document.body.appendChild(measurer);

  const pages = [];
  let pageHtml = '';

  const headerHtml = `<header class="page-header">
    <h2 class="recipe-title">${escapeHtml(name)}</h2>
    ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
  </header>`;
  pageHtml = headerHtml;

  const sections = [
    { key: 'ingredients',  title: 'Ingredients',  ordered: false, items: ingredients },
    { key: 'instructions', title: 'Instructions', ordered: true,  items: steps },
    { key: 'notes',        title: 'Notes',        ordered: false, items: notes }
  ];

  let listOpen = false;
  let listType = null;
  let containerKey = null;
  let stepCounter = 1;

  const tailClose = () => (listOpen ? (listType === 'ol' ? '</ol>' : '</ul>') + '</div>' : '');

  const measureWouldFit = (extra) => {
    measurer.innerHTML = pageHtml + extra + tailClose();
    return measurer.offsetHeight <= maxContentHeight;
  };

  const pushPage = () => {
    const saved = listOpen ? pageHtml + tailClose() : pageHtml;
    pages.push(`<section class="page">${saved}</section>`);
    pageHtml = '';
  };

  const ensureListForSection = (key, ordered, startNum) => {
    if (listOpen && containerKey === key && (ordered ? 'ol' : 'ul') === listType) {
      return '';
    }
    if (listOpen) {
      pageHtml += tailClose();
      listOpen = false;
      listType = null;
      containerKey = null;
    }
    const open = `<div class="${key}">` + (ordered
      ? `<ol class="step-list" start="${startNum}">`
      : `<ul class="ingredient-list">`);
    listOpen = true;
    listType = ordered ? 'ol' : 'ul';
    containerKey = key;
    return open;
  };

  const addSectionTitle = (titleHtml) => {
    if (!measureWouldFit(titleHtml)) {
      pushPage();
    }
    pageHtml += titleHtml;
  };

  const splitTextByWordsToFit = (prefix, text, isOrderedContinuation, itemNumber) => {
    const words = String(text).split(/\s+/);
    let low = 1, high = words.length, best = 0;
    const liOpen = isOrderedContinuation
      ? `<li value="${itemNumber}" class="continued">`
      : `<li>`;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const chunk = escapeHtml(words.slice(0, mid).join(' ')) + ' …';
      const candidate = prefix + liOpen + chunk + '</li>';
      if (measureWouldFit(candidate)) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (best === 0) {
      const sliceChars = Math.min(80, text.length);
      const head = escapeHtml(text.slice(0, sliceChars)) + ' …';
      const tail = text.slice(sliceChars);
      return {
        fitsHtml: prefix + liOpen + head + '</li>',
        remainder: tail
      };
    }
    const first = words.slice(0, best).join(' ');
    const rest  = words.slice(best).join(' ');
    return {
      fitsHtml: prefix + liOpen + escapeHtml(first) + ' …</li>',
      remainder: rest
    };
  };

  for (const sec of sections) {
    if (!Array.isArray(sec.items) || sec.items.length === 0) continue;

    addSectionTitle(`<h3 class="section-title">${escapeHtml(sec.title)}</h3>`);

    for (let idx = 0; idx < sec.items.length; idx++) {
      const raw = sec.items[idx] == null ? '' : String(sec.items[idx]);
      const itemNumber = sec.ordered ? stepCounter : null;
      let remaining = raw;
      let continuation = false;

      while (remaining.length > 0) {
        const openPrefix = ensureListForSection(sec.key, sec.ordered, stepCounter);

        const liOpen = sec.ordered && continuation
          ? `<li value="${itemNumber}" class="continued">`
          : `<li>`;
        const liHtmlFull = openPrefix + liOpen + escapeHtml(remaining) + '</li>';

        if (measureWouldFit(liHtmlFull)) {
          pageHtml += liHtmlFull;
          if (sec.ordered) stepCounter++;
          remaining = '';
        } else {
          if (pageHtml.trim()) {
            pushPage();
          }

          const reopen = ensureListForSection(sec.key, sec.ordered, stepCounter);
          const liHtmlOnNew = reopen + liOpen + escapeHtml(remaining) + '</li>';

