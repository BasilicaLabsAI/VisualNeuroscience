import SwiftUI
import UIKit

/* The pieces every tab's page is made of, so the five read as one object:
   the site's palette and typefaces, the paper under everything, the box a
   page links from, and the keyboard's way out. A page has no header of its
   own: the tab bar names it, and its first box starts at the top.
   Shell.swift lays the tabs out with them; ShellWeb.swift opens the pages. */

// MARK: - Languages

/// The language the app speaks (v12.71, at the owner's word): the one iOS
/// gives it from the phone's own list of languages, or the one picked for
/// the app on its page in Settings, among those Info.plist names
/// (CFBundleLocalizations: English and Simplified Chinese). Traditional
/// Chinese has none of its own yet, so iOS passes over it to the next
/// language in the person's list, as the website does.
nonisolated enum Lang {
    /// iOS's name for it: "en" or "zh-Hans".
    static let code: String = Bundle.main.preferredLocalizations.first ?? "en"
    /// Whether the app speaks Simplified Chinese.
    static let chinese: Bool = code.lowercased().hasPrefix("zh-hans") || code.lowercased() == "zh"

    /// A page's Chinese twin, where the app speaks Chinese: "about.html" is
    /// "about.zh-hans.html", which scripts/i18n/build.py writes beside it.
    /// Whether the bundle holds it is for the caller to see.
    static func twin(of file: String) -> String? {
        guard chinese, file.hasSuffix(".html") else { return nil }
        return String(file.dropLast(".html".count)) + ".zh-hans.html"
    }
}

/// English words in the app's language: their Chinese from the catalog the
/// website's pages are written from (i18n/zh-hans.json, gathered into
/// ShellWords.swift), or the English where it has none. Every word the
/// shell shows passes through here, written L("…") where it stands, which
/// is how scripts/i18n/build.py finds it; {1}, {2} in the words take the
/// values given after them, in either language.
nonisolated func L(_ english: String, _ values: String...) -> String {
    var out = Lang.chinese ? (ShellWords.zh[english] ?? english) : english
    for (i, value) in values.enumerated() {
        out = out.replacingOccurrences(of: "{\(i + 1)}", with: value)
    }
    return out
}

// MARK: - Palette

/// The site's colours (index.html's :root), from the asset catalog, each
/// with its dark-theme value: ink on paper, and the two greys between.
enum Palette {
    static let ink = Color("Ink")
    static let paper = Color("Paper")
    static let ink60 = Color("Ink60")
    static let ink35 = Color("Ink35")
}

// MARK: - Typefaces

/// The site's three faces, copied from site/fonts into Fonts/ and listed
/// under UIAppFonts. Every size is given against a text style, so Dynamic
/// Type scales it.
enum Faces {
    /// Flux, the brand face: kickers, readouts, signposts.
    static func brand(_ size: CGFloat, _ style: Font.TextStyle) -> Font {
        .custom("Flux", size: size, relativeTo: style)
    }
    /// Newsreader, the reading face.
    static func serif(_ size: CGFloat, _ style: Font.TextStyle) -> Font {
        .custom("Newsreader16pt16pt-Regular", size: size, relativeTo: style)
    }
    static func serifItalic(_ size: CGFloat, _ style: Font.TextStyle) -> Font {
        .custom("Newsreader16pt16pt-Italic", size: size, relativeTo: style)
    }
    /// Prata, the display face of the titles.
    static func display(_ size: CGFloat, _ style: Font.TextStyle) -> Font {
        .custom("Prata-Regular", size: size, relativeTo: style)
    }
}

// MARK: - The paper

/// The ground of every tab: the page's paper with a faint grid of ink dots
/// at the site's 14-point gap, running under the bars.
struct PaperBackground: View {
    var body: some View {
        let dot = Palette.ink.opacity(0.1)
        Canvas { context, size in
            let step: CGFloat = 14
            var dots = Path()
            var y = step / 2
            while y < size.height {
                var x = step / 2
                while x < size.width {
                    dots.addEllipse(in: CGRect(x: x - 0.75, y: y - 0.75, width: 1.5, height: 1.5))
                    x += step
                }
                y += step
            }
            context.fill(dots, with: .color(dot))
        }
        .background(Palette.paper)
        .accessibilityHidden(true)
    }
}

extension View {
    /// Puts the shared paper behind a page, under the bars as well.
    func paperBackground() -> some View {
        background {
            PaperBackground().ignoresSafeArea()
        }
    }
}

// MARK: - The keyboard's way out

