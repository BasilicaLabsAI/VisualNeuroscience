import SwiftUI
import UIKit
import WebKit
import Capacitor

/* The web app's pages inside the tabs. Each page a box opens gets a
   Capacitor bridge of its own, opened on that page, so every plugin the
   page uses (sign-in, Files, the share sheet, haptics) is there as it was
   when one bridge filled the window. A link from one page to another is not
   followed in place: the shell pushes the new page in the same tab, so each
   web view holds one page and Back is the system's. Popping a page lets its
   bridge go, web view and all.

   The pages know they are in the tabs by data-shell="tabs" on their root
   element, set before anything on them runs. assets/navbar.js then leaves
   out its own bar, since the system navigation bar carries back and the
   title, the tab bar the sections and the Account tab the theme and the
   account; assets/viewer.css drops the room it kept for that bar. */

/// One of the web app's pages: its file, a fragment to open it on, and the
/// title the navigation bar gives it.
nonisolated struct Page: Sendable {
    let file: String
    var fragment: String? = nil
    let title: String

    static let regionAtlas = Page(file: "regions.html", title: L("3D Region Atlas"))
    static let brodmann = Page(file: "brodmann.html", title: L("Brodmann Area Atlas"))
    static let networkAtlas = Page(file: "network-atlas.html", title: L("Network Atlas"))
    static let microanatomy = Page(file: "microanatomy.html", title: L("Microanatomy"))
    static let molecular = Page(file: "molecular.html", title: L("Molecular"))
    static let tractography = Page(file: "tracts.html", title: L("Tractography"))
    static let studies = Page(file: "studies.html", title: L("Visualizing Studies"))
    static let textbook = Page(file: "textbook.html", title: L("Digital Textbook"))
    static let posters = Page(file: "posters.html", title: L("Posters"))
    static let practice = Page(file: "practice.html", title: L("Practice"))
    static let about = Page(file: "about.html", title: L("A Message from the Developer"))
    static let mcp = Page(file: "mcp.html", title: L("MCP Server"))
    static let account = Page(file: "account.html", title: L("Account"))
    static let privacy = Page(file: "privacy.html", title: L("Privacy & Support"))
    static let terms = Page(file: "terms.html", title: L("Terms of Use"))
    static let deleteAccount = Page(file: "account.html", fragment: "delete", title: L("Account"))
    static let password = Page(file: "account.html", fragment: "password", title: L("Account"))

    /// The titles of the pages a link can lead to, as the app's bar names them.
    static let titles: [String: String] = [
        "regions.html": L("3D Region Atlas"), "brodmann.html": L("Brodmann Area Atlas"),
        "network-atlas.html": L("Network Atlas"), "tracts.html": L("Tractography"),
        "microanatomy.html": L("Microanatomy"), "molecular.html": L("Molecular"),
        "studies.html": L("Visualizing Studies"), "hallucinations.html": L("Hallucinations"),
        "practice.html": L("Practice"), "textbook.html": L("Digital Textbook"),
        "about.html": L("A Message from the Developer"), "privacy.html": L("Privacy & Support"),
        "terms.html": L("Terms of Use"), "delete-account.html": L("Delete your account"),
        "account.html": L("Account"), "mcp.html": L("MCP Server"), "connect.html": L("Connect")
    ]
}

extension Page {
    /// The page a link inside the app leads to, or nil for the home page,
    /// whose place in the app the tabs have taken.
    nonisolated init?(link url: URL) {
        var file = url.lastPathComponent
        var fragment = url.fragment
        // a Chinese twin's link leads to another twin: the page is the English
        // file's, which the bridge opens in the app's language (v12.71)
        if file.hasSuffix(".zh-hans.html") { file = String(file.dropLast(".zh-hans.html".count)) + ".html" }
        if file.isEmpty || file == "/" || file == "index.html" { return nil }
        // the Region Atlas's old network mode is the Network Atlas's own page
        if file == "regions.html", let f = fragment, f == "network" || f.hasPrefix("network=") {
            file = "network-atlas.html"
            fragment = f.hasPrefix("network=") ? "state=" + f.dropFirst("network=".count) : nil
        }
        if let f = fragment, f.isEmpty { fragment = nil }
        let title = Page.titles[file] ?? file.replacingOccurrences(of: ".html", with: "").capitalized
        self.init(file: file, fragment: fragment, title: title)
    }
}

