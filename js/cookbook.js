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
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
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
      console.error('Error loading recipes:', err);
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
  const paddingY         = 2 * 16; // vertical padding: 1em top & bottom = 16px * 2
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
    line-height:1.4;
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

  // Step 1: Paginate blocks before instructions (title, desc, ingredients)
  let currentPageContent = '';
  const allPages = [];

  for(let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const tentativeContent = currentPageContent + block;
    measurer.innerHTML = tentativeContent;
    if(measurer.offsetHeight <= maxContentHeight){
      currentPageContent = tentativeContent;
    } else {
      if(currentPageContent) allPages.push(`<section class="page">${currentPageContent}</section>`);
      currentPageContent = block;
    }
  }
  if(currentPageContent) allPages.push(`<section class="page">${currentPageContent}</section>`);

  // Measure leftover space in last page after prep blocks
  measurer.innerHTML = allPages[allPages.length - 1];
  const lastPageHeight = measurer.offsetHeight;
  const leftoverSpace = maxContentHeight - lastPageHeight;

  // Prepare instruction blocks split into sentences
  let instructionLiBlocks = [];
  let instructionIndex = 1;
  steps.forEach(step => {
    splitToSentences(step).forEach(sentence => {
      instructionLiBlocks.push({ text: sentence, index: instructionIndex++ });
    });
  });

  // Step 2: Paginate instructions, optionally merging first instruction page with last page if leftover space is large enough
  let instructionPages = [];
  if (instructionLiBlocks.length) {
    if (leftoverSpace >= maxContentHeight * 0.25) {
      // Merge first instruction blocks into last page
      let currPage = allPages.pop().replace(/<\/section>$/, '');

      let olStart = 1;
      let isListOpen = false;
      let firstPage = true;
      let newPageContent = currPage;

      for (let i = 0; i < instructionLiBlocks.length; i++) {
        const liHtml = `<li>${escapeHtml(instructionLiBlocks[i].text)}</li>`;
        const heading = firstPage ? `<h3 class="section-title">Instructions</h3>` : '';
        let tentativeContent;
        if (!isListOpen) {
          tentativeContent = newPageContent + heading + `<ol class="step-list" start="${olStart}">` + liHtml + '</ol>';
        } else {
          tentativeContent = newPageContent.replace(/<\/ol>$/, '') + liHtml + '</ol>';
        }
        measurer.innerHTML = tentativeContent;
        if (measurer.offsetHeight <= maxContentHeight) {
          if (!isListOpen) {
            newPageContent += heading + `<ol class="step-list" start="${olStart}">` + liHtml;
            isListOpen = true;
            firstPage = false;
          } else {
            newPageContent = newPageContent.replace(/<\/ol>$/, '') + liHtml;
          }
          olStart++;
        } else {
          if (isListOpen) newPageContent += '</ol>';
          instructionPages.push(`<section class="page">${newPageContent}</section>`);
          newPageContent = `<ol class="step-list" start="${olStart}">${liHtml}`;
          isListOpen = true;
          olStart++;
          firstPage = false;
        }
      }
      if (isListOpen) newPageContent += '</ol>';
      if (newPageContent) instructionPages.push(`<section class="page">${newPageContent}</section>`);
    } else {
      instructionPages = paginateInstructions(instructionLiBlocks, measurer, maxContentHeight);
    }
  }

  // Step 3: Paginate notes section similarly with leftover space merge logic
  let notesPages = [];
  if(notes.length){
    const noteBlocks = [];
    noteBlocks.push(`<h3 class="section-title">Notes</h3>`);
    noteBlocks.push('<ul class="note-list">');
    notes.forEach(note => {
      splitToSentences(note).forEach(sentence => {
        noteBlocks.push(`<li>${escapeHtml(sentence)}</li>`);
      });
    });
    noteBlocks.push('</ul>');

    // measure leftover space after instructions (or last page)
    measurer.innerHTML = instructionPages.length ? instructionPages[instructionPages.length -1] : allPages[allPages.length -1];
    const lastInstructionPageHeight = measurer.offsetHeight;
    const leftoverSpaceAfterInstructions = maxContentHeight - lastInstructionPageHeight;

    if (leftoverSpaceAfterInstructions >= maxContentHeight * 0.25) {
      // Try merging notes into last page of previous section
      let currPage = (instructionPages.length ? instructionPages : allPages).pop().replace(/<\/section>$/, '');

      let newPageContent = currPage;
      let notesPageContent = '';
      for(let i = 0; i < noteBlocks.length; i++) {
        const block = noteBlocks[i];
        const tentativeContent = newPageContent + notesPageContent + block;
        measurer.innerHTML = tentativeContent;
        if(measurer.offsetHeight <= maxContentHeight) {
          notesPageContent += block;
        } else {
          if(notesPageContent) notesPages.push(`<section class="page">${newPageContent + notesPageContent}</section>`);
          newPageContent = '';
          notesPageContent = block;
        }
      }
      if(notesPageContent) notesPages.push(`<section class="page">${newPageContent + notesPageContent}</section>`);
    } else {
      // Paginate notes normally
      let notesPageContent = '';
      for(let i = 0; i < noteBlocks.length; i++){
        const block = noteBlocks[i];
        const tentativeContent = notesPageContent + block;
        measurer.innerHTML = tentativeContent;
        if(measurer.offsetHeight <= maxContentHeight){
          notesPageContent = tentativeContent;
        } else {
          if(notesPageContent) notesPages.push(`<section class="page">${notesPageContent}</section>`);
          notesPageContent = block;
        }
      }
      if(notesPageContent) notesPages.push(`<section class="page">${notesPageContent}</section>`);
    }
  }

  document.body.removeChild(measurer);

  return [...allPages, ...instructionPages, ...notesPages];
}

function paginateInstructions(blocks, measurer, maxContentHeight) {
  let pages = [];
  let currentPage = '';
  let olStart = 1;
  let isListOpen = false;
  let firstPage = true;

  for(let i = 0; i < blocks.length; i++) {
    const liHtml = `<li>${escapeHtml(blocks[i].text)}</li>`;
    const heading = firstPage ? `<h3 class="section-title">Instructions</h3>` : '';
    let tentativeContent;

    if (!isListOpen) {
      tentativeContent = currentPage + heading + `<ol class="step-list" start="${olStart}">` + liHtml + '</ol>';
    } else {
      tentativeContent = currentPage.replace(/<\/ol>$/, '') + liHtml + '</ol>';
    }

    measurer.innerHTML = tentativeContent;
    if (measurer.offsetHeight <= maxContentHeight) {
      if (!isListOpen) {
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

  // Merge last page with previous if it’s too small
  if (pages.length > 1) {
    measurer.innerHTML = pages[pages.length - 1];
    const lastPageHeight = measurer.offsetHeight;
    if (lastPageHeight < maxContentHeight * 0.4) {
      const prevPageContent = pages[pages.length - 2];
      measurer.innerHTML = prevPageContent + pages[pages.length -1];
      if (measurer.offsetHeight <= maxContentHeight) {
        pages[pages.length - 2] = prevPageContent + pages[pages.length -1];
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
