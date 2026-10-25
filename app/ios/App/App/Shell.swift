import SwiftUI
import UIKit

/* The app's root since v11: one system tab bar over the web app's pages.
   The site's navigation falls into four groups, and each is a tab that
   opens on a page in the home page's manner, its boxes leading to the web
   app's pages; Account comes last. A page opened from a box is pushed
   inside its own tab (ShellWeb.swift), so each tab keeps its place.

   No tab carries a badge, because nothing in the app is waiting to be done
   (practice is adaptive and keeps no queue of due questions), and there is
   no gate in front of the tabs, because nothing has to be settled before
   the app can be used: an account is optional and asked for where it is
   needed. Nothing switches tabs in code, so there is no selection binding. */

/// Light or dark, as the site names them (its "mn-theme").
nonisolated enum Theme: String, Sendable {
    case dark, light
}

/// White or black: the tile behind the brain on the Home Screen.
nonisolated enum IconTile: String, Sendable {
    case white, black

    /// The asset catalog's name for the tile; nil is the primary icon.
    var alternateIconName: String? { self == .black ? "AppIcon-Black" : nil }
}

/// What the shell keeps: the theme, chosen on the Account tab and carried
/// into every page, and the app icon's tile.
final class AppStore: ObservableObject {
    /// Set by the Appearance switch on the Account tab, and kept.
    @Published var theme: Theme {
        didSet {
            hasTheme = true
            UserDefaults.standard.set(theme.rawValue, forKey: Self.key)
        }
    }
    /// Set by the App icon switch on the Account tab. The system keeps the
    /// icon itself, so this is read off it as the shell starts and written
    /// through to it as it changes.
    @Published var iconTile: IconTile {
        didSet {
            if iconTile != oldValue { showIcon(iconTile) }
        }
    }
    /// False until the shell has a theme of its own. Until then the first
    /// page to open reports the theme the web app last used, and the shell
    /// takes it, so nobody's choice is lost in the move to the tabs.
    private(set) var hasTheme: Bool

    private static let key = "vn-theme"

    init() {
        if let raw = UserDefaults.standard.string(forKey: Self.key), let saved = Theme(rawValue: raw) {
            theme = saved
            hasTheme = true
        } else {
            theme = .dark   // the site's own default
            hasTheme = false
        }
        iconTile = Self.shownTile
    }

    /// A page reports the theme it opened in.
    func pageReported(_ reported: Theme) {
        if !hasTheme { theme = reported }
    }

    /// The tile the Home Screen shows now.
    private static var shownTile: IconTile {
        UIApplication.shared.alternateIconName == IconTile.black.alternateIconName ? .black : .white
    }

    /// Asks the system for the tile. If it declines, the switch goes back
    /// to the icon it kept.
    private func showIcon(_ tile: IconTile) {
        let app = UIApplication.shared
        guard app.supportsAlternateIcons, app.alternateIconName != tile.alternateIconName else { return }
        Task {
            do {
                try await UIApplication.shared.setAlternateIconName(tile.alternateIconName)
            } catch {
                self.iconTile = Self.shownTile
            }
        }
    }
}

// MARK: - Updates

/// What the App Store's lookup service says of the app: the version it
/// offers, and the oldest system that version runs on.
nonisolated struct StoreListing: Decodable, Sendable {
    let results: [Entry]

    nonisolated struct Entry: Decodable, Sendable {
        let version: String
        let minimumOsVersion: String?
    }
}

/// Tells the person, in a popup, when the App Store has a newer version of
/// the app than the one they are running. The store is asked as the app
/// opens and whenever it comes back to the front, at most once an hour; the
/// person is asked at most once a day for the same version, and not at all
/// when that version needs a newer system than the device has. A build
/// newer than the store's, on TestFlight or in review, is never asked.
final class UpdateCheck: ObservableObject {
    /// True while the popup is up.
    @Published var asking = false
    /// The version the store offers, once it is known to be newer.
    @Published private(set) var newer: String?

