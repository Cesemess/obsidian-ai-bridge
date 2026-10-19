/* ==========================================================================
   AI Bridge Plugin for Obsidian
   Author: Cesemess (https://github.com/Cesemess)
   Repository: https://github.com/Cesemess/obsidian-ai-bridge
   Description: Seamless bridge between Obsidian, Google NotebookLM, Gemini & Google Search.
                Right sidebar views, precise chat input typing, clean note-to-notebook mapping,
                two-line notebook cards with purple default font, and cross-platform support.
   Platforms: Desktop (macOS, Windows, Linux) - Requires Electron Webview.
   License: MIT
   ========================================================================== */

const {
  Plugin,
  PluginSettingTab,
  Setting,
  ItemView,
  Notice,
  Modal,
  requestUrl,
  setIcon,
  Platform,
  TFile,
  TFolder
} = require("obsidian");

const VIEW_TYPE_NOTEBOOKLM = "ai-bridge-notebooklm-view";
const VIEW_TYPE_GEMINI = "ai-bridge-gemini-view";

const GOOGLE_PARTITION = "persist:notebooklm";

function deriveGoogleUserAgent() {
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    const cleaned = navigator.userAgent
      .replace(/obsidian\/[^\s]+/i, "")
      .replace(/electron\/[^\s]+/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) return cleaned;
  }
  return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
}

const GOOGLE_USER_AGENT = deriveGoogleUserAgent();

const GENERIC_APP_TITLES = [
  "gemini notebook",
  "notebooklm",
  "google notebooklm",
  "gemini",
  "google",
  "google accounts",
  "sign in",
  "zaloguj się",
  "untitled notebook",
  "notes bez tytułu",
  "notatnik bez tytułu"
];

