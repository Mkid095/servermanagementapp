; Server Manager v1.0.0 - Professional Inno Setup Installer
; Development Server Management Tool by Next Mavens

#define MyAppName "Server Manager"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Next Mavens"
#define MyAppURL "https://github.com/servermanager/server-manager-app"
#define MyAppExeName "Server-Manager.bat"

[Setup]
; NOTE: The value of AppId uniquely identifies this application
AppId={{8E8F4F4C-8E4A-4A2F-8B6E-7A9B9C9D8E7F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Installation directories
DefaultDirName={autopf}\Server Manager
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=build-temp\app\LICENSE
InfoBeforeFile=build-temp\app\README.md

; Output configuration
OutputDir=dist
OutputBaseFilename=Server-Manager-v1.0.0-Setup
SetupIconFile=build-temp\app\assets\icon.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
WizardImageFile=build-temp\app\assets\wizard.bmp
WizardSmallImageFile=build-temp\app\assets\wizard-small.bmp

; Security and permissions
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableWelcomePage=no
DisableDirPage=no
DisableProgramGroupPage=no
DisableReadyPage=no
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
; Application files
Source: "build-temp\app\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.log,*.tmp"
Source: "build-temp\app\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "build-temp\app\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "build-temp\app\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "build-temp\app\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "build-temp\app\Server-Manager.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Program menu shortcuts
Name: "{group}\{#MyAppName}"; Filename: "{app}\Server-Manager.bat"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon.ico"; Comment: "Development Server Management Tool"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"; IconFilename: "{app}\assets\icon.ico"

; Desktop shortcut
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\Server-Manager.bat"; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{app}\assets\icon.ico"; Comment: "Development Server Management Tool"

; Quick launch shortcut
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\Server-Manager.bat"; WorkingDir: "{app}"; Tasks: quicklaunchicon; IconFilename: "{app}\assets\icon.ico"; Comment: "Development Server Management Tool"

; Startup shortcut
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\Server-Manager.bat"; WorkingDir: "{app}"; Tasks: startupicon; IconFilename: "{app}\assets\icon.ico"; Comment: "Development Server Management Tool"

[Run]
; Launch application after installation
Filename: "{app}\Server-Manager.bat"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Clean up all application files on uninstall
Type: filesandordirs; Name: "{app}\src"
Type: filesandordirs; Name: "{app}\assets"
Type: files; Name: "{app}\package.json"
Type: files; Name: "{app}\LICENSE"
Type: files; Name: "{app}\README.md"
Type: files; Name: "{app}\Server-Manager.bat"
Type: files; Name: "{app}\*.log"
Type: files; Name: "{app}\*.tmp"

[Code]
// Custom code for enhanced installation experience
procedure InitializeWizard;
begin
  // Set wizard styling
  WizardForm.WizardBitmapImage.Width := 496;
  WizardForm.WizardBitmapImage.Height := 296;
  WizardForm.WizardSmallBitmapImage.Width := 164;
  WizardForm.WizardSmallBitmapImage.Height := 296;
  
  // Customize welcome page
  WizardForm.WelcomeLabel1.Caption := 'Welcome to the Server Manager Setup Wizard';
  WizardForm.WelcomeLabel2.Caption := 'This wizard will guide you through the installation of Server Manager v1.0.0 on your computer.' + #13#10 + #13#10 +
    'Server Manager is a powerful system tray application for managing development servers on Windows. It automatically detects running servers, provides real-time monitoring, and allows you to start, stop, and restart development services with ease.' + #13#10 + #13#10 +
    'Key Features:' + #13#10 +
    '• Automatic server detection (React, Node.js, Python)' + #13#10 +
    '• Real port detection and localhost URL display' + #13#10 +
    '• System tray integration with confirmation dialog' + #13#10 +
    '• Server restart and error logging capabilities' + #13#10 +
    '• System process filtering for safety' + #13#10 +
    '• Server categorization and organization' + #13#10 + #13#10 +
    'Note: This application requires Node.js to be installed on your system.' + #13#10 + #13#10 +
    'Click Next to continue.';
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
      'Computer: ' + GetComputerNameString + #13#10 + #13#10 +
      'Files Installed:' + #13#10 +
      '• Application source files' + #13#10 +
      '• Assets and resources' + #13#10 +
      '• Configuration files' + #13#10 +
      '• Launcher scripts' + #13#10 +
      '• Documentation' + #13#10 + #13#10 +
      'Shortcuts Created:' + #13#10 +
      '• Start Menu: Programs\Server Manager' + #13#10 +
      '• Desktop: Server Manager.lnk (if selected)' + #13#10 +
      '• Quick Launch: Server Manager.lnk (if selected)' + #13#10 +
      '• Startup: Server Manager.lnk (if selected)' + #13#10 + #13#10, 
      False);
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
end;

procedure DeinitializeSetup();
begin
  // Final cleanup and logging
end;