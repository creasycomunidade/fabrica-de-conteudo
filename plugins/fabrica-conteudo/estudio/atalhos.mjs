// Atalhos do Estúdio no Windows.
//   node estudio/atalhos.mjs criar                   atalho "Estúdio da Fábrica" na Área de Trabalho
//   node estudio/atalhos.mjs iniciar-com-windows on|off
//   node estudio/atalhos.mjs status                  JSON com o que existe
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ESTUDIO = path.dirname(fileURLToPath(import.meta.url));
const NOME = 'Estúdio da Fábrica.lnk';

// Paths go in through environment variables so spaces and accents never break PowerShell quoting.
function ps(script, env = {}) {
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout).trim().split('\n').at(-1));
  return r.stdout.trim();
}
const pasta = qual => ps(`[Environment]::GetFolderPath('${qual}')`);

function criarLnk(destino, args) {
  ps(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut($env:LNK); $s.TargetPath=Join-Path $env:WINDIR 'System32\\wscript.exe'; $s.Arguments=$env:ARGS; $s.WorkingDirectory=$env:RAIZ; $s.IconLocation=$env:ICONE; $s.Description='Estúdio da Fábrica de Conteúdo'; $s.Save()`,
    { LNK: destino, ARGS: args, RAIZ: path.dirname(ESTUDIO), ICONE: path.join(ESTUDIO, 'icone.ico') });
}

export function status() {
  if (process.platform !== 'win32') return { suportado: false, desktop: false, startup: false };
  return { suportado: true, desktop: fs.existsSync(path.join(pasta('Desktop'), NOME)), startup: fs.existsSync(path.join(pasta('Startup'), NOME)) };
}
export function criarDesktop() {
  if (process.platform !== 'win32') throw new Error('Atalho automático só no Windows. No Mac, use "Abrir Estudio.command".');
  const lnk = path.join(pasta('Desktop'), NOME);
  criarLnk(lnk, `"${path.join(ESTUDIO, 'iniciar.vbs')}"`);
  return lnk;
}
export function iniciarComWindows(ligar) {
  if (process.platform !== 'win32') throw new Error('Só no Windows.');
  const lnk = path.join(pasta('Startup'), NOME);
  if (ligar) criarLnk(lnk, `"${path.join(ESTUDIO, 'iniciar.vbs')}" --sem-navegador`);
  else fs.rmSync(lnk, { force: true });
  return status();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, val] = process.argv.slice(2);
  try {
    if (cmd === 'criar') console.log(`Atalho criado: ${criarDesktop()}`);
    else if (cmd === 'iniciar-com-windows') console.log(JSON.stringify(iniciarComWindows(val === 'on')));
    else console.log(JSON.stringify(status()));
  } catch (e) { console.error('ERRO:', e.message); process.exitCode = 1; }
}