// --------------------------------------------------------------------------
// Internationalization (i18n)
// --------------------------------------------------------------------------
const TRANSLATIONS = {
  en: {
    // Navigation & Toolbar
    navOpenInBrowser: "Open in browser",
    navRefreshPage: "Refresh page",
    navPluginSettings: "Plugin settings",
    navBuyCoffee: "Buy Me a Coffee",
    navNoNotebooks: "No notebooks added",

    // Commands
    cmdOpenNotebookLMSidebar: "NotebookLM: Open sidebar panel",
    cmdOpenGeminiSidebar: "Gemini: Open sidebar panel",
    cmdSendSelectionNotebookLM: "NotebookLM: Send selection to sidebar",
    cmdSendSelectionGemini: "Gemini: Send selection to Gemini in sidebar",
    cmdSearchGoogle: "Google: Search selection in external browser",

    // Context Menu
    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Google Search",

    // Notices
    noticeNoText: "Please select text to send.",
    noticeNoTextSearch: "Please select text to search.",
    noticeAddNotebookFirst: "Please add a notebook in the „NotebookLM” tab first!",
    noticeCopiedAndOpened: "📋 Copied and opened „{name}” in sidebar!",
    noticeOpenedInSidebar: "📓 Opening „{name}” in sidebar...",
    noticeGeminiSending: "✨ Sending query to Gemini in sidebar...",
    noticeNoNotebooksToCheck: "No notebooks added to verify.",
    noticeAllNotebooksActive: "✅ All notebooks ({count}) are active!",
    noticeSomeNotebooksUnavailable: "⚠️ Found {invalidCount} unavailable notebooks out of {checkedCount}.",
    noticeAutoRemoved: "🗑️ Automatically removed {count} unavailable notebooks.",
    noticeEnterNotebookName: "Please enter a notebook name!",
    noticeInvalidUrlOrId: "Invalid URL or Notebook ID!",
    noticeNotebookAdded: "✅ Notebook added: „{name}”",
    noticeNotebookUpdated: "✅ Notebook updated: „{name}”",
    noticeAutoScanFound: "⚡ Auto-mapped {count} folders to notebooks!",
    noticeAutoScanNone: "No matching folders found for notebooks.",
    noticeSelectFolderOrNote: "Please select a folder or note!",
    noticeSelectNotebook: "Please select a NotebookLM notebook!",
    noticeRuleExists: "A rule for this path already exists!",
    noticeRuleAdded: "✅ Mapping rule created!",

    // Mobile
    mobileViewTitle: "Desktop Webview Only",
    mobileViewDesc: "Embedded panels using Webview are only available on desktop. Tap below to open in your browser.",
    openInBrowser: "Open in browser",

    // Tabs
    tabAbout: "About",
    tabNotebookLM: "NotebookLM",
    tabMappings: "Note Mappings",
    tabSettings: "Settings",

    // Hero & About
    heroTitle: "AI Bridge — NotebookLM & Gemini",
    heroAuthor: "Author: Cesemess",
    heroDesc: "Seamless bridge connecting your Obsidian notes with official Google NotebookLM and Gemini environments.",
    qsTitle: "Quick Start — How to Begin?",
    qsStep1Title: "Add your notebook: ",
    qsStep1Desc: "In the „NotebookLM” tab, click „Add notebook” and paste the link from your browser. The plugin will extract the ID and let you name it.",
    qsStep2Title: "Assign to subject or folder: ",
    qsStep2Desc: "In the „Note Mappings” tab, choose which folder or note in Obsidian opens this notebook (or use auto-matching).",
    qsStep3Title: "Select text and ask via right-click: ",
    qsStep3Desc: "In any note, select text, right-click, and choose „📓 NotebookLM” — the question will be sent directly to your sidebar.",

    // Language
    langSelectName: "Interface Language",
    langSelectDesc: "Choose the display language for the plugin.",
    langAuto: "Automatic (system)",

    // Guide
    guideTitle: "How AI Bridge Works & Best Practices",
    guideBridgeTitle: "The plugin is strictly a Bridge",
    guideBridgeDesc: "The plugin does not generate answers itself or use third-party APIs. Its sole purpose is to instantly route your questions from Obsidian into your official Google NotebookLM (and Gemini) workspace in the sidebar.",
    guideQualityTitle: "Results depend directly on your notebook content",
    guideQualityDesc: "NotebookLM grounds 100% of its answers in your uploaded source materials (RAG). Empty or disorganized notebooks yield vague answers, while a well-curated notebook produces precise answers with exact page citations.",
    guidePracticeTitle: "Best practice: dedicated notebook per subject",
    guidePracticeDesc: "Create a distinct notebook in NotebookLM for each course or topic (e.g. „Educational Psychology”, „Statistics”) and upload comprehensive sources:",
    guideBullet1: "📚 Books and papers: official textbooks, syllabus papers, and research articles (PDF)",
    guideBullet2: "📑 Presentations: lecture slides, workshop handouts, and class notes",
    guideBullet3: "🎙️ Transcripts: audio/video lecture transcripts and seminar recordings",
    guideCalloutTitle: "In practice: ",
    guideCalloutText: "While studying in Obsidian, select any confusing term and get an authoritative answer grounded in your coursework — no hallucinations, no guesswork.",

    // Coffee Support
    coffeeBannerText: "Enjoying the plugin? Buy me a coffee!",
    coffeeBannerSubtext: " Support development and maintenance.",
    coffeeBannerBtn: "Buy me a coffee",
    supportTitle: "Support the Project",
    supportDesc: "This plugin is completely free and open-source. If it helps you learn and work in Obsidian, buying a coffee is a great way to say thanks and support future development!",
    supportBtnText: "Buy me a coffee",
    hideSupportName: "Ukryj wsparcie",
    hideSupportDesc: "Ukrywa pasek wsparcia na samej górze ustawień oraz ikonę filiżanki kawy w nagłówku panelu bocznego.",
    linksTitle: "About the Project",
    linksGithub: "GitHub Repository",
    linksIssues: "Report Bug or Suggest Feature",

    // NotebookLM Manager
    manageNotebooksTitle: "Manage NotebookLM Notebooks",
    addNotebookBtn: "Add notebook",
    checkAvailabilityBtn: "Check availability",
    startupCheckName: "Verification on Obsidian startup",
    startupCheckDesc: "Checks availability of added notebooks when Obsidian starts.",
    autoRemoveInvalidName: "Auto-remove deleted notebooks",
    autoRemoveInvalidDesc: "Automatically removes notebooks that return a 404 error during verification.",
    yourNotebooksTitle: "Your Notebooks ({count})",
    emptyNotebooksTitle: "No notebooks added",
    emptyNotebooksDesc: "Click „Add notebook” to paste a link to your Google NotebookLM notebook.",
    defaultBadge: "Default",
    statusActive: "🟢 Active",
    statusUnavailable: "🔴 Unavailable",
    statusUnverified: "⚪ Unverified",
    actionOpenInBrowser: "Open in browser",
    actionSetAsDefault: "Set as default",
    actionIsDefault: "Default notebook",
    actionEdit: "Edit",
    actionDelete: "Delete",

    // Note Mappings
    autoMatchTitle: "Automatic Matching (Auto-Match)",
    enableAutoMatchName: "Enable automatic matching",
    enableAutoMatchDesc: "Automatically routes notes to a notebook if the folder or note name matches the notebook name.",
    scanFoldersName: "Scan folders and match now",
    scanFoldersDesc: "Scans vault folders and creates mapping rules for folders matching notebook names.",
    scanFoldersBtn: "⚡ Check and match now",
    defaultNotebookName: "Default notebook",
    defaultNotebookDesc: "Handles all unmapped notes (indicated with purple font).",
    defaultNotebookNone: "— None (ask when unassigned) —",
    mappingRulesTitle: "Mapping Rules ({count})",
    chooseFolderOrNote: "— Choose folder or note —",
    optgroupFolders: "📁 Folders",
    optgroupFiles: "📄 Notes",
    chooseNotebook: "— Choose NotebookLM notebook —",
    assignBtn: "Assign",
    emptyRulesTitle: "No mapping rules yet",
    emptyRulesDesc: "Select a folder or note above, choose a notebook and click „Assign”.",
    targetFolder: "Folder",
    targetNote: "Note",

    // Settings Tab
    contextMenuCardTitle: "Context Menu (Right-Click / Touch)",
    showNotebookLMContextMenu: "Show NotebookLM in context menu",
    showGeminiContextMenu: "Show Gemini in context menu",
    showGoogleContextMenu: "Show Google Search in context menu",
    behaviorCardTitle: "Action Behavior & Clipboard",
    autoSendName: "Automatically send queries",
    autoSendDesc: "When enabled, queries are automatically submitted in NotebookLM/Gemini. When disabled, text is pasted into the chat field without sending.",
    copyClipboardName: "Copy selected text to clipboard",
    copyClipboardDesc: "Copies selected text to your system clipboard when opening NotebookLM or Gemini.",
    showNoticeName: "Show action notifications",
    showNoticeDesc: "Shows brief toast notices when actions are triggered.",
    searchCardTitle: "Google Search",
    googleSearchUrlName: "Search URL template",
    googleSearchUrlDesc: "URL template used for web searches. Use {query} as the placeholder.",
    sidebarHeaderCardTitle: "Sidebar Header",
    hideNotebookLMHeaderName: "Hide NotebookLM top Google bar",
    hideNotebookLMHeaderDesc: "Hides the Google header with logo and account icons to maximize screen space for notes and chat.",
    hotkeysCardTitle: "Hotkeys",
    hotkeysConfigName: "Configure Hotkeys",
    hotkeysConfigDesc: "Assign keyboard shortcuts to NotebookLM, Gemini, and Google actions in Obsidian settings.",
    hotkeysOpenBtn: "Open Obsidian Hotkeys",

    // Modals
    addModalTitle: "Add NotebookLM Notebook",
    addModalDesc: "Paste the link from your browser or the notebook ID. The plugin will automatically extract the ID and suggest the title.",
    labelUrlOrId: "Link or Notebook ID:",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... or ID",
    labelName: "Notebook Name:",
    placeholderName: "e.g. Educational Psychology",
    checkboxSetDefault: "Set as default notebook",
    btnCancel: "Cancel",
    btnSave: "Save",
    btnChecking: "⏳ Checking...",
    btnValidId: "✓ Valid ID: {id}",
    btnInvalidId: "⚠️ Invalid ID format",
    editModalTitle: "Edit Notebook",
    deleteModalTitle: "Delete Notebook?",
    deleteModalDesc: "Are you sure you want to delete „{name}”? All mapping rules for this notebook will also be removed.",
    btnDeleteConfirm: "Delete notebook",
    suggestModalTitle: "Choose Notebook for „{file}”",
    suggestModalDesc: "This note does not have a mapped notebook yet. Select where you want to send your question:",
    suggestCheckboxSave: "Save this assignment permanently for folder: {folder}",
    btnOpenAndSend: "Open & Send"
  },
  pl: {
    // Navigation & Toolbar
    navOpenInBrowser: "Otwórz w przeglądarce komputera",
    navRefreshPage: "Odśwież stronę",
    navPluginSettings: "Ustawienia wtyczki",
    navBuyCoffee: "Postaw mi kawę (Buy Me a Coffee)",
    navNoNotebooks: "Brak dodanych notesów",

    // Commands
    cmdOpenNotebookLMSidebar: "NotebookLM: Otwórz panel boczny",
    cmdOpenGeminiSidebar: "Gemini: Otwórz panel boczny",
    cmdSendSelectionNotebookLM: "NotebookLM: Wyślij zaznaczenie do panelu bocznego",
    cmdSendSelectionGemini: "Gemini: Wyślij zaznaczenie do Gemini w panelu bocznym",
    cmdSearchGoogle: "Google: Szukaj zaznaczenia w zewnętrznej przeglądarce",

    // Context Menu
    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Google Search",

    // Notices
    noticeNoText: "Zaznacz tekst, który chcesz wysłać.",
    noticeNoTextSearch: "Zaznacz tekst, który chcesz wyszukać.",
    noticeAddNotebookFirst: "Dodaj notes w zakładce „NotebookLM”!",
    noticeCopiedAndOpened: "📋 Skopiowano i otworzono „{name}” w panelu!",
    noticeOpenedInSidebar: "📓 Otwieranie „{name}” w panelu...",
    noticeGeminiSending: "✨ Przesyłanie zapytania do Gemini w panelu bocznym...",
    noticeNoNotebooksToCheck: "Brak dodanych notesów do sprawdzenia.",
    noticeAllNotebooksActive: "✅ Wszystkie notatniki ({count}) są aktywne!",
    noticeSomeNotebooksUnavailable: "⚠️ Znaleziono {invalidCount} niedostępnych notesów z {checkedCount}.",
    noticeAutoRemoved: "🗑️ Automatycznie usunięto {count} nieprawidłowych notatników.",
    noticeEnterNotebookName: "Wpisz nazwę notatnika!",
    noticeInvalidUrlOrId: "Nieprawidłowy link lub ID notesu!",
    noticeNotebookAdded: "✅ Dodano notes: „{name}”",
    noticeNotebookUpdated: "✅ Zaktualizowano notatnik: „{name}”",
    noticeAutoScanFound: "⚡ Automatycznie przypisano {count} folderów do notatników!",
    noticeAutoScanNone: "Nie znaleziono pasujących folderów dla dodanych notatników.",
    noticeSelectFolderOrNote: "Wybierz folder lub notatkę!",
    noticeSelectNotebook: "Wybierz notatnik NotebookLM!",
    noticeRuleExists: "Reguła dla tej ścieżki już istnieje!",
    noticeRuleAdded: "✅ Dodano regułę przypisania!",

    // Mobile
    mobileViewTitle: "Panel dostępny na komputerach",
    mobileViewDesc: "Wbudowany panel wykorzystujący technologię Webview działa wyłącznie na komputerach. Kliknij poniżej, aby otworzyć w przeglądarce.",
    openInBrowser: "Otwórz w przeglądarce",

    // Tabs
    tabAbout: "Informacje",
    tabNotebookLM: "NotebookLM",
    tabMappings: "Przypisanie notatek",
    tabSettings: "Ustawienia",

    // Hero & About
    heroTitle: "AI Bridge — NotebookLM & Gemini",
    heroAuthor: "Twórca: Cesemess",
    heroDesc: "Inteligentny most łączący Twoje notatki w Obsidianie z oficjalnym środowiskiem Google NotebookLM i Gemini.",
    qsTitle: "Szybki start — jak zacząć?",
    qsStep1Title: "Dodaj swój notatnik: ",
    qsStep1Desc: "W zakładce „NotebookLM” kliknij „Dodaj notes” i wklej link ze swojej przeglądarki. Wtyczka sama odczyta ID notatnika i pozwoli nadać mu czytelną nazwę.",
    qsStep2Title: "Przypisz do przedmiotu lub folderu: ",
    qsStep2Desc: "W zakładce „Przypisanie notatek” wybierz, który folder lub notatka w Obsidianie ma otwierać dany notatnik (możesz też użyć przycisku automatycznego dopasowania).",
    qsStep3Title: "Zaznacz tekst i pytaj pod PPM: ",
    qsStep3Desc: "W dowolnej notatce zaznacz trudny fragment, kliknij prawym przyciskiem myszy i wybierz „📓 NotebookLM” — pytanie wyśle się automatycznie w bocznym panelu.",

    // Język
    langSelectName: "Język interfejsu",
    langSelectDesc: "Wybierz język wyświetlania wtyczki.",
    langAuto: "Automatyczny (systemowy)",

    // Guide
    guideTitle: "Jak działa wtyczka i jak osiągnąć najlepsze rezultaty?",
    guideBridgeTitle: "Wtyczka jest wyłącznie mostem (Bridge)",
    guideBridgeDesc: "Wtyczka nie generuje własnych odpowiedzi ani nie korzysta z pośredników. Jej jedyną rolą jest natychmiastowe skierowanie Twojego pytania z Obsidiana do właściwego notesu w oficjalnym środowisku Google NotebookLM (oraz Gemini) w prawym panelu.",
    guideQualityTitle: "Wyniki będą tak dobre, jak przygotujesz swój notatnik",
    guideQualityDesc: "NotebookLM odpowiada w 100% w oparciu o wgrane do niego materiały źródłowe (tzw. ugruntowanie / RAG). Jeśli notatnik będzie pusty, odpowiedzi będą ogólne. Jeżeli dobrze go nakarmisz wiedzą, otrzymasz bezbłędne odpowiedzi z precyzyjnymi cytatami i stronami.",
    guidePracticeTitle: "Najlepsza praktyka: osobny notatnik dla każdego przedmiotu",
    guidePracticeDesc: "Stwórz w NotebookLM osobny notes do każdego przedmiotu (np. „Psychologia wychowawcza”, „Statystyka”) i dodaj do niego kompletne materiały:",
    guideBullet1: "📚 Publikacje i książki: oficjalne podręczniki, skrypty oraz artykuły naukowe w PDF",
    guideBullet2: "📑 Prezentacje: slajdy z wykładów, materiały z ćwiczeń i konspekty zajęć",
    guideBullet3: "🎙️ Transkrypcje: zapisy nagrań audio/wideo z wykładów i prelekcji",
    guideCalloutTitle: "Efekt w praktyce: ",
    guideCalloutText: "Ucząc się lub pisząc notatki w Obsidianie, zaznaczasz niezrozumiałe pojęcie i natychmiast otrzymujesz rzetelne wyjaśnienie oparte wyłącznie na Twoim programie studiów — bez zmyślania i bez halucynacji.",

    // Coffee Support
    coffeeBannerText: "Podoba Ci się wtyczka? Postaw mi kawę!",
    coffeeBannerSubtext: " Wspieraj rozwój i utrzymanie wtyczki.",
    coffeeBannerBtn: "Postaw mi kawę",
    supportTitle: "Wesprzyj projekt",
    supportDesc: "Ta wtyczka jest całkowicie bezpłatna i otwartoźródłowa, tworzona z pasji w wolnym czasie. Jeśli ułatwia Ci codzienną naukę lub pracę z notatkami, postawienie kawy to świetny sposób, aby podziękować i zmotywować do dalszego rozwoju!",
    supportBtnText: "Postaw mi kawę",
    hideSupportName: "Ukryj wsparcie",
    hideSupportDesc: "Ukrywa pasek wsparcia na samej górze ustawień oraz ikonę filiżanki kawy w nagłówku panelu bocznego.",
    linksTitle: "O projekcie",
    linksGithub: "Repozytorium GitHub",
    linksIssues: "Zgłoś błąd lub propozycję",

    // NotebookLM Manager
    manageNotebooksTitle: "Zarządzanie notatnikami NotebookLM",
    addNotebookBtn: "Dodaj notes",
    checkAvailabilityBtn: "Sprawdź dostępność",
    startupCheckName: "Weryfikacja przy uruchomieniu Obsidiana",
    startupCheckDesc: "Sprawdza dostępność dodanych notesów przy starcie programu.",
    autoRemoveInvalidName: "Automatycznie usuwaj niedostępne notatniki",
    autoRemoveInvalidDesc: "Automatycznie usuwa notatniki, które podczas sprawdzania zwrócą błąd 404.",
    yourNotebooksTitle: "Twoje notatniki ({count})",
    emptyNotebooksTitle: "Brak dodanych notatników",
    emptyNotebooksDesc: "Kliknij „Dodaj notes”, aby wkleić link do notatnika z Google NotebookLM.",
    defaultBadge: "Domyślny",
    statusActive: "🟢 Aktywny",
    statusUnavailable: "🔴 Niedostępny",
    statusUnverified: "⚪ Niezweryfikowany",
    actionOpenInBrowser: "Otwórz w przeglądarce",
    actionSetAsDefault: "Ustaw jako domyślny",
    actionIsDefault: "Notes domyślny",
    actionEdit: "Edytuj",
    actionDelete: "Usuń",

    // Note Mappings
    autoMatchTitle: "Automatyczne dopasowywanie (Auto-Match)",
    enableAutoMatchName: "Włącz automatyczne dopasowywanie",
    enableAutoMatchDesc: "Automatycznie kieruje notatki do notesu, jeśli nazwa folderu lub notatki odpowiada nazwie notatnika NotebookLM.",
    scanFoldersName: "Skanuj foldery i dopasuj teraz",
    scanFoldersDesc: "Przeszukuje foldery w Twoim skarbcu i automatycznie tworzy reguły przypisania dla folderów o nazwach odpowiadających notatnikom.",
    scanFoldersBtn: "⚡ Sprawdź i przypisz teraz",
    defaultNotebookName: "Domyślny notatnik",
    defaultNotebookDesc: "Obsługuje wszystkie nieprzypisane notatki (oznaczony fioletową czcionką).",
    defaultNotebookNone: "— Brak (zapytaj przy braku przypisania) —",
    mappingRulesTitle: "Reguły przypisania ({count})",
    chooseFolderOrNote: "— Wybierz folder lub notatkę —",
    optgroupFolders: "📁 Foldery",
    optgroupFiles: "📄 Notatki",
    chooseNotebook: "— Wybierz notatnik NotebookLM —",
    assignBtn: "Przypisz",
    emptyRulesTitle: "Brak utworzonych reguł",
    emptyRulesDesc: "Wybierz folder lub notatkę powyżej, wskaż notatnik i kliknij „Przypisz”.",
    targetFolder: "Folder",
    targetNote: "Notatka",

    // Settings Tab
    contextMenuCardTitle: "Menu kontekstowe (Prawym przyciskiem myszy)",
    showNotebookLMContextMenu: "Pokaż NotebookLM pod PPM",
    showGeminiContextMenu: "Pokaż Gemini pod PPM",
    showGoogleContextMenu: "Pokaż Google pod PPM",
    behaviorCardTitle: "Zachowanie akcji i schowek",
    autoSendName: "Automatycznie wysyłaj zapytania",
    autoSendDesc: "Gdy włączone, zapytania są natychmiast wysyłane. Gdy wyłączone, tekst zostaje wklejony do pola czatu bez wysyłania.",
    copyClipboardName: "Kopiuj zaznaczenie do schowka",
    copyClipboardDesc: "Kopiuje zaznaczony tekst do schowka systemowego podczas wywoływania akcji.",
    showNoticeName: "Wyświetlaj powiadomienia o akcjach",
    showNoticeDesc: "Pokazuje powiadomienia o wykonaniu akcji i skopiowaniu tekstu.",
    searchCardTitle: "Wyszukiwarka Google",
    googleSearchUrlName: "Szablon adresu URL wyszukiwania",
    googleSearchUrlDesc: "Szablon adresu URL używany do wyszukiwania. Użyj {query} jako znacznika zapytania.",
    sidebarHeaderCardTitle: "Nagłówek panelu bocznego",
    hideNotebookLMHeaderName: "Ukryj górną belkę NotebookLM",
    hideNotebookLMHeaderDesc: "Usuwa górną belkę z logo, przyciskiem PRO i awatarem Google, dając maksymalną przestrzeń na czat i notatki.",
    hotkeysCardTitle: "Skróty klawiszowe (Hotkeys)",
    hotkeysConfigName: "Konfiguracja skrótów klawiszy",
    hotkeysConfigDesc: "Przypisz własne skróty klawiszowe do NotebookLM, Gemini i Google w konfiguracji Obsidiana.",
    hotkeysOpenBtn: "Otwórz skróty Obsidiana",

    // Modals
    addModalTitle: "Dodaj notatnik NotebookLM",
    addModalDesc: "Wklej link ze swojej przeglądarki lub identyfikator notesu. Wtyczka automatycznie wyciągnie ID i zaproponuje nazwę.",
    labelUrlOrId: "Link lub ID notatnika:",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... lub ID",
    labelName: "Nazwa notatnika:",
    placeholderName: "np. Psychologia wychowawcza",
    checkboxSetDefault: "Ustaw jako notatnik domyślny",
    btnCancel: "Anuluj",
    btnSave: "Zapisz",
    btnChecking: "⏳ Pobieranie...",
    btnValidId: "✓ Prawidłowe ID: {id}",
    btnInvalidId: "⚠️ Nieprawidłowy format ID",
    editModalTitle: "Edytuj notatnik",
    deleteModalTitle: "Usunąć notatnik?",
    deleteModalDesc: "Czy na pewno chcesz usunąć notatnik „{name}”? Wszystkie przypisane do niego reguły również zostaną skasowane.",
    btnDeleteConfirm: "Usuń notatnik",
    suggestModalTitle: "Wybierz notatnik dla „{file}”",
    suggestModalDesc: "Ta notatka nie ma jeszcze przypisanego notatnika. Wybierz, do którego notesu chcesz skierować pytanie:",
    suggestCheckboxSave: "Zapisz to przypisanie na stałe dla folderu: {folder}",
    btnOpenAndSend: "Otwórz i wyślij"
  },
  de: {
    navOpenInBrowser: "Im Browser öffnen",
    navRefreshPage: "Seite neu laden",
    navPluginSettings: "Plugin-Einstellungen",
    navBuyCoffee: "Kauf mir einen Kaffee",
    navNoNotebooks: "Keine Notizbücher hinzugefügt",

    cmdOpenNotebookLMSidebar: "NotebookLM: Seitenleiste öffnen",
    cmdOpenGeminiSidebar: "Gemini: Seitenleiste öffnen",
    cmdSendSelectionNotebookLM: "NotebookLM: Auswahl an Seitenleiste senden",
    cmdSendSelectionGemini: "Gemini: Auswahl an Gemini in der Seitenleiste senden",
    cmdSearchGoogle: "Google: Auswahl im externen Browser suchen",

    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Google Suche",

    noticeNoText: "Bitte wähle Text zum Senden aus.",
    noticeNoTextSearch: "Bitte wähle Text zum Suchen aus.",
    noticeAddNotebookFirst: "Bitte füge zuerst ein Notizbuch im Tab „NotebookLM” hinzu!",
    noticeCopiedAndOpened: "📋 „{name}” kopiert und in der Seitenleiste geöffnet!",
    noticeOpenedInSidebar: "📓 Öffne „{name}” in der Seitenleiste...",
    noticeGeminiSending: "✨ Frage wird an Gemini in der Seitenleiste gesendet...",
    noticeNoNotebooksToCheck: "Keine Notizbücher zum Überprüfen vorhanden.",
    noticeAllNotebooksActive: "✅ Alle Notizbücher ({count}) sind aktiv!",
    noticeSomeNotebooksUnavailable: "⚠️ {invalidCount} von {checkedCount} Notizbüchern sind nicht verfügbar.",
    noticeAutoRemoved: "🗑️ {count} nicht verfügbare Notizbücher automatisch entfernt.",
    noticeEnterNotebookName: "Bitte gib einen Namen für das Notizbuch ein!",
    noticeInvalidUrlOrId: "Ungültige URL oder Notizbuch-ID!",
    noticeNotebookAdded: "✅ Notizbuch hinzugefügt: „{name}”",
    noticeNotebookUpdated: "✅ Notizbuch aktualisiert: „{name}”",
    noticeAutoScanFound: "⚡ {count} Ordner automatisch mit Notizbüchern verknüpft!",
    noticeAutoScanNone: "Keine passenden Ordner für Notizbücher gefunden.",
    noticeSelectFolderOrNote: "Bitte wähle einen Ordner oder eine Notiz aus!",
    noticeSelectNotebook: "Bitte wähle ein NotebookLM-Notizbuch aus!",
    noticeRuleExists: "Eine Verknüpfungsregel für diesen Pfad existiert bereits!",
    noticeRuleAdded: "✅ Verknüpfungsregel erfolgreich erstellt!",

    mobileViewTitle: "Nur Desktop-Webview",
    mobileViewDesc: "Eingebettete Webview-Panels sind nur auf dem Desktop verfügbar. Tippe unten, um im Browser zu öffnen.",
    openInBrowser: "Im Browser öffnen",

    tabAbout: "Über",
    tabNotebookLM: "NotebookLM",
    tabMappings: "Notiz-Zuordnungen",
    tabSettings: "Einstellungen",

    heroTitle: "AI Bridge — NotebookLM & Gemini",
    heroAuthor: "Autor: Cesemess",
    heroDesc: "Nahtlose Brücke zwischen deinen Obsidian-Notizen und den offiziellen Google NotebookLM- und Gemini-Umgebungen.",
    qsTitle: "Schnellstart — Wie fange ich an?",
    qsStep1Title: "Notizbuch hinzufügen: ",
    qsStep1Desc: "Klicke im Tab „NotebookLM” auf „Notizbuch hinzufügen” und füge den Link aus deinem Browser ein. Das Plugin erkennt die ID und lässt dich einen Namen vergeben.",
    qsStep2Title: "Fach oder Ordner zuweisen: ",
    qsStep2Desc: "Wähle im Tab „Notiz-Zuordnungen”, welcher Ordner oder welche Notiz in Obsidian dieses Notizbuch öffnen soll (oder nutze die automatische Erkennung).",
    qsStep3Title: "Text markieren & per Rechtsklick fragen: ",
    qsStep3Desc: "Markiere Text in einer beliebigen Notiz, klicke mit der rechten Maustaste und wähle „📓 NotebookLM” — die Frage wird direkt an deine Seitenleiste gesendet.",

    langSelectName: "Oberflächensprache",
    langSelectDesc: "Wähle die Anzeigesprache für das Plugin.",
    langAuto: "Automatisch (System)",

    guideTitle: "Funktionsweise von AI Bridge & Best Practices",
    guideBridgeTitle: "Das Plugin ist ausschließlich eine Brücke",
    guideBridgeDesc: "Das Plugin generiert selbst keine Antworten und nutzt keine Drittanbieter-APIs. Seine einzige Aufgabe ist es, deine Fragen aus Obsidian direkt in deinen offiziellen Google NotebookLM (und Gemini) Arbeitsbereich in der Seitenleiste weiterzuleiten.",
    guideQualityTitle: "Ergebnisse hängen direkt von deinen Notizbuch-Quellen ab",
    guideQualityDesc: "NotebookLM stützt 100% seiner Antworten auf deine hochgeladenen Quellen (RAG). Ein leeres Notizbuch liefert vage Antworten, während ein gut gepflegtes Notizbuch präzise Antworten mit genauen Seitenzitaten liefert.",
    guidePracticeTitle: "Best Practice: Ein eigenes Notizbuch pro Thema",
    guidePracticeDesc: "Erstelle in NotebookLM ein eigenes Notizbuch für jedes Fach oder Thema (z. B. „Pädagogische Psychologie”, „Statistik”) und lade umfassende Quellen hoch:",
    guideBullet1: "📚 Bücher & Fachartikel: Offizielle Lehrbücher, Vorlesungsunterlagen und Forschungsarbeiten (PDF)",
    guideBullet2: "📑 Präsentationen: Vorlesungsfolien, Handouts und Seminarnotizen",
    guideBullet3: "🎙️ Transkripte: Audio-/Video-Vorlesungstranskripte und Seminaraufzeichnungen",
    guideCalloutTitle: "In der Praxis: ",
    guideCalloutText: "Wenn du in Obsidian lernst, markiere einen unklaren Begriff und erhalte eine fundierte Antwort basierend auf deinem Kursmaterial — ohne Halluzinationen, ohne Rätselraten.",

    coffeeBannerText: "Gefällt dir das Plugin? Spendier mir einen Kaffee!",
    coffeeBannerSubtext: " Unterstütze Weiterentwicklung und Wartung.",
    coffeeBannerBtn: "Kauf mir einen Kaffee",
    supportTitle: "Projekt unterstützen",
    supportDesc: "Dieses Plugin ist komplett kostenlos und quelloffen. Wenn es dir beim Lernen und Arbeiten in Obsidian hilft, ist ein Kaffee eine tolle Möglichkeit, Danke zu sagen!",
    supportBtnText: "Kauf mir einen Kaffee",
    hideSupportName: "Unterstützung ausblenden",
    hideSupportDesc: "Blendet das Unterstützungsbanner oben in den Einstellungen und das Kaffeesymbol in der Kopfzeile der Seitenleiste aus.",
    linksTitle: "Über das Projekt",
    linksGithub: "GitHub-Repository",
    linksIssues: "Fehler melden oder Feature vorschlagen",

    manageNotebooksTitle: "NotebookLM-Notizbücher verwalten",
    addNotebookBtn: "Notizbuch hinzufügen",
    checkAvailabilityBtn: "Verfügbarkeit prüfen",
    startupCheckName: "Überprüfung beim Obsidian-Start",
    startupCheckDesc: "Prüft die Verfügbarkeit hinzugefügter Notizbücher beim Starten von Obsidian.",
    autoRemoveInvalidName: "Gelöschte Notizbücher automatisch entfernen",
    autoRemoveInvalidDesc: "Entfernt Notizbücher automatisch, die bei der Überprüfung einen 404-Fehler zurückgeben.",
    yourNotebooksTitle: "Deine Notizbücher ({count})",
    emptyNotebooksTitle: "Keine Notizbücher hinzugefügt",
    emptyNotebooksDesc: "Klicke auf „Notizbuch hinzufügen”, um einen Link zu deinem Google NotebookLM-Notizbuch einzufügen.",
    defaultBadge: "Standard",
    statusActive: "🟢 Aktiv",
    statusUnavailable: "🔴 Nicht verfügbar",
    statusUnverified: "⚪ Nicht überprüft",
    actionOpenInBrowser: "Im Browser öffnen",
    actionSetAsDefault: "Als Standard festlegen",
    actionIsDefault: "Standard-Notizbuch",
    actionEdit: "Bearbeiten",
    actionDelete: "Löschen",

    autoMatchTitle: "Automatische Zuordnung (Auto-Match)",
    enableAutoMatchName: "Automatische Zuordnung aktivieren",
    enableAutoMatchDesc: "Leitet Notizen automatisch an ein Notizbuch weiter, wenn der Ordner- oder Notizname mit dem Notizbuchnamen übereinstimmt.",
    scanFoldersName: "Ordner jetzt scannen und zuordnen",
    scanFoldersDesc: "Durchsucht Vault-Ordner und erstellt Zuordnungsregeln für Ordner, die Notizbuchnamen entsprechen.",
    scanFoldersBtn: "⚡ Jetzt prüfen und zuordnen",
    defaultNotebookName: "Standard-Notizbuch",
    defaultNotebookDesc: "Zuständig für alle nicht zugeordneten Notizen (lila Schrift).",
    defaultNotebookNone: "— Keines (beim Senden nachfragen) —",
    mappingRulesTitle: "Zuordnungsregeln ({count})",
    chooseFolderOrNote: "— Ordner oder Notiz wählen —",
    optgroupFolders: "📁 Ordner",
    optgroupFiles: "📄 Notizen",
    chooseNotebook: "— NotebookLM-Notizbuch wählen —",
    assignBtn: "Zuweisen",
    emptyRulesTitle: "Noch keine Zuordnungsregeln",
    emptyRulesDesc: "Wähle oben einen Ordner oder eine Notiz, wähle ein Notizbuch und klicke auf „Zuweisen”.",
    targetFolder: "Ordner",
    targetNote: "Notiz",

    contextMenuCardTitle: "Kontextmenü (Rechtsklick / Touch)",
    showNotebookLMContextMenu: "NotebookLM im Kontextmenü anzeigen",
    showGeminiContextMenu: "Gemini im Kontextmenü anzeigen",
    showGoogleContextMenu: "Google Suche im Kontextmenü anzeigen",
    behaviorCardTitle: "Aktionsverhalten & Zwischenablage",
    autoSendName: "Fragen automatisch absenden",
    autoSendDesc: "Wenn aktiviert, werden Anfragen automatisch in NotebookLM/Gemini abgesendet. Wenn deaktiviert, wird der Text nur eingefügt.",
    copyClipboardName: "Markierten Text in die Zwischenablage kopieren",
    copyClipboardDesc: "Kopiert den markierten Text beim Öffnen von NotebookLM oder Gemini in die Zwischenablage.",
    showNoticeName: "Aktionsbenachrichtigungen anzeigen",
    showNoticeDesc: "Zeigt kurze Toast-Benachrichtigungen an, wenn Aktionen ausgelöst werden.",
    searchCardTitle: "Google Suche",
    googleSearchUrlName: "Such-URL-Vorlage",
    googleSearchUrlDesc: "URL-Vorlage für die Websuche. Verwende {query} als Platzhalter.",
    sidebarHeaderCardTitle: "Seitenleisten-Kopfzeile",
    hideNotebookLMHeaderName: "Oberen Google-Balken in NotebookLM ausblenden",
    hideNotebookLMHeaderDesc: "Blendet die Google-Kopfzeile mit Logo und Konto-Icons aus, um mehr Platz für Notizen und Chat zu schaffen.",
    hotkeysCardTitle: "Hotkeys",
    hotkeysConfigName: "Hotkeys konfigurieren",
    hotkeysConfigDesc: "Tastatur-Kurzbefehle für NotebookLM, Gemini und Google in den Obsidian-Einstellungen zuweisen.",
    hotkeysOpenBtn: "Obsidian-Hotkeys öffnen",

    addModalTitle: "NotebookLM-Notizbuch hinzufügen",
    addModalDesc: "Füge den Link aus deinem Browser oder die Notizbuch-ID ein. Das Plugin erkennt die ID automatisch und schlägt den Titel vor.",
    labelUrlOrId: "Link oder Notizbuch-ID:",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... oder ID",
    labelName: "Notizbuch-Name:",
    placeholderName: "z. B. Pädagogische Psychologie",
    checkboxSetDefault: "Als Standard-Notizbuch festlegen",
    btnCancel: "Abbrechen",
    btnSave: "Speichern",
    btnChecking: "⏳ Überprüfung...",
    btnValidId: "✓ Gültige ID: {id}",
    btnInvalidId: "⚠️ Ungültiges ID-Format",
    editModalTitle: "Notizbuch bearbeiten",
    deleteModalTitle: "Notizbuch löschen?",
    deleteModalDesc: "Möchtest du „{name}” wirklich löschen? Alle Verknüpfungsregeln für dieses Notizbuch werden ebenfalls entfernt.",
    btnDeleteConfirm: "Notizbuch löschen",
    suggestModalTitle: "Notizbuch für „{file}” wählen",
    suggestModalDesc: "Diese Notiz hat noch kein zugewiesenes Notizbuch. Wähle, wohin die Frage gesendet werden soll:",
    suggestCheckboxSave: "Diese Zuweisung dauerhaft für Ordner speichern: {folder}",
    btnOpenAndSend: "Öffnen & Senden"
  },
  es: {
    navOpenInBrowser: "Abrir en el navegador",
    navRefreshPage: "Recargar página",
    navPluginSettings: "Ajustes del plugin",
    navBuyCoffee: "Cómprame un café",
    navNoNotebooks: "No hay cuadernos añadidos",

    cmdOpenNotebookLMSidebar: "NotebookLM: Abrir panel lateral",
    cmdOpenGeminiSidebar: "Gemini: Abrir panel lateral",
    cmdSendSelectionNotebookLM: "NotebookLM: Enviar selección al panel lateral",
    cmdSendSelectionGemini: "Gemini: Enviar selección a Gemini en el panel lateral",
    cmdSearchGoogle: "Google: Buscar selección en el navegador externo",

    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Búsqueda en Google",

    noticeNoText: "Por favor, selecciona texto para enviar.",
    noticeNoTextSearch: "Por favor, selecciona texto para buscar.",
    noticeAddNotebookFirst: "¡Añade primero un cuaderno en la pestaña „NotebookLM”!",
    noticeCopiedAndOpened: "📋 ¡Copiado y abierto „{name}” en el panel lateral!",
    noticeOpenedInSidebar: "📓 Abriendo „{name}” en el panel lateral...",
    noticeGeminiSending: "✨ Enviando consulta a Gemini en el panel lateral...",
    noticeNoNotebooksToCheck: "No hay cuadernos añadidos para verificar.",
    noticeAllNotebooksActive: "✅ ¡Todos los cuadernos ({count}) están activos!",
    noticeSomeNotebooksUnavailable: "⚠️ Se encontraron {invalidCount} cuadernos no disponibles de {checkedCount}.",
    noticeAutoRemoved: "🗑️ Eliminados automáticamente {count} cuadernos no disponibles.",
    noticeEnterNotebookName: "¡Por favor, introduce un nombre para el cuaderno!",
    noticeInvalidUrlOrId: "¡URL o ID de cuaderno no válido!",
    noticeNotebookAdded: "✅ Cuaderno añadido: „{name}”",
    noticeNotebookUpdated: "✅ Cuaderno actualizado: „{name}”",
    noticeAutoScanFound: "⚡ ¡Se asignaron automáticamente {count} carpetas a cuadernos!",
    noticeAutoScanNone: "No se encontraron carpetas coincidentes con cuadernos.",
    noticeSelectFolderOrNote: "¡Por favor, selecciona una carpeta o nota!",
    noticeSelectNotebook: "¡Por favor, selecciona un cuaderno de NotebookLM!",
    noticeRuleExists: "¡Ya existe una regla de asignación para esta ruta!",
    noticeRuleAdded: "✅ ¡Regla de asignación creada!",

    mobileViewTitle: "Solo Webview de escritorio",
    mobileViewDesc: "Los paneles incrustados mediante Webview solo están disponibles en escritorio. Toca abajo para abrir en el navegador.",
    openInBrowser: "Abrir en el navegador",

    tabAbout: "Acerca de",
    tabNotebookLM: "NotebookLM",
    tabMappings: "Asignaciones",
    tabSettings: "Ajustes",

    heroTitle: "AI Bridge — NotebookLM & Gemini",
    heroAuthor: "Autor: Cesemess",
    heroDesc: "Puente fluido entre tus notas de Obsidian y los entornos oficiales de Google NotebookLM y Gemini.",
    qsTitle: "Inicio rápido — ¿Cómo empezar?",
    qsStep1Title: "Añade tu cuaderno: ",
    qsStep1Desc: "En la pestaña „NotebookLM”, haz clic en „Añadir cuaderno” y pega el enlace desde tu navegador. El plugin extraerá el ID y te permitirá nombrarlo.",
    qsStep2Title: "Asigna a una materia o carpeta: ",
    qsStep2Desc: "En la pestaña „Asignaciones”, elige qué carpeta o nota de Obsidian abre este cuaderno (o usa la asignación automática).",
    qsStep3Title: "Selecciona texto y pregunta con clic derecho: ",
    qsStep3Desc: "En cualquier nota, selecciona texto, haz clic derecho y elige „📓 NotebookLM”: la pregunta se enviará directamente a tu panel lateral.",

    langSelectName: "Idioma de la interfaz",
    langSelectDesc: "Elige el idioma de visualización del plugin.",
    langAuto: "Automático (sistema)",

    guideTitle: "Cómo funciona AI Bridge y mejores prácticas",
    guideBridgeTitle: "El plugin es estrictamente un Puente",
    guideBridgeDesc: "El plugin no genera respuestas por sí mismo ni utiliza APIs de terceros. Su único propósito es enviar al instante tus preguntas desde Obsidian a tu espacio oficial de Google NotebookLM (y Gemini) en el panel lateral.",
    guideQualityTitle: "Los resultados dependen directamente de tus fuentes",
    guideQualityDesc: "NotebookLM basa el 100% de sus respuestas en tus materiales subidos (RAG). Un cuaderno vacío da respuestas genéricas, mientras que uno bien documentado ofrece respuestas exactas con citas de páginas.",
    guidePracticeTitle: "Mejor práctica: un cuaderno por cada materia",
    guidePracticeDesc: "Crea un cuaderno exclusivo en NotebookLM para cada asignatura o tema (ej. „Psicología Educativa”, „Estadística”) y sube fuentes completas:",
    guideBullet1: "📚 Libros y artículos: libros de texto oficiales, apuntes y artículos científicos (PDF)",
    guideBullet2: "📑 Presentaciones: diapositivas de clase, presentaciones y resúmenes",
    guideBullet3: "🎙️ Transcripciones: transcripciones de conferencias y grabaciones de audio/vídeo",
    guideCalloutTitle: "En la práctica: ",
    guideCalloutText: "Al estudiar en Obsidian, selecciona cualquier término dudoso y obtén una respuesta fundada en tu material de estudio — sin alucinaciones ni conjeturas.",

    coffeeBannerText: "¿Te gusta el plugin? ¡Cómprame un café!",
    coffeeBannerSubtext: " Apoya el desarrollo y mantenimiento.",
    coffeeBannerBtn: "Cómprame un café",
    supportTitle: "Apoyar el proyecto",
    supportDesc: "Este plugin es completamente gratuito y de código abierto. Si te ayuda a estudiar y trabajar en Obsidian, invitar a un café es una gran forma de agradecer y apoyar futuras mejoras.",
    supportBtnText: "Cómprame un café",
    hideSupportName: "Ocultar apoyo",
    hideSupportDesc: "Oculta la barra de apoyo superior en los ajustes y el icono de café en la cabecera del panel lateral.",
    linksTitle: "Acerca del proyecto",
    linksGithub: "Repositorio en GitHub",
    linksIssues: "Reportar error o sugerir función",

    manageNotebooksTitle: "Gestionar cuadernos de NotebookLM",
    addNotebookBtn: "Añadir cuaderno",
    checkAvailabilityBtn: "Comprobar disponibilidad",
    startupCheckName: "Verificación al iniciar Obsidian",
    startupCheckDesc: "Comprueba la disponibilidad de los cuadernos añadidos al iniciar Obsidian.",
    autoRemoveInvalidName: "Eliminar cuadernos borrados automáticamente",
    autoRemoveInvalidDesc: "Elimina de forma automática los cuadernos que devuelven error 404 durante la verificación.",
    yourNotebooksTitle: "Tus cuadernos ({count})",
    emptyNotebooksTitle: "No hay cuadernos añadidos",
    emptyNotebooksDesc: "Haz clic en „Añadir cuaderno” para pegar el enlace a tu cuaderno de Google NotebookLM.",
    defaultBadge: "Predeterminado",
    statusActive: "🟢 Activo",
    statusUnavailable: "🔴 No disponible",
    statusUnverified: "⚪ Sin verificar",
    actionOpenInBrowser: "Abrir en el navegador",
    actionSetAsDefault: "Establecer como predeterminado",
    actionIsDefault: "Cuaderno predeterminado",
    actionEdit: "Editar",
    actionDelete: "Eliminar",

    autoMatchTitle: "Coincidencia automática (Auto-Match)",
    enableAutoMatchName: "Activar coincidencia automática",
    enableAutoMatchDesc: "Dirige automáticamente las notas a un cuaderno si el nombre de la carpeta o nota coincide con el cuaderno.",
    scanFoldersName: "Escanear carpetas y asociar ahora",
    scanFoldersDesc: "Escanea las carpetas de la bóveda y crea reglas para las carpetas que coincidan con nombres de cuadernos.",
    scanFoldersBtn: "⚡ Comprobar y asociar ahora",
    defaultNotebookName: "Cuaderno predeterminado",
    defaultNotebookDesc: "Gestiona todas las notas no asignadas (mostrado con fuente morada).",
    defaultNotebookNone: "— Ninguno (preguntar al enviar) —",
    mappingRulesTitle: "Reglas de asignación ({count})",
    chooseFolderOrNote: "— Elegir carpeta o nota —",
    optgroupFolders: "📁 Carpetas",
    optgroupFiles: "📄 Notas",
    chooseNotebook: "— Elegir cuaderno de NotebookLM —",
    assignBtn: "Asignar",
    emptyRulesTitle: "Aún no hay reglas de asignación",
    emptyRulesDesc: "Selecciona una carpeta o nota arriba, elige un cuaderno y haz clic en „Asignar”.",
    targetFolder: "Carpeta",
    targetNote: "Nota",

    contextMenuCardTitle: "Menú contextual (Clic derecho / Táctil)",
    showNotebookLMContextMenu: "Mostrar NotebookLM en menú contextual",
    showGeminiContextMenu: "Mostrar Gemini en menú contextual",
    showGoogleContextMenu: "Mostrar Búsqueda en Google en menú contextual",
    behaviorCardTitle: "Comportamiento de acciones y portapapeles",
    autoSendName: "Enviar consultas automáticamente",
    autoSendDesc: "Al activarlo, las consultas se envían automáticamente en NotebookLM/Gemini. Al desactivarlo, el texto solo se pega en el chat.",
    copyClipboardName: "Copiar texto seleccionado al portapapeles",
    copyClipboardDesc: "Copia el texto seleccionado al portapapeles al abrir NotebookLM o Gemini.",
    showNoticeName: "Mostrar notificaciones de acción",
    showNoticeDesc: "Muestra avisos breves en pantalla cuando se ejecutan las acciones.",
    searchCardTitle: "Búsqueda en Google",
    googleSearchUrlName: "Plantilla de URL de búsqueda",
    googleSearchUrlDesc: "Plantilla de URL para búsquedas web. Usa {query} como marcador de posición.",
    sidebarHeaderCardTitle: "Cabecera de la barra lateral",
    hideNotebookLMHeaderName: "Ocultar barra superior de Google en NotebookLM",
    hideNotebookLMHeaderDesc: "Oculta la cabecera de Google con el logotipo y la cuenta para maximizar el espacio de lectura y chat.",
    hotkeysCardTitle: "Atajos de teclado",
    hotkeysConfigName: "Configurar atajos",
    hotkeysConfigDesc: "Asigna combinaciones de teclas para NotebookLM, Gemini y Google en los ajustes de Obsidian.",
    hotkeysOpenBtn: "Abrir atajos de Obsidian",

    addModalTitle: "Añadir cuaderno de NotebookLM",
    addModalDesc: "Pega el enlace del navegador o el ID del cuaderno. El plugin extraerá el ID automáticamente y sugerirá el título.",
    labelUrlOrId: "Enlace o ID de cuaderno:",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... o ID",
    labelName: "Nombre del cuaderno:",
    placeholderName: "ej. Psicología Educativa",
    checkboxSetDefault: "Establecer como cuaderno predeterminado",
    btnCancel: "Cancelar",
    btnSave: "Guardar",
    btnChecking: "⏳ Verificando...",
    btnValidId: "✓ ID válido: {id}",
    btnInvalidId: "⚠️ Formato de ID no válido",
    editModalTitle: "Editar cuaderno",
    deleteModalTitle: "¿Eliminar cuaderno?",
    deleteModalDesc: "¿Seguro que deseas eliminar „{name}”? Se eliminarán también todas las reglas asociadas a este cuaderno.",
    btnDeleteConfirm: "Eliminar cuaderno",
    suggestModalTitle: "Elegir cuaderno para „{file}”",
    suggestModalDesc: "Esta nota aún no tiene un cuaderno asignado. Elige a dónde enviar tu consulta:",
    suggestCheckboxSave: "Guardar esta asignación de forma permanente para la carpeta: {folder}",
    btnOpenAndSend: "Abrir y enviar"
  },
  fr: {
    navOpenInBrowser: "Ouvrir dans le navigateur",
    navRefreshPage: "Actualiser la page",
    navPluginSettings: "Paramètres du plugin",
    navBuyCoffee: "M'offrir un café",
    navNoNotebooks: "Aucun carnet ajouté",

    cmdOpenNotebookLMSidebar: "NotebookLM : Ouvrir le panneau latéral",
    cmdOpenGeminiSidebar: "Gemini : Ouvrir le panneau latéral",
    cmdSendSelectionNotebookLM: "NotebookLM : Envoyer la sélection au panneau latéral",
    cmdSendSelectionGemini: "Gemini : Envoyer la sélection à Gemini dans le panneau latéral",
    cmdSearchGoogle: "Google : Rechercher la sélection dans le navigateur externe",

    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Recherche Google",

    noticeNoText: "Veuillez sélectionner du texte à envoyer.",
    noticeNoTextSearch: "Veuillez sélectionner du texte à rechercher.",
    noticeAddNotebookFirst: "Veuillez d'abord ajouter un carnet dans l'onglet „NotebookLM” !",
    noticeCopiedAndOpened: "📋 „{name}” copié et ouvert dans le panneau latéral !",
    noticeOpenedInSidebar: "📓 Ouverture de „{name}” dans le panneau latéral...",
    noticeGeminiSending: "✨ Envoi de la requête à Gemini dans le panneau latéral...",
    noticeNoNotebooksToCheck: "Aucun carnet à vérifier.",
    noticeAllNotebooksActive: "✅ Tous les carnets ({count}) sont actifs !",
    noticeSomeNotebooksUnavailable: "⚠️ {invalidCount} carnets indisponibles sur {checkedCount}.",
    noticeAutoRemoved: "🗑️ {count} carnets indisponibles supprimés automatiquement.",
    noticeEnterNotebookName: "Veuillez entrer un nom pour le carnet !",
    noticeInvalidUrlOrId: "URL ou identifiant de carnet invalide !",
    noticeNotebookAdded: "✅ Carnet ajouté : „{name}”",
    noticeNotebookUpdated: "✅ Carnet mis à jour : „{name}”",
    noticeAutoScanFound: "⚡ {count} dossiers associés automatiquement aux carnets !",
    noticeAutoScanNone: "Aucun dossier correspondant aux carnets trouvé.",
    noticeSelectFolderOrNote: "Veuillez sélectionner un dossier ou une note !",
    noticeSelectNotebook: "Veuillez sélectionner un carnet NotebookLM !",
    noticeRuleExists: "Une règle de mappage existe déjà pour ce chemin !",
    noticeRuleAdded: "✅ Règle de mappage créée avec succès !",

    mobileViewTitle: "Webview de bureau uniquement",
    mobileViewDesc: "Les panneaux Webview intégrés ne sont disponibles que sur ordinateur. Appuyez ci-dessous pour ouvrir dans le navigateur.",
    openInBrowser: "Ouvrir dans le navigateur",

    tabAbout: "À propos",
    tabNotebookLM: "NotebookLM",
    tabMappings: "Mappage de notes",
    tabSettings: "Paramètres",

    heroTitle: "AI Bridge — NotebookLM & Gemini",
    heroAuthor: "Auteur : Cesemess",
    heroDesc: "Pont fluide reliant vos notes Obsidian aux environnements officiels Google NotebookLM et Gemini.",
    qsTitle: "Démarrage rapide — Comment débuter ?",
    qsStep1Title: "Ajoutez votre carnet : ",
    qsStep1Desc: "Dans l'onglet „NotebookLM”, cliquez sur „Ajouter un carnet” et collez le lien de votre navigateur. Le plugin extrait l'ID et vous permet de le nommer.",
    qsStep2Title: "Associez à une matière ou un dossier : ",
    qsStep2Desc: "Dans l'onglet „Mappage de notes”, choisissez quel dossier ou note dans Obsidian ouvre ce carnet (ou utilisez la correspondance automatique).",
    qsStep3Title: "Sélectionnez du texte et posez votre question via clic droit : ",
    qsStep3Desc: "Dans n'importe quelle note, sélectionnez du texte, faites un clic droit et choisissez „📓 NotebookLM” — la question est envoyée directement dans la barre latérale.",

    langSelectName: "Langue de l'interface",
    langSelectDesc: "Choisissez la langue d'affichage du plugin.",
    langAuto: "Automatique (système)",

    guideTitle: "Fonctionnement d'AI Bridge & bonnes pratiques",
    guideBridgeTitle: "Le plugin est strictement une passerelle (Bridge)",
    guideBridgeDesc: "Le plugin ne génère pas de réponses lui-même et n'utilise aucune API tierce. Son unique but est d'acheminer instantanément vos questions depuis Obsidian vers votre espace officiel Google NotebookLM (et Gemini) dans le panneau latéral.",
    guideQualityTitle: "Les résultats dépendent directement de vos sources",
    guideQualityDesc: "NotebookLM fonde 100 % de ses réponses sur les documents que vous y téléchargez (RAG). Un carnet vide produit des réponses vagues, tandis qu'un carnet bien documenté fournit des réponses précises avec citations exactes.",
    guidePracticeTitle: "Bonne pratique : un carnet dédié par matière",
    guidePracticeDesc: "Créez un carnet distinct dans NotebookLM pour chaque matière ou projet (ex. „Psychologie de l'éducation”, „Statistiques”) et importez des sources complètes :",
    guideBullet1: "📚 Livres et articles : manuels de cours officiels, publications et articles de recherche (PDF)",
    guideBullet2: "📑 Présentations : diapositives de cours, polycopiés et résumés",
    guideBullet3: "🎙️ Transcriptions : transcriptions audio/vidéo des cours et enregistrements",
    guideCalloutTitle: "En pratique : ",
    guideCalloutText: "En révisant dans Obsidian, sélectionnez un concept flou et obtenez une réponse étayée par votre propre cours — sans hallucinations, sans approximations.",

    coffeeBannerText: "Vous aimez le plugin ? Offrez-moi un café !",
    coffeeBannerSubtext: " Soutenez le développement et la maintenance.",
    coffeeBannerBtn: "M'offrir un café",
    supportTitle: "Soutenir le projet",
    supportDesc: "Ce plugin est entièrement gratuit et open source. S'il améliore vos révisions et votre travail dans Obsidian, offrir un café est une excellente façon de remercier l'auteur et de soutenir les futures évolutions !",
    supportBtnText: "M'offrir un café",
    hideSupportName: "Masquer le soutien",
    hideSupportDesc: "Masque le bandeau de soutien en haut des paramètres ainsi que l'icône de tasse de café dans l'en-tête de la barre latérale.",
    linksTitle: "À propos du projet",
    linksGithub: "Dépôt GitHub",
    linksIssues: "Signaler un bug ou suggérer une idée",

    manageNotebooksTitle: "Gérer les carnets NotebookLM",
    addNotebookBtn: "Ajouter un carnet",
    checkAvailabilityBtn: "Vérifier la disponibilité",
    startupCheckName: "Vérification au démarrage d'Obsidian",
    startupCheckDesc: "Vérifie la disponibilité des carnets ajoutés au lancement d'Obsidian.",
    autoRemoveInvalidName: "Supprimer automatiquement les carnets inexistants",
    autoRemoveInvalidDesc: "Supprime automatiquement les carnets qui renvoient une erreur 404 lors de la vérification.",
    yourNotebooksTitle: "Vos carnets ({count})",
    emptyNotebooksTitle: "Aucun carnet ajouté",
    emptyNotebooksDesc: "Cliquez sur „Ajouter un carnet” pour coller le lien de votre carnet Google NotebookLM.",
    defaultBadge: "Par défaut",
    statusActive: "🟢 Actif",
    statusUnavailable: "🔴 Indisponible",
    statusUnverified: "⚪ Non vérifié",
    actionOpenInBrowser: "Ouvrir dans le navigateur",
    actionSetAsDefault: "Définir par défaut",
    actionIsDefault: "Carnet par défaut",
    actionEdit: "Modifier",
    actionDelete: "Supprimer",

    autoMatchTitle: "Correspondance automatique (Auto-Match)",
    enableAutoMatchName: "Activer la correspondance automatique",
    enableAutoMatchDesc: "Achemine automatiquement les notes vers un carnet si le nom du dossier ou de la note correspond au carnet.",
    scanFoldersName: "Analyser les dossiers et associer maintenant",
    scanFoldersDesc: "Parcourt les dossiers du coffre et crée des règles de mappage pour les dossiers correspondant aux noms des carnets.",
    scanFoldersBtn: "⚡ Vérifier et associer maintenant",
    defaultNotebookName: "Carnet par défaut",
    defaultNotebookDesc: "Prend en charge toutes les notes non associées (affichées en violet).",
    defaultNotebookNone: "— Aucun (demander lors de l'envoi) —",
    mappingRulesTitle: "Règles de mappage ({count})",
    chooseFolderOrNote: "— Choisir un dossier ou une note —",
    optgroupFolders: "📁 Dossiers",
    optgroupFiles: "📄 Notes",
    chooseNotebook: "— Choisir un carnet NotebookLM —",
    assignBtn: "Associer",
    emptyRulesTitle: "Aucune règle de mappage",
    emptyRulesDesc: "Sélectionnez un dossier ou une note ci-dessus, choisissez un carnet et cliquez sur „Associer”.",
    targetFolder: "Dossier",
    targetNote: "Note",

    contextMenuCardTitle: "Menu contextuel (Clic droit / Tactile)",
    showNotebookLMContextMenu: "Afficher NotebookLM dans le menu contextuel",
    showGeminiContextMenu: "Afficher Gemini dans le menu contextuel",
    showGoogleContextMenu: "Afficher Recherche Google dans le menu contextuel",
    behaviorCardTitle: "Comportement des actions et presse-papiers",
    autoSendName: "Envoyer les requêtes automatiquement",
    autoSendDesc: "Si activé, les requêtes sont directement envoyées dans NotebookLM/Gemini. Si désactivé, le texte est simplement collé dans le champ de saisie.",
    copyClipboardName: "Copier la sélection dans le presse-papiers",
    copyClipboardDesc: "Copie le texte sélectionné dans le presse-papiers système lors de l'ouverture de NotebookLM ou Gemini.",
    showNoticeName: "Afficher les notifications d'action",
    showNoticeDesc: "Affiche de brèves notifications à l'écran lors du déclenchement des actions.",
    searchCardTitle: "Recherche Google",
    googleSearchUrlName: "Modèle d'URL de recherche",
    googleSearchUrlDesc: "Modèle d'URL utilisé pour la recherche web. Utilisez {query} comme variable.",
    sidebarHeaderCardTitle: "En-tête de la barre latérale",
    hideNotebookLMHeaderName: "Masquer la barre supérieure Google dans NotebookLM",
    hideNotebookLMHeaderDesc: "Masque l'en-tête Google avec logo et compte afin de maximiser l'espace pour les notes et le chat.",
    hotkeysCardTitle: "Raccourcis clavier",
    hotkeysConfigName: "Configurer les raccourcis",
    hotkeysConfigDesc: "Attribuer des raccourcis clavier pour NotebookLM, Gemini et Google dans les paramètres d'Obsidian.",
    hotkeysOpenBtn: "Ouvrir les raccourcis Obsidian",

    addModalTitle: "Ajouter un carnet NotebookLM",
    addModalDesc: "Collez le lien depuis votre navigateur ou l'identifiant du carnet. Le plugin extrait automatiquement l'ID et suggère le titre.",
    labelUrlOrId: "Lien ou identifiant du carnet :",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... ou ID",
    labelName: "Nom du carnet :",
    placeholderName: "ex. Psychologie de l'éducation",
    checkboxSetDefault: "Définir comme carnet par défaut",
    btnCancel: "Annuler",
    btnSave: "Enregistrer",
    btnChecking: "⏳ Vérification...",
    btnValidId: "✓ ID valide : {id}",
    btnInvalidId: "⚠️ Format d'ID invalide",
    editModalTitle: "Modifier le carnet",
    deleteModalTitle: "Supprimer le carnet ?",
    deleteModalDesc: "Voulez-vous vraiment supprimer „{name}” ? Toutes les règles de mappage associées à ce carnet seront également supprimées.",
    btnDeleteConfirm: "Supprimer le carnet",
    suggestModalTitle: "Choisir un carnet pour „{file}”",
    suggestModalDesc: "Cette note n'a pas encore de carnet assigné. Choisissez où envoyer votre question :",
    suggestCheckboxSave: "Enregistrer définitivement cette attribution pour le dossier : {folder}",
    btnOpenAndSend: "Ouvrir & Envoyer"
  },
  zh: {
    navOpenInBrowser: "在浏览器中打开",
    navRefreshPage: "刷新页面",
    navPluginSettings: "插件设置",
    navBuyCoffee: "请我喝杯咖啡",
    navNoNotebooks: "未添加笔记本",

    cmdOpenNotebookLMSidebar: "NotebookLM：打开侧边栏面板",
    cmdOpenGeminiSidebar: "Gemini：打开侧边栏面板",
    cmdSendSelectionNotebookLM: "NotebookLM：发送选中文本至侧边栏",
    cmdSendSelectionGemini: "Gemini：发送选中文本至侧边栏 Gemini",
    cmdSearchGoogle: "Google：在外部浏览器中搜索选中文本",

    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Google 搜索",

    noticeNoText: "请先选择要发送的文本。",
    noticeNoTextSearch: "请先选择要搜索的文本。",
    noticeAddNotebookFirst: "请先在「NotebookLM」选项卡中添加笔记本！",
    noticeCopiedAndOpened: "📋 已复制并在侧边栏中打开「{name}」！",
    noticeOpenedInSidebar: "📓 正在侧边栏中打开「{name}」...",
    noticeGeminiSending: "✨ 正在将问题发送至侧边栏 Gemini...",
    noticeNoNotebooksToCheck: "没有需要验证的笔记本。",
    noticeAllNotebooksActive: "✅ 所有笔记本（{count} 个）均有效可用！",
    noticeSomeNotebooksUnavailable: "⚠️ 在 {checkedCount} 个笔记本中发现 {invalidCount} 个不可用。",
    noticeAutoRemoved: "🗑️ 已自动移除 {count} 个不可用的笔记本。",
    noticeEnterNotebookName: "请输入笔记本名称！",
    noticeInvalidUrlOrId: "无效的 URL 或笔记本 ID！",
    noticeNotebookAdded: "✅ 笔记本已添加：「{name}」",
    noticeNotebookUpdated: "✅ 笔记本已更新：「{name}」",
    noticeAutoScanFound: "⚡ 已自动将 {count} 个文件夹映射到笔记本！",
    noticeAutoScanNone: "未找到与笔记本名称匹配的文件夹。",
    noticeSelectFolderOrNote: "请选择文件夹或笔记！",
    noticeSelectNotebook: "请选择 NotebookLM 笔记本！",
    noticeRuleExists: "该路径的映射规则已存在！",
    noticeRuleAdded: "✅ 映射规则创建成功！",

    mobileViewTitle: "仅支持桌面端 Webview",
    mobileViewDesc: "基于 Webview 的内置面板仅在桌面端可用。请点击下方在浏览器中打开。",
    openInBrowser: "在浏览器中打开",

    tabAbout: "关于",
    tabNotebookLM: "NotebookLM",
    tabMappings: "笔记映射",
    tabSettings: "设置",

    heroTitle: "AI Bridge — NotebookLM 与 Gemini",
    heroAuthor: "作者：Cesemess",
    heroDesc: "将你的 Obsidian 笔记与官方 Google NotebookLM 和 Gemini 环境无缝连接的高速桥梁。",
    qsTitle: "快速入门 — 如何开始？",
    qsStep1Title: "添加你的笔记本：",
    qsStep1Desc: "在「NotebookLM」选项卡中，点击「添加笔记本」并粘贴浏览器中的链接。插件会自动识别 ID 并让你为它命名。",
    qsStep2Title: "绑定学科或文件夹：",
    qsStep2Desc: "在「笔记映射」选项卡中，选择 Obsidian 中的哪个文件夹或笔记打开该笔记本（或使用自动匹配）。",
    qsStep3Title: "选中文本并右键提问：",
    qsStep3Desc: "在任何笔记中选中文本，右键点击并选择「📓 NotebookLM」—— 问题将直接发送到你的侧边栏。",

    langSelectName: "界面语言",
    langSelectDesc: "选择插件的显示语言。",
    langAuto: "自动（跟随系统）",

    guideTitle: "AI Bridge 运作原理与最佳实践",
    guideBridgeTitle: "本插件严格充当桥梁（Bridge）",
    guideBridgeDesc: "插件本身不生成回答，也不使用第三方中转 API。它的唯一作用是将你的问题从 Obsidian 瞬间传送到侧边栏官方 Google NotebookLM（和 Gemini）工作区。",
    guideQualityTitle: "回答质量完全取决于你上传的知识库资料",
    guideQualityDesc: "NotebookLM 100% 基于你上传的资料提供答案（RAG）。空的笔记本回答宽泛，而经过精心整理的知识库能提供极其精准且附带具体页码引用的回答。",
    guidePracticeTitle: "最佳实践：每个学科或研究独立建立笔记本",
    guidePracticeDesc: "在 NotebookLM 中为每门课程或课题（如「教育心理学」、「统计学」）单独建立笔记本，并上传全面的权威资料：",
    guideBullet1: "📚 书籍与论文：官方教材、教学大纲课件与学术论文（PDF）",
    guideBullet2: "📑 演示文稿：课堂讲义幻灯片、研讨材料与笔记",
    guideBullet3: "🎙️ 逐字稿：音视频讲座逐字稿与研讨会录音记录",
    guideCalloutTitle: "实际应用：",
    guideCalloutText: "在 Obsidian 中复习时，遇到任何疑惑的概念只需选中文本，即可直接获得基于你自己课程教材的权威解答——零幻觉、零猜测。",

    coffeeBannerText: "喜欢这个插件？请我喝杯咖啡吧！",
    coffeeBannerSubtext: " 支持持续开发与维护。",
    coffeeBannerBtn: "请我喝杯咖啡",
    supportTitle: "支持本项目",
    supportDesc: "本插件完全免费且开源。如果它提升了你在 Obsidian 中的学习与研究效率，请作者喝杯咖啡是对后续开发最好的鼓励！",
    supportBtnText: "请我喝杯咖啡",
    hideSupportName: "隐藏赞助栏",
    hideSupportDesc: "隐藏设置页面顶部的赞助横幅以及侧边栏顶部的咖啡杯图标。",
    linksTitle: "关于项目",
    linksGithub: "GitHub 代码仓库",
    linksIssues: "反馈问题或建议功能",

    manageNotebooksTitle: "管理 NotebookLM 笔记本",
    addNotebookBtn: "添加笔记本",
    checkAvailabilityBtn: "检查可用性",
    startupCheckName: "Obsidian 启动时检查可用性",
    startupCheckDesc: "在启动 Obsidian 时自动验证已添加笔记本的有效性。",
    autoRemoveInvalidName: "自动清理已删除的笔记本",
    autoRemoveInvalidDesc: "在验证过程中若遇到 404 错误，自动从列表中移除该笔记本。",
    yourNotebooksTitle: "你的笔记本列表（{count} 个）",
    emptyNotebooksTitle: "尚未添加笔记本",
    emptyNotebooksDesc: "点击「添加笔记本」粘贴你的 Google NotebookLM 笔记本链接。",
    defaultBadge: "默认",
    statusActive: "🟢 正常可用",
    statusUnavailable: "🔴 无法访问",
    statusUnverified: "⚪ 未验证",
    actionOpenInBrowser: "在浏览器中打开",
    actionSetAsDefault: "设为默认笔记本",
    actionIsDefault: "默认笔记本",
    actionEdit: "编辑",
    actionDelete: "删除",

    autoMatchTitle: "自动名称匹配（Auto-Match）",
    enableAutoMatchName: "启用自动匹配",
    enableAutoMatchDesc: "当文件夹或笔记名称与笔记本名称相符时，自动路由到对应笔记本。",
    scanFoldersName: "立即扫描文件夹并匹配",
    scanFoldersDesc: "遍历仓库文件夹，为名称匹配笔记本的文件夹创建映射规则。",
    scanFoldersBtn: "⚡ 立即检测并匹配",
    defaultNotebookName: "默认笔记本",
    defaultNotebookDesc: "接管所有未单独映射的笔记（以紫色字体显示）。",
    defaultNotebookNone: "— 无（未分配时弹窗询问）—",
    mappingRulesTitle: "映射规则列表（{count} 条）",
    chooseFolderOrNote: "— 选择文件夹或笔记 —",
    optgroupFolders: "📁 文件夹",
    optgroupFiles: "📄 笔记文件",
    chooseNotebook: "— 选择 NotebookLM 笔记本 —",
    assignBtn: "关联映射",
    emptyRulesTitle: "暂无映射规则",
    emptyRulesDesc: "在上方选择文件夹或笔记，挑选目标笔记本后点击「关联映射」。",
    targetFolder: "文件夹",
    targetNote: "笔记",

    contextMenuCardTitle: "右键菜单配置（Context Menu）",
    showNotebookLMContextMenu: "在右键菜单中显示 NotebookLM",
    showGeminiContextMenu: "在右键菜单中显示 Gemini",
    showGoogleContextMenu: "在右键菜单中显示 Google 搜索",
    behaviorCardTitle: "交互行为与剪贴板",
    autoSendName: "自动提交发送问题",
    autoSendDesc: "启用后，选中内容会自动提交至 NotebookLM/Gemini。关闭时，文本仅粘贴进输入框而不自动回车。",
    copyClipboardName: "自动复制选中文本至剪贴板",
    copyClipboardDesc: "打开 NotebookLM 或 Gemini 时，自动将选中文本复制到系统剪贴板。",
    showNoticeName: "显示操作通知提示",
    showNoticeDesc: "触发操作时在屏幕右上角显示短暂的提示气泡。",
    searchCardTitle: "Google 网页搜索",
    googleSearchUrlName: "搜索 URL 模板",
    googleSearchUrlDesc: "用于网页搜索的 URL 模板。使用 {query} 作为查询内容占位符。",
    sidebarHeaderCardTitle: "侧边栏顶栏样式",
    hideNotebookLMHeaderName: "隐藏 NotebookLM 顶部 Google 栏",
    hideNotebookLMHeaderDesc: "隐藏 NotebookLM 顶部的 Google 标志与账号栏，为笔记与对话留出更多屏幕空间。",
    hotkeysCardTitle: "快捷键配置",
    hotkeysConfigName: "配置快捷键",
    hotkeysConfigDesc: "在 Obsidian 设置中为 NotebookLM、Gemini 和 Google 搜索分配自定义键盘快捷键。",
    hotkeysOpenBtn: "打开 Obsidian 快捷键设置",

    addModalTitle: "添加 NotebookLM 笔记本",
    addModalDesc: "粘贴浏览器地址栏中的完整链接或笔记本 ID。插件将自动提取 ID 并读取建议标题。",
    labelUrlOrId: "链接或笔记本 ID：",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... 或 ID",
    labelName: "笔记本名称：",
    placeholderName: "例如：教育心理学",
    checkboxSetDefault: "设为默认笔记本",
    btnCancel: "取消",
    btnSave: "保存",
    btnChecking: "⏳ 正在检测...",
    btnValidId: "✓ 有效 ID：{id}",
    btnInvalidId: "⚠️ 无效的 ID 格式",
    editModalTitle: "编辑笔记本",
    deleteModalTitle: "确认删除笔记本？",
    deleteModalDesc: "确定要删除「{name}」吗？所有关联到该笔记本的映射规则也将一并被移除。",
    btnDeleteConfirm: "确认删除",
    suggestModalTitle: "为「{file}」选择笔记本",
    suggestModalDesc: "该笔记尚未关联指定笔记本。请选择你要将问题发送至哪个笔记本：",
    suggestCheckboxSave: "永久保存该文件夹的映射规则：{folder}",
    btnOpenAndSend: "打开并发送"
  },
  ja: {
    navOpenInBrowser: "ブラウザで開く",
    navRefreshPage: "ページを更新",
    navPluginSettings: "プラグイン設定",
    navBuyCoffee: "コーヒーをおごる",
    navNoNotebooks: "ノートブックが未登録です",

    cmdOpenNotebookLMSidebar: "NotebookLM：サイドバーを開く",
    cmdOpenGeminiSidebar: "Gemini：サイドバーを開く",
    cmdSendSelectionNotebookLM: "NotebookLM：選択テキストをサイドバーに送信",
    cmdSendSelectionGemini: "Gemini：選択テキストをサイドバーのGeminiに送信",
    cmdSearchGoogle: "Google：選択テキストをブラウザで検索",

    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Google 検索",

    noticeNoText: "送信するテキストを選択してください。",
    noticeNoTextSearch: "検索するテキストを選択してください。",
    noticeAddNotebookFirst: "「NotebookLM」タブでノートブックを先に追加してください！",
    noticeCopiedAndOpened: "📋 「{name}」をコピーしてサイドバーで開きました！",
    noticeOpenedInSidebar: "📓 「{name}」をサイドバーで開いています...",
    noticeGeminiSending: "✨ サイドバーのGeminiに質問を送信中...",
    noticeNoNotebooksToCheck: "確認するノートブックがありません。",
    noticeAllNotebooksActive: "✅ すべてのノートブック（{count}件）が正常に利用可能です！",
    noticeSomeNotebooksUnavailable: "⚠️ {checkedCount}件中{invalidCount}件のノートブックが利用できません。",
    noticeAutoRemoved: "🗑️ 利用できないノートブック{count}件を自動削除しました。",
    noticeEnterNotebookName: "ノートブックの名前を入力してください！",
    noticeInvalidUrlOrId: "無効なURLまたはノートブックIDです！",
    noticeNotebookAdded: "✅ ノートブックを追加しました：「{name}」",
    noticeNotebookUpdated: "✅ ノートブックを更新しました：「{name}」",
    noticeAutoScanFound: "⚡ {count}個のフォルダをノートブックに自動割り当てしました！",
    noticeAutoScanNone: "ノートブック名に一致するフォルダは見つかりませんでした。",
    noticeSelectFolderOrNote: "フォルダまたはノートを選択してください！",
    noticeSelectNotebook: "NotebookLMノートブックを選択してください！",
    noticeRuleExists: "このパスに対するルールは既に存在します！",
    noticeRuleAdded: "✅ マッピングルールを作成しました！",

    mobileViewTitle: "デスクトップWebview専用",
    mobileViewDesc: "埋め込みWebviewパネルはデスクトップ版でのみ利用可能です。ブラウザで開くには下をタップしてください。",
    openInBrowser: "ブラウザで開く",

    tabAbout: "概要",
    tabNotebookLM: "NotebookLM",
    tabMappings: "ノートの関連付け",
    tabSettings: "設定",

    heroTitle: "AI Bridge — NotebookLM & Gemini",
    heroAuthor: "開発者: Cesemess",
    heroDesc: "Obsidianのノートと公式Google NotebookLMおよびGeminiを直接結ぶシームレスな架け橋。",
    qsTitle: "クイックスタート — はじめ方",
    qsStep1Title: "ノートブックを追加する：",
    qsStep1Desc: "「NotebookLM」タブで「ノートブックを追加」をクリックし、ブラウザのURLを貼り付けます。プラグインが自動でIDを認識します。",
    qsStep2Title: "科目やフォルダに関連付ける：",
    qsStep2Desc: "「ノートの関連付け」タブで、どのフォルダやノートからこのノートブックを開くかを設定します（自動一致も利用可能）。",
    qsStep3Title: "テキストを選択して右クリックで質問：",
    qsStep3Desc: "ノート内のテキストを選択し、右クリックして「📓 NotebookLM」を選ぶと、サイドバーに質問が直接送信されます。",

    langSelectName: "表示言語",
    langSelectDesc: "プラグインの表示言語を選択します。",
    langAuto: "自動（システム標準）",

    guideTitle: "AI Bridgeの仕組みとベストプラクティス",
    guideBridgeTitle: "本プラグインは純粋な架け橋（Bridge）です",
    guideBridgeDesc: "プラグイン自体が回答を生成したり外部APIを介したりすることはありません。Obsidianでの疑問をサイドバーの公式Google NotebookLM（およびGemini）に届けることが唯一の役割です。",
    guideQualityTitle: "回答の質は登録した資料に直結します",
    guideQualityDesc: "NotebookLMはあなたがアップロードした資料に100%基づいて回答します（RAG）。空のノートでは一般的な回答になりますが、充実した資料を揃えれば正確な引用付きの回答が得られます。",
    guidePracticeTitle: "おすすめの運用法：科目ごとにノートブックを分ける",
    guidePracticeDesc: "講義や研究テーマ（例：「教育心理学」「統計学」）ごとにNotebookLMで独立したノートブックを作成し、資料を網羅的にアップロードしましょう：",
    guideBullet1: "📚 書籍・学術論文：公式教科書、講義レジュメ、研究論文（PDF）",
    guideBullet2: "📑 プレゼンテーション：講義スライド、配布資料、講義メモ",
    guideBullet3: "🎙️ 文字起こし：音声・動画講義の文字起こしやゼミの録音データ",
    guideCalloutTitle: "実際の利用シーン：",
    guideCalloutText: "Obsidianで復習中に不明な用語を選択するだけで、講義資料に基づいた信頼できる回答が即座に得られます——ハルシネーションの心配もありません。",

    coffeeBannerText: "このプラグインが気に入りましたか？ コーヒーを一杯おごる",
    coffeeBannerSubtext: " 継続的な開発とメンテナンスを支援。",
    coffeeBannerBtn: "コーヒーをおごる",
    supportTitle: "プロジェクトを支援する",
    supportDesc: "本プラグインは完全無料でオープンソースです。Obsidianでの学習や研究の役に立った場合は、コーヒーをおごって応援していただけると励みになります！",
    supportBtnText: "コーヒーをおごる",
    hideSupportName: "支援バナーを非表示",
    hideSupportDesc: "設定画面上部の支援バナーとサイドバーヘッダーのコーヒーアイコンを非表示にします。",
    linksTitle: "プロジェクトについて",
    linksGithub: "GitHubリポジトリ",
    linksIssues: "バグ報告・機能提案",

    manageNotebooksTitle: "NotebookLMノートブックの管理",
    addNotebookBtn: "ノートブックを追加",
    checkAvailabilityBtn: "利用可否を確認",
    startupCheckName: "Obsidian起動時に検証",
    startupCheckDesc: "Obsidian起動時に登録済みノートブックの接続性を自動確認します。",
    autoRemoveInvalidName: "無効なノートブックを自動削除",
    autoRemoveInvalidDesc: "検証時に404エラーとなったノートブックを自動的に一覧から削除します。",
    yourNotebooksTitle: "登録済みノートブック（{count}件）",
    emptyNotebooksTitle: "ノートブックがありません",
    emptyNotebooksDesc: "「ノートブックを追加」をクリックしてGoogle NotebookLMのURLを貼り付けてください。",
    defaultBadge: "標準",
    statusActive: "🟢 利用可能",
    statusUnavailable: "🔴 利用不可",
    statusUnverified: "⚪ 未確認",
    actionOpenInBrowser: "ブラウザで開く",
    actionSetAsDefault: "標準に設定",
    actionIsDefault: "標準ノートブック",
    actionEdit: "編集",
    actionDelete: "削除",

    autoMatchTitle: "名前による自動関連付け（Auto-Match）",
    enableAutoMatchName: "自動一致を有効化",
    enableAutoMatchDesc: "フォルダやノートの名前がノートブック名と一致する場合、自動的にそのノートブックを開きます。",
    scanFoldersName: "フォルダを今すぐスキャンして関連付け",
    scanFoldersDesc: "保管庫内のフォルダを検索し、ノートブック名と一致するフォルダの関連付けルールを作成します。",
    scanFoldersBtn: "⚡ 今すぐ確認して関連付け",
    defaultNotebookName: "標準ノートブック",
    defaultNotebookDesc: "関連付けのないすべてのノートを担当します（紫色の文字で表示）。",
    defaultNotebookNone: "— なし（未割り当て時は選択） —",
    mappingRulesTitle: "関連付けルール一覧（{count}件）",
    chooseFolderOrNote: "— フォルダまたはノートを選択 —",
    optgroupFolders: "📁 フォルダ",
    optgroupFiles: "📄 ノート",
    chooseNotebook: "— NotebookLMノートブックを選択 —",
    assignBtn: "関連付ける",
    emptyRulesTitle: "関連付けルールがありません",
    emptyRulesDesc: "上でフォルダまたはノートを選び、ノートブックを指定して「関連付ける」をクリックしてください。",
    targetFolder: "フォルダ",
    targetNote: "ノート",

    contextMenuCardTitle: "右クリックメニュー設定",
    showNotebookLMContextMenu: "右クリックメニューにNotebookLMを表示",
    showGeminiContextMenu: "右クリックメニューにGeminiを表示",
    showGoogleContextMenu: "右クリックメニューにGoogle検索を表示",
    behaviorCardTitle: "動作とクリップボード",
    autoSendName: "質問を自動送信する",
    autoSendDesc: "有効にするとNotebookLMやGeminiに自動で送信されます。無効時は入力欄への貼り付けのみ行われます。",
    copyClipboardName: "選択テキストをクリップボードにコピー",
    copyClipboardDesc: "NotebookLMまたはGeminiを開く際、選択したテキストをクリップボードにもコピーします。",
    showNoticeName: "実行通知を表示",
    showNoticeDesc: "アクション実行時に短いトースト通知を表示します。",
    searchCardTitle: "Google 検索",
    googleSearchUrlName: "検索URLテンプレート",
    googleSearchUrlDesc: "Web検索に使用するURLテンプレートです。{query}をプレースホルダーとして使用します。",
    sidebarHeaderCardTitle: "サイドバーのヘッダー表示",
    hideNotebookLMHeaderName: "NotebookLM上部のGoogleヘッダーを隠す",
    hideNotebookLMHeaderDesc: "Googleのロゴやアカウントバーを非表示にし、ノートやチャットの表示領域を広げます。",
    hotkeysCardTitle: "ホットキー設定",
    hotkeysConfigName: "ホットキーを設定",
    hotkeysConfigDesc: "Obsidianの設定画面でNotebookLM、Gemini、Google検索のショートカットキーを割り当てます。",
    hotkeysOpenBtn: "Obsidianのホットキー設定を開く",

    addModalTitle: "NotebookLMノートブックの追加",
    addModalDesc: "ブラウザのURLまたはノートブックIDを貼り付けてください。IDを自動抽出し、タイトルを提案します。",
    labelUrlOrId: "URLまたはノートブックID：",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... または ID",
    labelName: "ノートブック名：",
    placeholderName: "例：教育心理学",
    checkboxSetDefault: "標準ノートブックに設定する",
    btnCancel: "キャンセル",
    btnSave: "保存",
    btnChecking: "⏳ 確認中...",
    btnValidId: "✓ 有効なID：{id}",
    btnInvalidId: "⚠️ 無効なID形式です",
    editModalTitle: "ノートブックの編集",
    deleteModalTitle: "ノートブックを削除しますか？",
    deleteModalDesc: "「{name}」を削除してもよろしいですか？ このノートブックに関連付けられたルールもすべて削除されます。",
    btnDeleteConfirm: "削除する",
    suggestModalTitle: "「{file}」のノートブックを選択",
    suggestModalDesc: "このノートにはノートブックが割り当てられていません。質問の送信先を選択してください：",
    suggestCheckboxSave: "この設定をフォルダ（{folder}）に永続保存する",
    btnOpenAndSend: "開いて送信"
  },
  ko: {
    navOpenInBrowser: "브라우저에서 열기",
    navRefreshPage: "페이지 새로고침",
    navPluginSettings: "플러그인 설정",
    navBuyCoffee: "커피 한 잔 후원하기",
    navNoNotebooks: "추가된 노트북 없음",

    cmdOpenNotebookLMSidebar: "NotebookLM: 사이드바 열기",
    cmdOpenGeminiSidebar: "Gemini: 사이드바 열기",
    cmdSendSelectionNotebookLM: "NotebookLM: 선택 영역을 사이드바로 보내기",
    cmdSendSelectionGemini: "Gemini: 선택 영역을 사이드바 Gemini로 보내기",
    cmdSearchGoogle: "Google: 외부 브라우저에서 선택 영역 검색",

    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Google 검색",

    noticeNoText: "보낼 텍스트를 선택해 주세요.",
    noticeNoTextSearch: "검색할 텍스트를 선택해 주세요.",
    noticeAddNotebookFirst: "먼저 „NotebookLM” 탭에서 노트북을 추가해 주세요!",
    noticeCopiedAndOpened: "📋 „{name}” 복사 및 사이드바에서 열기 완료!",
    noticeOpenedInSidebar: "📓 사이드바에서 „{name}” 여는 중...",
    noticeGeminiSending: "✨ 사이드바 Gemini로 질문 전송 중...",
    noticeNoNotebooksToCheck: "확인할 노트북이 없습니다.",
    noticeAllNotebooksActive: "✅ 모든 노트북({count}개)이 정상 작동 중입니다!",
    noticeSomeNotebooksUnavailable: "⚠️ {checkedCount}개 중 {invalidCount}개의 노트북을 사용할 수 없습니다.",
    noticeAutoRemoved: "🗑️ 사용할 수 없는 노트북 {count}개를 자동으로 정리했습니다.",
    noticeEnterNotebookName: "노트북 이름을 입력해 주세요!",
    noticeInvalidUrlOrId: "유효하지 않은 URL 또는 노트북 ID입니다!",
    noticeNotebookAdded: "✅ 노트북 추가됨: „{name}”",
    noticeNotebookUpdated: "✅ 노트북 업데이트됨: „{name}”",
    noticeAutoScanFound: "⚡ {count}개의 폴더가 노트북에 자동 매핑되었습니다!",
    noticeAutoScanNone: "노트북 이름과 일치하는 폴더를 찾을 수 없습니다.",
    noticeSelectFolderOrNote: "폴더 또는 노트를 선택해 주세요!",
    noticeSelectNotebook: "NotebookLM 노트북을 선택해 주세요!",
    noticeRuleExists: "해당 경로에 대한 매핑 규칙이 이미 존재합니다!",
    noticeRuleAdded: "✅ 매핑 규칙이 생성되었습니다!",

    mobileViewTitle: "데스크톱 웹뷰 전용",
    mobileViewDesc: "웹뷰 임베디드 패널은 데스크톱에서만 지원됩니다. 아래 버튼을 눌러 브라우저에서 열어보세요.",
    openInBrowser: "브라우저에서 열기",

    tabAbout: "소개",
    tabNotebookLM: "NotebookLM",
    tabMappings: "노트 매핑",
    tabSettings: "설정",

    heroTitle: "AI Bridge — NotebookLM & Gemini",
    heroAuthor: "제작자: Cesemess",
    heroDesc: "Obsidian 노트와 공식 Google NotebookLM 및 Gemini 환경을 매끄럽게 연결해 주는 직통 다리.",
    qsTitle: "빠른 시작 — 어떻게 사용하나요?",
    qsStep1Title: "노트북 추가하기: ",
    qsStep1Desc: "„NotebookLM” 탭에서 „노트북 추가”를 클릭하고 브라우저 주소를 붙여넣으세요. 플러그인이 자동으로 ID를 인식합니다.",
    qsStep2Title: "과목이나 폴더에 연결하기: ",
    qsStep2Desc: "„노트 매핑” 탭에서 어떤 폴더나 노트가 이 노트북을 열지 지정하세요(자동 매칭도 지원).",
    qsStep3Title: "텍스트 선택 후 우클릭으로 질문하기: ",
    qsStep3Desc: "노트에서 텍스트를 선택하고 마우스 우클릭 후 „📓 NotebookLM”을 누르면 사이드바에 즉시 질문이 전송됩니다.",

    langSelectName: "인터페이스 언어",
    langSelectDesc: "플러그인 표시 언어를 선택합니다.",
    langAuto: "자동 (시스템 기본값)",

    guideTitle: "AI Bridge 작동 원리와 추천 활용법",
    guideBridgeTitle: "본 플러그인은 순수한 연결 다리(Bridge)입니다",
    guideBridgeDesc: "플러그인 자체가 답변을 생성하거나 타사 API를 거치지 않습니다. Obsidian의 질문을 사이드바의 공식 Google NotebookLM(및 Gemini) 공간으로 즉시 전달하는 것이 유일한 역할입니다.",
    guideQualityTitle: "답변의 품질은 등록한 학습 자료에 정비례합니다",
    guideQualityDesc: "NotebookLM은 업로드된 출처 자료에 100% 기반하여 답변합니다(RAG). 빈 노트북은 피상적인 답변을 내놓지만, 잘 정리된 지식 창고는 정확한 페이지 인용과 함께 신뢰할 수 있는 답을 제공합니다.",
    guidePracticeTitle: "추천 실전법: 과목별로 독립된 노트북 운영하기",
    guidePracticeDesc: "각 강의나 연구 주제(예: „교육심리학”, „통계학”)마다 독립된 노트북을 만들고 풍부한 자료를 업로드하세요:",
    guideBullet1: "📚 교재 및 논문: 공식 교재, 강의계획서 관련 논문 및 학술 자료 (PDF)",
    guideBullet2: "📑 강의 자료: 슬라이드 PPT, 핸드아웃 및 요약 노트",
    guideBullet3: "🎙️ 녹취록: 음성/영상 강의 트랜스크립트 및 세미나 기록",
    guideCalloutTitle: "실제 활용: ",
    guideCalloutText: "Obsidian에서 공부하다가 헷갈리는 개념을 드래그하기만 하면, 내가 업로드한 공식 교재에 근거한 명쾌한 해설을 즉시 얻을 수 있습니다 — 할루시네이션 걱정이 없습니다.",

    coffeeBannerText: "플러그인이 마음에 드시나요? 커피 한 잔 후원해 주세요!",
    coffeeBannerSubtext: " 지속적인 개발과 유지보수에 큰 힘이 됩니다.",
    coffeeBannerBtn: "커피 한 잔 후원하기",
    supportTitle: "프로젝트 후원하기",
    supportDesc: "이 플러그인은 완전한 무료 오픈소스입니다. Obsidian에서의 학습과 연구에 도움이 되었다면, 커피 한 잔으로 응원해 주시면 감사하겠습니다!",
    supportBtnText: "커피 한 잔 후원하기",
    hideSupportName: "후원 배너 숨기기",
    hideSupportDesc: "설정 최상단의 후원 배너와 사이드바 상단의 커피 아이콘을 숨깁니다.",
    linksTitle: "프로젝트 정보",
    linksGithub: "GitHub 저장소",
    linksIssues: "버그 신고 및 기능 제안",

    manageNotebooksTitle: "NotebookLM 노트북 관리",
    addNotebookBtn: "노트북 추가",
    checkAvailabilityBtn: "연결 상태 확인",
    startupCheckName: "Obsidian 시작 시 상태 검증",
    startupCheckDesc: "Obsidian이 시작될 때 등록된 노트북의 접속 상태를 자동으로 확인합니다.",
    autoRemoveInvalidName: "삭제된 노트북 자동 정리",
    autoRemoveInvalidDesc: "검증 시 404 오류가 발생하는 노트북을 목록에서 자동으로 삭제합니다.",
    yourNotebooksTitle: "등록된 노트북 목록 ({count}개)",
    emptyNotebooksTitle: "추가된 노트북이 없습니다",
    emptyNotebooksDesc: "„노트북 추가”를 클릭하여 Google NotebookLM 링크를 붙여넣으세요.",
    defaultBadge: "기본",
    statusActive: "🟢 정상",
    statusUnavailable: "🔴 사용 불가",
    statusUnverified: "⚪ 미확인",
    actionOpenInBrowser: "브라우저에서 열기",
    actionSetAsDefault: "기본값으로 설정",
    actionIsDefault: "기본 노트북",
    actionEdit: "수정",
    actionDelete: "삭제",

    autoMatchTitle: "이름 기반 자동 매칭 (Auto-Match)",
    enableAutoMatchName: "자동 매칭 활성화",
    enableAutoMatchDesc: "폴더나 노트의 이름이 노트북 이름과 일치하면 자동으로 해당 노트북으로 연결합니다.",
    scanFoldersName: "폴더 스캔 및 자동 매칭 실행",
    scanFoldersDesc: "보관함의 폴더를 스캔하여 노트북 이름과 일치하는 폴더의 매핑 규칙을 생성합니다.",
    scanFoldersBtn: "⚡ 지금 확인 및 매칭",
    defaultNotebookName: "기본 노트북",
    defaultNotebookDesc: "매핑되지 않은 모든 노트를 처리합니다 (보라색 글씨로 표시).",
    defaultNotebookNone: "— 없음 (전송 시 매번 선택) —",
    mappingRulesTitle: "매핑 규칙 목록 ({count}개)",
    chooseFolderOrNote: "— 폴더 또는 노트 선택 —",
    optgroupFolders: "📁 폴더",
    optgroupFiles: "📄 노트",
    chooseNotebook: "— NotebookLM 노트북 선택 —",
    assignBtn: "연결하기",
    emptyRulesTitle: "등록된 매핑 규칙이 없습니다",
    emptyRulesDesc: "위에서 폴더나 노트를 고르고 노트북을 지정한 뒤 „연결하기”를 누르세요.",
    targetFolder: "폴더",
    targetNote: "노트",

    contextMenuCardTitle: "우클릭 메뉴 설정 (Context Menu)",
    showNotebookLMContextMenu: "우클릭 메뉴에 NotebookLM 표시",
    showGeminiContextMenu: "우클릭 메뉴에 Gemini 표시",
    showGoogleContextMenu: "우클릭 메뉴에 Google 검색 표시",
    behaviorCardTitle: "동작 방식 및 클립보드",
    autoSendName: "질문 자동 제출",
    autoSendDesc: "활성화하면 NotebookLM/Gemini에 질문이 즉시 전송됩니다. 끄면 입력창에 붙여넣기만 진행됩니다.",
    copyClipboardName: "선택 영역 클립보드 복사",
    copyClipboardDesc: "NotebookLM이나 Gemini를 열 때 선택한 텍스트를 시스템 클립보드에도 복사합니다.",
    showNoticeName: "실행 알림 메시지 표시",
    showNoticeDesc: "기능이 실행될 때 화면 우측 상단에 팝업 알림을 띄웁니다.",
    searchCardTitle: "Google 검색",
    googleSearchUrlName: "검색 URL 템플릿",
    googleSearchUrlDesc: "웹 검색 시 사용할 URL 템플릿입니다. 검색어 자리에 {query}를 사용하세요.",
    sidebarHeaderCardTitle: "사이드바 헤더 디자인",
    hideNotebookLMHeaderName: "NotebookLM 상단 Google 바 숨기기",
    hideNotebookLMHeaderDesc: "상단 Google 로고와 계정 바를 숨겨 노트와 채팅 공간을 더 넓게 확보합니다.",
    hotkeysCardTitle: "단축키 설정",
    hotkeysConfigName: "단축키 설정하기",
    hotkeysConfigDesc: "Obsidian 환경설정에서 NotebookLM, Gemini, Google 검색 단축키를 지정할 수 있습니다.",
    hotkeysOpenBtn: "Obsidian 단축키 설정 열기",

    addModalTitle: "NotebookLM 노트북 추가",
    addModalDesc: "브라우저 URL이나 노트북 ID를 입력하세요. 플러그인이 자동으로 ID를 추출하고 제목을 제안합니다.",
    labelUrlOrId: "링크 또는 노트북 ID:",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... 또는 ID",
    labelName: "노트북 이름:",
    placeholderName: "예: 교육심리학",
    checkboxSetDefault: "기본 노트북으로 설정",
    btnCancel: "취소",
    btnSave: "저장",
    btnChecking: "⏳ 확인 중...",
    btnValidId: "✓ 유효한 ID: {id}",
    btnInvalidId: "⚠️ 잘못된 ID 형식입니다",
    editModalTitle: "노트북 수정",
    deleteModalTitle: "노트북을 삭제하시겠습니까?",
    deleteModalDesc: "정말 „{name}” 노트북을 삭제하시겠습니까? 연결된 모든 매핑 규칙도 함께 삭제됩니다.",
    btnDeleteConfirm: "노트북 삭제",
    suggestModalTitle: "„{file}”에 연결할 노트북 선택",
    suggestModalDesc: "이 노트에 지정된 노트북이 없습니다. 질문을 어디로 보낼지 선택해 주세요:",
    suggestCheckboxSave: "이 폴더({folder})에 대한 설정을 영구적으로 저장하기",
    btnOpenAndSend: "열기 및 전송"
  },
  pt: {
    navOpenInBrowser: "Abrir no navegador",
    navRefreshPage: "Atualizar página",
    navPluginSettings: "Configurações do plugin",
    navBuyCoffee: "Pague-me um café",
    navNoNotebooks: "Nenhum caderno adicionado",

    cmdOpenNotebookLMSidebar: "NotebookLM: Abrir painel lateral",
    cmdOpenGeminiSidebar: "Gemini: Abrir painel lateral",
    cmdSendSelectionNotebookLM: "NotebookLM: Enviar seleção para o painel lateral",
    cmdSendSelectionGemini: "Gemini: Enviar seleção para o Gemini no painel lateral",
    cmdSearchGoogle: "Google: Pesquisar seleção no navegador externo",

    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Pesquisa Google",

    noticeNoText: "Por favor, selecione um texto para enviar.",
    noticeNoTextSearch: "Por favor, selecione um texto para pesquisar.",
    noticeAddNotebookFirst: "Adicione primeiro um caderno na aba „NotebookLM”!",
    noticeCopiedAndOpened: "📋 „{name}” copiado e aberto no painel lateral!",
    noticeOpenedInSidebar: "📓 Abrindo „{name}” no painel lateral...",
    noticeGeminiSending: "✨ Enviando pergunta para o Gemini no painel lateral...",
    noticeNoNotebooksToCheck: "Nenhum caderno adicionado para verificar.",
    noticeAllNotebooksActive: "✅ Todos os cadernos ({count}) estão ativos!",
    noticeSomeNotebooksUnavailable: "⚠️ Foram encontrados {invalidCount} cadernos indisponíveis de {checkedCount}.",
    noticeAutoRemoved: "🗑️ Removidos automaticamente {count} cadernos indisponíveis.",
    noticeEnterNotebookName: "Por favor, insira um nome para o caderno!",
    noticeInvalidUrlOrId: "URL ou ID de caderno inválido!",
    noticeNotebookAdded: "✅ Caderno adicionado: „{name}”",
    noticeNotebookUpdated: "✅ Caderno atualizado: „{name}”",
    noticeAutoScanFound: "⚡ {count} pastas foram mapeadas automaticamente para cadernos!",
    noticeAutoScanNone: "Nenhuma pasta correspondente encontrada para os cadernos.",
    noticeSelectFolderOrNote: "Por favor, selecione uma pasta ou nota!",
    noticeSelectNotebook: "Por favor, selecione um caderno do NotebookLM!",
    noticeRuleExists: "Já existe uma regra de mapeamento para este caminho!",
    noticeRuleAdded: "✅ Regra de mapeamento criada com sucesso!",

    mobileViewTitle: "Apenas Webview de Desktop",
    mobileViewDesc: "Os painéis integrados com Webview estão disponíveis apenas no desktop. Toque abaixo para abrir no navegador.",
    openInBrowser: "Abrir no navegador",

    tabAbout: "Sobre",
    tabNotebookLM: "NotebookLM",
    tabMappings: "Mapeamento de Notas",
    tabSettings: "Configurações",

    heroTitle: "AI Bridge — NotebookLM & Gemini",
    heroAuthor: "Autor: Cesemess",
    heroDesc: "Ponte direta conectando suas notas do Obsidian com os ambientes oficiais do Google NotebookLM e Gemini.",
    qsTitle: "Início Rápido — Como começar?",
    qsStep1Title: "Adicione seu caderno: ",
    qsStep1Desc: "Na aba „NotebookLM”, clique em „Adicionar caderno” e cole o link do seu navegador. O plugin identificará o ID e permitirá nomeá-lo.",
    qsStep2Title: "Vincule a uma matéria ou pasta: ",
    qsStep2Desc: "Na aba „Mapeamento de Notas”, escolha qual pasta ou nota no Obsidian abre este caderno (ou use a correspondência automática).",
    qsStep3Title: "Selecione o texto e pergunte com o botão direito: ",
    qsStep3Desc: "Em qualquer nota, selecione um texto, clique com o botão direito e escolha „📓 NotebookLM” — a pergunta será enviada diretamente para sua barra lateral.",

    langSelectName: "Idioma da Interface",
    langSelectDesc: "Escolha o idioma de exibição do plugin.",
    langAuto: "Automático (sistema)",

    guideTitle: "Como o AI Bridge funciona e melhores práticas",
    guideBridgeTitle: "O plugin funciona estritamente como uma Ponte",
    guideBridgeDesc: "O plugin não gera respostas próprias nem utiliza APIs de terceiros. Seu único propósito é enviar instantaneamente suas perguntas do Obsidian para o seu espaço de trabalho oficial do Google NotebookLM (e Gemini) na barra lateral.",
    guideQualityTitle: "Os resultados dependem diretamente do conteúdo do seu caderno",
    guideQualityDesc: "O NotebookLM baseia 100% de suas respostas nos materiais de estudo que você adiciona a ele (RAG). Um caderno vazio gera respostas genéricas, enquanto uma base bem documentada produz respostas exatas com citações de páginas.",
    guidePracticeTitle: "Melhor prática: um caderno dedicado para cada disciplina",
    guidePracticeDesc: "Crie um caderno separado no NotebookLM para cada disciplina ou projeto (ex: „Psicologia Educacional”, „Estatística”) e envie fontes completas:",
    guideBullet1: "📚 Livros e artigos: livros didáticos oficiais, artigos de pesquisa e ementas (PDF)",
    guideBullet2: "📑 Apresentações: slides de aulas, resumos e anotações",
    guideBullet3: "🎙️ Transcrições: transcrições de aulas em áudio/vídeo e gravações de seminários",
    guideCalloutTitle: "Na prática: ",
    guideCalloutText: "Ao estudar no Obsidian, selecione qualquer termo complexo e receba uma resposta fundamentada no seu próprio material de aula — sem alucinações, sem adivinhações.",

    coffeeBannerText: "Gostando do plugin? Pague-me um café!",
    coffeeBannerSubtext: " Apoie o desenvolvimento e a manutenção.",
    coffeeBannerBtn: "Pague-me um café",
    supportTitle: "Apoiar o Projeto",
    supportDesc: "Este plugin é totalmente gratuito e de código aberto. Se ele ajuda você a estudar e produzir no Obsidian, pagar um café é uma ótima maneira de agradecer e apoiar futuras melhorias!",
    supportBtnText: "Pague-me um café",
    hideSupportName: "Ocultar apoio",
    hideSupportDesc: "Oculta a barra de apoio no topo das configurações e o ícone de café no cabeçalho da barra lateral.",
    linksTitle: "Sobre o Projeto",
    linksGithub: "Repositório no GitHub",
    linksIssues: "Relatar erro ou sugerir funcionalidade",

    manageNotebooksTitle: "Gerenciar Cadernos do NotebookLM",
    addNotebookBtn: "Adicionar caderno",
    checkAvailabilityBtn: "Verificar disponibilidade",
    startupCheckName: "Verificação ao iniciar o Obsidian",
    startupCheckDesc: "Verifica a disponibilidade dos cadernos adicionados ao iniciar o Obsidian.",
    autoRemoveInvalidName: "Remover cadernos excluídos automaticamente",
    autoRemoveInvalidDesc: "Remove automaticamente os cadernos que retornarem erro 404 durante a verificação.",
    yourNotebooksTitle: "Seus Cadernos ({count})",
    emptyNotebooksTitle: "Nenhum caderno adicionado",
    emptyNotebooksDesc: "Clique em „Adicionar caderno” para colar o link do seu caderno do Google NotebookLM.",
    defaultBadge: "Padrão",
    statusActive: "🟢 Ativo",
    statusUnavailable: "🔴 Indisponível",
    statusUnverified: "⚪ Não verificado",
    actionOpenInBrowser: "Abrir no navegador",
    actionSetAsDefault: "Definir como padrão",
    actionIsDefault: "Caderno padrão",
    actionEdit: "Editar",
    actionDelete: "Excluir",

    autoMatchTitle: "Correspondência Automática (Auto-Match)",
    enableAutoMatchName: "Ativar correspondência automática",
    enableAutoMatchDesc: "Direciona automaticamente as notas para um caderno se o nome da pasta ou da nota coincidir com o nome do caderno.",
    scanFoldersName: "Escanear pastas e vincular agora",
    scanFoldersDesc: "Verifica as pastas do cofre e cria regras de mapeamento para as pastas com nomes correspondentes aos cadernos.",
    scanFoldersBtn: "⚡ Verificar e vincular agora",
    defaultNotebookName: "Caderno padrão",
    defaultNotebookDesc: "Responsável por todas as notas não atribuídas (indicado com fonte roxa).",
    defaultNotebookNone: "— Nenhum (perguntar ao enviar) —",
    mappingRulesTitle: "Regras de Mapeamento ({count})",
    chooseFolderOrNote: "— Escolher pasta ou nota —",
    optgroupFolders: "📁 Pastas",
    optgroupFiles: "📄 Notas",
    chooseNotebook: "— Escolher caderno do NotebookLM —",
    assignBtn: "Vincular",
    emptyRulesTitle: "Nenhuma regra de mapeamento ainda",
    emptyRulesDesc: "Selecione uma pasta ou nota acima, escolha um caderno e clique em „Vincular”.",
    targetFolder: "Pasta",
    targetNote: "Nota",

    contextMenuCardTitle: "Menu de Contexto (Botão Direito / Toque)",
    showNotebookLMContextMenu: "Mostrar NotebookLM no menu de contexto",
    showGeminiContextMenu: "Mostrar Gemini no menu de contexto",
    showGoogleContextMenu: "Mostrar Pesquisa Google no menu de contexto",
    behaviorCardTitle: "Comportamento de Ação e Área de Transferência",
    autoSendName: "Enviar perguntas automaticamente",
    autoSendDesc: "Quando ativado, as perguntas são enviadas diretamente no NotebookLM/Gemini. Quando desativado, o texto é apenas colado no chat.",
    copyClipboardName: "Copiar texto selecionado para a área de transferência",
    copyClipboardDesc: "Copia o texto selecionado para a área de transferência do sistema ao abrir o NotebookLM ou Gemini.",
    showNoticeName: "Exibir notificações de ação",
    showNoticeDesc: "Mostra pequenos avisos na tela quando as ações são acionadas.",
    searchCardTitle: "Pesquisa Google",
    googleSearchUrlName: "Modelo de URL de pesquisa",
    googleSearchUrlDesc: "Modelo de URL usado para buscas na web. Use {query} como o termo de pesquisa.",
    sidebarHeaderCardTitle: "Cabeçalho da Barra Lateral",
    hideNotebookLMHeaderName: "Ocultar barra superior do Google no NotebookLM",
    hideNotebookLMHeaderDesc: "Oculta o cabeçalho do Google com logo e conta para aproveitar melhor o espaço para notas e chat.",
    hotkeysCardTitle: "Teclas de Atalho",
    hotkeysConfigName: "Configurar atalhos",
    hotkeysConfigDesc: "Atribua atalhos de teclado para o NotebookLM, Gemini e Pesquisa Google nas configurações do Obsidian.",
    hotkeysOpenBtn: "Abrir atalhos do Obsidian",

    addModalTitle: "Adicionar Caderno do NotebookLM",
    addModalDesc: "Cole o link do seu navegador ou o ID do caderno. O plugin identificará o ID automaticamente e sugerirá o título.",
    labelUrlOrId: "Link ou ID do caderno:",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... ou ID",
    labelName: "Nome do caderno:",
    placeholderName: "ex: Psicologia Educacional",
    checkboxSetDefault: "Definir como caderno padrão",
    btnCancel: "Cancelar",
    btnSave: "Salvar",
    btnChecking: "⏳ Verificando...",
    btnValidId: "✓ ID válido: {id}",
    btnInvalidId: "⚠️ Formato de ID inválido",
    editModalTitle: "Editar Caderno",
    deleteModalTitle: "Excluir caderno?",
    deleteModalDesc: "Tem certeza de que deseja excluir „{name}”? Todas as regras de mapeamento deste caderno também serão removidas.",
    btnDeleteConfirm: "Excluir caderno",
    suggestModalTitle: "Escolher Caderno para „{file}”",
    suggestModalDesc: "Esta nota ainda não tem um caderno associado. Escolha para onde enviar sua pergunta:",
    suggestCheckboxSave: "Salvar esta associação permanentemente para a pasta: {folder}",
    btnOpenAndSend: "Abrir e Enviar"
  },
  ru: {
    navOpenInBrowser: "Открыть в браузере",
    navRefreshPage: "Обновить страницу",
    navPluginSettings: "Настройки плагина",
    navBuyCoffee: "Купить мне кофе",
    navNoNotebooks: "Нет добавленных блокнотов",

    cmdOpenNotebookLMSidebar: "NotebookLM: Открыть боковую панель",
    cmdOpenGeminiSidebar: "Gemini: Открыть боковую панель",
    cmdSendSelectionNotebookLM: "NotebookLM: Отправить выделенный текст в панель",
    cmdSendSelectionGemini: "Gemini: Отправить выделенный текст в Gemini в панели",
    cmdSearchGoogle: "Google: Искать выделенный текст в браузере",

    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Поиск Google",

    noticeNoText: "Пожалуйста, выделите текст для отправки.",
    noticeNoTextSearch: "Пожалуйста, выделите текст для поиска.",
    noticeAddNotebookFirst: "Сначала добавьте блокнот во вкладке „NotebookLM”!",
    noticeCopiedAndOpened: "📋 Скопировано и открыт „{name}” в боковой панели!",
    noticeOpenedInSidebar: "📓 Открываем „{name}” в боковой панели...",
    noticeGeminiSending: "✨ Отправка запроса в Gemini в боковой панели...",
    noticeNoNotebooksToCheck: "Нет добавленных блокнотов для проверки.",
    noticeAllNotebooksActive: "✅ Все блокноты ({count}) активны и доступны!",
    noticeSomeNotebooksUnavailable: "⚠️ Недоступно {invalidCount} блокнотов из {checkedCount}.",
    noticeAutoRemoved: "🗑️ Автоматически удалено {count} недоступных блокнотов.",
    noticeEnterNotebookName: "Пожалуйста, введите название блокнота!",
    noticeInvalidUrlOrId: "Некорректный URL или ID блокнота!",
    noticeNotebookAdded: "✅ Блокнот добавлен: „{name}”",
    noticeNotebookUpdated: "✅ Блокнот обновлен: „{name}”",
    noticeAutoScanFound: "⚡ Автоматически сопоставлено папок: {count}!",
    noticeAutoScanNone: "Не найдено папок, совпадающих с блокнотами.",
    noticeSelectFolderOrNote: "Пожалуйста, выберите папку или заметку!",
    noticeSelectNotebook: "Пожалуйста, выберите блокнот NotebookLM!",
    noticeRuleExists: "Правило сопоставления для этого пути уже существует!",
    noticeRuleAdded: "✅ Правило сопоставления создано!",

    mobileViewTitle: "Только для ПК (Webview)",
    mobileViewDesc: "Встроенные панели Webview доступны только в версии для компьютера. Нажмите ниже, чтобы открыть в браузере.",
    openInBrowser: "Открыть в браузере",

    tabAbout: "О плагине",
    tabNotebookLM: "NotebookLM",
    tabMappings: "Привязка заметок",
    tabSettings: "Настройки",

    heroTitle: "AI Bridge — NotebookLM & Gemini",
    heroAuthor: "Автор: Cesemess",
    heroDesc: "Удобный мост, соединяющий ваши заметки в Obsidian с официальными сервисами Google NotebookLM и Gemini.",
    qsTitle: "Быстрый старт — с чего начать?",
    qsStep1Title: "Добавьте ваш блокнот: ",
    qsStep1Desc: "Во вкладке „NotebookLM” нажмите „Добавить блокнот” и вставьте ссылку из браузера. Плагин сам определит ID и предложит название.",
    qsStep2Title: "Привяжите к предмету или папке: ",
    qsStep2Desc: "Во вкладке „Привязка заметок” выберите папку или заметку в Obsidian, которая будет открывать этот блокнот.",
    qsStep3Title: "Выделите текст и спросите через правый клик: ",
    qsStep3Desc: "В любой заметке выделите фрагмент, нажмите правую кнопку мыши и выберите „📓 NotebookLM” — вопрос отправится прямо в боковую панель.",

    langSelectName: "Язык интерфейса",
    langSelectDesc: "Выберите язык интерфейса плагина.",
    langAuto: "Автоматически (системный)",

    guideTitle: "Как работает AI Bridge и лучшие практики",
    guideBridgeTitle: "Плагин является исключительно мостом (Bridge)",
    guideBridgeDesc: "Плагин не генерирует ответы сам и не использует сторонние API. Его единственная задача — мгновенно доставить ваш вопрос из Obsidian в ваш официальный аккаунт Google NotebookLM (и Gemini) в боковой панели.",
    guideQualityTitle: "Качество ответов напрямую зависит от ваших источников",
    guideQualityDesc: "NotebookLM формирует 100% ответов строго на основе загруженных вами материалов (RAG). Пустой блокнот отвечает общими фразами, тогда как наполненный дает точные ответы со ссылками на конкретные страницы.",
    guidePracticeTitle: "Лучшая практика: отдельный блокнот под каждый предмет",
    guidePracticeDesc: "Создайте в NotebookLM отдельный блокнот для каждого курса или проекта (например, „Педагогическая психология”, „Статистика”) и загрузите полные материалы:",
    guideBullet1: "📚 Книги и статьи: официальные учебники, статьи и научные публикации (PDF)",
    guideBullet2: "📑 Презентации: слайды лекций, конспекты и методички",
    guideBullet3: "🎙️ Стенограммы: текстовые расшифровки аудио/видео лекций и семинаров",
    guideCalloutTitle: "На практике: ",
    guideCalloutText: "Занимаясь в Obsidian, выделите сложный термин и мгновенно получите авторитетный ответ по вашим собственным учебным материалам — без галлюцинаций и догадок.",

    coffeeBannerText: "Нравится плагин? Угостите меня кофе!",
    coffeeBannerSubtext: " Поддержите разработку и обновления.",
    coffeeBannerBtn: "Купить мне кофе",
    supportTitle: "Поддержать проект",
    supportDesc: "Этот плагин полностью бесплатный и с открытым исходным кодом. Если он помогает вам учиться и работать в Obsidian, чашка кофе — отличный способ сказать спасибо!",
    supportBtnText: "Купить мне кофе",
    hideSupportName: "Скрыть блок поддержки",
    hideSupportDesc: "Скрывает верхний баннер в настройках и иконку чашки кофе в заголовке боковой панели.",
    linksTitle: "О проекте",
    linksGithub: "Репозиторий на GitHub",
    linksIssues: "Сообщить об ошибке или предложить идею",

    manageNotebooksTitle: "Управление блокнотами NotebookLM",
    addNotebookBtn: "Добавить блокнот",
    checkAvailabilityBtn: "Проверить доступность",
    startupCheckName: "Проверка при запуске Obsidian",
    startupCheckDesc: "Проверяет доступность добавленных блокнотов при старте Obsidian.",
    autoRemoveInvalidName: "Автоматически удалять недоступные блокноты",
    autoRemoveInvalidDesc: "Автоматически удаляет из списка блокноты, возвращающие ошибку 404 при проверке.",
    yourNotebooksTitle: "Ваши блокноты ({count})",
    emptyNotebooksTitle: "Нет добавленных блокнотов",
    emptyNotebooksDesc: "Нажмите „Добавить блокнот”, чтобы вставить ссылку на блокнот в Google NotebookLM.",
    defaultBadge: "По умолчанию",
    statusActive: "🟢 Активен",
    statusUnavailable: "🔴 Недоступен",
    statusUnverified: "⚪ Не проверен",
    actionOpenInBrowser: "Открыть в браузере",
    actionSetAsDefault: "Сделать по умолчанию",
    actionIsDefault: "Блокнот по умолчанию",
    actionEdit: "Редактировать",
    actionDelete: "Удалить",

    autoMatchTitle: "Автоматическое сопоставление (Auto-Match)",
    enableAutoMatchName: "Включить автоматическое сопоставление",
    enableAutoMatchDesc: "Автоматически направляет заметку в блокнот, если имя папки или заметки совпадает с названием блокнота.",
    scanFoldersName: "Сканировать папки и сопоставить сейчас",
    scanFoldersDesc: "Проверяет папки хранилища и создает правила для папок с именами, совпадающими с блокнотами.",
    scanFoldersBtn: "⚡ Проверить и сопоставить",
    defaultNotebookName: "Блокнот по умолчанию",
    defaultNotebookDesc: "Обрабатывает все непривязанные заметки (выделен фиолетовым шрифтом).",
    defaultNotebookNone: "— Не выбран (спрашивать при отправке) —",
    mappingRulesTitle: "Правила привязки ({count})",
    chooseFolderOrNote: "— Выберите папку или заметку —",
    optgroupFolders: "📁 Папки",
    optgroupFiles: "📄 Заметки",
    chooseNotebook: "— Выберите блокнот NotebookLM —",
    assignBtn: "Привязать",
    emptyRulesTitle: "Правил привязки пока нет",
    emptyRulesDesc: "Выберите папку или заметку выше, укажите блокнот и нажмите „Привязать”.",
    targetFolder: "Папка",
    targetNote: "Заметка",

    contextMenuCardTitle: "Контекстное меню (ПКМ / Касание)",
    showNotebookLMContextMenu: "Показывать NotebookLM в контекстном меню",
    showGeminiContextMenu: "Показывать Gemini в контекстном меню",
    showGoogleContextMenu: "Показывать Поиск Google в контекстном меню",
    behaviorCardTitle: "Поведение действий и буфер обмена",
    autoSendName: "Автоматически отправлять запросы",
    autoSendDesc: "При включении вопросы сразу отправляются в чат NotebookLM/Gemini. При выключении текст только вставляется в поле ввода.",
    copyClipboardName: "Копировать выделенный текст в буфер",
    copyClipboardDesc: "Копирует выделенный текст в буфер обмена системы при открытии NotebookLM или Gemini.",
    showNoticeName: "Показывать уведомления действий",
    showNoticeDesc: "Отображает краткие всплывающие уведомления при выполнении действий.",
    searchCardTitle: "Поиск Google",
    googleSearchUrlName: "Шаблон URL поиска",
    googleSearchUrlDesc: "Шаблон адреса для веб-поиска. Используйте {query} в качестве заполнителя запроса.",
    sidebarHeaderCardTitle: "Шапка боковой панели",
    hideNotebookLMHeaderName: "Скрыть верхнюю панель Google в NotebookLM",
    hideNotebookLMHeaderDesc: "Скрывает верхний логотип Google и аккаунт для экономии места под заметки и диалог.",
    hotkeysCardTitle: "Горячие клавиши",
    hotkeysConfigName: "Настроить горячие клавиши",
    hotkeysConfigDesc: "Назначьте удобные комбинации клавиш для NotebookLM, Gemini и Google в настройках Obsidian.",
    hotkeysOpenBtn: "Открыть горячие клавиши Obsidian",

    addModalTitle: "Добавить блокнот NotebookLM",
    addModalDesc: "Вставьте ссылку из адресной строки браузера или ID блокнота. Плагин сам определит ID и предложит название.",
    labelUrlOrId: "Ссылка или ID блокнота:",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... или ID",
    labelName: "Название блокнота:",
    placeholderName: "например: Педагогическая психология",
    checkboxSetDefault: "Сделать блокнотом по умолчанию",
    btnCancel: "Отмена",
    btnSave: "Сохранить",
    btnChecking: "⏳ Проверка...",
    btnValidId: "✓ Корректный ID: {id}",
    btnInvalidId: "⚠️ Неверный формат ID",
    editModalTitle: "Редактировать блокнот",
    deleteModalTitle: "Удалить блокнот?",
    deleteModalDesc: "Вы уверены, что хотите удалить „{name}”? Все правила привязки для этого блокнота также будут удалены.",
    btnDeleteConfirm: "Удалить блокнот",
    suggestModalTitle: "Выберите блокнот для „{file}”",
    suggestModalDesc: "К этой заметке еще не привязан блокнот. Выберите, куда отправить вопрос:",
    suggestCheckboxSave: "Сохранить эту привязку для папки: {folder}",
    btnOpenAndSend: "Открыть и отправить"
  },
  it: {
    navOpenInBrowser: "Apri nel browser",
    navRefreshPage: "Ricarica pagina",
    navPluginSettings: "Impostazioni plugin",
    navBuyCoffee: "Offrimi un caffè",
    navNoNotebooks: "Nessun taccuino aggiunto",

    cmdOpenNotebookLMSidebar: "NotebookLM: Apri barra laterale",
    cmdOpenGeminiSidebar: "Gemini: Apri barra laterale",
    cmdSendSelectionNotebookLM: "NotebookLM: Invia selezione alla barra laterale",
    cmdSendSelectionGemini: "Gemini: Invia selezione a Gemini nella barra laterale",
    cmdSearchGoogle: "Google: Cerca selezione nel browser esterno",

    contextMenuNotebookLM: "NotebookLM",
    contextMenuGemini: "Gemini",
    contextMenuGoogle: "Ricerca Google",

    noticeNoText: "Seleziona del testo da inviare.",
    noticeNoTextSearch: "Seleziona del testo da cercare.",
    noticeAddNotebookFirst: "Aggiungi prima un taccuino nella scheda „NotebookLM”!",
    noticeCopiedAndOpened: "📋 „{name}” copiato e aperto nella barra laterale!",
    noticeOpenedInSidebar: "📓 Apertura di „{name}” nella barra laterale...",
    noticeGeminiSending: "✨ Invio della domanda a Gemini nella barra laterale...",
    noticeNoNotebooksToCheck: "Nessun taccuino aggiunto da verificare.",
    noticeAllNotebooksActive: "✅ Tutti i taccuini ({count}) sono attivi e disponibili!",
    noticeSomeNotebooksUnavailable: "⚠️ Trovati {invalidCount} taccuini non disponibili su {checkedCount}.",
    noticeAutoRemoved: "🗑️ Rimossi automaticamente {count} taccuini non disponibili.",
    noticeEnterNotebookName: "Inserisci un nome per il taccuino!",
    noticeInvalidUrlOrId: "URL o ID del taccuino non valido!",
    noticeNotebookAdded: "✅ Taccuino aggiunto: „{name}”",
    noticeNotebookUpdated: "✅ Taccuino aggiornato: „{name}”",
    noticeAutoScanFound: "⚡ Associate automaticamente {count} cartelle ai taccuini!",
    noticeAutoScanNone: "Nessuna cartella corrispondente ai taccuini trovata.",
    noticeSelectFolderOrNote: "Seleziona una cartella o una nota!",
    noticeSelectNotebook: "Seleziona un taccuino di NotebookLM!",
    noticeRuleExists: "Una regola per questo percorso esiste già!",
    noticeRuleAdded: "✅ Regola di associazione creata con successo!",

    mobileViewTitle: "Solo Webview Desktop",
    mobileViewDesc: "I pannelli Webview incorporati sono disponibili solo su desktop. Tocca in basso per aprire nel browser.",
    openInBrowser: "Apri nel browser",

    tabAbout: "Info",
    tabNotebookLM: "NotebookLM",
    tabMappings: "Associazione Note",
    tabSettings: "Impostazioni",

    heroTitle: "AI Bridge — NotebookLM & Gemini",
    heroAuthor: "Autore: Cesemess",
    heroDesc: "Ponte fluido per collegare le tue note Obsidian con gli ambienti ufficiali di Google NotebookLM e Gemini.",
    qsTitle: "Guida rapida — Come iniziare?",
    qsStep1Title: "Aggiungi il tuo taccuino: ",
    qsStep1Desc: "Nella scheda „NotebookLM”, clicca su „Aggiungi taccuino” e incolla il link dal browser. Il plugin riconoscerà l'ID e ti permetterà di nominarlo.",
    qsStep2Title: "Associa a una materia o cartella: ",
    qsStep2Desc: "Nella scheda „Associazione Note”, scegli quale cartella o nota in Obsidian apre questo taccuino (o usa l'abbinamento automatico).",
    qsStep3Title: "Seleziona il testo e chiedi col tasto destro: ",
    qsStep3Desc: "In qualsiasi nota, seleziona del testo, fai clic destro e scegli „📓 NotebookLM”: la domanda verrà inviata direttamente nella barra laterale.",

    langSelectName: "Lingua dell'interfaccia",
    langSelectDesc: "Scegli la lingua di visualizzazione del plugin.",
    langAuto: "Automatica (sistema)",

    guideTitle: "Come funziona AI Bridge e buone pratiche",
    guideBridgeTitle: "Il plugin è rigorosamente un Ponte (Bridge)",
    guideBridgeDesc: "Il plugin non genera risposte in autonomia e non usa API di terze parti. Il suo unico scopo è instradare all'istante le tue domande da Obsidian al tuo spazio ufficiale Google NotebookLM (e Gemini) nella barra laterale.",
    guideQualityTitle: "I risultati dipendono direttamente dai materiali caricati",
    guideQualityDesc: "NotebookLM basa il 100% delle risposte sui materiali di studio caricati (RAG). Un taccuino vuoto produce risposte vaghe, mentre uno ben curato fornisce risposte precise con citazioni di pagina esatte.",
    guidePracticeTitle: "Buona pratica: un taccuino dedicato per ogni materia",
    guidePracticeDesc: "Crea un taccuino separato in NotebookLM per ogni corso o progetto (es. „Psicologia dell'educazione”, „Statistica”) e carica fonti complete:",
    guideBullet1: "📚 Libri e articoli: manuali di testo ufficiali, dispense e articoli accademici (PDF)",
    guideBullet2: "📑 Presentazioni: slide delle lezioni, dispense e riassunti",
    guideBullet3: "🎙️ Trascrizioni: trascrizioni audio/video delle lezioni e registrazioni",
    guideCalloutTitle: "In pratica: ",
    guideCalloutText: "Studiando in Obsidian, seleziona un concetto poco chiaro e ottieni una spiegazione fondata sui tuoi testi d'esame — senza allucinazioni, senza supposizioni.",

    coffeeBannerText: "Ti piace il plugin? Offrimi un caffè!",
    coffeeBannerSubtext: " Sostieni lo sviluppo e gli aggiornamenti.",
    coffeeBannerBtn: "Offrimi un caffè",
    supportTitle: "Sostieni il Progetto",
    supportDesc: "Questo plugin è completamente gratuito e open source. Se migliora il tuo studio e lavoro in Obsidian, offrire un caffè è un modo splendido per ringraziare e sostenere i futuri sviluppi!",
    supportBtnText: "Offrimi un caffè",
    hideSupportName: "Nascondi supporto",
    hideSupportDesc: "Nasconde il banner di supporto in cima alle impostazioni e l'icona della tazza di caffè nell'intestazione della barra laterale.",
    linksTitle: "Informazioni sul progetto",
    linksGithub: "Repository GitHub",
    linksIssues: "Segnala un bug o suggerisci una funzione",

    manageNotebooksTitle: "Gestisci taccuini NotebookLM",
    addNotebookBtn: "Aggiungi taccuino",
    checkAvailabilityBtn: "Verifica disponibilità",
    startupCheckName: "Verifica all'avvio di Obsidian",
    startupCheckDesc: "Controlla la disponibilità dei taccuini aggiunti all'avvio di Obsidian.",
    autoRemoveInvalidName: "Rimuovi automaticamente taccuini cancellati",
    autoRemoveInvalidDesc: "Rimuove automaticamente i taccuini che restituiscono un errore 404 durante la verifica.",
    yourNotebooksTitle: "I tuoi taccuini ({count})",
    emptyNotebooksTitle: "Nessun taccuino aggiunto",
    emptyNotebooksDesc: "Clicca su „Aggiungi taccuino” per incollare il link del tuo taccuino di Google NotebookLM.",
    defaultBadge: "Predefinito",
    statusActive: "🟢 Attivo",
    statusUnavailable: "🔴 Non disponibile",
    statusUnverified: "⚪ Non verificato",
    actionOpenInBrowser: "Apri nel browser",
    actionSetAsDefault: "Imposta come predefinito",
    actionIsDefault: "Taccuino predefinito",
    actionEdit: "Modifica",
    actionDelete: "Elimina",

    autoMatchTitle: "Abbinamento Automatico (Auto-Match)",
    enableAutoMatchName: "Attiva abbinamento automatico",
    enableAutoMatchDesc: "Indirizza automaticamente le note a un taccuino se il nome della cartella o della nota corrisponde al taccuino.",
    scanFoldersName: "Scansiona cartelle e associa ora",
    scanFoldersDesc: "Scansiona le cartelle del vault e crea regole per quelle che corrispondono ai nomi dei taccuini.",
    scanFoldersBtn: "⚡ Controlla e associa ora",
    defaultNotebookName: "Taccuino predefinito",
    defaultNotebookDesc: "Gestisce tutte le note non associate (mostrato con carattere viola).",
    defaultNotebookNone: "— Nessuno (chiedi all'invio) —",
    mappingRulesTitle: "Regole di associazione ({count})",
    chooseFolderOrNote: "— Scegli cartella o nota —",
    optgroupFolders: "📁 Cartelle",
    optgroupFiles: "📄 Note",
    chooseNotebook: "— Scegli taccuino NotebookLM —",
    assignBtn: "Associa",
    emptyRulesTitle: "Nessuna regola di associazione presente",
    emptyRulesDesc: "Seleziona una cartella o nota in alto, scegli un taccuino e clicca su „Associa”.",
    targetFolder: "Cartella",
    targetNote: "Nota",

    contextMenuCardTitle: "Menu Contestuale (Tasto Destro / Touch)",
    showNotebookLMContextMenu: "Mostra NotebookLM nel menu contestuale",
    showGeminiContextMenu: "Mostra Gemini nel menu contestuale",
    showGoogleContextMenu: "Mostra Ricerca Google nel menu contestuale",
    behaviorCardTitle: "Comportamento azioni e appunti",
    autoSendName: "Invia automaticamente le domande",
    autoSendDesc: "Se attivo, le domande vengono inviate direttamente in NotebookLM/Gemini. Se disattivato, il testo viene solo incollato nel campo di chat.",
    copyClipboardName: "Copia testo selezionato negli appunti",
    copyClipboardDesc: "Copia il testo selezionato negli appunti di sistema all'apertura di NotebookLM o Gemini.",
    showNoticeName: "Mostra notifiche delle azioni",
    showNoticeDesc: "Mostra brevi avvisi su schermo quando vengono attivate le azioni.",
    searchCardTitle: "Ricerca Google",
    googleSearchUrlName: "Modello URL di ricerca",
    googleSearchUrlDesc: "Modello URL utilizzato per le ricerche web. Usa {query} come segnaposto.",
    sidebarHeaderCardTitle: "Intestazione Barra Laterale",
    hideNotebookLMHeaderName: "Nascondi barra superiore di Google in NotebookLM",
    hideNotebookLMHeaderDesc: "Nasconde l'intestazione di Google con logo e account per massimizzare lo spazio per note e chat.",
    hotkeysCardTitle: "Scorciatoie da tastiera",
    hotkeysConfigName: "Configura scorciatoie",
    hotkeysConfigDesc: "Assegna combinazioni di tasti per NotebookLM, Gemini e Google nelle impostazioni di Obsidian.",
    hotkeysOpenBtn: "Apri scorciatoie di Obsidian",

    addModalTitle: "Aggiungi taccuino NotebookLM",
    addModalDesc: "Incolla il link dal browser o l'ID del taccuino. Il plugin estrarrà automaticamente l'ID e suggerirà il titolo.",
    labelUrlOrId: "Link o ID del taccuino:",
    placeholderUrlOrId: "https://notebooklm.google.com/notebook/... o ID",
    labelName: "Nome del taccuino:",
    placeholderName: "es. Psicologia dell'educazione",
    checkboxSetDefault: "Imposta come taccuino predefinito",
    btnCancel: "Annulla",
    btnSave: "Salva",
    btnChecking: "⏳ Verifica...",
    btnValidId: "✓ ID valido: {id}",
    btnInvalidId: "⚠️ Formato ID non valido",
    editModalTitle: "Modifica taccuino",
    deleteModalTitle: "Eliminare il taccuino?",
    deleteModalDesc: "Sei sicuro di voler eliminare „{name}”? Verranno rimosse anche tutte le regole di associazione collegate.",
    btnDeleteConfirm: "Elimina taccuino",
    suggestModalTitle: "Scegli taccuino per „{file}”",
    suggestModalDesc: "Questa nota non ha ancora un taccuino assegnato. Scegli dove inviare la tua domanda:",
    suggestCheckboxSave: "Salva questa associazione definitivamente per la cartella: {folder}",
    btnOpenAndSend: "Apri e Invia"
  }
};

