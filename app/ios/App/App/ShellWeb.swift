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

    static let regionAtlas = Page(file: "regions.html", title: "3D Region Atlas")
    static let brodmann = Page(file: "brodmann.html", title: "Brodmann Area Atlas")
    static let networkAtlas = Page(file: "network-atlas.html", title: "Network Atlas")
    static let microanatomy = Page(file: "microanatomy.html", title: "Microanatomy")
    static let molecular = Page(file: "molecular.html", title: "Molecular")
    static let tractography = Page(file: "tracts.html", title: "Tractography")
    static let studies = Page(file: "studies.html", title: "Visualizing Studies")
    static let textbook = Page(file: "textbook.html", title: "Digital Textbook")
    static let practice = Page(file: "practice.html", title: "Practice")
    static let about = Page(file: "about.html", title: "About")
    static let mcp = Page(file: "mcp.html", title: "MCP Server")
    static let account = Page(file: "account.html", title: "Account")
    static let privacy = Page(file: "privacy.html", title: "Privacy & Support")
    static let terms = Page(file: "terms.html", title: "Terms of Use")
    static let deleteAccount = Page(file: "account.html", fragment: "delete", title: "Account")

    /// The titles of the pages a link can lead to, as the app's bar named them.
    static let titles: [String: String] = [
        "regions.html": "3D Region Atlas", "brodmann.html": "Brodmann Area Atlas",
        "network-atlas.html": "Network Atlas", "tracts.html": "Tractography",
        "microanatomy.html": "Microanatomy", "molecular.html": "Molecular",
        "studies.html": "Visualizing Studies", "hallucinations.html": "Hallucinations",
        "practice.html": "Practice", "textbook.html": "Digital Textbook",
        "about.html": "About", "privacy.html": "Privacy & Support",
        "terms.html": "Terms of Use", "delete-account.html": "Delete your account",
        "account.html": "Account", "mcp.html": "MCP Server", "connect.html": "Connect"
    ]
}

extension Page {
    /// The page a link inside the app leads to, or nil for the home page,
    /// whose place in the app the tabs have taken.
    nonisolated init?(link url: URL) {
        var file = url.lastPathComponent
        var fragment = url.fragment
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
    @Environment(\.dismiss) private var dismiss
    @State private var next: Page?
    @State private var showingNext = false

    init(page: Page) {
        self.page = page
    }

    var body: some View {
        BridgeView(page: page, store: store,
                   open: { link in
                       next = link
                       showingNext = true
                   },
                   home: { dismiss() })
            .background {
                Palette.paper.ignoresSafeArea()
            }
            // on an iPad the title would take a row of its own under the tab
            // bar, so the page has that room instead; the tab bar names the
            // section and the page its own contents
            .navigationTitle(UIDevice.current.userInterfaceIdiom == .pad ? "" : page.title)
            .navigationBarTitleDisplayMode(.inline)
            .systemBar(hidden: false)
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

/// The bridge of one page, as a SwiftUI view.
struct BridgeView: UIViewControllerRepresentable {
    let page: Page
    let store: AppStore
    let open: (Page) -> Void
    let home: () -> Void

    func makeUIViewController(context: Context) -> PageBridgeController {
        let controller = PageBridgeController(page: page, startTheme: store.hasTheme ? store.theme : nil)
        controller.store = store
        controller.onOpen = open
        controller.onHome = home
        return controller
    }

    func updateUIViewController(_ controller: PageBridgeController, context: Context) {
        controller.onOpen = open
        controller.onHome = home
        controller.show(theme: store.theme)
    }
}

// MARK: - The bridge

/// A Capacitor bridge opened on one page, living inside a tab rather than
/// filling the window as Capacitor's own does.
final class PageBridgeController: CAPBridgeViewController {
    let page: Page
    weak var store: AppStore?
    var onOpen: ((Page) -> Void)?
    var onHome: (() -> Void)?

    /// The theme written into the page before it runs, when the shell has one.
    private let startTheme: Theme?
    /// The theme the page is in, once it has said so.
    private var pageTheme: Theme?

    init(page: Page, startTheme: Theme?) {
        self.page = page
        self.startTheme = startTheme
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("a page's bridge is made in code")
    }

    override func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        // Capacitor stops the app if its start file is missing, so a page is
        // named only when it is there; otherwise the bridge opens as before
        let start = descriptor.appLocation.appendingPathComponent(page.file)
        if FileManager.default.fileExists(atPath: start.path) {
            descriptor.appStartPath = page.file
        }
        // the splash is the app's launch screen, not every page's
        var plugins = descriptor.pluginConfigurations
        plugins["SplashScreen"] = ["launchShowDuration": 0, "launchAutoHide": true] as [String: Any]
        descriptor.pluginConfigurations = plugins
        return descriptor
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(ShellLinks(file: page.file, controller: self))
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

    /// Runs before anything on the page: marks the page as one of the
    /// shell's, and on an iPad as one that fills the screen (as soon as its
    /// root element exists, which WebKit makes before this runs), writes the
    /// shell's theme where the page reads its own, opens it on its fragment,
    /// and once it is built has it say which theme it came up in.
    private var startScript: String {
        let pad = UIDevice.current.userInterfaceIdiom == .pad
        var lines = [
            "var pad = \(pad);",
            "var mark = function () { var root = document.documentElement; if (root) { root.setAttribute('data-shell', 'tabs'); if (pad) root.setAttribute('data-shell-pad', ''); } return !!root; };",
            "if (!mark()) new MutationObserver(function (records, watch) { if (mark()) watch.disconnect(); }).observe(document, { childList: true });"
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

    /// A message from the page: so far only the theme it came up in. The
    /// shell takes it if it has none yet; otherwise the page is brought to
    /// the shell's.
    fileprivate func received(_ body: Any) {
        guard let message = body as? [String: Any],
              let raw = message["theme"] as? String,
              let reported = Theme(rawValue: raw) else { return }
        pageTheme = reported
        store?.pageReported(reported)
        if let wanted = store?.theme { show(theme: wanted) }
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
