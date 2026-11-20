' Abre o Estudio da Fabrica sem janela preta (Windows).
' Se ele ja estiver aberto, o servidor so abre o navegador de novo.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
sh.CurrentDirectory = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
extra = ""
If WScript.Arguments.Count > 0 Then extra = " " & WScript.Arguments(0)
sh.Run "node estudio\servidor.mjs" & extra, 0, False