let pluginInstance = null;

function getLang() {
  if (pluginInstance && pluginInstance.settings && pluginInstance.settings.language && pluginInstance.settings.language !== "auto") {
    return pluginInstance.settings.language;
  }
  const loc = (typeof window !== "undefined" && window.moment ? window.moment.locale() : "en").toLowerCase();
  const supported = ["pl", "de", "es", "fr", "zh", "ja", "ko", "pt", "ru", "it"];
  for (const s of supported) {
    if (loc.startsWith(s)) return s;
  }
  return "en";
}

function t(key, params = {}) {
  const lang = getLang();
  let str = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || (TRANSLATIONS.en && TRANSLATIONS.en[key]) || key;
  if (params && typeof params === "object") {
    Object.keys(params).forEach(k => {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), params[k]);
    });
  }
  return str;
}

// --------------------------------------------------------------------------
// Default Settings
// --------------------------------------------------------------------------
const DEFAULT_SETTINGS = {
  // Language
  language: "auto",

  // Context Menu (PPM) Toggles
  showNotebookLMInContextMenu: true,
  showGeminiInContextMenu: true,
  showGoogleInContextMenu: true,

  // Action Behavior
  autoSendQueries: true,
  copySelectionToClipboard: true,
  showCopyNotice: true,

  // NotebookLM Notebooks
  notebooks: [],
  defaultNotebookId: "",
  currentSidebarNotebookId: "",
  checkNotebooksOnStartup: true,
  autoRemoveInvalidNotebooks: false,

  // Note Mappings
  mappings: [],
  autoMatchByName: true,

  // Google Search
  googleSearchUrl: "https://www.google.com/search?q={query}",

  // Support / UI
  showCoffeeBanner: true,
  showCoffeeIconInHeader: true,
  hideNotebookLMHeader: true,
  hideSupport: false,
  activeTab: "about"
};