// MARK: - A page in a tab

/// A page of the web app pushed inside a tab, under the system navigation
/// bar. A link to another page pushes that one after it; a link home goes
/// back to the tab's own page.
struct WebPage: View {
    let page: Page

    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var account: AccountAuth
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var horizontalSize
    @Environment(\.verticalSizeClass) private var verticalSize
    @State private var next: Page?
    @State private var showingNext = false

    init(page: Page) {
        self.page = page
    }

    /// A phone held sideways: the system bar is kept off the page, which
    /// has the whole height then, and only a back button stands over its
    /// top left corner, where the bar's stood (the page's own bar makes
    /// room for it there).
    private var sideways: Bool {
        UIDevice.current.userInterfaceIdiom == .phone && verticalSize == .compact
    }

    /// An iPad, or an iPhone with an iPad's room, as an iPhone Duo opened
    /// (padLayout): the page fills the screen as on an iPad, and follows as
    /// the Duo opens and closes.
    private var pad: Bool {
        padLayout(horizontalSize, verticalSize)
    }

    var body: some View {
        BridgeView(page: page, store: store, account: account, pad: pad,
                   open: { link in
                       next = link
                       showingNext = true
                   },
                   home: { dismiss() })
            // the keyboard rises over the page rather than shortening it: a
            // page shortened by the keyboard read as wider than tall, and on
            // an iPhone the atlases laid themselves out as for a phone held
            // sideways while their search was typed in
            .ignoresSafeArea(.keyboard, edges: .bottom)
            .background {
                Palette.paper.ignoresSafeArea()
            }
            // on an iPad the title would take a row of its own under the tab
            // bar, so the page has that room instead; the tab bar names the
            // section and the page its own contents (an iPhone Duo opened too)
            .navigationTitle(pad ? "" : page.title)
            .navigationBarTitleDisplayMode(.inline)
            .systemBar(hidden: sideways)
            .overlay(alignment: .topLeading) {
                if sideways {
                    BackOverPage { dismiss() }
                }
            }
            // the page's own fields lower the keyboard as its scroll is
            // dragged and get Done from the system's bar above the keys
            // (PageBridgeController); this covers any native field it grows
            .keyboardDismissal()
            .push(isPresented: $showingNext) {
                if let next = next {
                    WebPage(page: next)
                }
            }
    }
}

/// The back button a phone held sideways keeps over the page's top left
/// corner, the system bar being off the page there: the bar's own chevron,
/// on a disc of the material the bar would have been.
struct BackOverPage: View {
    let act: () -> Void

    var body: some View {
        Button(action: act) {
            Image(systemName: "chevron.backward")
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(Palette.ink)
                .frame(width: 40, height: 40)
                .background(.thinMaterial, in: Circle())
                .contentShape(Circle())
        }
        .buttonStyle(PressStyle())
        .padding(.leading, 8)
        .padding(.top, 2)
        .accessibilityLabel(L("Back"))
    }
}

/// The bridge of one page, as a SwiftUI view.
struct BridgeView: UIViewControllerRepresentable {
    let page: Page
    let store: AppStore
    let account: AccountAuth
    let pad: Bool
    let open: (Page) -> Void
    let home: () -> Void

    func makeUIViewController(context: Context) -> PageBridgeController {
        let controller = PageBridgeController(page: page, startTheme: store.hasTheme ? store.theme : nil, startPad: pad)
        controller.store = store
        controller.account = account
        controller.onOpen = open
        controller.onHome = home
        return controller
    }

    func updateUIViewController(_ controller: PageBridgeController, context: Context) {
        controller.onOpen = open
        controller.onHome = home
        controller.show(theme: store.theme)
        controller.show(pad: pad)
    }
}

// MARK: - The bridge

