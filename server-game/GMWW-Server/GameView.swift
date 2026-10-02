import SwiftUI
import WebKit

struct GameView: View {
    var body: some View {
        GameWebView()
            .ignoresSafeArea(.container, edges: .bottom)
            .background(Color.black)
    }
}

struct GameWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.isOpaque = false
        web.backgroundColor = .black
        if let url = Bundle.main.url(forResource: "GMWW", withExtension: "html", subdirectory: "Web") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private func present(_ alert: UIAlertController, from webView: WKWebView) {
            guard var controller = webView.window?.rootViewController else { return }
            while let presented = controller.presentedViewController { controller = presented }
            controller.present(alert, animated: true)
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            guard webView.window != nil else { completionHandler(); return }
            let alert = UIAlertController(title: "GMWW", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            present(alert, from: webView)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            guard webView.window != nil else { completionHandler(false); return }
            let alert = UIAlertController(title: "Xác nhận", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Huỷ", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            present(alert, from: webView)
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url,
               !url.isFileURL,
               navigationAction.targetFrame?.isMainFrame != false,
               let scheme = url.scheme?.lowercased(),
               scheme == "http" || scheme == "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}