// --------------------------------------------------------------------------
// Helper Functions & SVG Assets
// --------------------------------------------------------------------------

const BMC_CUP_SVG = `<svg class="ai-bmc-cup-svg" viewBox="0 0 884 1279" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="logo-coffee" d="M472.623 590.836C426.682 610.503 374.546 632.802 306.976 632.802C278.71 632.746 250.58 628.868 223.353 621.274L270.086 1101.08C271.74 1121.13 280.876 1139.83 295.679 1153.46C310.482 1167.09 329.87 1174.65 349.992 1174.65C349.992 1174.65 416.254 1178.09 438.365 1178.09C462.161 1178.09 533.516 1174.65 533.516 1174.65C553.636 1174.65 573.019 1167.08 587.819 1153.45C602.619 1139.82 611.752 1121.13 613.406 1101.08L663.459 570.876C641.091 563.237 618.516 558.161 593.068 558.161C549.054 558.144 513.591 573.303 472.623 590.836Z" fill="#ffffff"/><path class="logo-outline" d="M879.567 341.849L872.53 306.352C866.215 274.503 851.882 244.409 819.19 232.898C808.711 229.215 796.821 227.633 788.786 220.01C780.751 212.388 778.376 200.55 776.518 189.572C773.076 169.423 769.842 149.257 766.314 129.143C763.269 111.85 760.86 92.4243 752.928 76.56C742.604 55.2584 721.182 42.8009 699.88 34.559C688.965 30.4844 677.826 27.0375 666.517 24.2352C613.297 10.1947 557.342 5.03277 502.591 2.09047C436.875 -1.53577 370.983 -0.443234 305.422 5.35968C256.625 9.79894 205.229 15.1674 158.858 32.0469C141.91 38.224 124.445 45.6399 111.558 58.7341C95.7448 74.8221 90.5829 99.7026 102.128 119.765C110.336 134.012 124.239 144.078 138.985 150.737C158.192 159.317 178.251 165.846 198.829 170.215C256.126 182.879 315.471 187.851 374.007 189.968C438.887 192.586 503.87 190.464 568.44 183.618C584.408 181.863 600.347 179.758 616.257 177.304C634.995 174.43 647.022 149.928 641.499 132.859C634.891 112.453 617.134 104.538 597.055 107.618C594.095 108.082 591.153 108.512 588.193 108.942L586.06 109.252C579.257 110.113 572.455 110.915 565.653 111.661C551.601 113.175 537.515 114.414 523.394 115.378C491.768 117.58 460.057 118.595 428.363 118.647C397.219 118.647 366.058 117.769 334.983 115.722C320.805 114.793 306.661 113.611 292.552 112.177C286.134 111.506 279.733 110.801 273.333 110.009L267.241 109.235L265.917 109.046L259.602 108.134C246.697 106.189 233.792 103.953 221.025 101.251C219.737 100.965 218.584 100.249 217.758 99.2193C216.932 98.1901 216.482 96.9099 216.482 95.5903C216.482 94.2706 216.932 92.9904 217.758 91.9612C218.584 90.9319 219.737 90.2152 221.025 89.9293H221.266C232.33 87.5721 243.479 85.5589 254.663 83.8038C258.392 83.2188 262.131 82.6453 265.882 82.0832H265.985C272.988 81.6186 280.026 80.3625 286.994 79.5366C347.624 73.2301 408.614 71.0801 469.538 73.1014C499.115 73.9618 528.676 75.6996 558.116 78.6935C564.448 79.3474 570.746 80.0357 577.043 80.8099C579.452 81.1025 581.878 81.4465 584.305 81.7391L589.191 82.4445C603.438 84.5667 617.61 87.1419 631.708 90.1703C652.597 94.7128 679.422 96.1925 688.713 119.077C691.673 126.338 693.015 134.408 694.649 142.03L696.732 151.752C696.786 151.926 696.826 152.105 696.852 152.285C701.773 175.227 706.7 198.169 711.632 221.111C711.994 222.806 712.002 224.557 711.657 226.255C711.312 227.954 710.621 229.562 709.626 230.982C708.632 232.401 707.355 233.6 705.877 234.504C704.398 235.408 702.75 235.997 701.033 236.236H700.895L697.884 236.649L694.908 237.044C685.478 238.272 676.038 239.419 666.586 240.486C647.968 242.608 629.322 244.443 610.648 245.992C573.539 249.077 536.356 251.102 499.098 252.066C480.114 252.57 461.135 252.806 442.162 252.771C366.643 252.712 291.189 248.322 216.173 239.625C208.051 238.662 199.93 237.629 191.808 236.58C198.106 237.389 187.231 235.96 185.029 235.651C179.867 234.928 174.705 234.177 169.543 233.397C152.216 230.798 134.993 227.598 117.7 224.793C96.7944 221.352 76.8005 223.073 57.8906 233.397C42.3685 241.891 29.8055 254.916 21.8776 270.735C13.7217 287.597 11.2956 305.956 7.64786 324.075C4.00009 342.193 -1.67805 361.688 0.472751 380.288C5.10128 420.431 33.165 453.054 73.5313 460.35C111.506 467.232 149.687 472.807 187.971 477.556C338.361 495.975 490.294 498.178 641.155 484.129C653.44 482.982 665.708 481.732 677.959 480.378C681.786 479.958 685.658 480.398 689.292 481.668C692.926 482.938 696.23 485.005 698.962 487.717C701.694 490.429 703.784 493.718 705.08 497.342C706.377 500.967 706.846 504.836 706.453 508.665L702.633 545.797C694.936 620.828 687.239 695.854 679.542 770.874C671.513 849.657 663.431 928.434 655.298 1007.2C653.004 1029.39 650.71 1051.57 648.416 1073.74C646.213 1095.58 645.904 1118.1 641.757 1139.68C635.218 1173.61 612.248 1194.45 578.73 1202.07C548.022 1209.06 516.652 1212.73 485.161 1213.01C450.249 1213.2 415.355 1211.65 380.443 1211.84C343.173 1212.05 297.525 1208.61 268.756 1180.87C243.479 1156.51 239.986 1118.36 236.545 1085.37C231.957 1041.7 227.409 998.039 222.9 954.381L197.607 711.615L181.244 554.538C180.968 551.94 180.693 549.376 180.435 546.76C178.473 528.023 165.207 509.681 144.301 510.627C126.407 511.418 106.069 526.629 108.168 546.76L120.298 663.214L145.385 904.104C152.532 972.528 159.661 1040.96 166.773 1109.41C168.15 1122.52 169.44 1135.67 170.885 1148.78C178.749 1220.43 233.465 1259.04 301.224 1269.91C340.799 1276.28 381.337 1277.59 421.497 1278.24C472.979 1279.07 524.977 1281.05 575.615 1271.72C650.653 1257.95 706.952 1207.85 714.987 1130.13C717.282 1107.69 719.576 1085.25 721.87 1062.8C729.498 988.559 737.115 914.313 744.72 840.061L769.601 597.451L781.009 486.263C781.577 480.749 783.905 475.565 787.649 471.478C791.392 467.391 796.352 464.617 801.794 463.567C823.25 459.386 843.761 452.245 859.023 435.916C883.318 409.918 888.153 376.021 879.567 341.849ZM72.4301 365.835C72.757 365.68 72.1548 368.484 71.8967 369.792C71.8451 367.813 71.9483 366.058 72.4301 365.835ZM74.5121 381.94C74.6842 381.819 75.2003 382.508 75.7337 383.334C74.925 382.576 74.4089 382.009 74.4949 381.94H74.5121ZM76.5597 384.641C77.2996 385.897 77.6953 386.689 76.5597 384.641V384.641ZM80.672 387.979H80.7752C80.7752 388.1 80.9645 388.22 81.0333 388.341C80.9192 388.208 80.7925 388.087 80.6548 387.979H80.672ZM800.796 382.989C793.088 390.319 781.473 393.726 769.996 395.43C641.292 414.529 510.713 424.199 380.597 419.932C287.476 416.749 195.336 406.407 103.144 393.382C94.1102 392.109 84.3197 390.457 78.1082 383.798C66.4078 371.237 72.1548 345.944 75.2003 330.768C77.9878 316.865 83.3218 298.334 99.8572 296.355C125.667 293.327 155.64 304.218 181.175 308.09C211.917 312.781 242.774 316.538 273.745 319.36C405.925 331.405 540.325 329.529 671.92 311.91C695.906 308.686 719.805 304.941 743.619 300.674C764.835 296.871 788.356 289.731 801.175 311.703C809.967 326.673 811.137 346.701 809.778 363.615C809.359 370.984 806.139 377.915 800.779 382.989H800.796Z" fill="#0D0C22"/></svg>`;

