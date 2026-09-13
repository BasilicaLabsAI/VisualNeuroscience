import SwiftUI
import WebKit

/// The atlas as it is on the web, in a flat window. For now this loads the
/// live site; the iPhone and iPad app carries the same pages offline.
struct AtlasWindow: View {
    var body: some View {
        AtlasBrowser(url: URL(string: "https://visualneuroscience.ai/regions.html")!)
            .ignoresSafeArea()
    }
}

struct AtlasBrowser: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.isOpaque = false
        view.backgroundColor = .black
        view.load(URLRequest(url: url))
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}
}
