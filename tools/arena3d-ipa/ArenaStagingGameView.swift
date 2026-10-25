// GMWW Arena 3D - isolated iPhone QA app, GĐ32.
// This Swift file replaces GameView.swift ONLY inside a dedicated CI runner.
// Production native shell, Runtime OTA, Player Web and current IPA stay untouched.
import SwiftUI
import WebKit
import UIKit

private enum ArenaQA {
    static let host = "gmww-arena3d-stage14-staging.williampham0702.workers.dev"
    static let url = URL(string: "https://gmww-arena3d-stage14-staging.williampham0702.workers.dev/village/arena-3d/live.html")!
}

struct GameView: View {
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                Image(systemName: "cube.transparent.fill")
                Text("GMWW ARENA 3D").fontWeight(.semibold)
                Text("· QA STAGING").foregroundStyle(.yellow)
                Spacer()
                Image(systemName: "lock.shield")
            }
            .font(.system(size: 12))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color(red: 0.04, green: 0.15, blue: 0.20))
            .foregroundColor(.white)
            ArenaStagingWebView()
        }
        .background(Color.black)
    }
}

private struct ArenaStagingWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = [.audio]
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 0.04, green: 0.15, blue: 0.20, alpha: 1)
        web.load(URLRequest(url: ArenaQA.url, cachePolicy: .reloadIgnoringLocalCacheData,
                            timeoutInterval: 30))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            // Force all game API / WebSocket requests to the STAGING hostname.
            // Never route QA sessions to production or another host.
            let allow = (url.scheme == "https" && url.host == ArenaQA.host) ||
                        url.scheme == "about"
            decisionHandler(allow ? .allow : .cancel)
        }
    }
}
