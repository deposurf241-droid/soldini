/* Soldini V25: elenco canonico, solo Negozio. Nessun dato Firebase modificato. */
export const SHOP_INCOME = Object.freeze([
  'Infilatura','Rodiatura','Pagamento in oro','Incisione','Riparazione',
  'Incassatore','Creazione','Vetrina','Compra oro','Clips di sicurezza D&D'
]);
export const SHOP_EXPENSE = Object.freeze([
  'Affitto negozio','Bollette telefonia','Bollette luce','Bollette acqua e condominio',
  'Commercialista','Oro vecchio','Tasse IVA (accantonamento)','Tasse INAIL',
  'Tasse IRPEF','Tasse INPS','Tasse arretrate',
  'Fornitore Fusione','Fornitore Lefèvre','Fornitore Incassatore Luciano',
  'Fornitore CP Pietre','Fornitore Laser Claudio','Altro'
]);
export const MACRO_EXPENSE = Object.freeze([
  'Affitto negozio','Oro vecchio','Fornitori','Tasse','Bollette','Commercialista','Altro'
]);
export const normalizeShopCategory = s => String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it').trim().replace(/\s+/g,' ');
export function expenseMacro(name){
  const s=normalizeShopCategory(name);
  if (/^(bollett|utenze|telefonia|acqua e condominio)/.test(s))return 'Bollette';
  if (/^(fornitor|fusione|lefevre|incassatore luciano|cp pietre|laser claudio)/.test(s))return 'Fornitori';
  if (/^(tass|iva stimata|iva accantonamento|iva \(|iva inclusa)/.test(s))return 'Tasse';
  if (/^(affitto negozio|affitto del negozio)$/.test(s))return 'Affitto negozio';
  if (/^(oro vecchio)$/.test(s))return 'Oro vecchio';
  if (/^(commercialista)$/.test(s))return 'Commercialista';
  if (/^(altro)$/.test(s))return 'Altro';
  return name||'Senza categoria';
}
export function isShopById(id, select=document.getElementById('space-select')){
  if(!id||id==='personal'||id==='global')return false;
  const candidates=[select,document.getElementById('tx-space')];
  return candidates.some(el=>[...(el?.options||[])].some(opt=>opt.value===id && /negozio/i.test(opt.textContent||'')));
}
export function isShopLabel(label){return /negozio/i.test(String(label||''))}
export function shopPreset(kind){return kind==='income'?SHOP_INCOME:SHOP_EXPENSE}
