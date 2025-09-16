; Server Manager Installer Script
; Inno Setup Script for creating professional installer

#define MyAppName "Server Manager"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Server Manager"
#define MyAppURL "https://github.com/servermanager/server-manager-app"
#define MyAppExeName "Server Manager.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{B5C4F4C0-8E4A-4A2F-8B6E-7A9B9C9D8E7F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\Server Manager
DisableProgramGroupPage=yes
LicenseFile=LICENSE
InfoBeforeFile=README.txt
OutputDir=dist
OutputBaseFilename=Server-Manager-Setup-v1.0.0
SetupIconFile=assets\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UsePreviousAppDir=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1

[Files]
Source: "src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "run-server-manager.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\run-server-manager.bat"; WorkingDir: "{app}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\run-server-manager.bat"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\run-server-manager.bat"; WorkingDir: "{app}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\run-server-manager.bat"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\src"
Type: filesandordirs; Name: "{app}\assets"
Type: filesandordirs; Name: "{app}\node_modules"
Type: files; Name: "{app}\package.json"
Type: files; Name: "{app}\LICENSE"
Type: files; Name: "{app}\README.txt"
Type: files; Name: "{app}\run-server-manager.bat"

[Code]
procedure InitializeWizard;
begin
  // Set wizard images
  WizardForm.WizardBitmapImage.Width := 496;
  WizardForm.WizardBitmapImage.Height := 296;
  WizardForm.WizardSmallBitmapImage.Width := 164;
  WizardForm.WizardSmallBitmapImage.Height := 296;
end;