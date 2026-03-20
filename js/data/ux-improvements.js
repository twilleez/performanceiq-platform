export function buildFloatingInput({id,label,type='text',required=false}) {
  return `<div class="b-field"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${required?'required':''}></div>`;
}
export function piqValidate(input) {
  if (!input.value) { input.classList.remove('valid','invalid'); return; }
  const ok = input.checkValidity() && input.value.trim().length>0;
  input.classList.toggle('valid',ok); input.classList.toggle('invalid',!ok);
}
export function piqValidateForm(formEl) {
  let ok=true;
  formEl.querySelectorAll('input[required]').forEach(i=>{ piqValidate(i); if(!i.value||i.classList.contains('invalid')) ok=false; });
  return ok;
}