    /// The app's number on the App Store.
    static let appID = "6805618686"
    /// The app's page on the App Store, which opens in the App Store app.
    static let storePage = URL(string: "https://apps.apple.com/app/id6805618686")!
    /// The version this build carries.
    static let installed = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"

    private static let askedOnKey = "vn-update-asked-on"
    private static let askedForKey = "vn-update-asked-for"
    private var lookedAt: Date?
    private var looking = false

    /// Asks the store which version it offers and raises the popup if that
    /// one is newer, unless the store was asked within the hour.
    func look() async {
        if looking || asking { return }
        if let last = lookedAt, Date().timeIntervalSince(last) < 60 * 60 { return }
        looking = true
        defer { looking = false }
        guard let entry = await Self.listing() else { return }
        lookedAt = Date()
        guard Self.order(entry.version, Self.installed) == .orderedDescending else { return }
        // On a Mac the iPad app runs under macOS, whose numbers are not iOS's,
        // and the Mac App Store decides what can be installed there.
        if let needs = entry.minimumOsVersion, !ProcessInfo.processInfo.isiOSAppOnMac {
            let os = ProcessInfo.processInfo.operatingSystemVersion
            if Self.order(needs, "\(os.majorVersion).\(os.minorVersion).\(os.patchVersion)") == .orderedDescending { return }
        }
        let defaults = UserDefaults.standard
        if defaults.string(forKey: Self.askedForKey) == entry.version,
           let on = defaults.object(forKey: Self.askedOnKey) as? Date,
           Date().timeIntervalSince(on) < 24 * 60 * 60 { return }
        defaults.set(Date(), forKey: Self.askedOnKey)
        defaults.set(entry.version, forKey: Self.askedForKey)
        newer = entry.version
        asking = true
    }

    /// The store's entry for the app: from the storefront of the device's
    /// region where it names one, else from the store's default.
    private static func listing() async -> StoreListing.Entry? {
        let region: String?
        if #available(iOS 16, *) {
            region = Locale.current.region?.identifier
        } else {
            region = Locale.current.regionCode
        }
        var countries: [String?] = [nil]
        if let region, region.count == 2 { countries.insert(region.lowercased(), at: 0) }
        for country in countries {
            guard var parts = URLComponents(string: "https://itunes.apple.com/lookup") else { return nil }
            var query = [URLQueryItem(name: "id", value: appID)]
            if let country { query.append(URLQueryItem(name: "country", value: country)) }
            parts.queryItems = query
            guard let url = parts.url else { continue }
            let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
            guard let answer = try? await URLSession.shared.data(for: request) else { continue }
            let (data, response) = answer
            guard (response as? HTTPURLResponse)?.statusCode == 200,
                  let listing = try? JSONDecoder().decode(StoreListing.self, from: data),
                  let entry = listing.results.first
            else { continue }
            return entry
        }
        return nil
    }

    /// Two version numbers compared part by part, a missing part counting as
    /// nought, so that 1.10 is newer than 1.9 and 1.1 the same as 1.1.0.
    static func order(_ a: String, _ b: String) -> ComparisonResult {
        let x = a.split(separator: ".").map { Int($0) ?? 0 }
        let y = b.split(separator: ".").map { Int($0) ?? 0 }
        for i in 0..<max(x.count, y.count) {
            let p = i < x.count ? x[i] : 0
            let q = i < y.count ? y[i] : 0
            if p != q { return p < q ? .orderedAscending : .orderedDescending }
        }
        return .orderedSame
    }
}

/// The root the scene's window holds: the store, the ink tint for the
/// selected tab and every control, set once here, the theme, and the popup
/// that says when a newer version is on the App Store.
struct ShellRoot: View {
    @StateObject private var store = AppStore()
    @StateObject private var update = UpdateCheck()
    @Environment(\.openURL) private var openURL

    init() {}