/// A Capacitor bridge opened on one page, living inside a tab rather than
/// filling the window as Capacitor's own does.
final class PageBridgeController: CAPBridgeViewController {
    let page: Page
    /// The file the bridge opens: the page's own, or its Chinese twin where
    /// the app speaks Chinese and the bundle holds one (v12.71).
    private var startFile: String
    weak var store: AppStore?
    /// The native account (v12.46), told to the page as it opens and told
    /// of what the page does itself.
    weak var account: AccountAuth?
    var onOpen: ((Page) -> Void)?
    var onHome: (() -> Void)?

    /// The theme written into the page before it runs, when the shell has one.
    private let startTheme: Theme?
    /// The theme the page is in, once it has said so.
    private var pageTheme: Theme?
    /// Whether the page is marked as an iPad's (data-shell-pad): written
    /// before it runs, and changed as the window's room changes.
    private var pad: Bool
    /// Whether this build came from the App Store: a TestFlight or Xcode
    /// build keeps a sandbox receipt. The pages count usage only in an App
    /// Store build (VN_STORE, v12.30), so the numbers are the approved app's.
    private static let fromStore = Bundle.main.appStoreReceiptURL?.lastPathComponent == "receipt"
    /// The launch's own name, the same for every page while the app runs and
    /// new each time it is launched (VN_LAUNCH, v12.35): a page keeps how it
    /// was left under it (site/assets/launch-keep.js), so the study opens
    /// where it was left when it is come back to, and as on a first visit
    /// after the app has been closed for good.
    private static let launch = UUID().uuidString

    init(page: Page, startTheme: Theme?, startPad: Bool) {
        self.page = page
        self.startFile = page.file
        self.startTheme = startTheme
        self.pad = startPad
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("a page's bridge is made in code")
    }