function renderBmcButtonContent(containerEl, labelText) {
  containerEl.empty();
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(BMC_CUP_SVG, "image/svg+xml");
    if (doc.documentElement) {
      containerEl.appendChild(containerEl.ownerDocument.importNode(doc.documentElement, true));
    }
  } catch (e) {}
  containerEl.createSpan({ cls: "ai-coffee-btn-text", text: labelText });
}
function extractNotebookId(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  const urlMatch = trimmed.match(/\/notebook\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch && urlMatch[1] && urlMatch[1].length >= 6) {
    return urlMatch[1];
  }

  const plainMatch = trimmed.match(/^[a-zA-Z0-9_-]{6,}$/);
  if (plainMatch) {
    return trimmed;
  }

  return null;
}

async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed:", err);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.className = "ai-clipboard-textarea";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (fallbackErr) {
    console.error("Clipboard copy fallback error:", fallbackErr);
    return false;
  }
}

function openExternalUrl(url) {
  try {
    window.open(url, "_blank");
  } catch (e) {
    console.error("Failed to open URL:", url, e);
  }
}

let activeFetchCleanup = null;

function cancelActiveTitleFetch() {
  if (activeFetchCleanup) {
    try {
      activeFetchCleanup();
    } catch (e) {}
    activeFetchCleanup = null;
  }
}