    var body: some View {
        ShellTabs()
            .environmentObject(store)
            .tint(Palette.ink)
            .preferredColorScheme(store.theme == .dark ? .dark : .light)
            .task { await update.look() }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                Task { await update.look() }
            }
            .alert("Update Available", isPresented: $update.asking, presenting: update.newer) { _ in
                Button("Update") { openURL(UpdateCheck.storePage) }
                Button("Not Now", role: .cancel) {}
            } message: { version in
                Text("Version \(version) of Visual Neuroscience is on the App Store, and this device has \(UpdateCheck.installed). Update to get the latest atlases and fixes.")
            }
    }
}

/// One system tab bar: the site's four groups of pages, then Account.
struct ShellTabs: View {
    var body: some View {
        TabView {
            AtlasTab()
                .tabItem { Label("Atlases", systemImage: "brain") }
            LibraryTab()
                .tabItem { Label("Library", systemImage: "books.vertical") }
            PracticeTab()
                .tabItem { Label("Practice", systemImage: "checklist") }
            AboutTab()
                .tabItem { Label("About", systemImage: "info.circle") }
            AccountTab()
                .tabItem { Label("Account", systemImage: "person") }
        }
    }
}

/// A box that opens one of the web app's pages inside the tab.
struct PageBox: View {
    let page: Page
    let kicker: String
    var title: String? = nil
    var text: String? = nil
    var shot: Shot? = nil
    var meta: String? = nil
    let go: String

    var body: some View {
        NavigationLink(destination: WebPage(page: page)) {
            Box(kicker: kicker, title: title ?? page.title, text: text, shot: shot, meta: meta, go: go)
                .accessibilityElement(children: .combine)
        }
        .buttonStyle(PressStyle())
    }
}

// MARK: - The tabs

/// The atlases: the regions in 3D, the Brodmann areas beneath them, the
/// cell, the receptors, the white matter and, last, the networks.
struct AtlasTab: View {
    var body: some View {
        TabPage {
            PageBox(page: .regionAtlas, kicker: "The Atlas",
                    text: "A detailed 3D atlas of the human brain, with the Brodmann areas, receptor density maps and a functional breakdown of every region.",
                    shot: Shot("assets/home/atlas.jpg", light: "assets/home/atlas-light.jpg"),
                    meta: "116 parcels · 41 Brodmann areas · four viewports · receptor densities · slice tool · PNG and 3D export · saved models",
                    go: "Open the atlas")
            PageBox(page: .brodmann, kicker: "Cytoarchitecture",
                    text: "Brodmann’s 41 areas of the cortex on a map of both faces of the hemisphere. Tap one and what it does appears beside it.",
                    shot: Shot("assets/home/brodmann.jpg", light: "assets/home/brodmann-light.jpg"),
                    meta: "41 areas · both faces · what each one does",
                    go: "Open the map")
            PageBox(page: .microanatomy, kicker: "Under the microscope",
                    text: "The neuron and its synapses at the cell’s scale, down to the neurotransmitters and their receptors.",
                    shot: Shot("assets/home/cells.jpg", light: "assets/home/cells-light.jpg"),
                    meta: "2 cells drawn · 37 structures · explore and test modes",
                    go: "Open the cell")
            PageBox(page: .molecular, kicker: "The molecules",
                    text: "The dopamine and serotonin receptors in three dimensions, with the transmitters and drugs that bind them.",
                    shot: Shot("assets/home/molecular.jpg", light: "assets/home/molecular-light.jpg"),
                    meta: "17 receptors · 39 structures · 24 drugs · binding tour · compare",
                    go: "Open the receptors")
            PageBox(page: .tractography, kicker: "White matter",
                    text: "The white matter’s million fibre pathways, from the HCP1065 population average, in full 3D.",
                    shot: Shot("assets/home/tracts.jpg", light: "assets/home/tracts-light.jpg"),
                    meta: "Direction-coloured streamlines · free rotation",
                    go: "Open the tractogram")
            PageBox(page: .networkAtlas, kicker: "Systems",
                    text: "The brain’s large-scale networks in six states, from flow to meditation, mapped onto the scan.",
                    shot: Shot("assets/home/network.jpg", light: "assets/home/network-light.jpg"),
                    meta: "6 states · 7 systems · 20 nodes",
                    go: "Open the ring")
        }
    }
}

