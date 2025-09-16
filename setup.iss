; Server Manager Setup Script
; Professional Windows Installer using Inno Setup

#define MyAppName "Server Manager"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Next Mavens"
#define MyAppURL "https://github.com/servermanager/server-manager-app"
#define MyAppExeName "ServerManager.exe"
#define MyAppAssocName "Server Manager"
#define MyAppAssocExt ".sm"
#define MyAppAssocKey StringChange(MyAppAssocName, " ", "") + MyAppAssocExt

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{8E8F4F4C-8E4A-4A2F-8B6E-7A9B9C9D8E7F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\Server Manager
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=LICENSE
InfoBeforeFile=README.md
OutputDir=dist
OutputBaseFilename=Server-Manager-v1.0.0-Setup
SetupIconFile=assets\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableWelcomePage=no
DisableDirPage=no
DisableProgramGroupPage=no
DisableReadyPage=yes
DisableFinishedPage=no
UninstallDisplayIcon={app}\assets\icon.ico
UninstallDisplayName={#MyAppName}
VersionInfoVersion=1.0.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} - Development Server Management Tool
VersionInfoCopyright=Copyright © 2025 {#MyAppPublisher}
MinVersion=10.0
UsedUserAreasWarning=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1
Name: "startupicon"; Description: "Start Server Manager with Windows"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.log,*.tmp"
Source: "assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.log,*.tmp"
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "run-server-manager.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\run-server-manager.bat"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon.ico"; Comment: "Development Server Management Tool"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"; IconFilename: "{app}\assets\icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\run-server-manager.bat"; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{app}\assets\icon.ico"; Comment: "Development Server Management Tool"
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\run-server-manager.bat"; WorkingDir: "{app}"; Tasks: quicklaunchicon; IconFilename: "{app}\assets\icon.ico"; Comment: "Development Server Management Tool"
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\run-server-manager.bat"; WorkingDir: "{app}"; Tasks: startupicon; IconFilename: "{app}\assets\icon.ico"; Comment: "Development Server Management Tool"

[Run]
Filename: "{app}\run-server-manager.bat"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent unchecked

[UninstallDelete]
Type: filesandordirs; Name: "{app}\src"
Type: filesandordirs; Name: "{app}\assets"
Type: filesandordirs; Name: "{app}\node_modules"
Type: files; Name: "{app}\package.json"
Type: files; Name: "{app}\LICENSE"
Type: files; Name: "{app}\README.md"
Type: files; Name: "{app}\run-server-manager.bat"
Type: files; Name: "{app}\*.log"
Type: files; Name: "{app}\*.tmp"

[Code]
// Custom code for enhanced installation experience
procedure InitializeWizard;
begin
  // Set wizard images and styling
  WizardForm.WizardBitmapImage.Width := 496;
  WizardForm.WizardBitmapImage.Height := 296;
  WizardForm.WizardSmallBitmapImage.Width := 164;
  WizardForm.WizardSmallBitmapImage.Height := 296;
  
  // Set welcome page title
  WizardForm.WelcomeLabel1.Caption := 'Welcome to the Server Manager Setup Wizard';
  WizardForm.WelcomeLabel2.Caption := 'This wizard will guide you through the installation of Server Manager v1.0.0 on your computer.' + #13#10 + #13#10 +
    'Server Manager is a powerful system tray application for managing development servers on Windows. It automatically detects running servers, provides real-time monitoring, and allows you to start, stop, and restart development services with ease.' + #13#10 + #13#10 +
    'Click Next to continue.';
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
  begin
    // Create installation log
    SaveStringToFile(ExpandConstant('{app}\installation.log'), 
      'Server Manager Installation Log' + #13#10 +
      '============================' + #13#10 +
      'Installation Date: ' + GetDateTimeString('yyyy-mm-dd hh:nn:ss', '-', ':') + #13#10 +
      'Version: ' + '{#MyAppVersion}' + #13#10 +
      'Installation Path: ' + ExpandConstant('{app}') + #13#10 +
      'User: ' + GetUserNameString + #13#10 +
      'Computer: ' + GetComputerNameString + #13#10 + #13#10, 
      False);
  end;
end;

procedure DeinitializeSetup();
begin
  // Cleanup temporary files
end;