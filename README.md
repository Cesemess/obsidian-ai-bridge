# 🚀 AI Bridge — NotebookLM, Gemini & Google for Obsidian

[![Version](https://img.shields.io/badge/version-1.0.0-7c3aed.svg)](https://github.com/Cesemess/obsidian-ai-bridge)
[![Author](https://img.shields.io/badge/author-Cesemess-blue.svg)](https://github.com/Cesemess)
[![Compatibility](https://img.shields.io/badge/platforms-Desktop%20(macOS%20%7C%20Windows%20%7C%20Linux)-green.svg)](https://obsidian.md)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-cesemess-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/cesemess)

*Read this in [English](#english) | Przeczytaj w [języku polskim](#polski)*

---

<a id="english"></a>
## English

**AI Bridge** is an Obsidian plugin that seamlessly connects your local notes with **Google NotebookLM**, **Google Gemini**, and **Google Search**. It provides embedded desktop sidebar panels, smart folder-to-notebook mapping, right-click context menu shortcuts, and automatic query sending.

AI Bridge acts as a direct bridge — your data stays strictly between Obsidian and your Google account. No external proxy servers, no third-party API keys required.

> **💡 Philosophy**: AI Bridge is a bridge between your vault and NotebookLM. Your results are as good as the sources you provide in your notebook. We recommend creating a dedicated NotebookLM notebook for each subject or research project containing specific publications, books, presentations, and transcripts.

### ✨ Key Features

1. **Embedded Sidebar Webviews (Desktop)**
   - Open **NotebookLM** and **Gemini** directly inside Obsidian's right sidebar.
   - Preserves your login session across restarts.
   - Clean header mode: hides promotional Google headers to maximize reading space.
   - Navigation toolbar: open in default browser, quick reload, settings shortcut, and support button.
   - Desktop focused: powered by native Electron Webviews with dedicated sessions.

2. **Context Menu Actions (Right-Click / Touch)**
   - Highlight any text in your note and right-click:
     - 📓 **NotebookLM**: copies selection to clipboard (optional) and loads the mapped or default notebook in the sidebar.
     - ✨ **Gemini**: sends the selected text directly to the Gemini sidebar chat.
     - 🔍 **Google**: opens a Google search for the selected text in your default browser.

3. **Smart NotebookLM Mapping**
   - **Default Notebook**: designate a primary notebook for unassigned notes.
   - **Vault Auto-Matching**: automatically scans your vault folders/files and suggests matching notebooks.
   - **Folder & Note Rules**: map specific folders or files to dedicated notebooks.
   - **Frontmatter Support**: set `notebooklm: Notebook Name` or `notebook_id: <ID>` in your note's YAML frontmatter.

4. **Notebook Management & Verification**
   - Add notebooks by pasting full URLs (`https://notebooklm.google.com/notebook/...`) or raw IDs.
   - Automatic notebook title fetching in the background.
   - Status indicators: 🟢 *Verified*, ⚪ *Unverified*, 🔴 *Error / Inaccessible*.
   - Optional automatic removal of deleted/invalid notebooks.

5. **Configurable Query Automation**
   - **Auto-send queries**: automatically sends queries to the chat box or only pre-fills them for review.
   - **Clipboard control**: toggle whether selected text is copied to your system clipboard.
   - **Custom Google search URL**: customize your preferred search provider URL.

6. **Multi-Language Support (11 Languages)**
   - Fully localized interface in English (`en`), Polish (`pl`), German (`de`), Spanish (`es`), French (`fr`), Simplified Chinese (`zh`), Japanese (`ja`), Korean (`ko`), Portuguese (`pt`), Russian (`ru`), and Italian (`it`).
   - Automatically adapts to Obsidian's display language or can be set manually in settings.

---

### ⌨️ Commands & Hotkeys

You can bind hotkeys to any of these commands in Obsidian (**Settings** → **Hotkeys**):

| Command ID | Command Name (English) | Nazwa polecenia (Polski) |
| :--- | :--- | :--- |
| `ai-bridge:open-notebooklm-sidebar` | `NotebookLM: Open sidebar panel` | `NotebookLM: Otwórz panel boczny` |
| `ai-bridge:open-gemini-sidebar` | `Gemini: Open sidebar panel` | `Gemini: Otwórz panel boczny` |
| `ai-bridge:open-notebooklm-selection` | `NotebookLM: Send selection to sidebar` | `NotebookLM: Wyślij zaznaczenie do panelu bocznego` |
| `ai-bridge:open-gemini-selection` | `Gemini: Send selection to Gemini in sidebar` | `Gemini: Wyślij zaznaczenie do Gemini w panelu bocznym` |
| `ai-bridge:search-google-selection` | `Google: Search selection in external browser` | `Google: Szukaj zaznaczenia w zewnętrznej przeglądarce` |

---

### 🛠️ Installation

#### Manual Installation:
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. In your Obsidian vault folder, create: `.obsidian/plugins/ai-bridge/`
3. Copy the downloaded files into that folder.
4. Reload Obsidian, go to **Settings** → **Community plugins**, and enable **AI Bridge**.

---

### ☕ Support

AI Bridge is free and open-source. If it improves your study workflow and daily research, consider buying me a coffee:

👉 **[Buy Me a Coffee (cesemess)](https://buymeacoffee.com/cesemess)**

---

<a id="polski"></a>
## Polski

**AI Bridge** to wtyczka dla aplikacji [Obsidian](https://obsidian.md), która łączy Twoje lokalne notatki z **Google NotebookLM**, asystentem **Gemini** oraz wyszukiwarką **Google**. Oferuje zintegrowane panele boczne Webview na komputerze, inteligentne mapowanie folderów i notatek do notesów, szybkie akcje w menu kontekstowym oraz automatyczne przesyłanie zapytań.

AI Bridge działa jako bezpośredni most — Twoje dane pozostają wyłącznie pomiędzy Twoim skarbcem Obsidian a Twoim kontem Google. Brak zewnętrznych serwerów proxy i brak konieczności podawania kluczy API.

> **💡 Filozofia działania**: AI Bridge stanowi most między Twoim skarbcem a NotebookLM. Otrzymywane odpowiedzi są tak dobre, jak materiały źródłowe przygotowane w danym notatniku. Zalecamy stworzenie osobnego notatnika NotebookLM dla każdego przedmiotu lub projektu badawczego i załadowanie do niego rzetelnych publikacji, podręczników, prezentacji oraz transkrypcji wykładów.

### ✨ Główne możliwości

1. **Wbudowane panele boczne (Desktop Webview)**
   - Otwieraj **NotebookLM** oraz **Gemini** bezpośrednio w prawym panelu bocznym Obsidiana.
   - Pamięta sesję logowania Google pomiędzy ponownymi uruchomieniami aplikacji.
   - Tryb czystego nagłówka: ukrywa zbędne banery promocyjne Google, zwiększając czytelność.
   - Pasek narzędzi: otwieranie w przeglądarce systemowej, odświeżanie, skrót do ustawień i wsparcie twórcy.
   - Dedykowana dla komputerów: wykorzystuje natywne panele Electron Webview z bezpieczną, izolowaną sesją logowania.

2. **Menu pod prawym przyciskiem myszy (PPM / Dotyk)**
   - Zaznacz dowolny fragment tekstu w notatce:
     - 📓 **NotebookLM** — kopiuje zaznaczenie do schowka (opcjonalnie) i ładuje powiązany notatnik w panelu bocznym.
     - ✨ **Gemini** — wkleja zaznaczone zapytanie bezpośrednio do czatu Gemini w panelu bocznym.
     - 🔍 **Google** — uruchamia wyszukiwanie zaznaczonego hasła w Twojej domyślnej przeglądarce.

3. **Inteligentne mapowanie notatek (Smart Mapping)**
   - **Domyślny notatnik**: wyznacz jeden notatnik główny dla wszystkich nieprzypisanych notatek.
   - **Automatyczne dopasowywanie (Auto-Match)**: przeszukuje skarbiec i proponuje powiązanie folderów lub plików o nazwach zgodnych z notatnikami.
   - **Reguły folderów i plików**: twórz stałe powiązania folderów i plików z odpowiednimi notatnikami w tabeli reguł.
   - **Obsługa Frontmatter**: wpisz w nagłówku YAML notatki `notebooklm: Nazwa Notatnika` lub `notebook_id: <ID>`.

4. **Zarządzanie notatnikami NotebookLM**
   - Dodawanie notatników przez wklejenie pełnego linku (`https://notebooklm.google.com/notebook/...`) lub samego ID.
   - Automatyczne pobieranie tytułu notatnika w tle.
   - Wskaźniki statusu: 🟢 *Zweryfikowany*, ⚪ *Niezweryfikowany*, 🔴 *Błąd / Brak dostępu*.
   - Opcja automatycznego usuwania usuniętych/niedostępnych notatników.

5. **Konfigurowalna automatyzacja zapytań**
   - **Automatyczne wysyłanie**: wybierz, czy zapytania mają być automatycznie wysyłane, czy tylko wklejane do pola czatu.
   - **Kontrola schowka**: decyduj, czy zaznaczony tekst ma być kopiowany do schowka systemowego.
   - **Własny adres URL wyszukiwarki**: dostosuj adres URL dla wyszukiwania Google.

6. **Pełna wielojęzyczność (11 języków)**
   - Cały interfejs, powiadomienia i wskazówki przetłumaczone na: angielski (`en`), polski (`pl`), niemiecki (`de`), hiszpański (`es`), francuski (`fr`), chiński uproszczony (`zh`), japoński (`ja`), koreański (`ko`), portugalski (`pt`), rosyjski (`ru`) oraz włoski (`it`).
   - Automatyczne dostosowanie do języka aplikacji Obsidian z możliwością ręcznego wyboru w zakładce „Informacje”.

---

### ⌨️ Skróty klawiszowe

Wszystkie polecenia możesz przypisać do własnych skrótów klawiszowych w **Ustawienia** → **Skróty klawiszowe**:
- `NotebookLM: Otwórz panel boczny`
- `Gemini: Otwórz panel boczny`
- `NotebookLM: Wyślij zaznaczenie do panelu bocznego`
- `Gemini: Wyślij zaznaczenie do Gemini w panelu bocznym`
- `Google: Szukaj zaznaczenia w zewnętrznej przeglądarce`

---

### 🛠️ Instalacja ręczna

1. Pobierz pliki `main.js`, `manifest.json` oraz `styles.css` z najnowszego wydania (Releases).
2. W folderze swojego skarbca Obsidian przejdź do: `.obsidian/plugins/ai-bridge/`
3. Skopiuj pobrane pliki do tego folderu.
4. Uruchom ponownie Obsidian, wejdź w **Ustawienia** → **Wtyczki społeczności** i włącz **AI Bridge**.

---

### ☕ Wsparcie projektu

Wtyczka jest w 100% bezpłatna i otwartoźródłowa. Jeśli ułatwia Ci codzienną naukę i organizację notatek:

👉 **[Postaw mi kawę na Buy Me a Coffee](https://buymeacoffee.com/cesemess)**

---

## 📄 Licencja / License

Distributed under the MIT License. See `LICENSE` for more information.