/// The papers drawn on the brain, and the book.
struct LibraryTab: View {
    var body: some View {
        TabPage {
            PageBox(page: .studies, kicker: "The Papers",
                    text: "Published neuroimaging studies drawn directly on the brain, region by region.",
                    shot: Shot("assets/studies/hallucinations.png", light: "assets/studies/hallucinations-light.png"),
                    meta: "1 study drawn · more to come",
                    go: "Open the shelf")
            PageBox(page: .textbook, kicker: "The Book",
                    text: "OpenStax’s complete Introduction to Behavioral Neuroscience, in the site’s own pages.",
                    shot: Shot("assets/home/textbook.jpg", light: "assets/home/textbook-light.jpg"),
                    meta: "19 chapters · 85 sections · 506 figures · CC BY-NC-SA",
                    go: "Open the book")
            PageBox(page: .posters, kicker: "On paper",
                    text: "Two A1 prints: every neurotransmitter drawn to one scale, and the receptors with their affinities.",
                    shot: Shot("assets/posters/home.jpg"),
                    meta: "2 posters · A1 · shop opening soon",
                    go: "See the posters")
        }
    }
}

/// Revision.
struct PracticeTab: View {
    var body: some View {
        TabPage {
            PageBox(page: .practice, kicker: "Revision", title: "Neuroscience Practice",
                    text: "Adaptive multiple-choice revision built for the KCL MSc Neuroscience syllabus.",
                    shot: Shot("assets/home/practice.jpg", light: "assets/home/practice-light.jpg"),
                    meta: "Adaptive questions · session score · explanations",
                    go: "Start practising")
        }
    }
}

/// The server that lets an assistant ask the atlas, first, then the
/// developer's message and where to follow and write.
struct AboutTab: View {
    var body: some View {
        TabPage {
            PageBox(page: .mcp, kicker: "For AI assistants",
                    text: "Ask the atlas from Claude, ChatGPT, Kimi or any assistant that speaks the Model Context Protocol: what a region does, where a receptor is densest, how the brain changes in a state. Each answer links to the view it describes.",
                    meta: "9 tools · no key needed · sign in only for your own models",
                    go: "How to connect")
            Box(kicker: "On the way", title: "Coming soon",
                text: "Three things being built now, none of them ready to open yet.") {
                VStack(alignment: .leading, spacing: 0) {
                    SoonRow(name: "Circuit Atlas", text: "The 3D Region Atlas with the traffic drawn on: animated paths run from region to region, so a circuit such as the Hallucinations study’s plays out on the brain.")
                    SoonRow(name: "Regions in depth", text: "A detailed functional breakdown of every region, written from the research, beyond the line the atlas gives each one now.")
                    SoonRow(name: "The MCP server, extended", text: "New tools for an assistant: the Circuit Atlas’s paths and the detailed breakdowns, answered in Claude, ChatGPT, Kimi or any assistant that speaks the protocol.")
                }
                .padding(.top, 10)
            }
            PageBox(page: .about, kicker: "From the developer", title: "A Message from the Developer",
                    shot: Shot("assets/portrait/portrait.webp", framed: true),
                    meta: "Fadil Karim · built by one engineer · free to use",
                    go: "Read the message")
            Box(kicker: "Follow and write", title: "Channels") {
                VStack(alignment: .leading, spacing: 0) {
                    OutLink(name: "YouTube", handle: "@VisualNeuroscienceAI", url: "https://www.youtube.com/@VisualNeuroscienceAI")
                    OutLink(name: "Instagram", handle: "fid_900", url: "https://www.instagram.com/fid_900/")
                    OutLink(name: "LinkedIn", handle: "Fadil Karim", url: "https://www.linkedin.com/in/fadil-karim/")
                    OutLink(name: "Email", handle: "fkarim@visualneuroscience.ai", url: "mailto:fkarim@visualneuroscience.ai")
                }
                .padding(.top, 10)
            }
        }
    }
}

