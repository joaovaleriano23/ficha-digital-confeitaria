const STORAGE_KEY = "confeitariaJJ_pedidos_v1";
let pedidos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const $ = id => document.getElementById(id);
const money = v => Number(v || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const nextNumber = () => {
  const max = pedidos.reduce((m,p)=>Math.max(m, Number((p.numero||"").replace(/\D/g,""))||0),0);
  return `PED-${String(max+1).padStart(4,"0")}`;
};
const setDefaultDate = () => {
  const d = new Date(); d.setDate(d.getDate()+1);
  $("dataEntrega").value = d.toISOString().slice(0,10);
  $("horaEntrega").value = "15:00";
};

function produtoTemplate(data={}){
  const row=document.createElement("div");
  row.className="product-row";
  row.innerHTML=`
    <label>Produto / serviço<input class="p-nome" required value="${escapeHTML(data.nome||"")}" placeholder="Ex.: Bolo de chocolate"></label>
    <label>Tamanho
      <select class="p-tamanho">
        ${["Personalizado","15cm","20cm","25cm","30cm","35cm","40cm","40 fatias","50 fatias"].map(x=>`<option ${x===(data.tamanho||"Personalizado")?"selected":""}>${x}</option>`).join("")}
      </select>
    </label>
    <label>Fatias<input class="p-fatias" type="number" min="0" value="${data.fatias||0}"></label>
    <label>Unidades<input class="p-qtd" type="number" min="1" value="${data.quantidade||1}"></label>
    <label>Valor unitário<input class="p-preco" type="number" min="0" step="0.01" value="${data.preco||0}"></label>
    <button type="button" class="remove" title="Remover item">×</button>`;
  row.querySelector(".remove").onclick=()=>{row.remove();calcular();};
  row.querySelectorAll("input,select").forEach(el=>el.addEventListener("input",calcular));
  $("produtos").appendChild(row);
}

function getItens(){
  return [...document.querySelectorAll(".product-row")].map(row=>({
    nome:row.querySelector(".p-nome").value.trim(),
    tamanho:row.querySelector(".p-tamanho").value,
    fatias:Number(row.querySelector(".p-fatias").value)||0,
    quantidade:Number(row.querySelector(".p-qtd").value)||1,
    preco:Number(row.querySelector(".p-preco").value)||0
  })).filter(x=>x.nome);
}
function calcular(){
  const itens=getItens();
  const subtotal=itens.reduce((s,i)=>s+i.preco*i.quantidade,0);
  const desconto=Math.min(Math.max(Number($("desconto").value)||0,0),subtotal);
  const total=subtotal-desconto;
  $("subtotal").textContent=money(subtotal);
  $("resumoDesconto").textContent="- "+money(desconto);
  $("total").textContent=money(total);
  $("resumoItens").innerHTML=itens.length?itens.map(i=>`
    <div class="summary-line"><div><strong>${escapeHTML(i.quantidade)}× ${escapeHTML(i.nome)}</strong><small>${escapeHTML(i.tamanho)}${i.fatias?` · ${i.fatias} fatias`:""}</small></div><strong>${money(i.preco*i.quantidade)}</strong></div>`).join(""):`<p class="empty">Adicione produtos para visualizar o resumo.</p>`;
}
function dadosFormulario(){
  const itens=getItens();
  const subtotal=itens.reduce((s,i)=>s+i.preco*i.quantidade,0);
  const desconto=Math.min(Math.max(Number($("desconto").value)||0,0),subtotal);
  return {
    numero:$("numeroPedido").textContent, criadoEm:new Date().toISOString(),
    cliente:{nome:$("clienteNome").value.trim(),telefone:$("clienteTelefone").value.trim(),email:$("clienteEmail").value.trim()},
    itens, data:$("dataEntrega").value,hora:$("horaEntrega").value,tipoEntrega:$("tipoEntrega").value,
    pagamento:$("pagamento").value,observacoes:$("observacoes").value.trim(),
    subtotal,desconto,total:subtotal-desconto
  };
}
function resetForm(){
  $("pedidoForm").reset(); $("produtos").innerHTML=""; $("numeroPedido").textContent=nextNumber(); $("resumoNumero").textContent=$("numeroPedido").textContent;
  setDefaultDate(); produtoTemplate(); calcular();
}
function salvar(e){
  e.preventDefault();
  const p=dadosFormulario();
  if(!p.cliente.nome||!p.cliente.telefone||!p.itens.length){showToast("Preencha cliente, telefone e pelo menos um item.");return;}
  pedidos.unshift(p);localStorage.setItem(STORAGE_KEY,JSON.stringify(pedidos));renderHistorico();updateDashboard();showToast("Pedido salvo com sucesso!");resetForm();
}
function renderHistorico(){
  const q=$("buscaPedidos").value.toLowerCase();
  const lista=pedidos.filter(p=>(p.numero+" "+p.cliente.nome+" "+p.cliente.telefone).toLowerCase().includes(q));
  $("tabelaPedidos").innerHTML=lista.length?lista.map((p,i)=>`<tr>
    <td><strong>${escapeHTML(p.numero)}</strong></td><td>${escapeHTML(p.cliente.nome)}</td>
    <td>${formatDate(p.data)} ${p.hora}</td><td>${escapeHTML(p.pagamento)}</td><td><strong>${money(p.total)}</strong></td>
    <td><div class="table-actions"><button class="mini" onclick="carregarPedido(${pedidos.indexOf(p)})">Abrir</button><button class="mini" onclick="excluirPedido(${pedidos.indexOf(p)})">Excluir</button></div></td>
  </tr>`).join(""):`<tr><td colspan="6" class="empty">Nenhum pedido encontrado.</td></tr>`;
}
function carregarPedido(index){
  const p=pedidos[index]; if(!p)return;
  $("clienteNome").value=p.cliente.nome;$("clienteTelefone").value=p.cliente.telefone;$("clienteEmail").value=p.cliente.email||"";
  $("dataEntrega").value=p.data;$("horaEntrega").value=p.hora;$("tipoEntrega").value=p.tipoEntrega;$("pagamento").value=p.pagamento;$("desconto").value=p.desconto;$("observacoes").value=p.observacoes||"";
  $("produtos").innerHTML="";p.itens.forEach(produtoTemplate);$("numeroPedido").textContent=p.numero;$("resumoNumero").textContent=p.numero;calcular();window.scrollTo({top:0,behavior:"smooth"});showToast("Pedido carregado para edição.");
}
function excluirPedido(i){if(!confirm("Excluir este pedido do histórico?"))return;pedidos.splice(i,1);localStorage.setItem(STORAGE_KEY,JSON.stringify(pedidos));renderHistorico();updateDashboard();showToast("Pedido excluído.");}
function updateDashboard(){
  const faturamento=pedidos.reduce((s,p)=>s+p.total,0);
  $("totalPedidos").textContent=pedidos.length;$("faturamento").textContent=money(faturamento);$("ticketMedio").textContent=money(pedidos.length?faturamento/pedidos.length:0);$("ultimoPedido").textContent=pedidos[0]?.numero||"—";
}
function formatDate(d){if(!d)return"—";return new Date(d+"T00:00:00").toLocaleDateString("pt-BR")}
function showToast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2800)}
function textoPedido(){
  const p=dadosFormulario();
  return `*${p.numero} — CONFEITARIA JJ*\n\n*CLIENTE*\nNome: ${p.cliente.nome}\nWhatsApp: ${p.cliente.telefone}${p.cliente.email?`\nE-mail: ${p.cliente.email}`:""}\n\n*ITENS*\n${p.itens.map(i=>`• ${i.quantidade}x ${i.nome} | ${i.tamanho}${i.fatias?` | ${i.fatias} fatias`:""} | ${money(i.preco*i.quantidade)}`).join("\n")}\n\n*ENTREGA*\nData: ${formatDate(p.data)}\nHorário: ${p.hora}\nTipo: ${p.tipoEntrega}\n\n*PAGAMENTO*\n${p.pagamento}\nSubtotal: ${money(p.subtotal)}\nDesconto: ${money(p.desconto)}\n*TOTAL: ${money(p.total)}*${p.observacoes?`\n\n*OBSERVAÇÕES*\n${p.observacoes}`:""}`;
}
function enviarWhatsApp(){
  const p=dadosFormulario();
  if(!p.cliente.telefone){showToast("Informe o telefone/WhatsApp do cliente.");return;}
  let phone=p.cliente.telefone.replace(/\D/g,""); if(phone.length<=11) phone="55"+phone;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(textoPedido())}`,"_blank");
}
async function gerarPDF(){
  const p=dadosFormulario();
  if(!p.itens.length){showToast("Adicione pelo menos um item.");return;}
  if(!window.jspdf){showToast("Biblioteca de PDF ainda não carregou.");return;}
  const {jsPDF}=window.jspdf;const doc=new jsPDF();let y=18;
  const line=(txt,size=10,bold=false)=>{doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(size);doc.text(String(txt),18,y);y+=6};
  line("CONFEITARIA JJ",18,true);line("FICHA DIGITAL DE PEDIDO",11,true);line(p.numero,10,false);y+=4;
  line("CLIENTE",12,true);line(p.cliente.nome);line(p.cliente.telefone);if(p.cliente.email)line(p.cliente.email);y+=3;
  line("ITENS",12,true);
  p.itens.forEach(i=>line(`${i.quantidade}x ${i.nome} | ${i.tamanho}${i.fatias?` | ${i.fatias} fatias`:""} | ${money(i.preco*i.quantidade)}`));
  y+=3;line("ENTREGA",12,true);line(`${formatDate(p.data)} às ${p.hora} — ${p.tipoEntrega}`);
  y+=3;line("PAGAMENTO",12,true);line(p.pagamento);line(`Subtotal: ${money(p.subtotal)}`);line(`Desconto: ${money(p.desconto)}`);line(`TOTAL: ${money(p.total)}`,15,true);
  if(p.observacoes){y+=3;line("OBSERVAÇÕES",12,true);doc.setFontSize(10);const lines=doc.splitTextToSize(p.observacoes,174);doc.text(lines,18,y);y+=lines.length*5;}
  doc.setFontSize(8);doc.text("Documento gerado pela Ficha Digital — Confeitaria JJ",18,285);
  doc.save(`${p.numero}-confeitaria-jj.pdf`);showToast("PDF gerado.");
}

$("btnAdicionarProduto").onclick=()=>{produtoTemplate();calcular()};
$("pedidoForm").addEventListener("submit",salvar);$("desconto").addEventListener("input",calcular);$("buscaPedidos").addEventListener("input",renderHistorico);
$("btnNovoTopo").onclick=resetForm;$("btnLimpar").onclick=()=>{if(confirm("Limpar a ficha atual?"))resetForm()};
$("btnWhatsApp").onclick=enviarWhatsApp;$("btnPDF").onclick=gerarPDF;$("btnImprimir").onclick=()=>window.print();
$("btnApagarTodos").onclick=()=>{if(pedidos.length&&confirm("Apagar todo o histórico de pedidos?")){pedidos=[];localStorage.removeItem(STORAGE_KEY);renderHistorico();updateDashboard();showToast("Histórico apagado.")}};

setDefaultDate();$("numeroPedido").textContent=nextNumber();$("resumoNumero").textContent=$("numeroPedido").textContent;produtoTemplate();calcular();renderHistorico();updateDashboard();
