// Autoteste + vitrine: cria a marca fictícia "lumina" e gera uma peça de cada layout, um carrossel e um reel.
//   node motor/teste.mjs            tudo (~2 min)
//   node motor/teste.mjs rapido     só 1 post (para conferir a instalação)
import fs from 'node:fs';
import assert from 'node:assert';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { p, salvarJson, findBrowser } from './lib.mjs';
import { renderizar } from './render.mjs';

const dir = p('clientes', 'lumina');
if (!fs.existsSync(path.join(dir, 'marca.json'))) {
  fs.mkdirSync(path.join(dir, 'produtos'), { recursive: true });
  for (const f of ['serum.svg', 'creme.svg']) fs.copyFileSync(p('motor', 'demo', f), path.join(dir, 'produtos', f));
  salvarJson(path.join(dir, 'marca.json'), {
    nome: 'Lumina', instagram: '@lumina.skin', estilo: 'premium',
    tom: 'sofisticado, acolhedor, frases curtas, sem promessas milagrosas', publico: 'mulheres 28–45 que investem em skincare',
    cores: { primaria: '#3A2A1E', secundaria: '#E8B96A', fundo: '#F7F1E8', texto: '#1E1611' },
    fontes: { titulo: 'Fraunces', corpo: 'Inter' },
    hashtags: ['#skincare', '#vitaminac', '#cuidadoscomapele', '#lumina'], redes: ['instagram', 'facebook'], horarios: ['12:00', '19:30'],
    produtos: {
      serum: { nome: 'Sérum Vitamina C 20%', foto: 'produtos/serum.svg', preco: 'R$ 149,90', precoDe: 'R$ 189,90' },
      creme: { nome: 'Creme Noturno Renovador', foto: 'produtos/creme.svg', preco: 'R$ 129,90' },
    },
  });
}

// Marca pessoal fictícia para o estilo educativo (carrossel de dicas/ferramentas).
const dn = p('clientes', 'norte');
if (!fs.existsSync(path.join(dn, 'marca.json'))) {
  fs.mkdirSync(path.join(dn, 'imagens'), { recursive: true });
  for (const f of ['avatar.svg', 'fluxo.svg', 'tela.jpg']) fs.copyFileSync(p('motor', 'demo', f), path.join(dn, 'imagens', f));
  salvarJson(path.join(dn, 'marca.json'), {
    nome: 'Estúdio Norte', instagram: '@estudionorte', estilo: 'quadro',
    autor: { nome: 'Ana Ribeiro', arroba: '@ana.norte', foto: 'imagens/avatar.svg' },
    tom: 'didático, direto, informal, frases curtas', publico: 'donos de pequenos negócios e social medias',
    cores: { primaria: '#1F5EFF', secundaria: '#FF6B2C', fundo: '#F4F1EA', texto: '#111111' },
    fontes: { titulo: 'Inter Tight', corpo: 'Inter', mono: 'JetBrains Mono' },
    hashtags: ['#marketingdigital', '#socialmedia', '#ia'], redes: ['instagram', 'linkedin'], horarios: ['08:30', '18:00'], produtos: {},
  });
}