/// One way out of the app, a line of its own under a hairline.
struct OutLink: View {
    let name: String
    let handle: String
    let url: String

    var body: some View {
        if let destination = URL(string: url) {
            Link(destination: destination) {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(name.uppercased())
                            .font(Faces.brand(11, .footnote))
                            .tracking(2.4)
                            .foregroundColor(Palette.ink)
                        Text(handle)
                            .font(Faces.serif(16, .body))
                            .foregroundColor(Palette.ink60)
                    }
                    Spacer(minLength: 8)
                    Image(systemName: "arrow.up.right")
                        .font(Faces.brand(12, .footnote))
                        .foregroundColor(Palette.ink)
                        .accessibilityHidden(true)
                }
                .padding(.vertical, 12)
                .overlay(alignment: .top) {
                    Rectangle().fill(Palette.ink35).frame(height: 1)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(PressStyle())
            .accessibilityElement(children: .combine)
        }
    }
}

/// A row that names something on its way: the Coming soon box's rows, in
/// OutLink's manner with no arrow and nothing to press.
struct SoonRow: View {
    let name: String
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(name.uppercased())
                .font(Faces.brand(11, .footnote))
                .tracking(2.4)
                .foregroundColor(Palette.ink)
            Text(text)
                .font(Faces.serif(16, .body))
                .foregroundColor(Palette.ink60)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 12)
        .overlay(alignment: .top) {
            Rectangle().fill(Palette.ink35).frame(height: 1)
        }
        .accessibilityElement(children: .combine)
    }
}

/// A row that pushes one of the site's pages: the rows of the Support box,
/// in OutLink's manner, with a chevron where an outward link carries an arrow.
struct PageRow: View {
    let name: String
    let text: String
    let page: Page

    var body: some View {
        NavigationLink(destination: WebPage(page: page)) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(name.uppercased())
                        .font(Faces.brand(11, .footnote))
                        .tracking(2.4)
                        .foregroundColor(Palette.ink)
                    Text(text)
                        .font(Faces.serif(16, .body))
                        .foregroundColor(Palette.ink60)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                Image(systemName: "chevron.right")
                    .font(Faces.brand(12, .footnote))
                    .foregroundColor(Palette.ink)
                    .accessibilityHidden(true)
            }
            .padding(.vertical, 12)
            .overlay(alignment: .top) {
                Rectangle().fill(Palette.ink35).frame(height: 1)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle())
        .accessibilityElement(children: .combine)
    }
}

/// The account and what goes with it: preferences, support and the credits.
struct AccountTab: View {
    @EnvironmentObject private var store: AppStore

    init() {}

    var body: some View {
        TabPage {
            PageBox(page: .account, kicker: "Your account", title: "Account",
                    text: "Log in to see your details, your saved models and your practice progress, change your password, download a copy of all of it, or delete the account. An account is optional: everything works without one.",
                    go: "Open your account")
            Box(kicker: "Preferences", title: "Appearance",
                text: "Light or dark, for these pages, the atlas pages and the scans.") {
                Picker("Appearance", selection: $store.theme) {
                    Text("Dark").tag(Theme.dark)
                    Text("Light").tag(Theme.light)
                }
                .pickerStyle(.segmented)
                .padding(.top, 14)
            }
            if UIApplication.shared.supportsAlternateIcons {
                Box(kicker: "Preferences", title: "App icon",
                    text: "The brain on a white tile or on a black one, on the Home Screen. The one in use is boxed; press the other to change over.") {
                    IconTileChoice(tile: $store.iconTile)
                }
            }
            Box(kicker: "Support", title: "Help, privacy and terms",
                text: "Questions and problems go straight to the developer. The password is changed, and the account deleted, from the account's own page.") {
                VStack(alignment: .leading, spacing: 0) {
                    OutLink(name: "Email", handle: "fkarim@visualneuroscience.ai", url: "mailto:fkarim@visualneuroscience.ai")
                    PageRow(name: "Privacy & Support", text: "What the app keeps, and how to reach the developer", page: .privacy)
                    PageRow(name: "Terms of Use", text: "What you may do here, and what we promise and do not", page: .terms)
                    PageRow(name: "Change your password", text: "A new password for an account that logs in with an email address", page: .password)
                    PageRow(name: "Delete your account", text: "Remove the account, its saved models and its progress, for good", page: .deleteAccount)
                }
                .padding(.top, 10)
            }
            Credits()
        }
    }
}