    override func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        // the page in the app's language: its Chinese twin where the app speaks
        // Chinese and the bundle holds one (the twin's own script never moves a
        // page inside the tabs, since the shell would push the move as a link)
        if let twin = Lang.twin(of: page.file),
           FileManager.default.fileExists(atPath: descriptor.appLocation.appendingPathComponent(twin).path) {
            startFile = twin
        }
        // Capacitor stops the app if its start file is missing, so a page is
        // named only when it is there; otherwise the bridge opens as before
        let start = descriptor.appLocation.appendingPathComponent(startFile)
        if FileManager.default.fileExists(atPath: start.path) {
            descriptor.appStartPath = startFile
        }
        // the splash is the app's launch screen, not every page's
        var plugins = descriptor.pluginConfigurations
        plugins["SplashScreen"] = ["launchShowDuration": 0, "launchAutoHide": true] as [String: Any]
        descriptor.pluginConfigurations = plugins
        return descriptor
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(ShellLinks(file: startFile, controller: self))
        bridge?.registerPluginInstance(StillStatusBar())
        guard let webView = webView else { return }
        let paper = UIColor(named: "Paper") ?? .systemBackground
        webView.backgroundColor = paper
        webView.scrollView.backgroundColor = paper
        // one page per web view, and Back is the navigation bar's button
        webView.allowsBackForwardNavigationGestures = false
        webView.scrollView.keyboardDismissMode = .interactive
        let content = webView.configuration.userContentController
        content.addUserScript(WKUserScript(source: startScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        content.add(ShellMessages(controller: self), name: "vnShell")
    }

    /// The pages are worked by dragging (the scans, their sliders, the 3D
    /// models), so the stack's swipes back are taken away: the swipe from
    /// the edge, and from iOS 26 the swipe from anywhere on the page, which
    /// a sideways drag on a scan would set off. Back is the bar's button.
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard let stack = navigationController else { return }
        stack.interactivePopGestureRecognizer?.isEnabled = false
        if #available(iOS 26.0, *) {
            stack.interactiveContentPopGestureRecognizer?.isEnabled = false
        }
    }

    /// Runs before anything on the page: names the app's language (VN_LANG,
    /// v12.71, which assets/i18n.js takes over the browser's), marks the
    /// page as one of the shell's, and on an iPad (or with an iPad's room) as
    /// one that fills the screen (as soon as its root element exists, which
    /// WebKit makes before this runs), pins the viewport so the page cannot
    /// zoom (a double tap on a region once magnified a whole atlas page; the
    /// views pinch on their own), writes the shell's theme where the page
    /// reads its own, tells it who is logged in natively (VN_NATIVE_AUTH,
    /// v12.46), opens it on its fragment, and once it is built has it say
    /// which theme it came up in.
    private var startScript: String {
        var lines = [
            "window.VN_STORE = \(Self.fromStore);",
            "window.VN_LAUNCH = \(Self.literal(Self.launch));",
            "window.VN_LANG = \(Self.literal(Lang.code));",
            "window.VN_NATIVE_AUTH = \(nativeAuth);",
            "var pad = \(pad);",
            "var mark = function () { var root = document.documentElement; if (root) { root.setAttribute('data-shell', 'tabs'); if (pad) root.setAttribute('data-shell-pad', ''); } return !!root; };",
            "if (!mark()) new MutationObserver(function (records, watch) { if (mark()) watch.disconnect(); }).observe(document, { childList: true });",
            "var still = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';",
            "var pin = function () { var m = document.querySelector('meta[name=viewport]'); if (!m) return false; if (m.content !== still) m.content = still; return true; };",
            "if (!pin()) new MutationObserver(function (records, watch) { if (pin()) watch.disconnect(); }).observe(document, { childList: true, subtree: true });",
            "document.addEventListener('DOMContentLoaded', function () { if (!pin() && document.head) { var m = document.createElement('meta'); m.name = 'viewport'; m.content = still; document.head.appendChild(m); } });"
        ]
        if let theme = startTheme {
            lines.append("try { localStorage.setItem('mn-theme', '\(theme.rawValue)'); } catch (e) {}")
        }
        if let fragment = page.fragment {
            lines.append("if (!location.hash) { try { history.replaceState(history.state, '', location.pathname + location.search + '#' + \(Self.literal(fragment))); } catch (e) {} }")
        }
        lines.append("document.addEventListener('DOMContentLoaded', function () { try { window.webkit.messageHandlers.vnShell.postMessage({ theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light' }); } catch (e) {} });")
        return "(function () {\n" + lines.joined(separator: "\n") + "\n})();"
    }

    /// Brings the page to the shell's theme as its own switch would: a press
    /// on the switch where the page has one, so whatever else the page does
    /// on a change (the Region Atlas repaints its scans) happens too.
    func show(theme: Theme) {
        guard let now = pageTheme, now != theme else { return }
        pageTheme = theme
        let script = """
            (function (t) {
              var root = document.documentElement;
              var now = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
              if (now !== t) {
                var button = document.getElementById('themeBtn');
                if (button) button.click();
                else if (t === 'dark') root.setAttribute('data-theme', 'dark');
                else root.removeAttribute('data-theme');
              }
              try { localStorage.setItem('mn-theme', t); } catch (e) {}
            })('\(theme.rawValue)');
            """
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    /// Marks the page as an iPad's or takes the mark away, as an iPhone
    /// Duo's window gains an iPad's room opening and loses it closing; the
    /// page follows the mark as it changes (navbar.js).
    func show(pad now: Bool) {
        guard now != pad else { return }
        pad = now
        markPad()
    }

    private func markPad() {
        let script = "(function (on) { var root = document.documentElement; if (!root) return; if (on) root.setAttribute('data-shell-pad', ''); else root.removeAttribute('data-shell-pad'); })(\(pad));"
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    /// Who is logged in natively, as the page's own sign-in reads it at
    /// document start (v12.46): AccountAuth's state as a JSON literal, the
    /// person and a token or credential their SDK can sign in with, or
    /// {user: null} with nobody.
    private var nativeAuth: String {
        let state = account?.pageState() ?? ["user": NSNull()]
        if let data = try? JSONSerialization.data(withJSONObject: state),
           let json = String(data: data, encoding: .utf8) {
            return "JSON.parse(\(Self.literal(json)))"
        }
        return "{ user: null }"
    }

    /// A message from the page: the theme it came up in, or (v12.46) its
    /// word on the account. The shell takes the theme if it has none yet;
    /// otherwise the page is brought to the shell's. The iPad's mark is
    /// written again then, in case the room changed while the page was
    /// loading.
    fileprivate func received(_ body: Any) {
        guard let message = body as? [String: Any] else { return }
        if let word = message["auth"] as? String {
            heard(auth: word, message)
            return
        }
        guard let raw = message["theme"] as? String,
              let reported = Theme(rawValue: raw) else { return }
        pageTheme = reported
        store?.pageReported(reported)
        if let wanted = store?.theme { show(theme: wanted) }
        markPad()
    }

    /// The page's word on the account (v12.46): it took the credential it
    /// was handed, it signed in by itself, or it signed out; the native
    /// account follows (AccountAuth).
    private func heard(auth word: String, _ message: [String: Any]) {
        switch word {
        case "took":
            account?.handoffTaken()
        case "signedIn":
            account?.pageSignedIn(provider: message["provider"] as? String ?? "",
                                  email: message["email"] as? String,
                                  password: message["password"] as? String,
                                  idToken: message["idToken"] as? String)
        case "signedOut":
            account?.pageSignedOut()
        case "changed":
            // the page wrote something (v12.54): the native copy of the account is read again
            account?.warm(force: true)
        default:
            break
        }
    }

    /// A link on the page asked for another page.
    fileprivate func follow(_ url: URL) {
        if let next = Page(link: url) {
            onOpen?(next)
        } else {
            onHome?()
        }
    }

    /// A string as a JavaScript literal.
    private static func literal(_ text: String) -> String {
        var out = "\""
        for scalar in text.unicodeScalars {
            switch scalar {
            case "\"": out += "\\\""
            case "\\": out += "\\\\"
            case "\n": out += "\\n"
            case "\r": out += "\\r"
            case "<": out += "\\u003C"
            case "\u{2028}": out += "\\u2028"
            case "\u{2029}": out += "\\u2029"
            default: out.unicodeScalars.append(scalar)
            }
        }
        return out + "\""
    }
}

// MARK: - The bridge's helpers

/// Sees every navigation of a page's web view before Capacitor does. A link
/// to another of the app's pages is not followed in place: the shell pushes
/// that page instead. The same page with another fragment, and everything
/// outside the app, are left to Capacitor as before.
nonisolated final class ShellLinks: CAPInstancePlugin, CAPBridgedPlugin {
    let identifier = "ShellLinks"
    let jsName = "ShellLinks"
    let pluginMethods: [CAPPluginMethod] = []

    private let file: String
    private weak var controller: PageBridgeController?

    init(file: String, controller: PageBridgeController) {
        self.file = file
        self.controller = controller
        super.init()
    }

    override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        let file = self.file
        let controller = self.controller
        // WebKit asks on the main thread
        let takeOver: Bool? = MainActor.assumeIsolated {
            let frame = navigationAction.targetFrame
            guard frame == nil || frame?.isMainFrame == true,
                  let url = navigationAction.request.url,
                  url.scheme == InstanceDescriptorDefaults.scheme,
                  url.host == InstanceDescriptorDefaults.hostname,
                  url.lastPathComponent != file else { return nil }
            Task { @MainActor in controller?.follow(url) }
            return true
        }
        return takeOver.map { NSNumber(value: $0) }
    }
}

/// Stands in for the status bar plugin in a page's bridge. The real one
/// resizes its web view to the whole window whenever any bridge appears or
/// the device turns, which suits a bridge that is the window and not one
/// inside a tab. The tabs' status bar follows the theme by itself.
nonisolated final class StillStatusBar: CAPInstancePlugin, CAPBridgedPlugin {
    let identifier = "StatusBarPlugin"
    let jsName = "StatusBar"
    let pluginMethods: [CAPPluginMethod] = []
}

/// Carries the page's messages to its controller without keeping it alive.
final class ShellMessages: NSObject, WKScriptMessageHandler {
    private weak var controller: PageBridgeController?

    init(controller: PageBridgeController) {
        self.controller = controller
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        controller?.received(message.body)
    }
}
