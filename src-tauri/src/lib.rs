// UniERP Desktop (P10) — the native shell.
//
// What this process actually does, deliberately kept small:
//   1. Hosts a single webview (`public/`) that renders an entitled-platform
//      picker, fed by `GET /auth/platforms` — the same endpoint the Global
//      Platform Wizard renders from (idp/src/modules/oidc/controllers/
//      platforms.controller.ts), so desktop can never show a platform the
//      wizard wouldn't.
//   2. Drives the OIDC authorization-code + PKCE flow through the SYSTEM
//      browser (`shell.open`), never an embedded webview login form — the
//      same doctrine idp's hosted login page states for every relying party.
//      The system browser is also what carries the resulting SSO session:
//      picking a platform tile opens it in that same browser, already
//      signed in, rather than re-authenticating inside this shell.
//   3. Catches the `unierp://auth/callback` redirect via the OS's own
//      registered-scheme mechanism (tauri-plugin-deep-link) and hands the
//      authorization code back to the frontend to complete the PKCE
//      exchange.
//   4. Stores the resulting tokens in the OS keychain (the `keyring` crate —
//      Credential Manager / Keychain / Secret Service), not a plaintext file
//      or localStorage, via the three commands below.

use keyring::Entry;
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

const KEYCHAIN_SERVICE: &str = "com.unerp.desktop";

fn entry(key: &str) -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, key).map_err(|e| e.to_string())
}

#[tauri::command]
fn keychain_set(key: String, value: String) -> Result<(), String> {
    entry(&key)?.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
fn keychain_get(key: String) -> Result<Option<String>, String> {
    match entry(&key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn keychain_delete(key: String) -> Result<(), String> {
    match entry(&key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

/// Forwards a deep-link URL to the frontend as an event, from wherever it
/// was caught — first launch (macOS/iOS hand the URL to the app directly) or
/// a relaunch-with-args the single-instance plugin redirected here (the
/// Windows/Linux case, where opening a second `unierp://…` process is the
/// OS's actual delivery mechanism).
fn forward_deep_link(app: &tauri::AppHandle, url: String) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
    }
    let _ = app.emit("oidc-callback", url);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be the first plugin registered — it's what makes a second
        // `unierp://auth/callback` launch on Windows/Linux redeliver into
        // the already-running instance instead of opening a second window.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(url) = argv.iter().find(|a| a.starts_with("unierp://")) {
                forward_deep_link(app, url.clone());
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            keychain_set,
            keychain_get,
            keychain_delete
        ])
        .setup(|app| {
            // Runtime registration is required in dev (unpackaged) builds on
            // Linux/Windows; a packaged build also gets it declaratively from
            // tauri.conf.json's `plugins.deep-link.desktop.schemes`. Calling
            // both is intentional belt-and-braces, not redundant — the
            // declarative path covers the installed case, this covers
            // `tauri dev`.
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                app.deep_link().register_all()?;
            }

            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(url) = event.urls().first() {
                    forward_deep_link(&handle, url.to_string());
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the UniERP desktop shell");
}