const L = 'lumina';
const S = 'saida/lumina/vitrine';
const pecas = [
  { cliente: L, tipo: 'post', saida: `${S}/01-hero`, slides: [{ layout: 'hero', produto: 'serum', eyebrow: 'Novo · Vitamina C 20%', titulo: 'Pele *luminosa*\nem 4 semanas', texto: 'Antioxidante estável que uniformiza o tom e devolve o viço.', mostrarPreco: true, cta: 'Comprar agora' }], legenda: 'O sérum que virou o primeiro passo da rotina.' },
  { cliente: L, tipo: 'post', saida: `${S}/02-oferta`, slides: [{ layout: 'oferta', estilo: 'vibrante', produto: 'serum', faixa: 'Semana da pele · só até domingo', eyebrow: 'Oferta de lançamento', titulo: 'Seu sérum\n*21% off*', selo: '-21%', cta: 'Garantir o meu' }], legenda: 'Últimos dias.' },
  { cliente: L, tipo: 'post', formato: 'quadrado', saida: `${S}/03-editorial`, slides: [{ layout: 'editorial', produto: 'creme', palavra: 'Noite', meta: ['Coleção', 'Ritual noturno', '2026'], titulo: 'Acorde com a pele *descansada*' }], legenda: 'Ritual noturno.' },
  { cliente: L, tipo: 'post', saida: `${S}/04-split`, slides: [{ layout: 'split', estilo: 'clean', produto: 'creme', eyebrow: 'Creme noturno', titulo: 'Renova enquanto você *dorme*', texto: 'Peptídeos e ceramidas em textura que não pesa.', mostrarPreco: true, cta: 'Conhecer' }], legenda: 'Renovação noturna.' },
  { cliente: L, tipo: 'post', saida: `${S}/05-beneficios`, slides: [{ layout: 'beneficios', estilo: 'clean', produto: 'serum', eyebrow: 'Por que funciona', titulo: 'Um frasco,\n*quatro* resultados', itens: [{ icone: 'brilho', texto: 'Mais luminosidade' }, { icone: 'gota', texto: 'Hidratação leve' }, { icone: 'escudo', texto: 'Proteção antioxidante' }, { icone: 'folha', texto: 'Fórmula vegana' }] }], legenda: 'Quatro motivos.' },
  { cliente: L, tipo: 'post', formato: 'quadrado', saida: `${S}/06-depoimento`, slides: [{ layout: 'depoimento', produto: 'serum', titulo: 'Em três semanas minha pele *ganhou vida*.', autor: 'Mariana C.', detalhe: 'Cliente verificada · São Paulo' }], legenda: 'Quem usa, conta.' },
  { cliente: L, tipo: 'carrossel', saida: `${S}/07-carrossel`, legenda: 'Salva para não esquecer.', slides: [
    { layout: 'capa', produto: 'serum', eyebrow: 'Guia rápido', titulo: '3 erros que apagam sua *vitamina C*', texto: 'O terceiro quase todo mundo comete.' },
    { layout: 'lista', titulo: 'Guardar perto da luz', texto: 'Luz e calor oxidam o ativo. Guarde o frasco fechado, longe da janela.' },
    { layout: 'lista', titulo: 'Usar só à noite', texto: 'Ela potencializa o protetor solar. O melhor momento é *de manhã*.' },
    { layout: 'lista', titulo: 'Misturar com ácidos', texto: 'Evite usar junto com AHA ou BHA na mesma rotina.' },
    { layout: 'cta', produto: 'serum', eyebrow: 'Agora você já sabe', titulo: 'Comece do *jeito certo*', cta: 'Link na bio' }] },
  { cliente: L, tipo: 'story', saida: `${S}/08-story`, slides: [{ layout: 'hero', produto: 'serum', eyebrow: 'Chegou', titulo: 'O brilho que\nfaltava na *rotina*', mostrarPreco: true, cta: 'Arraste para cima' }], legenda: '' },
  { cliente: 'norte', tipo: 'carrossel', saida: `${S}/10-educativo`, legenda: 'Salva e manda pra quem cuida do seu Instagram.', slides: [
    { layout: 'capa', eyebrow: 'Guia rápido · 6 slides', titulo: '5 ferramentas pra *turbinar* seu marketing', texto: 'Testadas no dia a dia de uma agência pequena.' },
    { layout: 'cards', eyebrow: 'Etapa 1 de 3 · Criar', titulo: 'Fazer os *posts*', texto: 'Arte, vídeo e texto sem abrir o editor.', imagem: 'imagens/fluxo.svg', abas: ['Criar', 'Editar', 'Publicar', 'Medir'], aba: 0, itens: [
      { icone: 'camadas', nome: 'Fábrica', papel: 'Diretor de arte', texto: 'Posts e carrosséis com a cara da marca', numero: '01', selo: 'grátis' },
      { icone: 'brilho', nome: 'Nano Banana', papel: 'Ilustrador', texto: 'Ilustrações e fundos sem texto', numero: '02', selo: 'pago' },
      { icone: 'audio', nome: 'ElevenLabs', papel: 'Locutor', texto: 'Transforma o roteiro em narração', numero: '03', selo: 'pago' },
      { icone: 'chat', nome: 'Whisper', papel: 'Legendador', texto: 'Legenda qualquer vídeo gravado', numero: '04', selo: 'pago' },
      { icone: 'calendario', nome: 'Metricool', papel: 'Agendador', texto: 'Publica em todas as redes no horário', numero: '05', selo: 'plano' }] },
    { layout: 'comparativo', eyebrow: 'O que muda', titulo: 'Tempo por *carrossel*', antes: { rotulo: 'Sem a fábrica', legenda: 'Tempo médio', valor: '3h', texto: 'Briefing, arte, revisão e legenda' }, depois: { rotulo: 'Com a fábrica', legenda: 'Tempo médio', valor: '25min', texto: 'Você revisa, ajusta e aprova' } },
    { layout: 'mockup', etiqueta: 'Aprovação', titulo: 'Uma página pra *aprovar* tudo', imagem: 'imagens/tela.jpg', url: 'revisao.html', itens: [
      { icone: 'check', nome: 'Todas as peças', texto: 'posts, carrosséis e reels' }, { icone: 'chat', nome: 'Com legenda', texto: 'pronta pra copiar' },
      { icone: 'link', nome: 'Um arquivo só', texto: 'manda por e-mail ou zip' }, { icone: 'calendario', nome: 'Status', texto: 'o que já foi agendado' }] },
    { layout: 'topico', numero: '05', titulo: '/legendar', imagem: 'imagens/fluxo.svg', texto: 'Grava, transcreve e coloca *legenda palavra a palavra* com a fonte da marca.', icone: 'raio' },
    { layout: 'comente', titulo: 'Quer o passo a passo *completo*?', texto: 'Mando o guia de instalação com os links oficiais.', palavra: 'FÁBRICA' }] },
  { cliente: L, tipo: 'reel', saida: `${S}/09-reel`, legenda: 'Pele luminosa sem complicação.', cenas: [
    { layout: 'impacto', titulo: 'Pele *opaca*\nde novo?', duracao: 2.2 },
    { layout: 'hero', produto: 'serum', eyebrow: 'Vitamina C 20%', titulo: 'Conheça o\n*Sérum Lumina*', duracao: 3 },
    { layout: 'beneficios', produto: 'serum', titulo: 'Em *4 semanas*', itens: [{ icone: 'brilho', texto: 'Mais viço' }, { icone: 'gota', texto: 'Tom uniforme' }, { icone: 'escudo', texto: 'Antioxidante' }], duracao: 3.2 },
    { layout: 'oferta', produto: 'serum', faixa: 'Lançamento', titulo: 'Só esta *semana*', selo: '-21%', duracao: 3 },
    { layout: 'cta', produto: 'serum', titulo: 'Sua pele\n*agradece*', cta: 'Link na bio', duracao: 2.8 }] },
];

const rapido = process.argv[2] === 'rapido';
const t0 = Date.now();
const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'] });
const feitos = [];
try {
  for (const spec of rapido ? pecas.slice(0, 1) : pecas) {
    const r = await renderizar(spec, { browser });
    for (const a of r.arquivos) assert(fs.statSync(path.join(r.dir, a)).size > 20000, `${a} vazio`);
    feitos.push(r);
    console.log(`✓ ${path.basename(r.dir)} (${r.arquivos.length} arquivo(s))${r.avisos.length ? ' · avisos: ' + r.avisos.join(' | ') : ''}`);
  }
} finally { await browser.close(); }
if (!rapido) assert.deepEqual(feitos.filter(r => r.tipo === 'carrossel').map(r => r.arquivos.length), [5, 6]);
console.log(`OK em ${((Date.now() - t0) / 1000).toFixed(0)}s → ${p(S)}`);