/**
 * Intelligent Title Fetcher:
 * Tries to fetch notebook title from webview session without generic fallback
 */
function fetchNotebookTitle(id, callback) {
  cancelActiveTitleFetch();

  if (typeof document !== "undefined" && document.createElement && !Platform.isMobile) {
    try {
      const wv = document.createElement("webview");
      wv.className = "ai-hidden-fetch-webview";
      wv.setAttribute("data-ai-bridge-fetch", "true");
      wv.setAttribute("partition", GOOGLE_PARTITION);
      wv.setAttribute("useragent", GOOGLE_USER_AGENT);
      wv.setAttribute("nodeintegration", "false");
      wv.setAttribute("webpreferences", "contextIsolation=true");
      wv.setAttribute("src", `https://notebooklm.google.com/notebook/${id}`);
      document.body.appendChild(wv);

      let finished = false;
      const cleanup = () => {
        if (!finished) {
          finished = true;
          if (activeFetchCleanup === cleanup) {
            activeFetchCleanup = null;
          }
          try {
            if (typeof wv.stop === "function") wv.stop();
            if (wv.parentNode) wv.parentNode.removeChild(wv);
          } catch (e) {}
        }
      };

      activeFetchCleanup = cleanup;

      const timer = setTimeout(() => {
        if (!finished) {
          cleanup();
          callback(null);
        }
      }, 5500);

      wv.addEventListener("dom-ready", () => {
        setTimeout(async () => {
          if (finished) return;
          try {
            const rawTitle = await wv.executeJavaScript(`
              (function() {
                const generic = [
                  "gemini notebook", "notebooklm", "google notebooklm",
                  "gemini", "google", "sign in", "google accounts", "untitled"
                ];

                function isValid(str) {
                  if (!str || typeof str !== 'string') return false;
                  const s = str.trim().toLowerCase();
                  if (s.length < 2) return false;
                  return !generic.some(g => s === g || s.startsWith(g + " -") || s.includes("sign in"));
                }

                const titleInput = document.querySelector('input.title-input, textarea.title-textarea, [aria-label*="title" i], [aria-label*="tytuł" i], .project-title, .title-text, h1');
                if (titleInput) {
                  const val = titleInput.value || titleInput.innerText || titleInput.textContent;
                  if (isValid(val)) return val.trim();
                }

                let docT = document.title || "";
                docT = docT.replace(/\\s*-\\s*NotebookLM.*/i, "").replace(/NotebookLM/i, "").trim();
                if (isValid(docT)) return docT;

                return null;
              })()
            `);
            clearTimeout(timer);
            cleanup();
            callback(rawTitle);
          } catch (e) {
            clearTimeout(timer);
            cleanup();
            callback(null);
          }
        }, 1200);
      });
      return;
    } catch (e) {
      console.warn("Webview title fetch error:", e);
    }
  }

  callback(null);
}

// --------------------------------------------------------------------------
// Main Plugin Class
// --------------------------------------------------------------------------
class AIBridgePlugin extends Plugin {
  constructor(app, manifest) {
    super(app, manifest);
    pluginInstance = this;
    this.activeTimeouts = new Set();
  }

  async onload() {
    pluginInstance = this;
    await this.loadSettings();

    // Register Right Sidebar Views
    this.registerView(
      VIEW_TYPE_NOTEBOOKLM,
      leaf => new AINotebookLMSidebarView(leaf, this)
    );
    this.registerView(
      VIEW_TYPE_GEMINI,
      leaf => new AIGeminiSidebarView(leaf, this)
    );

    // Register Context Menu
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        const selection = editor.getSelection().trim();
        if (!selection) return;

        if (this.settings.showNotebookLMInContextMenu) {
          menu.addItem(item => {
            item
              .setTitle(`📓 ${t("contextMenuNotebookLM")}`)
              .setIcon("book-marked")
              .onClick(() => {
                this.handleNotebookLMAction(selection, view?.file);
              });
          });
        }

        if (this.settings.showGeminiInContextMenu) {
          menu.addItem(item => {
            item
              .setTitle(`✦ ${t("contextMenuGemini")}`)
              .setIcon("sparkles")
              .onClick(() => {
                this.handleGeminiAction(selection);
              });
          });
        }

        if (this.settings.showGoogleInContextMenu) {
          menu.addItem(item => {
            item
              .setTitle(`🔍 ${t("contextMenuGoogle")}`)
              .setIcon("search")
              .onClick(() => {
                this.handleGoogleAction(selection);
              });
          });
        }
      })
    );

    // Register Commands
    this.registerCommands();

    // Add Settings Tab
    this.addSettingTab(new AIBridgeSettingTab(this.app, this));

    // Ensure open sidebars have updated notebooks and toolbars on layout ready
    this.app.workspace.onLayoutReady(() => {
      this.updateSidebarNotebooks();
      this.updateSidebarToolbars();
    });

    // Startup Notebook Health Check
    if (this.settings.checkNotebooksOnStartup && this.settings.notebooks.length > 0) {
      this.setTrackedTimeout(() => {
        this.verifyAllNotebooks(false);
      }, 3500);
    }
  }

  onunload() {
    // Detach leaves of our views to prevent orphaned webview processes
    try {
      this.app.workspace.detachLeavesOfType(VIEW_TYPE_NOTEBOOKLM);
      this.app.workspace.detachLeavesOfType(VIEW_TYPE_GEMINI);
    } catch (e) {}

    // Cancel any active background title fetch
    cancelActiveTitleFetch();

    // Clear tracked timeouts
    if (this.activeTimeouts) {
      this.activeTimeouts.forEach(tId => clearTimeout(tId));
      this.activeTimeouts.clear();
    }

    // Clean up any lingering hidden fetch webviews
    if (typeof document !== "undefined") {
      document.querySelectorAll("webview.ai-hidden-fetch-webview, webview[data-ai-bridge-fetch]").forEach(el => {
        try {
          if (el.parentNode) el.parentNode.removeChild(el);
        } catch (e) {}
      });
    }

    pluginInstance = null;
  }

  setTrackedTimeout(fn, ms) {
    const timer = setTimeout(() => {
      this.activeTimeouts.delete(timer);
      fn();
    }, ms);
    this.activeTimeouts.add(timer);
    return timer;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (this.settings.hideSupport === undefined) {
      this.settings.hideSupport = (this.settings.showCoffeeBanner === false && this.settings.showCoffeeIconInHeader === false);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateSidebarNotebooks();
  }

  openPluginSettings() {
    try {
      this.app.setting.open();
      this.app.setting.openTabById(this.manifest.id);
    } catch (e) {
      console.warn("Could not open settings tab directly:", e);
    }
  }

  updateSidebarToolbars() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTEBOOKLM).forEach(l => {
      if (l.view && typeof l.view.renderToolbarButtons === "function") {
        l.view.renderToolbarButtons();
      }
    });
    this.app.workspace.getLeavesOfType(VIEW_TYPE_GEMINI).forEach(l => {
      if (l.view && typeof l.view.renderToolbarButtons === "function") {
        l.view.renderToolbarButtons();
      }
    });
  }

  updateSidebarNotebooks() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTEBOOKLM).forEach(l => {
      if (l.view && typeof l.view.updateNotebookSelect === "function") {
        l.view.updateNotebookSelect();
      }
    });
  }

  async activateNotebookLMView(notebookId = null, queryText = null) {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_NOTEBOOKLM)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({ type: VIEW_TYPE_NOTEBOOKLM, active: true });
        leaf = rightLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
      const view = leaf.view;
      if (view) {
        if (typeof view.updateNotebookSelect === "function") {
          view.updateNotebookSelect(notebookId);
        }
        const isSwitching = Boolean(notebookId && view.currentNotebookId && view.currentNotebookId !== notebookId);
        if (notebookId) {
          view.loadNotebook(notebookId);
        }
        if (queryText) {
          view.sendQuery(queryText, notebookId, isSwitching);
        }
      }
      return leaf.view;
    }
    return null;
  }

  async activateGeminiView(queryText = null) {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_GEMINI)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({ type: VIEW_TYPE_GEMINI, active: true });
        leaf = rightLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
      const view = leaf.view;
      if (view && queryText) {
        view.sendQuery(queryText);
      }
      return leaf.view;
    }
    return null;
  }

  resolveNotebookForFile(file) {
    if (!file) return this.resolveFallbackNotebook();

    const fileCache = this.app.metadataCache.getFileCache(file);
    if (fileCache?.frontmatter) {
      const fmName =
        fileCache.frontmatter.notebooklm ||
        fileCache.frontmatter["notebook-lm"] ||
        fileCache.frontmatter.notebook;
      if (fmName) {
        const found = this.settings.notebooks.find(
          n => n.name.toLowerCase() === String(fmName).trim().toLowerCase()
        );
        if (found) return found;
      }

      const fmId =
        fileCache.frontmatter.notebook_id ||
        fileCache.frontmatter.notebookId ||
        fileCache.frontmatter["notebook-id"];
      if (fmId) {
        const found = this.settings.notebooks.find(
          n => n.id.toLowerCase() === String(fmId).trim().toLowerCase()
        );
        if (found) return found;
      }
    }

    const fileRule = this.settings.mappings.find(
      m => m.type === "file" && m.path === file.path
    );
    if (fileRule) {
      const nb = this.settings.notebooks.find(n => n.id === fileRule.notebookId);
      if (nb) return nb;
    }

    const folderRules = this.settings.mappings
      .filter(m => m.type === "folder")
      .sort((a, b) => b.path.length - a.path.length);

    for (const rule of folderRules) {
      if (
        file.path.startsWith(rule.path + "/") ||
        file.path === rule.path ||
        file.parent?.path === rule.path
      ) {
        const nb = this.settings.notebooks.find(n => n.id === rule.notebookId);
        if (nb) return nb;
      }
    }

    if (this.settings.autoMatchByName) {
      const parentName = file.parent?.name?.toLowerCase();
      if (parentName) {
        const match = this.settings.notebooks.find(
          n => n.name.toLowerCase() === parentName
        );
        if (match) return match;
      }
    }

    return this.resolveFallbackNotebook();
  }

  resolveFallbackNotebook() {
    if (this.settings.defaultNotebookId) {
      const def = this.settings.notebooks.find(
        n => n.id === this.settings.defaultNotebookId
      );
      if (def) return def;
    }
    if (this.settings.notebooks.length === 1) {
      return this.settings.notebooks[0];
    }
    return null;
  }

  async handleNotebookLMAction(text, file) {
    let targetNotebook = this.resolveNotebookForFile(file);

    if (!targetNotebook) {
      if (this.settings.notebooks.length === 0) {
        new Notice(t("noticeAddNotebookFirst"));
        return;
      }

      new NotebookSuggestModal(this.app, this, file, async chosenNotebook => {
        if (chosenNotebook) {
          await this.executeNotebookLMOpen(chosenNotebook, text);
        }
      }).open();
      return;
    }

    await this.executeNotebookLMOpen(targetNotebook, text);
  }

  async executeNotebookLMOpen(notebook, text) {
    if (this.settings.copySelectionToClipboard !== false) {
      await copyToClipboard(text);
    }

    if (this.settings.showCopyNotice) {
      if (this.settings.copySelectionToClipboard !== false) {
        new Notice(t("noticeCopiedAndOpened", { name: notebook.name }));
      } else {
        new Notice(t("noticeOpenedInSidebar", { name: notebook.name }));
      }
    }

    if (!Platform.isMobile) {
      await this.activateNotebookLMView(notebook.id, text);
    } else {
      openExternalUrl(`https://notebooklm.google.com/notebook/${notebook.id}`);
    }
  }

  async handleGeminiAction(text) {
    if (this.settings.copySelectionToClipboard !== false) {
      await copyToClipboard(text);
    }

    if (this.settings.showCopyNotice) {
      new Notice(t("noticeGeminiSending"));
    }

    if (!Platform.isMobile) {
      await this.activateGeminiView(text);
    } else {
      openExternalUrl("https://gemini.google.com/app");
    }
  }

  handleGoogleAction(text) {
    const template =
      this.settings.googleSearchUrl || "https://www.google.com/search?q={query}";
    const searchUrl = template.replace("{query}", encodeURIComponent(text));
    openExternalUrl(searchUrl);
  }

  // ------------------------------------------------------------------------
  // NotebookLM Health Check
  // ------------------------------------------------------------------------
  async verifyAllNotebooks(showVerboseNotice = true) {
    if (this.settings.notebooks.length === 0) {
      if (showVerboseNotice) new Notice(t("noticeNoNotebooksToCheck"));
      return;
    }

    let checkedCount = 0;
    let invalidCount = 0;

    for (const nb of this.settings.notebooks) {
      checkedCount++;
      const validFormat = extractNotebookId(nb.id);
      if (!validFormat) {
        nb.status = "error";
        invalidCount++;
        nb.lastChecked = Date.now();
        continue;
      }

      try {
        const res = await requestUrl({
          url: `https://notebooklm.google.com/notebook/${nb.id}`,
          method: "GET",
          throw: false
        });

        const isLoginRedirect = res.headers && (
          (res.headers["location"] && res.headers["location"].includes("accounts.google.com")) ||
          (res.text && (res.text.includes("accounts.google.com") || res.text.includes("identifier?continue=")))
        );

        if (res.status === 404 || (res.status >= 500 && !isLoginRedirect)) {
          nb.status = "error";
          invalidCount++;
        } else {
          nb.status = "verified";
        }
        nb.lastChecked = Date.now();
      } catch (e) {
        // If offline or network issue, don't falsely delete notebooks
        nb.status = "unverified";
        nb.lastChecked = Date.now();
      }
    }

    let removedCount = 0;
    if (this.settings.autoRemoveInvalidNotebooks && invalidCount > 0) {
      const validNotebooks = this.settings.notebooks.filter(nb => nb.status !== "error");
      removedCount = this.settings.notebooks.length - validNotebooks.length;
      this.settings.notebooks = validNotebooks;

      const validIds = new Set(validNotebooks.map(nb => nb.id));
      this.settings.mappings = this.settings.mappings.filter(m => validIds.has(m.notebookId));
      if (!validIds.has(this.settings.defaultNotebookId)) {
        this.settings.defaultNotebookId = "";
      }
      if (!validIds.has(this.settings.currentSidebarNotebookId)) {
        this.settings.currentSidebarNotebookId = validNotebooks[0]?.id || "";
      }
    }

    await this.saveSettings();
    this.updateSidebarNotebooks();

    if (showVerboseNotice) {
      if (invalidCount === 0) {
        new Notice(t("noticeAllNotebooksActive", { count: checkedCount }));
      } else {
        new Notice(t("noticeSomeNotebooksUnavailable", { invalidCount, checkedCount }));
        if (removedCount > 0) {
          new Notice(t("noticeAutoRemoved", { count: removedCount }));
        }
      }
    }
  }

  // ------------------------------------------------------------------------
  // Commands Registration
  // ------------------------------------------------------------------------
  registerCommands() {
    this.addCommand({
      id: "open-notebooklm-sidebar",
      name: t("cmdOpenNotebookLMSidebar"),
      callback: () => this.activateNotebookLMView()
    });

    this.addCommand({
      id: "open-gemini-sidebar",
      name: t("cmdOpenGeminiSidebar"),
      callback: () => this.activateGeminiView()
    });

    this.addCommand({
      id: "open-notebooklm-selection",
      name: t("cmdSendSelectionNotebookLM"),
      editorCallback: (editor, view) => {
        const selection = editor.getSelection().trim();
        if (selection) {
          this.handleNotebookLMAction(selection, view?.file);
        } else {
          new Notice(t("noticeNoText"));
        }
      }
    });

    this.addCommand({
      id: "open-gemini-selection",
      name: t("cmdSendSelectionGemini"),
      editorCallback: editor => {
        const selection = editor.getSelection().trim();
        if (selection) {
          this.handleGeminiAction(selection);
        } else {
          new Notice(t("noticeNoText"));
        }
      }
    });

    this.addCommand({
      id: "search-google-selection",
      name: t("cmdSearchGoogle"),
      editorCallback: editor => {
        const selection = editor.getSelection().trim();
        if (selection) {
          this.handleGoogleAction(selection);
        } else {
          new Notice(t("noticeNoTextSearch"));
        }
      }
    });
  }
}

// --------------------------------------------------------------------------
// Sidebar Views (Right Leaf)
// --------------------------------------------------------------------------

