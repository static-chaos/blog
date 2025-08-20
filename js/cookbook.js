'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.recipe-book .book-content');
  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');

  fetch('data/cookbook.json')
    .then(r => r.json())
    .then(data => {
      const recipes = data?.recipes || [];
      const slugFromHash = window.location.hash.slice(1).toLowerCase();
      const toSlug = s => String(s).toLowerCase().trim().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
      let recipeIndex = slugFromHash ? recipes.findIndex(r => toSlug(r.name) === slugFromHash) : 0;
      if(recipeIndex<0) recipeIndex=0;

      const recipe = recipes[recipeIndex];
      const spreads = buildSpreadsForRecipe(recipe);

      let spreadIndex=0;
      function showSpread(i){
        spreadIndex=i;
        renderSpread(container, spreads[i]);
        prevBtn.disabled = i===0;
        nextBtn.disabled = i>=spreads.length-1;
      }
      showSpread(0);
      prevBtn.onclick=()=>{if(spreadIndex>0) showSpread(spreadIndex-1)};
      nextBtn.onclick=()=>{if(spreadIndex<spreads.length-1) showSpread(spreadIndex+1)};
    });
});

/* ---------- Core Pagination ---------- */
function buildSpreadsForRecipe(recipe){
  const pages = paginateContinuous(recipe);
  const spreads=[];
  for(let i=0;i<pages.length;i+=2){
    spreads.push({
      left: pages[i],
      right: pages[i+1]||renderBlankPage()
    });
  }
  return spreads;
}

function paginateContinuous(recipe){
  const blocks=[];

  blocks.push(`<h2 class="recipe-title">${escapeHtml(recipe?.name||'Untitled')}</h2>`);
  if(recipe?.description) blocks.push(`<p>${escapeHtml(recipe.description)}</p>`);

  if(Array.isArray(recipe?.ingredients) && recipe.ingredients.length){
    blocks.push(`<h3 class="section-title">Ingredients</h3>`);
    blocks.push('<ul class="ingredients">');
    recipe.ingredients.forEach(i=>{
      blocks.push(`<li>${escapeHtml(formatIngredient(i))}</li>`);
    });
    blocks.push('</ul>');
  }

  if(Array.isArray(recipe?.instructions) && recipe.instructions.length){
    blocks.push(`<h3 class="section-title">Instructions</h3>`);
    blocks.push('<ol class="instructions">');
    recipe.instructions.forEach(step=>{
      blocks.push(`<li>${escapeHtml(step)}</li>`);
    });
    blocks.push('</ol>');
  }

  if(Array.isArray(recipe?.extra_notes) && recipe.extra_notes.length){
    blocks.push(`<h3 class="section-title">Notes</h3>`);
    blocks.push('<ul class="notes">');
    recipe.extra_notes.forEach(note=>{
      blocks.push(`<li>${escapeHtml(note)}</li>`);
    });
    blocks.push('</ul>');
  }

  // paginate blocks into pages
  const measurer=document.createElement('div');
  measurer.style.cssText=`
    position:absolute;left:-9999px;top:-9999px;width:450px;
    padding:2em;box-sizing:border-box;visibility:hidden;
    font-family:'Inter',sans-serif;font-size:1em;line-height:1.6;
  `;
  document.body.appendChild(measurer);

  const maxHeight=600-(2*20); // page height minus padding guess
  const pages=[];
  let current='';

  blocks.forEach(block=>{
    let test=current+block;
    measurer.innerHTML=test;
    if(measurer.offsetHeight<=maxHeight){
      current=test;
    } else {
      if(current) pages.push(`<section class="page">${current}</section>`);
      current=block;
    }
  });
  if(current) pages.push(`<section class="page">${current}</section>`);

  document.body.removeChild(measurer);
  return pages;
}

function renderSpread(container, spread){
  container.innerHTML=`
    <div class="page-spread active">
      <div class="page left-page">${spread.left}</div>
      <div class="page right-page">${spread.right}</div>
    </div>`;
}

function renderBlankPage(){return '';}

function escapeHtml(v){
  return String(v??'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function formatIngredient(item){
  if(typeof item==='string') return item;
  if(!item) return '';
  const qty=item.quantity||item.qty||'';
  const unit=item.unit||'';
  const name=item.name||item.ingredient||'';
  return [qty,unit,name].filter(Boolean).join(' ');
}