/// The two tiles the app's icon can wear, pictured as the Home Screen draws
/// them, with a box around the one in use; pressing the other asks the
/// system for it. The pictures are the icon script's, in the asset catalog
/// (IconTileWhite and IconTileBlack).
struct IconTileChoice: View {
    @Binding var tile: IconTile

    init(tile: Binding<IconTile>) {
        _tile = tile
    }

    var body: some View {
        HStack(spacing: 10) {
            option(.white, name: "White", picture: "IconTileWhite")
            option(.black, name: "Black", picture: "IconTileBlack")
            Spacer(minLength: 0)
        }
        .padding(.top, 14)
    }

    private func option(_ value: IconTile, name: String, picture: String) -> some View {
        let chosen = tile == value
        return Button {
            tile = value
        } label: {
            VStack(spacing: 9) {
                Image(picture)
                    .resizable()
                    .interpolation(.high)
                    .frame(width: 72, height: 72)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Palette.ink35, lineWidth: 1))
                Text(name.uppercased())
                    .font(Faces.brand(10, .caption2))
                    .tracking(2.4)
                    .foregroundColor(chosen ? Palette.ink : Palette.ink60)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .overlay(Rectangle().strokeBorder(chosen ? Palette.ink : Color.clear, lineWidth: 1.5))
            .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle())
        .accessibilityLabel(Text("\(name) tile"))
        .accessibilityAddTraits(chosen ? .isSelected : [])
    }
}

/// The credits footer: what the app is drawn from and on whose terms, as
/// the pages' own footers and docs/PERMISSIONS.md give them.
struct Credits: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("CREDITS")
                .font(Faces.brand(10, .caption2))
                .tracking(2.6)
                .foregroundColor(Palette.ink60)
            Text("Rendered with [NiiVue](https://github.com/niivue/niivue) (Rorden lab). MNI152 template, McConnell Brain Imaging Centre. AAL parcellation, Tzourio-Mazoyer et al. 2002. Brodmann atlas volume from MRIcron. Receptor PET maps from Hansen et al. 2022 (CC BY-NC-SA 4.0) and autoradiography from Zilles and Palomero-Gallagher 2017 (CC BY 4.0). HCP1065 tractography, Yeh 2022 (CC BY-SA 4.0). Receptor structures from the Protein Data Bank, through GPCRdb.")
                .font(Faces.serifItalic(14, .footnote))
                .foregroundColor(Palette.ink60)
                .fixedSize(horizontal: false, vertical: true)
            Text("Brodmann Areas diagram adapted with permission from IFEN – Institute for EEG-Neurofeedback / [Neurofeedback Academy](https://neurofeedback-academy.com).")
                .font(Faces.serifItalic(14, .footnote))
                .foregroundColor(Palette.ink60)
                .fixedSize(horizontal: false, vertical: true)
            Text("The Digital Textbook is OpenStax’s Introduction to Behavioral Neuroscience, under CC BY-NC-SA 4.0. Set in Flux, Newsreader and Prata, under the SIL Open Font License. © 2026 VisualNeuroscience.AI")
                .font(Faces.serifItalic(14, .footnote))
                .foregroundColor(Palette.ink60)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 4)
        .padding(.vertical, 10)
    }
}