class AINotebookLMSidebarView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.currentNotebookId = plugin.settings.currentSidebarNotebookId || "";
    this.isDomReady = false;
    this.pendingQuery = null;
    this.pendingQueryTargetId = null;
  }

  getViewType() {
    return VIEW_TYPE_NOTEBOOKLM;
  }

  getDisplayText() {
    return "NotebookLM";
  }

  getIcon() {
    return "book-open";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("ai-sidebar-container");

    const toolbar = container.createDiv({ cls: "ai-sidebar-toolbar" });

    const leftGroup = toolbar.createDiv({ cls: "ai-sidebar-title-group" });
    const select = leftGroup.createEl("select", { cls: "ai-sidebar-select" });
    this.selectEl = select;
    this.updateNotebookSelect();

    select.addEventListener("change", () => {
      if (select.value) {
        this.loadNotebook(select.value);
      }
    });

    const btnGroup = toolbar.createDiv({ cls: "ai-sidebar-btn-group" });
    this.btnGroupEl = btnGroup;
    this.renderToolbarButtons();

    const wrap = container.createDiv({ cls: "ai-sidebar-webview-wrap" });

    if (!Platform.isMobile) {
      this.webview = document.createElement("webview");
      this.webview.className = "ai-sidebar-webview";
      this.webview.setAttribute("partition", GOOGLE_PARTITION);
      this.webview.setAttribute("useragent", GOOGLE_USER_AGENT);
      this.webview.setAttribute("allowpopups", "true");
      this.webview.setAttribute("nodeintegration", "false");
      this.webview.setAttribute("webpreferences", "contextIsolation=true");

      this.webview.addEventListener("new-window", (e) => {
        e.preventDefault();
        if (e.url) openExternalUrl(e.url);
      });

      this.webview.addEventListener("will-navigate", (e) => {
        const url = e.url || "";
        const isAllowed = url.includes("notebooklm.google.com") || url.includes("accounts.google.com");
        if (!isAllowed) {
          e.preventDefault();
          openExternalUrl(url);
        }
      });

      const triggerPendingQuery = (delay = 1000) => {
        this.isDomReady = true;
        this.applyHeaderHiding();
        if (this.pendingQuery) {
          const q = this.pendingQuery;
          const targetId = this.pendingQueryTargetId || this.currentNotebookId;
          this.pendingQuery = null;
          this.pendingQueryTargetId = null;
          this.plugin.setTrackedTimeout(() => this.sendQuery(q, targetId, false), delay);
        }
      };

      this.webview.addEventListener("dom-ready", () => {
        triggerPendingQuery(1000);
      });

      this.webview.addEventListener("did-finish-load", () => {
        triggerPendingQuery(1000);
      });

      this.webview.addEventListener("did-navigate", () => {
        triggerPendingQuery(1200);
      });

      wrap.appendChild(this.webview);

      if (this.currentNotebookId) {
        this.loadNotebook(this.currentNotebookId);
      } else if (this.plugin.settings.notebooks.length > 0) {
        this.loadNotebook(this.plugin.settings.notebooks[0].id);
      } else {
        this.webview.setAttribute("src", "https://notebooklm.google.com");
      }
    } else {
      const emptyState = wrap.createDiv({ cls: "ai-empty-state ai-mobile-empty-state" });
      const iconSpan = emptyState.createDiv({ cls: "ai-empty-state-icon" });
      setIcon(iconSpan, "monitor");
      emptyState.createDiv({ cls: "ai-empty-state-title", text: t("mobileViewTitle") });
      emptyState.createDiv({ cls: "ai-empty-state-desc", text: t("mobileViewDesc") });

      const openBtn = emptyState.createEl("button", { cls: "ai-btn-primary ai-mobile-open-btn" });
      setIcon(openBtn.createSpan(), "external-link");
      openBtn.createSpan({ text: t("openInBrowser") });
      openBtn.addEventListener("click", () => {
        const id = this.currentNotebookId || this.plugin.settings.defaultNotebookId || (this.plugin.settings.notebooks[0]?.id || "");
        if (id) {
          openExternalUrl(`https://notebooklm.google.com/notebook/${id}`);
        } else {
          openExternalUrl("https://notebooklm.google.com");
        }
      });
    }
  }

  renderToolbarButtons() {
    if (!this.btnGroupEl) return;
    this.btnGroupEl.empty();

    // 1. External Browser
    const extBtn = this.btnGroupEl.createEl("button", {
      cls: "ai-nav-btn ai-btn-external",
      attr: { title: t("navOpenInBrowser"), "aria-label": t("navOpenInBrowser") }
    });
    setIcon(extBtn, "external-link");
    extBtn.addEventListener("click", () => {
      if (this.currentNotebookId) {
        openExternalUrl(`https://notebooklm.google.com/notebook/${this.currentNotebookId}`);
      } else {
        openExternalUrl("https://notebooklm.google.com");
      }
    });

    // 2. Refresh Page
    const refreshBtn = this.btnGroupEl.createEl("button", {
      cls: "ai-nav-btn ai-btn-refresh",
      attr: { title: t("navRefreshPage"), "aria-label": t("navRefreshPage") }
    });
    setIcon(refreshBtn, "refresh-cw");
    refreshBtn.addEventListener("click", () => {
      refreshBtn.addClass("is-refreshing");
      if (this.webview) this.webview.reload();
      this.plugin.setTrackedTimeout(() => refreshBtn.removeClass("is-refreshing"), 800);
    });

    // 3. Settings Gear
    const settingsBtn = this.btnGroupEl.createEl("button", {
      cls: "ai-nav-btn ai-btn-settings",
      attr: { title: t("navPluginSettings"), "aria-label": t("navPluginSettings") }
    });
    setIcon(settingsBtn, "settings");
    settingsBtn.addEventListener("click", () => {
      this.plugin.openPluginSettings();
    });

    // 4. Coffee Button (Strictly preserved Buy Me a Coffee element)
    if (!this.plugin.settings.hideSupport && this.plugin.settings.showCoffeeIconInHeader !== false) {
      const coffeeBtn = this.btnGroupEl.createEl("button", {
        cls: "ai-nav-btn ai-btn-coffee",
        attr: { title: t("navBuyCoffee"), "aria-label": t("navBuyCoffee") }
      });
      setIcon(coffeeBtn, "coffee");
      if (!coffeeBtn.querySelector("svg")) {
        coffeeBtn.textContent = "☕";
      }
      coffeeBtn.addEventListener("click", () => {
        openExternalUrl("https://buymeacoffee.com/cesemess");
      });
    }
  }

  updateNotebookSelect(targetId = null) {
    if (!this.selectEl) return;
    this.selectEl.empty();

    const notebooks = this.plugin.settings.notebooks || [];
    const activeId =
      targetId ||
      this.currentNotebookId ||
      this.plugin.settings.defaultNotebookId ||
      (notebooks[0]?.id || "");

    if (notebooks.length === 0) {
      this.selectEl.createEl("option", { value: "", text: t("navNoNotebooks") });
      this.currentNotebookId = "";
      return;
    }

    notebooks.forEach(nb => {
      this.selectEl.createEl("option", {
        value: nb.id,
        text: `📓 ${nb.name}`
      });
    });

    const exists = notebooks.some(nb => nb.id === activeId);
    if (exists) {
      this.currentNotebookId = activeId;
      this.selectEl.value = activeId;
    } else if (activeId) {
      this.selectEl.createEl("option", {
        value: activeId,
        text: `📓 Notes (${activeId.slice(0, 8)}...)`
      });
      this.currentNotebookId = activeId;
      this.selectEl.value = activeId;
    } else {
      this.currentNotebookId = notebooks[0].id;
      this.selectEl.value = notebooks[0].id;
    }
  }

  loadNotebook(id) {
    if (!id) return;
    const isNew = this.currentNotebookId !== id;
    this.currentNotebookId = id;
    this.plugin.settings.currentSidebarNotebookId = id;
    this.plugin.saveSettings();
    this.updateNotebookSelect(id);

    if (this.webview) {
      const targetSrc = `https://notebooklm.google.com/notebook/${id}`;
      let currentSrc = "";
      try {
        currentSrc = (typeof this.webview.getURL === "function" ? this.webview.getURL() : "") || this.webview.getAttribute("src") || "";
      } catch (e) {
        currentSrc = this.webview.getAttribute("src") || "";
      }

      if (isNew || !currentSrc.includes(id)) {
        this.isDomReady = false;
        try {
          if (typeof this.webview.loadURL === "function") {
            this.webview.loadURL(targetSrc);
          } else {
            this.webview.setAttribute("src", targetSrc);
          }
        } catch (e) {
          this.webview.setAttribute("src", targetSrc);
        }
      } else {
        this.applyHeaderHiding();
      }
    }
  }

  applyHeaderHiding() {
    if (!this.webview || this.plugin.settings.hideNotebookLMHeader === false) return;

    // Declarative CSS Injection for instant layout without top bar
    const cssToInject = `
      header:not(:has([role="tablist"])),
      [role="banner"]:not(:has([role="tablist"])),
      mat-toolbar:not(:has([role="tablist"])),
      nav:not(:has([role="tablist"])):not(:has([role="tab"])),
      app-header,
      project-header,
      notebook-header,
      single-notebook-header,
      navigation-bar,
      top-bar,
      .notebook-header,
      .header-container,
      div[class*="gb_"]:not(:has([role="tablist"])),
      div:has(> [class*="gb_"]),
      div:has([class*="gb_"]):not(:has([role="tablist"])),
      div:has(> a[href="/"]),
      div:has(> a[href="/notebooks"]),
      div:has(> a[href*="notebooklm.google.com"]):not(:has([role="tablist"])),
      .ai-bridge-hidden-header {
        display: none !important;
        height: 0px !important;
        min-height: 0px !important;
        max-height: 0px !important;
        margin: 0px !important;
        padding: 0px !important;
        border: none !important;
        overflow: hidden !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;

    try {
      this.webview.insertCSS(cssToInject);
    } catch (e) {}

    // Lightweight targeted DOM cleaner without CPU drain or polling
    const jsToInject = `
      (function() {
        const TARGET_SELECTORS = [
          'header:not(:has([role="tablist"]))',
          '[role="banner"]:not(:has([role="tablist"]))',
          'mat-toolbar:not(:has([role="tablist"]))',
          'app-header',
          'project-header',
          'notebook-header',
          'single-notebook-header',
          'navigation-bar',
          'top-bar',
          '.notebook-header',
          '.header-container',
          'div[class*="gb_"]:not(:has([role="tablist"]))'
        ];

        function hideHeader() {
          try {
            for (let i = 0; i < TARGET_SELECTORS.length; i++) {
              const elements = document.querySelectorAll(TARGET_SELECTORS[i]);
              for (let j = 0; j < elements.length; j++) {
                const el = elements[j];
                if (el && !el.classList.contains('ai-bridge-hidden-header')) {
                  if (el.querySelector && el.querySelector('[role="tablist"], [role="tab"]')) continue;
                  el.classList.add('ai-bridge-hidden-header');
                  el.style.setProperty('display', 'none', 'important');
                  el.style.setProperty('height', '0px', 'important');
                  el.style.setProperty('overflow', 'hidden', 'important');
                }
              }
            }
          } catch (e) {}
        }

        hideHeader();

        if (!window._aiBridgeHeaderObserver) {
          window._aiBridgeHeaderObserver = new MutationObserver(hideHeader);
          window._aiBridgeHeaderObserver.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
          });
        }
      })();
    `;

    try {
      this.webview.executeJavaScript(jsToInject).catch(() => {});
    } catch (e) {}
  }

  async sendQuery(queryText, targetNotebookId = this.currentNotebookId, isSwitching = false) {
    if (!this.webview) return;

    if (isSwitching || !this.isDomReady) {
      this.pendingQuery = queryText;
      this.pendingQueryTargetId = targetNotebookId;
      return;
    }

    const autoSend = this.plugin.settings.autoSendQueries !== false;
    const injectScript = `
      (function() {
        if (${JSON.stringify(targetNotebookId || "")}) {
          const expectedId = ${JSON.stringify(targetNotebookId || "")};
          if (!window.location.href.includes(expectedId)) {
            return false;
          }
        }

        const textareas = Array.from(document.querySelectorAll('textarea'));
        let input = textareas.find(t => {
          if (t.disabled || t.readOnly || t.offsetParent === null) return false;
          const ph = (t.placeholder || "").toLowerCase();
          const al = (t.getAttribute("aria-label") || "").toLowerCase();
          return ph.includes("zapytaj") || ph.includes("ask") || ph.includes("notebooklm") || al.includes("zapytaj") || al.includes("ask");
        });

        if (!input) {
          input = textareas.find(t => !t.disabled && !t.readOnly && t.offsetParent !== null);
        }

        if (!input) {
          const ce = document.querySelector('div[contenteditable="true"]');
          if (ce && ce.offsetParent !== null && ce.getAttribute('aria-disabled') !== 'true') {
            input = ce;
          }
        }

        if (!input) {
          const tabs = Array.from(document.querySelectorAll('[role="tab"], button, div[role="button"]'));
          const chatTab = tabs.find(el => {
            const t = (el.textContent || '').trim().toLowerCase();
            return t === 'czat' || t === 'chat';
          });
          if (chatTab) {
            const isSelected = chatTab.getAttribute('aria-selected') === 'true' || chatTab.classList.contains('active') || chatTab.classList.contains('selected');
            if (!isSelected) {
              chatTab.click();
            }
          }
          return false;
        }

        input.focus();

        const isContentEditable = input.getAttribute('contenteditable') === 'true';
        if (isContentEditable) {
          input.textContent = ${JSON.stringify(queryText)};
        } else {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
          if (nativeSetter) {
            nativeSetter.call(input, ${JSON.stringify(queryText)});
          } else {
            input.value = ${JSON.stringify(queryText)};
          }
        }

        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

        if (${autoSend}) {
          const clickSend = () => {
            const container = input.closest('form, div[class*="input"], div[class*="chat"], .chat-box') || document;
            const buttons = Array.from(container.querySelectorAll('button'));
            const sendBtn = buttons.find(b => {
              if (b.disabled || b.getAttribute('aria-disabled') === 'true') return false;
              const al = (b.getAttribute('aria-label') || '').toLowerCase();
              const tt = (b.getAttribute('mattooltip') || '').toLowerCase();
              const title = (b.getAttribute('title') || '').toLowerCase();
              return al.includes('wyślij') || al.includes('send') || tt.includes('wyślij') || tt.includes('send') || title.includes('wyślij') || title.includes('send') || b.classList.contains('send-button');
            }) || container.querySelector('button[type="submit"]:not(:disabled)');

            if (sendBtn) {
              sendBtn.click();
              return true;
            }
            return false;
          };

          if (!clickSend()) {
            setTimeout(() => {
              if (!clickSend()) {
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
              }
            }, 250);
          }
        }

        return true;
      })();
    `;

    const maxAttempts = isSwitching ? 18 : 10;
    const intervalMs = isSwitching ? 650 : 500;
    const initialDelay = isSwitching ? 1400 : 300;

    let attempts = 0;
    const trySend = async () => {
      attempts++;
      try {
        const ok = await this.webview.executeJavaScript(injectScript);
        if (!ok && attempts < maxAttempts) {
          this.plugin.setTrackedTimeout(trySend, intervalMs);
        }
      } catch (e) {
        if (attempts < maxAttempts) {
          this.plugin.setTrackedTimeout(trySend, intervalMs);
        }
      }
    };

    this.plugin.setTrackedTimeout(trySend, initialDelay);
  }

  async onClose() {
    this.isDomReady = false;
    this.pendingQuery = null;
    this.pendingQueryTargetId = null;
    if (this.webview) {
      try {
        if (typeof this.webview.stop === "function") this.webview.stop();
        this.webview.remove();
      } catch (e) {}
      this.webview = null;
    }
  }
}

class AIGeminiSidebarView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.isDomReady = false;
    this.pendingQuery = null;
  }

  getViewType() {
    return VIEW_TYPE_GEMINI;
  }

  getDisplayText() {
    return "Gemini";
  }

  getIcon() {
    return "sparkles";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("ai-sidebar-container");

    const toolbar = container.createDiv({ cls: "ai-sidebar-toolbar" });

    const titleGroup = toolbar.createDiv({ cls: "ai-sidebar-title-group" });
    setIcon(titleGroup.createSpan({ cls: "ai-sidebar-title-icon" }), "sparkles");
    titleGroup.createSpan({ text: "Gemini AI", cls: "ai-gemini-title-text" });

    const btnGroup = toolbar.createDiv({ cls: "ai-sidebar-btn-group" });
    this.btnGroupEl = btnGroup;
    this.renderToolbarButtons();

    const wrap = container.createDiv({ cls: "ai-sidebar-webview-wrap" });

    if (!Platform.isMobile) {
      this.webview = document.createElement("webview");
      this.webview.className = "ai-sidebar-webview";
      this.webview.setAttribute("partition", GOOGLE_PARTITION);
      this.webview.setAttribute("useragent", GOOGLE_USER_AGENT);
      this.webview.setAttribute("allowpopups", "true");
      this.webview.setAttribute("nodeintegration", "false");
      this.webview.setAttribute("webpreferences", "contextIsolation=true");
      this.webview.setAttribute("src", "https://gemini.google.com/app");

      this.webview.addEventListener("new-window", (e) => {
        e.preventDefault();
        if (e.url) openExternalUrl(e.url);
      });

      this.webview.addEventListener("will-navigate", (e) => {
        const url = e.url || "";
        const isAllowed = url.includes("gemini.google.com") || url.includes("accounts.google.com");
        if (!isAllowed) {
          e.preventDefault();
          openExternalUrl(url);
        }
      });

      const triggerPendingQuery = (delay = 600) => {
        this.isDomReady = true;
        if (this.pendingQuery) {
          const q = this.pendingQuery;
          this.pendingQuery = null;
          this.plugin.setTrackedTimeout(() => this.sendQuery(q), delay);
        }
      };

      this.webview.addEventListener("dom-ready", () => {
        triggerPendingQuery(600);
      });

      this.webview.addEventListener("did-finish-load", () => {
        triggerPendingQuery(600);
      });

      wrap.appendChild(this.webview);
    } else {
      const emptyState = wrap.createDiv({ cls: "ai-empty-state ai-mobile-empty-state" });
      const iconSpan = emptyState.createDiv({ cls: "ai-empty-state-icon" });
      setIcon(iconSpan, "monitor");
      emptyState.createDiv({ cls: "ai-empty-state-title", text: t("mobileViewTitle") });
      emptyState.createDiv({ cls: "ai-empty-state-desc", text: t("mobileViewDesc") });

      const openBtn = emptyState.createEl("button", { cls: "ai-btn-primary ai-mobile-open-btn" });
      setIcon(openBtn.createSpan(), "external-link");
      openBtn.createSpan({ text: t("openInBrowser") });
      openBtn.addEventListener("click", () => {
        openExternalUrl("https://gemini.google.com/app");
      });
    }
  }

  renderToolbarButtons() {
    if (!this.btnGroupEl) return;
    this.btnGroupEl.empty();

    // 1. External Browser
    const extBtn = this.btnGroupEl.createEl("button", {
      cls: "ai-nav-btn ai-btn-external",
      attr: { title: t("navOpenInBrowser"), "aria-label": t("navOpenInBrowser") }
    });
    setIcon(extBtn, "external-link");
    extBtn.addEventListener("click", () => {
      openExternalUrl("https://gemini.google.com/app");
    });

    // 2. Refresh Page
    const refreshBtn = this.btnGroupEl.createEl("button", {
      cls: "ai-nav-btn ai-btn-refresh",
      attr: { title: t("navRefreshPage"), "aria-label": t("navRefreshPage") }
    });
    setIcon(refreshBtn, "refresh-cw");
    refreshBtn.addEventListener("click", () => {
      refreshBtn.addClass("is-refreshing");
      if (this.webview) this.webview.reload();
      this.plugin.setTrackedTimeout(() => refreshBtn.removeClass("is-refreshing"), 800);
    });

    // 3. Settings Gear
    const settingsBtn = this.btnGroupEl.createEl("button", {
      cls: "ai-nav-btn ai-btn-settings",
      attr: { title: t("navPluginSettings"), "aria-label": t("navPluginSettings") }
    });
    setIcon(settingsBtn, "settings");
    settingsBtn.addEventListener("click", () => {
      this.plugin.openPluginSettings();
    });

    // 4. Coffee Button (Strictly preserved Buy Me a Coffee element)
    if (!this.plugin.settings.hideSupport && this.plugin.settings.showCoffeeIconInHeader !== false) {
      const coffeeBtn = this.btnGroupEl.createEl("button", {
        cls: "ai-nav-btn ai-btn-coffee",
        attr: { title: t("navBuyCoffee"), "aria-label": t("navBuyCoffee") }
      });
      setIcon(coffeeBtn, "coffee");
      if (!coffeeBtn.querySelector("svg")) {
        coffeeBtn.textContent = "☕";
      }
      coffeeBtn.addEventListener("click", () => {
        openExternalUrl("https://buymeacoffee.com/cesemess");
      });
    }
  }

  async sendQuery(queryText) {
    if (!this.webview) return;
    if (!this.isDomReady) {
      this.pendingQuery = queryText;
      return;
    }

    const autoSend = this.plugin.settings.autoSendQueries !== false;
    const injectScript = `
      (function() {
        const field = document.querySelector('rich-textarea p, textarea, div[contenteditable="true"]');
        if (field) {
          field.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, ${JSON.stringify(queryText)});
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));

          if (${autoSend}) {
            const sendBtn = document.querySelector('button[aria-label*="Wyślij" i], button[aria-label*="Send" i], button.send-button');
            if (sendBtn && !sendBtn.disabled) {
              setTimeout(() => sendBtn.click(), 200);
            }
          }
          return true;
        }
        return false;
      })();
    `;

    const maxAttempts = 14;
    const intervalMs = 500;
    let attempts = 0;

    const trySend = async () => {
      attempts++;
      try {
        const ok = await this.webview.executeJavaScript(injectScript);
        if (!ok && attempts < maxAttempts) {
          this.plugin.setTrackedTimeout(trySend, intervalMs);
        }
      } catch (e) {
        if (attempts < maxAttempts) {
          this.plugin.setTrackedTimeout(trySend, intervalMs);
        }
      }
    };

    this.plugin.setTrackedTimeout(trySend, 300);
  }

  async onClose() {
    this.isDomReady = false;
    this.pendingQuery = null;
    if (this.webview) {
      try {
        if (typeof this.webview.stop === "function") this.webview.stop();
        this.webview.remove();
      } catch (e) {}
      this.webview = null;
    }
  }
}

// --------------------------------------------------------------------------
// Settings Tab UI
// --------------------------------------------------------------------------
class AIBridgeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    pluginInstance = plugin;
    this.plugin = plugin;
    this.activeTab = plugin.settings.activeTab || "about";
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("ai-settings-container");

    // Compact Tab Bar
    const tabBar = containerEl.createDiv({ cls: "ai-settings-tab-bar" });

    const tabs = [
      { id: "about", label: t("tabAbout"), icon: "sparkles" },
      { id: "notebooklm", label: t("tabNotebookLM"), icon: "book-open" },
      { id: "mapping", label: t("tabMappings"), icon: "folder-git" },
      { id: "settings", label: t("tabSettings"), icon: "settings" }
    ];

    tabs.forEach(tab => {
      const btn = tabBar.createEl("button", {
        cls: `ai-settings-tab-btn ${this.activeTab === tab.id ? "is-active" : ""}`
      });
      setIcon(btn.createSpan(), tab.icon);
      btn.createSpan({ text: tab.label });
      btn.addEventListener("click", () => {
        this.activeTab = tab.id;
        this.plugin.settings.activeTab = tab.id;
        this.plugin.saveSettings();
        this.display();
      });
    });

    const content = containerEl.createDiv({ cls: "ai-settings-tab-content" });

    switch (this.activeTab) {
      case "about":
        this.renderAboutTab(content);
        break;
      case "notebooklm":
        this.renderNotebookLMTab(content);
        break;
      case "mapping":
        this.renderMappingTab(content);
        break;
      case "settings":
        this.renderSettingsTab(content);
        break;
    }
  }

  // ------------------------------------------------------------------------
  // Tab 1: Informacje (Quick Start, Language, Guide, Support, Links)
  // ------------------------------------------------------------------------
  renderAboutTab(container) {
    const wrap = container.createDiv({ cls: "ai-about-container" });

    // 1. Quick Start
    const qsCard = wrap.createDiv({ cls: "ai-card" });
    const qsHeader = qsCard.createDiv({ cls: "ai-card-header" });
    setIcon(qsHeader.createSpan(), "rocket");
    qsHeader.createEl("h4", { cls: "ai-card-title", text: t("qsTitle") });

    const steps = qsCard.createDiv({ cls: "ai-about-steps" });

    // Step 1
    const s1 = steps.createDiv({ cls: "ai-about-step" });
    s1.createSpan({ cls: "ai-about-step-num", text: "1" });
    const s1Text = s1.createDiv();
    s1Text.createEl("strong", { text: t("qsStep1Title") });
    s1Text.createSpan({ text: t("qsStep1Desc") });

    // Step 2
    const s2 = steps.createDiv({ cls: "ai-about-step" });
    s2.createSpan({ cls: "ai-about-step-num", text: "2" });
    const s2Text = s2.createDiv();
    s2Text.createEl("strong", { text: t("qsStep2Title") });
    s2Text.createSpan({ text: t("qsStep2Desc") });

    // Step 3
    const s3 = steps.createDiv({ cls: "ai-about-step" });
    s3.createSpan({ cls: "ai-about-step-num", text: "3" });
    const s3Text = s3.createDiv();
    s3Text.createEl("strong", { text: t("qsStep3Title") });
    s3Text.createSpan({ text: t("qsStep3Desc") });

    // 2. Language Selection (Dropdown)
    const langCard = wrap.createDiv({ cls: "ai-card ai-card-condensed" });
    const langSetting = new Setting(langCard)
      .setName(t("langSelectName"))
      .setDesc(t("langSelectDesc"))
      .addDropdown(drop => {
        drop.addOption("auto", t("langAuto"));
        drop.addOption("en", "English");
        drop.addOption("pl", "Polski");
        drop.addOption("de", "Deutsch");
        drop.addOption("es", "Español");
        drop.addOption("fr", "Français");
        drop.addOption("zh", "简体中文");
        drop.addOption("ja", "日本語");
        drop.addOption("ko", "한국어");
        drop.addOption("pt", "Português");
        drop.addOption("ru", "Русский");
        drop.addOption("it", "Italiano");

        drop.setValue(this.plugin.settings.language || "auto");
        drop.onChange(async val => {
          this.plugin.settings.language = val;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    const langIcon = createSpan({ cls: "ai-setting-icon" });
    setIcon(langIcon, "globe");
    langSetting.nameEl.prepend(langIcon);

    // 3. How AI Bridge Works & Best Practices
    const guideCard = wrap.createDiv({ cls: "ai-card ai-guide-card" });
    const guideHeader = guideCard.createDiv({ cls: "ai-card-header" });
    setIcon(guideHeader.createSpan(), "book-open");
    guideHeader.createEl("h4", { cls: "ai-card-title", text: t("guideTitle") });

    const g1 = guideCard.createDiv({ cls: "ai-guide-item" });
    const g1Icon = g1.createDiv({ cls: "ai-guide-item-icon" });
    setIcon(g1Icon, "layers");
    const g1Content = g1.createDiv({ cls: "ai-guide-item-content" });
    g1Content.createEl("div", { cls: "ai-guide-item-title", text: t("guideBridgeTitle") });
    g1Content.createEl("p", { text: t("guideBridgeDesc") });

    const g2 = guideCard.createDiv({ cls: "ai-guide-item" });
    const g2Icon = g2.createDiv({ cls: "ai-guide-item-icon" });
    setIcon(g2Icon, "sparkles");
    const g2Content = g2.createDiv({ cls: "ai-guide-item-content" });
    g2Content.createEl("div", { cls: "ai-guide-item-title", text: t("guideQualityTitle") });
    g2Content.createEl("p", { text: t("guideQualityDesc") });

    const g3 = guideCard.createDiv({ cls: "ai-guide-item" });
    const g3Icon = g3.createDiv({ cls: "ai-guide-item-icon" });
    setIcon(g3Icon, "graduation-cap");
    const g3Content = g3.createDiv({ cls: "ai-guide-item-content" });
    g3Content.createEl("div", { cls: "ai-guide-item-title", text: t("guidePracticeTitle") });
    g3Content.createEl("p", { text: t("guidePracticeDesc") });
    const bullets = g3Content.createEl("ul", { cls: "ai-guide-bullets" });
    bullets.createEl("li", { text: t("guideBullet1") });
    bullets.createEl("li", { text: t("guideBullet2") });
    bullets.createEl("li", { text: t("guideBullet3") });

    const callout = guideCard.createDiv({ cls: "ai-guide-callout" });
    const calloutIcon = callout.createDiv({ cls: "ai-guide-callout-icon" });
    setIcon(calloutIcon, "check-circle");
    const calloutText = callout.createDiv({ cls: "ai-guide-callout-text" });
    calloutText.createEl("strong", { text: t("guideCalloutTitle") });
    calloutText.createSpan({ text: t("guideCalloutText") });

    // 4. Support Card (Strictly preserved Buy Me a Coffee element)
    const coffeeCard = wrap.createDiv({ cls: "ai-card ai-about-coffee-card" });
    const coffeeHeader = coffeeCard.createDiv({ cls: "ai-card-header" });
    coffeeHeader.createSpan({ text: "☕", cls: "ai-about-coffee-icon" });
    coffeeHeader.createEl("h4", { cls: "ai-card-title", text: t("supportTitle") });

    coffeeCard.createEl("p", {
      cls: "ai-card-desc",
      text: t("supportDesc")
    });

    const coffeeBtnRow = coffeeCard.createDiv({ cls: "ai-about-coffee-btn-wrap" });
    const coffeeBtn = coffeeBtnRow.createEl("a", {
      cls: "ai-coffee-btn ai-coffee-btn-full",
      attr: { href: "https://buymeacoffee.com/cesemess", target: "_blank" }
    });
    renderBmcButtonContent(coffeeBtn, t("supportBtnText"));

    new Setting(coffeeCard)
      .setName(t("hideSupportName"))
      .setDesc(t("hideSupportDesc"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.hideSupport === true)
          .onChange(async val => {
            this.plugin.settings.hideSupport = val;
            this.plugin.settings.showCoffeeBanner = !val;
            this.plugin.settings.showCoffeeIconInHeader = !val;
            await this.plugin.saveSettings();
            this.plugin.updateSidebarToolbars();
            this.display();
          });
      });

    // 5. About the Project
    const linksCard = wrap.createDiv({ cls: "ai-card" });
    const linksHeader = linksCard.createDiv({ cls: "ai-card-header ai-project-header" });

    const headerLeft = linksHeader.createDiv({ cls: "ai-project-header-left" });
    setIcon(headerLeft.createSpan(), "info");
    headerLeft.createEl("h4", { cls: "ai-card-title", text: t("linksTitle") });

    const badges = linksHeader.createDiv({ cls: "ai-project-header-badges" });
    const vBadge = badges.createSpan({ cls: "ai-about-badge ai-about-badge-version" });
    vBadge.textContent = this.plugin.manifest?.version || "1.0.0";

    badges.createEl("a", {
      cls: "ai-about-badge",
      text: t("heroAuthor"),
      attr: { href: "https://github.com/Cesemess", target: "_blank" }
    });

    const btnRow = linksCard.createDiv({ cls: "ai-about-btn-row" });

    const ghBtn = btnRow.createEl("a", {
      cls: "ai-about-action-btn",
      attr: { href: "https://github.com/Cesemess/obsidian-ai-bridge", target: "_blank" }
    });
    setIcon(ghBtn.createSpan(), "github");
    ghBtn.createSpan({ text: t("linksGithub") });

    const issueBtn = btnRow.createEl("a", {
      cls: "ai-about-action-btn",
      attr: { href: "https://github.com/Cesemess/obsidian-ai-bridge/issues", target: "_blank" }
    });
    setIcon(issueBtn.createSpan(), "bug");
    issueBtn.createSpan({ text: t("linksIssues") });
  }

  // ------------------------------------------------------------------------
  // Tab 2: NotebookLM Manager
  // ------------------------------------------------------------------------
  renderNotebookLMTab(container) {
    const actionCard = container.createDiv({ cls: "ai-card" });
    const headerBar = actionCard.createDiv({ cls: "ai-notebooks-header-bar" });

    const titleDiv = headerBar.createDiv();
    titleDiv.createEl("h4", {
      cls: "ai-card-title",
      text: t("manageNotebooksTitle")
    });

    const buttonsGroup = headerBar.createDiv({ cls: "ai-notebooks-btn-group" });

    const addBtn = buttonsGroup.createEl("button", { cls: "ai-btn-primary" });
    setIcon(addBtn.createSpan(), "plus");
    addBtn.createSpan({ text: t("addNotebookBtn") });
    addBtn.addEventListener("click", () => {
      new AddNotebookModal(this.app, this.plugin, () => this.display()).open();
    });

    const checkBtn = buttonsGroup.createEl("button", { cls: "ai-btn-secondary" });
    setIcon(checkBtn.createSpan(), "refresh-cw");
    checkBtn.createSpan({ text: t("checkAvailabilityBtn") });
    checkBtn.addEventListener("click", async () => {
      checkBtn.disabled = true;
      await this.plugin.verifyAllNotebooks(true);
      checkBtn.disabled = false;
      this.display();
    });

    new Setting(actionCard)
      .setName(t("startupCheckName"))
      .setDesc(t("startupCheckDesc"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.checkNotebooksOnStartup !== false)
          .onChange(async val => {
            this.plugin.settings.checkNotebooksOnStartup = val;
            await this.plugin.saveSettings();
          });
      });

    new Setting(actionCard)
      .setName(t("autoRemoveInvalidName"))
      .setDesc(t("autoRemoveInvalidDesc"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.autoRemoveInvalidNotebooks === true)
          .onChange(async val => {
            this.plugin.settings.autoRemoveInvalidNotebooks = val;
            await this.plugin.saveSettings();
          });
      });

    // Notebooks List Card
    const listCard = container.createDiv({ cls: "ai-card" });
    const listHeader = listCard.createDiv({ cls: "ai-card-header" });
    setIcon(listHeader.createSpan(), "list");
    listHeader.createEl("h4", {
      cls: "ai-card-title",
      text: t("yourNotebooksTitle", { count: this.plugin.settings.notebooks.length })
    });

    if (this.plugin.settings.notebooks.length === 0) {
      const empty = listCard.createDiv({ cls: "ai-empty-state" });
      empty.createDiv({ cls: "ai-empty-state-title", text: t("emptyNotebooksTitle") });
      empty.createDiv({
        cls: "ai-empty-state-desc",
        text: t("emptyNotebooksDesc")
      });
      return;
    }

    const list = listCard.createDiv({ cls: "ai-notebooks-list" });

    this.plugin.settings.notebooks.forEach((nb, index) => {
      const isDefault = nb.id === this.plugin.settings.defaultNotebookId;
      const item = list.createDiv({
        cls: `ai-notebook-item ${isDefault ? "is-default" : ""}`
      });

      const main = item.createDiv({ cls: "ai-notebook-main" });

      const titleRow = main.createDiv({ cls: "ai-notebook-title-row" });
      titleRow.createSpan({
        cls: `ai-notebook-name ${isDefault ? "is-default" : ""}`,
        text: nb.name
      });

      if (isDefault) {
        const defBadge = titleRow.createSpan({ cls: "ai-notebook-badge-default" });
        setIcon(defBadge.createSpan(), "star");
        defBadge.createSpan({ text: t("defaultBadge") });
      }

      const subRow = main.createDiv({ cls: "ai-notebook-sub-row" });
      subRow.createSpan({ cls: "ai-notebook-id-badge", text: `ID: ${nb.id}` });

      const statusBadge = subRow.createSpan({
        cls: `ai-notebook-status-badge ${
          nb.status === "verified"
            ? "is-verified"
            : nb.status === "error"
            ? "is-error"
            : "is-unverified"
        }`
      });

      if (nb.status === "verified") {
        statusBadge.textContent = t("statusActive");
      } else if (nb.status === "error") {
        statusBadge.textContent = t("statusUnavailable");
      } else {
        statusBadge.textContent = t("statusUnverified");
      }

      // Actions on the right
      const actions = item.createDiv({ cls: "ai-notebook-actions" });

      const openBtn = actions.createEl("button", {
        cls: "ai-icon-btn",
        attr: { title: t("actionOpenInBrowser") }
      });
      setIcon(openBtn, "external-link");
      openBtn.addEventListener("click", () => {
        openExternalUrl(`https://notebooklm.google.com/notebook/${nb.id}`);
      });

      const starBtn = actions.createEl("button", {
        cls: `ai-icon-btn ${isDefault ? "is-active-star" : ""}`,
        attr: { title: isDefault ? t("actionIsDefault") : t("actionSetAsDefault") }
      });
      setIcon(starBtn, "star");
      starBtn.addEventListener("click", async () => {
        this.plugin.settings.defaultNotebookId = isDefault ? "" : nb.id;
        await this.plugin.saveSettings();
        this.display();
      });

      const editBtn = actions.createEl("button", {
        cls: "ai-icon-btn",
        attr: { title: t("actionEdit") }
      });
      setIcon(editBtn, "pencil");
      editBtn.addEventListener("click", () => {
        new EditNotebookModal(this.app, this.plugin, nb, () => this.display()).open();
      });

      const deleteBtn = actions.createEl("button", {
        cls: "ai-icon-btn is-danger",
        attr: { title: t("actionDelete") }
      });
      setIcon(deleteBtn, "trash-2");
      deleteBtn.addEventListener("click", () => {
        new ConfirmDeleteModal(this.app, nb.name, async () => {
          this.plugin.settings.notebooks.splice(index, 1);
          if (this.plugin.settings.defaultNotebookId === nb.id) {
            this.plugin.settings.defaultNotebookId = "";
          }
          this.plugin.settings.mappings = this.plugin.settings.mappings.filter(
            m => m.notebookId !== nb.id
          );
          await this.plugin.saveSettings();
          this.display();
        }).open();
      });
    });
  }

  // ------------------------------------------------------------------------
  // Tab 3: Przypisanie notatek (Note Mappings)
  // ------------------------------------------------------------------------
  renderMappingTab(container) {
    // 1. Auto-Match Card
    const autoCard = container.createDiv({ cls: "ai-card" });
    const autoHeader = autoCard.createDiv({ cls: "ai-card-header" });
    setIcon(autoHeader.createSpan(), "zap");
    autoHeader.createEl("h4", { cls: "ai-card-title", text: t("autoMatchTitle") });

    new Setting(autoCard)
      .setName(t("enableAutoMatchName"))
      .setDesc(t("enableAutoMatchDesc"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.autoMatchByName !== false)
          .onChange(async val => {
            this.plugin.settings.autoMatchByName = val;
            await this.plugin.saveSettings();
          });
      });

    new Setting(autoCard)
      .setName(t("scanFoldersName"))
      .setDesc(t("scanFoldersDesc"))
      .addButton(btn => {
        btn
          .setButtonText(t("scanFoldersBtn"))
          .setCta()
          .onClick(() => {
            this.scanAndAutoMapFolders();
          });
      });

    // 2. Default Notebook Card (Condensed)
    const defaultCard = container.createDiv({ cls: "ai-card ai-card-condensed" });
    const defSetting = new Setting(defaultCard)
      .setName(t("defaultNotebookName"))
      .setDesc(t("defaultNotebookDesc"))
      .addDropdown(drop => {
        drop.addOption("", t("defaultNotebookNone"));
        this.plugin.settings.notebooks.forEach(nb => {
          drop.addOption(nb.id, nb.name);
        });
        drop.setValue(this.plugin.settings.defaultNotebookId || "");
        drop.onChange(async val => {
          this.plugin.settings.defaultNotebookId = val;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    const starIcon = createSpan({ cls: "ai-setting-icon" });
    setIcon(starIcon, "star");
    defSetting.nameEl.prepend(starIcon);

    // 3. Mapping Rules Card
    const mappingCard = container.createDiv({ cls: "ai-card" });
    const mapHeader = mappingCard.createDiv({ cls: "ai-card-header" });
    setIcon(mapHeader.createSpan(), "git-branch");
    mapHeader.createEl("h4", {
      cls: "ai-card-title",
      text: t("mappingRulesTitle", { count: this.plugin.settings.mappings.length })
    });

    const addBar = mappingCard.createDiv({ cls: "ai-mapping-add-bar" });

    const targetSelect = addBar.createEl("select");
    targetSelect.createEl("option", { value: "", text: t("chooseFolderOrNote") });

    const allFilesAndFolders = this.app.vault.getAllLoadedFiles();
    const folders = allFilesAndFolders
      .filter(f => f instanceof TFolder && f.path !== "/")
      .sort((a, b) => a.path.localeCompare(b.path));
    const files = allFilesAndFolders
      .filter(f => f instanceof TFile && f.extension === "md")
      .sort((a, b) => a.path.localeCompare(b.path));

    const optgroupFolders = targetSelect.createEl("optgroup", { attr: { label: t("optgroupFolders") } });
    folders.forEach(f => {
      optgroupFolders.createEl("option", { value: `folder:${f.path}`, text: `📁 ${f.path}` });
    });

    const optgroupFiles = targetSelect.createEl("optgroup", { attr: { label: t("optgroupFiles") } });
    files.forEach(f => {
      optgroupFiles.createEl("option", { value: `file:${f.path}`, text: `📄 ${f.path}` });
    });

    const nbSelect = addBar.createEl("select");
    nbSelect.createEl("option", { value: "", text: t("chooseNotebook") });
    this.plugin.settings.notebooks.forEach(nb => {
      nbSelect.createEl("option", { value: nb.id, text: `📓 ${nb.name}` });
    });

    const addRuleBtn = addBar.createEl("button", { cls: "ai-btn-primary" });
    setIcon(addRuleBtn.createSpan(), "plus");
    addRuleBtn.createSpan({ text: t("assignBtn") });
    addRuleBtn.addEventListener("click", async () => {
      const targetVal = targetSelect.value;
      const nbId = nbSelect.value;

      if (!targetVal) {
        new Notice(t("noticeSelectFolderOrNote"));
        return;
      }
      if (!nbId) {
        new Notice(t("noticeSelectNotebook"));
        return;
      }

      // Safe colon splitting
      const colonIdx = targetVal.indexOf(":");
      if (colonIdx === -1) return;
      const type = targetVal.substring(0, colonIdx);
      const path = targetVal.substring(colonIdx + 1);

      const exists = this.plugin.settings.mappings.some(
        m => m.type === type && m.path === path
      );
      if (exists) {
        new Notice(t("noticeRuleExists"));
        return;
      }

      this.plugin.settings.mappings.push({
        id: Date.now() + Math.random().toString(),
        type,
        path,
        notebookId: nbId
      });

      await this.plugin.saveSettings();
      new Notice(t("noticeRuleAdded"));
      this.display();
    });

    // Rules List
    if (this.plugin.settings.mappings.length === 0) {
      const empty = mappingCard.createDiv({ cls: "ai-empty-state" });
      empty.createDiv({ cls: "ai-empty-state-title", text: t("emptyRulesTitle") });
      empty.createDiv({
        cls: "ai-empty-state-desc",
        text: t("emptyRulesDesc")
      });
      return;
    }

    const rulesList = mappingCard.createDiv({ cls: "ai-mapping-list" });

    this.plugin.settings.mappings.forEach((rule, idx) => {
      const ruleRow = rulesList.createDiv({ cls: "ai-rule-row" });

      const left = ruleRow.createDiv({ cls: "ai-rule-left" });
      const typeTag = left.createSpan({
        cls: `ai-rule-tag ${rule.type === "folder" ? "is-folder" : "is-file"}`
      });
      const tagIcon = typeTag.createSpan({ cls: "ai-rule-tag-icon" });
      setIcon(tagIcon, rule.type === "folder" ? "folder" : "file-text");
      typeTag.createSpan({ cls: "ai-rule-tag-text", text: rule.type === "folder" ? t("targetFolder") : t("targetNote") });

      left.createSpan({ cls: "ai-rule-name", text: rule.path, attr: { title: rule.path } });

      ruleRow.createSpan({ cls: "ai-rule-arrow", text: "→" });

      const right = ruleRow.createDiv({ cls: "ai-rule-right" });
      const selectRuleNb = right.createEl("select", { cls: "ai-rule-select" });

      this.plugin.settings.notebooks.forEach(nb => {
        selectRuleNb.createEl("option", {
          value: nb.id,
          text: `📓 ${nb.name}`
        });
      });
      selectRuleNb.value = rule.notebookId;

      selectRuleNb.addEventListener("change", async () => {
        rule.notebookId = selectRuleNb.value;
        await this.plugin.saveSettings();
      });

      const delBtn = right.createEl("button", {
        cls: "ai-icon-btn is-danger",
        attr: { title: t("actionDelete") }
      });
      setIcon(delBtn, "trash-2");
      delBtn.addEventListener("click", async () => {
        this.plugin.settings.mappings.splice(idx, 1);
        await this.plugin.saveSettings();
        this.display();
      });
    });
  }

  // ------------------------------------------------------------------------
  // Tab 4: Ustawienia (Settings)
  // ------------------------------------------------------------------------
  renderSettingsTab(container) {
    // 1. Context Menu Toggles Card
    const menuCard = container.createDiv({ cls: "ai-card" });
    const menuHeader = menuCard.createDiv({ cls: "ai-card-header" });
    setIcon(menuHeader.createSpan(), "mouse-pointer");
    menuHeader.createEl("h4", { cls: "ai-card-title", text: t("contextMenuCardTitle") });

    new Setting(menuCard)
      .setName(t("showNotebookLMContextMenu"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.showNotebookLMInContextMenu !== false)
          .onChange(async val => {
            this.plugin.settings.showNotebookLMInContextMenu = val;
            await this.plugin.saveSettings();
          });
      });

    new Setting(menuCard)
      .setName(t("showGeminiContextMenu"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.showGeminiInContextMenu !== false)
          .onChange(async val => {
            this.plugin.settings.showGeminiInContextMenu = val;
            await this.plugin.saveSettings();
          });
      });

    new Setting(menuCard)
      .setName(t("showGoogleContextMenu"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.showGoogleInContextMenu !== false)
          .onChange(async val => {
            this.plugin.settings.showGoogleInContextMenu = val;
            await this.plugin.saveSettings();
          });
      });

    // 2. Action Behavior & Clipboard Card
    const behaviorCard = container.createDiv({ cls: "ai-card" });
    const behaviorHeader = behaviorCard.createDiv({ cls: "ai-card-header" });
    setIcon(behaviorHeader.createSpan(), "sliders");
    behaviorHeader.createEl("h4", { cls: "ai-card-title", text: t("behaviorCardTitle") });

    new Setting(behaviorCard)
      .setName(t("autoSendName"))
      .setDesc(t("autoSendDesc"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.autoSendQueries !== false)
          .onChange(async val => {
            this.plugin.settings.autoSendQueries = val;
            await this.plugin.saveSettings();
          });
      });

    new Setting(behaviorCard)
      .setName(t("copyClipboardName"))
      .setDesc(t("copyClipboardDesc"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.copySelectionToClipboard !== false)
          .onChange(async val => {
            this.plugin.settings.copySelectionToClipboard = val;
            await this.plugin.saveSettings();
          });
      });

    new Setting(behaviorCard)
      .setName(t("showNoticeName"))
      .setDesc(t("showNoticeDesc"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.showCopyNotice !== false)
          .onChange(async val => {
            this.plugin.settings.showCopyNotice = val;
            await this.plugin.saveSettings();
          });
      });

    // 3. Google Search Template Card
    const searchCard = container.createDiv({ cls: "ai-card" });
    const searchHeader = searchCard.createDiv({ cls: "ai-card-header" });
    setIcon(searchHeader.createSpan(), "search");
    searchHeader.createEl("h4", { cls: "ai-card-title", text: t("searchCardTitle") });

    new Setting(searchCard)
      .setName(t("googleSearchUrlName"))
      .setDesc(t("googleSearchUrlDesc"))
      .addText(text => {
        text
          .setPlaceholder("https://www.google.com/search?q={query}")
          .setValue(this.plugin.settings.googleSearchUrl || "https://www.google.com/search?q={query}")
          .onChange(async val => {
            this.plugin.settings.googleSearchUrl = val.trim() || "https://www.google.com/search?q={query}";
            await this.plugin.saveSettings();
          });
      });

    // 4. Sidebar Header Toolbar Card
    const headerCard = container.createDiv({ cls: "ai-card" });
    const headerTitle = headerCard.createDiv({ cls: "ai-card-header" });
    setIcon(headerTitle.createSpan(), "layout");
    headerTitle.createEl("h4", { cls: "ai-card-title", text: t("sidebarHeaderCardTitle") });

    new Setting(headerCard)
      .setName(t("hideSupportName"))
      .setDesc(t("hideSupportDesc"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.hideSupport === true)
          .onChange(async val => {
            this.plugin.settings.hideSupport = val;
            this.plugin.settings.showCoffeeBanner = !val;
            this.plugin.settings.showCoffeeIconInHeader = !val;
            await this.plugin.saveSettings();
            this.plugin.updateSidebarToolbars();
            this.display();
          });
      });

    new Setting(headerCard)
      .setName(t("hideNotebookLMHeaderName"))
      .setDesc(t("hideNotebookLMHeaderDesc"))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.hideNotebookLMHeader !== false)
          .onChange(async val => {
            this.plugin.settings.hideNotebookLMHeader = val;
            await this.plugin.saveSettings();
            this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTEBOOKLM).forEach(l => {
              if (l.view) {
                if (val && l.view.applyHeaderHiding) {
                  l.view.applyHeaderHiding();
                } else if (l.view.webview) {
                  l.view.webview.reload();
                }
              }
            });
          });
      });

    // 5. Hotkeys Card
    const hotkeyCard = container.createDiv({ cls: "ai-card" });
    const hotkeyHeader = hotkeyCard.createDiv({ cls: "ai-card-header" });
    setIcon(hotkeyHeader.createSpan(), "keyboard");
    hotkeyHeader.createEl("h4", { cls: "ai-card-title", text: t("hotkeysCardTitle") });

    new Setting(hotkeyCard)
      .setName(t("hotkeysConfigName"))
      .setDesc(t("hotkeysConfigDesc"))
      .addButton(btn => {
        btn.setButtonText(t("hotkeysOpenBtn")).setCta().onClick(() => {
          try {
            this.app.setting.open();
            this.app.setting.openTabById("hotkeys");
          } catch (e) {
            console.warn("Could not open hotkeys tab:", e);
          }
        });
      });
  }

  scanAndAutoMapFolders() {
    const folders = this.app.vault
      .getAllLoadedFiles()
      .filter(f => f instanceof TFolder && f.path !== "/");

    let mappedCount = 0;

    for (const nb of this.plugin.settings.notebooks) {
      const nbNameNorm = nb.name.trim().toLowerCase();

      const matchedFolder = folders.find(f => {
        const fName = f.name.trim().toLowerCase();
        return fName === nbNameNorm;
      });

      if (matchedFolder) {
        const alreadyMapped = this.plugin.settings.mappings.some(
          m => m.type === "folder" && m.path === matchedFolder.path
        );

        if (!alreadyMapped) {
          this.plugin.settings.mappings.push({
            id: Date.now() + Math.random().toString(),
            type: "folder",
            path: matchedFolder.path,
            notebookId: nb.id
          });
          mappedCount++;
        }
      }
    }

    if (mappedCount > 0) {
      this.plugin.saveSettings();
      new Notice(t("noticeAutoScanFound", { count: mappedCount }));
      this.display();
    } else {
      new Notice(t("noticeAutoScanNone"));
    }
  }
}