extension View {
    /// For any page with a text field: a drag down the page lowers the
    /// keyboard with the finger, and Done above the keys puts it away,
    /// since on an iPhone the keyboard covers the tab bar.
    func keyboardDismissal() -> some View {
        modifier(KeyboardDismissal())
    }
}

struct KeyboardDismissal: ViewModifier {
    @ViewBuilder func body(content: Content) -> some View {
        if #available(iOS 16.0, *) {
            content
                .scrollDismissesKeyboard(.interactively)
                .toolbar { done }
        } else {
            content.toolbar { done }
        }
    }

    @ToolbarContentBuilder private var done: some ToolbarContent {
        ToolbarItemGroup(placement: .keyboard) {
            Spacer()
            Button(L("Done")) {
                _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            }
        }
    }
}

// MARK: - Navigation at the deployment target

/// A tab's own stack, so what a box opens stays inside its tab:
/// NavigationStack where the system has it, the stack style of
/// NavigationView on iOS 15.
struct TabStack<Root: View>: View {
    private let root: Root

    init(@ViewBuilder root: () -> Root) {
        self.root = root()
    }

    var body: some View {
        if #available(iOS 16.0, *) {
            NavigationStack { root }
        } else {
            NavigationView { root }
                .navigationViewStyle(.stack)
        }
    }
}

extension View {
    /// Hides or shows the system navigation bar on this screen.
    @ViewBuilder func systemBar(hidden: Bool) -> some View {
        if #available(iOS 16.0, *) {
            toolbar(hidden ? .hidden : .visible, for: .navigationBar)
        } else {
            navigationBarHidden(hidden)
        }
    }

    /// Pushes a screen onto the stack while `isPresented` is true, for a
    /// push the code starts rather than a tap on a link.
    @ViewBuilder func push<Destination: View>(isPresented: Binding<Bool>, @ViewBuilder destination: () -> Destination) -> some View {
        if #available(iOS 16.0, *) {
            navigationDestination(isPresented: isPresented, destination: destination)
        } else {
            let link = NavigationLink(destination: destination(), isActive: isPresented) { EmptyView() }
            background {
                link.hidden()
            }
        }
    }
}

// MARK: - An iPad's room

/// Whether a page is laid out as on an iPad: on an iPad, and since v12.23 on
/// an iPhone whose window is regular both ways, as an iPhone Duo's is open,
/// so the Duo opened is an iPad and closed a phone. A large iPhone held
/// sideways is regular one way only and stays a phone.
func padLayout(_ horizontal: UserInterfaceSizeClass?, _ vertical: UserInterfaceSizeClass?) -> Bool {
    UIDevice.current.userInterfaceIdiom == .pad || (horizontal == .regular && vertical == .regular)
}

// MARK: - A tab's page

/// The shell of every tab's page: its own stack with the system bar
/// hidden, and a scroll of boxes 14 points apart on the paper. On a wide
/// screen the column keeps to a reading width in the middle.
struct TabPage<Content: View>: View {
    private let content: Content
    @Environment(\.horizontalSizeClass) private var horizontalSize
    @Environment(\.verticalSizeClass) private var verticalSize

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        TabStack {
            ScrollView {
                VStack(spacing: 14) {
                    /* on an iPhone a line at the top of every tab, in the kicker's type
                       (v12.14, at the owner's word); the pages say it too (navbar.js).
                       An iPhone Duo opened has an iPad's room and goes without it */
                    if !padLayout(horizontalSize, verticalSize) {
                        Text(L("Best experienced on iPad").uppercased())
                            .font(Faces.brand(10, .caption2))
                            .tracking(2.6)
                            .foregroundColor(Palette.ink60)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 2)
                    }
                    content
                }
                .padding(14)
                .frame(maxWidth: 820)
                .frame(maxWidth: .infinity)
            }
            .paperBackground()
            .systemBar(hidden: true)
        }
    }
}

// MARK: - A box

/// A picture from the web app's own files in the bundle (public/…), with
/// a twin for the light theme where the page draws on white.
nonisolated struct Shot: Sendable {
    let dark: String
    let light: String
    /// Captures of a page sit on a plate; the portrait stands in the
    /// engraved frame the About page draws round it.
    let framed: Bool

    init(_ path: String, light: String? = nil, framed: Bool = false) {
        dark = path
        self.light = light ?? path
        self.framed = framed
    }

    /// Renders on black sit on a black plate; one with a light twin sits on
    /// the paper, as the home page shows them.
    var themed: Bool { light != dark }
}

/// The web app's images, read once from the bundle.
enum BundledImages {
    private static var cache: [String: UIImage] = [:]

