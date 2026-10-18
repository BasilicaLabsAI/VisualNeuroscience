import SwiftUI

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

/// What the shell keeps: the theme, chosen on the Account tab and carried
/// into every page.
final class AppStore: ObservableObject {
    /// Set by the Appearance switch on the Account tab, and kept.
    @Published var theme: Theme {
        didSet {
            hasTheme = true
            UserDefaults.standard.set(theme.rawValue, forKey: Self.key)
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
    }

    /// A page reports the theme it opened in.
    func pageReported(_ reported: Theme) {
        if !hasTheme { theme = reported }
    }
}

/// The root the scene's window holds: the store, the ink tint for the
/// selected tab and every control, set once here, and the theme.
struct ShellRoot: View {
    @StateObject private var store = AppStore()

    init() {}

    var body: some View {
        ShellTabs()
            .environmentObject(store)
            .tint(Palette.ink)
            .preferredColorScheme(store.theme == .dark ? .dark : .light)
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

/// The atlases: the regions, the cell, the receptors, the white matter
/// and, last, the networks.
struct AtlasTab: View {
    var body: some View {
        TabPage {
            PageBox(page: .regionAtlas, kicker: "The Atlas",
                    text: "A detailed 3D atlas of the human brain, with the Brodmann areas, receptor density maps and a functional breakdown of every region.",
                    shot: Shot("assets/home/atlas.jpg", light: "assets/home/atlas-light.jpg"),
                    meta: "116 parcels · 41 Brodmann areas · four viewports · receptor densities · slice tool · PNG and 3D export · saved models",
                    go: "Open the atlas")
            PageBox(page: .microanatomy, kicker: "Under the microscope",
                    text: "The neuron and its synapses at the cell’s scale, down to the neurotransmitters and their receptors.",
                    shot: Shot("assets/home/cells.jpg"),
                    meta: "2 cells drawn · 37 structures · explore and test modes",
                    go: "Open the cell")
            PageBox(page: .molecular, kicker: "The molecules",
                    text: "The dopamine and serotonin receptors in three dimensions, with the transmitters and drugs that bind them.",
                    shot: Shot("assets/home/molecular.jpg"),
                    meta: "17 receptors · 39 structures · 24 drugs · binding tour · compare",
                    go: "Open the receptors")
            PageBox(page: .tractography, kicker: "White matter",
                    text: "The white matter’s million fibre pathways, from the HCP1065 population average, in full 3D.",
                    shot: Shot("assets/home/tracts.jpg"),
                    meta: "Direction-coloured streamlines · free rotation",
                    go: "Open the tractogram")
            PageBox(page: .networkAtlas, kicker: "Systems",
                    text: "The brain’s large-scale networks in six states, from flow to meditation, mapped onto the scan.",
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
                    shot: Shot("assets/studies/hallucinations.png"),
                    meta: "1 study drawn · more to come",
                    go: "Open the shelf")
            PageBox(page: .textbook, kicker: "The Book",
                    text: "OpenStax’s complete Introduction to Behavioral Neuroscience, in the site’s own pages.",
                    shot: Shot("assets/home/textbook.jpg"),
                    meta: "19 chapters · 85 sections · 506 figures · CC BY-NC-SA",
                    go: "Open the book")
        }
    }
}

/// Revision.
struct PracticeTab: View {
    var body: some View {
        TabPage {
            PageBox(page: .practice, kicker: "Revision", title: "Neuroscience Practice",
                    text: "Adaptive multiple-choice revision built for the KCL MSc Neuroscience syllabus.",
                    shot: Shot("assets/home/practice.jpg"),
                    meta: "Adaptive questions · session score · explanations",
                    go: "Start practising")
        }
    }
}

/// The developer's message, where to follow and write, and the server
/// that lets an assistant ask the atlas.
struct AboutTab: View {
    var body: some View {
        TabPage {
            PageBox(page: .about, kicker: "From the developer", title: "Message from the Developer",
                    shot: Shot("assets/portrait/portrait.webp", framed: true),
                    meta: "Fadil Karim · built by one engineer · free to use",
                    go: "Read the message")
            Box(kicker: "Follow and write", title: "Elsewhere") {
                VStack(alignment: .leading, spacing: 0) {
                    OutLink(name: "YouTube", handle: "@VisualNeuroscienceAI", url: "https://www.youtube.com/@VisualNeuroscienceAI")
                    OutLink(name: "Instagram", handle: "fid_900", url: "https://www.instagram.com/fid_900/")
                    OutLink(name: "LinkedIn", handle: "Fadil Karim", url: "https://www.linkedin.com/in/fadil-karim/")
                    OutLink(name: "Email", handle: "fkarim@visualneuroscience.ai", url: "mailto:fkarim@visualneuroscience.ai")
                }
                .padding(.top, 10)
            }
            PageBox(page: .mcp, kicker: "For AI assistants",
                    text: "Ask the atlas from Claude, ChatGPT or any assistant that speaks the Model Context Protocol: what a region does, where a receptor is densest, how the brain changes in a state. Each answer links to the view it describes.",
                    meta: "9 tools · no key needed · sign in only for your own models",
                    go: "How to connect")
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

/// The account and what goes with it: preferences, support and the credits.
struct AccountTab: View {
    @EnvironmentObject private var store: AppStore

    init() {}

    var body: some View {
        TabPage {
            PageBox(page: .account, kicker: "Your account", title: "Account",
                    text: "Log in to see your details, your saved models and your practice progress, download a copy of all of it, or delete the account. An account is optional: everything works without one.",
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
            Box(kicker: "Support", title: "Help and privacy",
                text: "Questions, problems and requests to delete an account go straight to the developer.") {
                VStack(alignment: .leading, spacing: 0) {
                    OutLink(name: "Email", handle: "fkarim@visualneuroscience.ai", url: "mailto:fkarim@visualneuroscience.ai")
                    NavigationLink(destination: WebPage(page: .privacy)) {
                        HStack(alignment: .firstTextBaseline) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text("PRIVACY & SUPPORT")
                                    .font(Faces.brand(11, .footnote))
                                    .tracking(2.4)
                                    .foregroundColor(Palette.ink)
                                Text("What the app keeps, and how to reach the developer")
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
                .padding(.top, 10)
            }
            Credits()
        }
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