// --------------------------------------------------------------------------
// Modals
// --------------------------------------------------------------------------

class AddNotebookModal extends Modal {
  constructor(app, plugin, onSave) {
    super(app);
    this.plugin = plugin;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ai-modal-container");

    const header = contentEl.createDiv({ cls: "ai-modal-header" });
    setIcon(header.createSpan(), "book-open");
    header.createSpan({ text: t("addModalTitle") });

    contentEl.createEl("p", {
      cls: "ai-modal-help",
      text: t("addModalDesc")
    });

    const body = contentEl.createDiv({ cls: "ai-modal-body" });

    // Field 1: Link or ID
    const urlField = body.createDiv({ cls: "ai-modal-field" });
    urlField.createEl("label", { cls: "ai-modal-label", text: t("labelUrlOrId") });
    const idInput = urlField.createEl("input", {
      cls: "ai-modal-input",
      attr: {
        type: "text",
        placeholder: t("placeholderUrlOrId")
      }
    });

    const previewTag = urlField.createDiv({
      cls: "ai-modal-extracted-tag ai-preview-tag is-hidden"
    });

    // Field 2: Name
    const nameField = body.createDiv({ cls: "ai-modal-field" });
    nameField.createEl("label", { cls: "ai-modal-label", text: t("labelName") });
    const nameInput = nameField.createEl("input", {
      cls: "ai-modal-input",
      attr: {
        type: "text",
        placeholder: t("placeholderName")
      }
    });

    let fetchDebounce = null;
    const triggerFetch = id => {
      previewTag.removeClass("is-hidden");
      previewTag.removeClass("is-valid");
      previewTag.removeClass("is-invalid");
      previewTag.addClass("is-resolving");
      previewTag.textContent = t("btnChecking");

      fetchNotebookTitle(id, fetchedTitle => {
        if (fetchedTitle) {
          previewTag.removeClass("is-resolving");
          previewTag.addClass("is-valid");
          previewTag.textContent = t("btnValidId", { id: id.slice(0, 8) + "..." });
          if (!nameInput.value.trim()) {
            nameInput.value = fetchedTitle;
          }
        } else {
          previewTag.removeClass("is-resolving");
          previewTag.addClass("is-invalid");
          previewTag.textContent = t("btnInvalidId");
        }
      });
    };

    idInput.addEventListener("input", () => {
      const extracted = extractNotebookId(idInput.value);
      if (extracted) {
        if (fetchDebounce) clearTimeout(fetchDebounce);
        fetchDebounce = setTimeout(() => triggerFetch(extracted), 350);
      } else {
        previewTag.addClass("is-hidden");
      }
    });

    // Checkbox Default
    const defField = body.createDiv({ cls: "ai-modal-field" });
    const defLabel = defField.createEl("label", { cls: "ai-checkbox-label" });
    const defCheck = defLabel.createEl("input", { attr: { type: "checkbox" } });
    defLabel.createSpan({ text: t("checkboxSetDefault") });

    const btnRow = contentEl.createDiv({ cls: "ai-modal-buttons" });

    const cancelBtn = btnRow.createEl("button", { cls: "ai-btn-secondary", text: t("btnCancel") });
    cancelBtn.addEventListener("click", () => this.close());

    const saveBtn = btnRow.createEl("button", { cls: "ai-btn-primary", text: t("btnSave") });
    saveBtn.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      const rawId = idInput.value.trim();
      const extractedId = extractNotebookId(rawId);

      if (!name) {
        new Notice(t("noticeEnterNotebookName"));
        nameInput.focus();
        return;
      }
      if (!extractedId) {
        new Notice(t("noticeInvalidUrlOrId"));
        idInput.focus();
        return;
      }

      this.plugin.settings.notebooks.push({
        id: extractedId,
        name,
        url: `https://notebooklm.google.com/notebook/${extractedId}`,
        status: "verified",
        lastChecked: Date.now()
      });

      if (defCheck.checked) {
        this.plugin.settings.defaultNotebookId = extractedId;
      }

      await this.plugin.saveSettings();
      new Notice(t("noticeNotebookAdded", { name }));
      if (this.onSave) this.onSave();
      this.close();
    });

    setTimeout(() => idInput.focus(), 80);
  }

  onClose() {
    cancelActiveTitleFetch();
    this.containerEl.empty();
  }
}

class EditNotebookModal extends Modal {
  constructor(app, plugin, notebook, onSave) {
    super(app);
    this.plugin = plugin;
    this.notebook = notebook;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ai-modal-container");

    const header = contentEl.createDiv({ cls: "ai-modal-header" });
    setIcon(header.createSpan(), "pencil");
    header.createSpan({ text: t("editModalTitle") });

    const body = contentEl.createDiv({ cls: "ai-modal-body" });

    const nameField = body.createDiv({ cls: "ai-modal-field" });
    nameField.createEl("label", { cls: "ai-modal-label", text: t("labelName") });
    const nameInput = nameField.createEl("input", {
      cls: "ai-modal-input",
      attr: { type: "text", value: this.notebook.name }
    });

    const idField = body.createDiv({ cls: "ai-modal-field" });
    idField.createEl("label", { cls: "ai-modal-label", text: t("labelUrlOrId") });
    const idInput = idField.createEl("input", {
      cls: "ai-modal-input",
      attr: { type: "text", value: this.notebook.id }
    });

    const isDefault = this.plugin.settings.defaultNotebookId === this.notebook.id;
    const defField = body.createDiv({ cls: "ai-modal-field" });
    const defLabel = defField.createEl("label", { cls: "ai-checkbox-label" });
    const defCheck = defLabel.createEl("input", { attr: { type: "checkbox" } });
    defCheck.checked = isDefault;
    defLabel.createSpan({ text: t("checkboxSetDefault") });

    const btnRow = contentEl.createDiv({ cls: "ai-modal-buttons" });
    const cancelBtn = btnRow.createEl("button", { cls: "ai-btn-secondary", text: t("btnCancel") });
    cancelBtn.addEventListener("click", () => this.close());

    const saveBtn = btnRow.createEl("button", { cls: "ai-btn-primary", text: t("btnSave") });
    saveBtn.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      const rawId = idInput.value.trim();
      const extractedId = extractNotebookId(rawId);

      if (!name) {
        new Notice(t("noticeEnterNotebookName"));
        return;
      }
      if (!extractedId) {
        new Notice(t("noticeInvalidUrlOrId"));
        return;
      }

      const oldId = this.notebook.id;
      this.notebook.name = name;
      this.notebook.id = extractedId;
      this.notebook.url = `https://notebooklm.google.com/notebook/${extractedId}`;

      if (oldId !== extractedId) {
        this.plugin.settings.mappings.forEach(m => {
          if (m.notebookId === oldId) m.notebookId = extractedId;
        });
        if (this.plugin.settings.defaultNotebookId === oldId) {
          this.plugin.settings.defaultNotebookId = extractedId;
        }
      }

      if (defCheck.checked) {
        this.plugin.settings.defaultNotebookId = extractedId;
      } else if (isDefault && !defCheck.checked) {
        this.plugin.settings.defaultNotebookId = "";
      }

      await this.plugin.saveSettings();
      new Notice(t("noticeNotebookUpdated", { name }));
      if (this.onSave) this.onSave();
      this.close();
    });

    setTimeout(() => nameInput.focus(), 80);
  }

  onClose() {
    this.containerEl.empty();
  }
}

class ConfirmDeleteModal extends Modal {
  constructor(app, notebookName, onConfirm) {
    super(app);
    this.notebookName = notebookName;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ai-modal-container");

    const header = contentEl.createDiv({ cls: "ai-modal-header" });
    setIcon(header.createSpan(), "alert-triangle");
    header.createSpan({ text: t("deleteModalTitle") });

    contentEl.createEl("p", {
      cls: "ai-modal-help",
      text: t("deleteModalDesc", { name: this.notebookName })
    });

    const btnRow = contentEl.createDiv({ cls: "ai-modal-buttons" });
    const cancelBtn = btnRow.createEl("button", { cls: "ai-btn-secondary", text: t("btnCancel") });
    cancelBtn.addEventListener("click", () => this.close());

    const confirmBtn = btnRow.createEl("button", {
      cls: "ai-btn-primary ai-btn-danger-confirm",
      text: t("btnDeleteConfirm")
    });
    confirmBtn.addEventListener("click", () => {
      this.onConfirm();
      this.close();
    });
  }

  onClose() {
    this.containerEl.empty();
  }
}

class NotebookSuggestModal extends Modal {
  constructor(app, plugin, file, onSelect) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ai-modal-container");

    const header = contentEl.createDiv({ cls: "ai-modal-header" });
    setIcon(header.createSpan(), "book-marked");
    header.createSpan({ text: t("suggestModalTitle", { file: this.file?.name || "Note" }) });

    contentEl.createEl("p", {
      cls: "ai-modal-help",
      text: t("suggestModalDesc")
    });

    const body = contentEl.createDiv({ cls: "ai-modal-body" });

    const select = body.createEl("select", { cls: "ai-rule-select ai-rule-select-full" });
    this.plugin.settings.notebooks.forEach(nb => {
      select.createEl("option", { value: nb.id, text: `📓 ${nb.name}` });
    });

    let saveCheck = null;
    if (this.file?.parent?.path) {
      const checkField = body.createDiv({ cls: "ai-modal-field" });
      const checkLabel = checkField.createEl("label", { cls: "ai-checkbox-label" });
      saveCheck = checkLabel.createEl("input", { attr: { type: "checkbox" } });
      saveCheck.checked = true;
      checkLabel.createSpan({
        text: t("suggestCheckboxSave", { folder: this.file.parent.path })
      });
    }

    const btnRow = contentEl.createDiv({ cls: "ai-modal-buttons" });
    const cancelBtn = btnRow.createEl("button", { cls: "ai-btn-secondary", text: t("btnCancel") });
    cancelBtn.addEventListener("click", () => this.close());

    const chooseBtn = btnRow.createEl("button", { cls: "ai-btn-primary", text: t("btnOpenAndSend") });
    chooseBtn.addEventListener("click", async () => {
      const chosenId = select.value;
      const nb = this.plugin.settings.notebooks.find(n => n.id === chosenId);

      if (nb && saveCheck && saveCheck.checked && this.file?.parent?.path) {
        const folderPath = this.file.parent.path;
        const exists = this.plugin.settings.mappings.some(
          m => m.type === "folder" && m.path === folderPath
        );
        if (!exists) {
          this.plugin.settings.mappings.push({
            id: Date.now().toString(),
            type: "folder",
            path: folderPath,
            notebookId: nb.id
          });
          await this.plugin.saveSettings();
        }
      }

      this.close();
      this.onSelect(nb);
    });
  }

  onClose() {
    this.containerEl.empty();
  }
}

// --------------------------------------------------------------------------
// Exports
// --------------------------------------------------------------------------
module.exports = AIBridgePlugin;
