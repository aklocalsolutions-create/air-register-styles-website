// Air Register Styles — install default (seed). OWNER: lead / packaging only.
// The shipped file says '00' (Classic = today's look). On Windows the launcher (AirRegister.ps1) rewrites this file at
// every start from %LOCALAPPDATA%\AirRegisterStyles\style-default.json, which the per-style installer writes ONLY when
// it does not exist yet (first install). A style chosen later in Settings > Style is saved in settings.json and wins.
window.AIRREG_STYLE_DEFAULT = '00';