    static func image(_ path: String) -> UIImage? {
        if let hit = cache[path] { return hit }
        let url = Bundle.main.bundleURL.appendingPathComponent("public").appendingPathComponent(path)
        guard let image = UIImage(contentsOfFile: url.path) else { return nil }
        cache[path] = image
        return image
    }
}

struct ShotView: View {
    let shot: Shot
    @Environment(\.colorScheme) private var scheme

    init(shot: Shot) {
        self.shot = shot
    }

    var body: some View {
        if let image = BundledImages.image(scheme == .dark ? shot.dark : shot.light) {
            if shot.framed {
                FramedPortrait(photo: image)
                    .frame(maxWidth: 230)
                    .frame(maxWidth: .infinity)
                    .accessibilityHidden(true)
            } else {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: .infinity)
                    .background(shot.themed ? Palette.paper : Color.black)
                    .overlay {
                        Rectangle().strokeBorder(Palette.ink35, lineWidth: 1)
                    }
                    .accessibilityHidden(true)
            }
        }
    }
}

/// The portrait as the About page frames it: the engraved oval behind the
/// photograph and the ribbon across its foot, in the frame's own colours in
/// either theme. The photograph's place on the frame is about.html's.
struct FramedPortrait: View {
    let photo: UIImage

    init(photo: UIImage) {
        self.photo = photo
    }

    var body: some View {
        if let engraving = BundledImages.image("assets/portrait/frame-back.webp"),
           let ribbon = BundledImages.image("assets/portrait/ribbon.webp") {
            Image(uiImage: engraving)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .overlay {
                    GeometryReader { box in
                        Image(uiImage: photo)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: box.size.width * 0.93724, height: box.size.height * 0.92344)
                            .offset(x: box.size.width * 0.03137, y: box.size.height * 0.03099)
                    }
                }
                .overlay {
                    Image(uiImage: ribbon)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                }
        } else {
            Image(uiImage: photo)
                .resizable()
                .aspectRatio(contentMode: .fit)
        }
    }
}

/// One box of a tab's page, in the home page's voice: kicker, headline,
/// standfirst, a figure, a readout line under a rule, and a signpost.
struct Box<Extra: View>: View {
    let kicker: String
    let title: String
    var text: String? = nil
    var shot: Shot? = nil
    var meta: String? = nil
    var go: String? = nil
    let extra: Extra

    init(kicker: String, title: String, text: String? = nil, shot: Shot? = nil,
         meta: String? = nil, go: String? = nil, @ViewBuilder extra: () -> Extra) {
        self.kicker = kicker
        self.title = title
        self.text = text
        self.shot = shot
        self.meta = meta
        self.go = go
        self.extra = extra()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(kicker.uppercased())
                .font(Faces.brand(10, .caption2))
                .tracking(2.6)
                .foregroundColor(Palette.ink60)
            Text(title)
                .font(Faces.display(26, .title))
                .foregroundColor(Palette.ink)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 6)
            if let text = text {
                Text(text)
                    .font(Faces.serif(16, .body))
                    .foregroundColor(Palette.ink60)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 8)
            }
            extra
            if let shot = shot {
                ShotView(shot: shot)
                    .padding(.top, 14)
            }
            if let meta = meta {
                Rectangle()
                    .fill(Palette.ink35)
                    .frame(height: 1)
                    .padding(.top, 14)
                Text(meta.uppercased())
                    .font(Faces.brand(10, .caption2))
                    .tracking(2)
                    .foregroundColor(Palette.ink35)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 8)
            }
            if let go = go {
                (Text(go.uppercased()).tracking(2.4) + Text("  ") + Text(Image(systemName: "arrow.right")))
                    .font(Faces.brand(11, .footnote))
                    .foregroundColor(Palette.ink)
                    .padding(.top, 14)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.paper)
        .overlay {
            Rectangle().strokeBorder(Palette.ink, lineWidth: 1)
        }
    }
}

extension Box where Extra == EmptyView {
    init(kicker: String, title: String, text: String? = nil, shot: Shot? = nil,
         meta: String? = nil, go: String? = nil) {
        self.init(kicker: kicker, title: title, text: text, shot: shot, meta: meta, go: go) { EmptyView() }
    }
}

/// A box answers on the press, as the site's controls do: the ink comes up
/// under the finger and goes as it lifts.
struct PressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .overlay {
                Palette.ink
                    .opacity(configuration.isPressed ? 0.07 : 0)
                    .allowsHitTesting(false)
            }
            .animation(.easeOut(duration: 0.18), value: configuration.isPressed)
    }
}
