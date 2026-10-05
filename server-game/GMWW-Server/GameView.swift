import SwiftUI
import WebKit
import UIKit
import CryptoKit

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
        config.userContentController.add(context.coordinator, name: "gmwwUpdater")

        let shellVersion = (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0"
        let escapedVersion = shellVersion.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
        // A freshly installed IPA contains a complete runtime with the same version.
        // Do not let a stale Application Support runtime from an older install override it.
        if let active = UserDefaults.standard.string(forKey: "GMWWActiveRuntimeVersion"),
           active.compare(shellVersion, options: .numeric) != .orderedSame {
            UserDefaults.standard.removeObject(forKey: "GMWWActiveRuntimeVersion")
        }
        let bridgeScript = "window.GMWW_NATIVE_SHELL_VERSION='\(escapedVersion)';window.GMWW_NATIVE_UPDATER=true;"
        config.userContentController.addUserScript(WKUserScript(source: bridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.isOpaque = false
        web.backgroundColor = .black
        context.coordinator.webView = web
        context.coordinator.loadInitialRuntime(in: web)
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "gmwwUpdater")
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        weak var webView: WKWebView?
        private let activeRuntimeKey = "GMWWActiveRuntimeVersion"

        private struct RuntimeFile: Decodable {
            let path: String
            let url: String
            let sha256: String
        }

        private struct RuntimePackage: Decodable {
            let files: [RuntimeFile]
        }

        private struct UpdateManifest: Decodable {
            let releaseVersion: String?
            let runtimeVersion: String?
            let runtime: RuntimePackage?
            let delete: [String]?
        }

        private func runtimeRoot() throws -> URL {
            guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
                throw NSError(domain: "GMWWUpdater", code: 1, userInfo: [NSLocalizedDescriptionKey: "Không tìm thấy thư mục Application Support."])
            }
            let root = base.appendingPathComponent("GMWWRuntime", isDirectory: true)
            try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
            return root
        }

        private func activeRuntimeHTML() -> URL? {
            guard let version = UserDefaults.standard.string(forKey: activeRuntimeKey),
                  !version.isEmpty,
                  let root = try? runtimeRoot() else { return nil }
            let html = root.appendingPathComponent(version, isDirectory: true).appendingPathComponent("GMWW.html")
            return FileManager.default.fileExists(atPath: html.path) ? html : nil
        }

        func loadInitialRuntime(in webView: WKWebView) {
            if let runtime = activeRuntimeHTML() {
                webView.loadFileURL(runtime, allowingReadAccessTo: runtime.deletingLastPathComponent())
                return
            }
            if let bundled = Bundle.main.url(forResource: "GMWW", withExtension: "html", subdirectory: "Web") {
                webView.loadFileURL(bundled, allowingReadAccessTo: bundled.deletingLastPathComponent())
            }
        }

        private func present(_ alert: UIAlertController, from webView: WKWebView) {
            guard var controller = webView.window?.rootViewController else { return }
            while let presented = controller.presentedViewController { controller = presented }
            controller.present(alert, animated: true)
        }

        private func presentShare(fileURL: URL, from webView: WKWebView) {
            guard var controller = webView.window?.rootViewController else { return }
            while let presented = controller.presentedViewController { controller = presented }
            let share = UIActivityViewController(activityItems: [fileURL], applicationActivities: nil)
            if let pop = share.popoverPresentationController {
                pop.sourceView = webView
                pop.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 1, height: 1)
            }
            share.completionWithItemsHandler = { _, _, _, _ in
                try? FileManager.default.removeItem(at: fileURL)
            }
            controller.present(share, animated: true)
        }

        private func sendResult(_ payload: [String: Any], to webView: WKWebView) {
            guard JSONSerialization.isValidJSONObject(payload),
                  let data = try? JSONSerialization.data(withJSONObject: payload),
                  let json = String(data: data, encoding: .utf8) else { return }
            DispatchQueue.main.async {
                webView.evaluateJavaScript("window.GMWWUpdateNative?.onResult(\(json));")
            }
        }

        private func allowedRuntimeURL(_ url: URL) -> Bool {
            guard url.scheme?.lowercased() == "https", let host = url.host?.lowercased() else { return false }
            return host == "gmww-v2-00.williampham0702.workers.dev"
        }

        private func allowedIPAURL(_ url: URL) -> Bool {
            guard url.scheme?.lowercased() == "https", let host = url.host?.lowercased() else { return false }
            return host == "github.com" || host == "api.github.com" || host.hasSuffix(".githubusercontent.com") || host == "gmww-v2-00.williampham0702.workers.dev"
        }

        private func sha256(_ data: Data) -> String {
            SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        }

        private func safeRelativePath(_ path: String) -> Bool {
            guard !path.isEmpty, !path.hasPrefix("/"), !path.contains("..") else { return false }
            return path.split(separator: "/").allSatisfy { !$0.isEmpty && $0 != "." }
        }

        private func installRuntime(manifestObject: [String: Any], webView: WKWebView) {
            guard JSONSerialization.isValidJSONObject(manifestObject),
                  let data = try? JSONSerialization.data(withJSONObject: manifestObject),
                  let manifest = try? JSONDecoder().decode(UpdateManifest.self, from: data),
                  let runtime = manifest.runtime,
                  !runtime.files.isEmpty else {
                sendResult(["ok": false, "action": "installRuntime", "error": "Gói cập nhật runtime không hợp lệ."], to: webView)
                return
            }

            let version = (manifest.runtimeVersion ?? manifest.releaseVersion ?? "").replacingOccurrences(of: "V", with: "")
            guard !version.isEmpty else {
                sendResult(["ok": false, "action": "installRuntime", "error": "Thiếu phiên bản runtime."], to: webView)
                return
            }

            Task {
                var staging: URL?
                do {
                    let root = try runtimeRoot()
                    let temp = root.appendingPathComponent(".staging-\(UUID().uuidString)", isDirectory: true)
                    staging = temp

                    if let active = activeRuntimeHTML()?.deletingLastPathComponent() {
                        try FileManager.default.copyItem(at: active, to: temp)
                    } else if let resources = Bundle.main.resourceURL {
                        let bundledWeb = resources.appendingPathComponent("Web", isDirectory: true)
                        guard FileManager.default.fileExists(atPath: bundledWeb.path) else {
                            throw NSError(domain: "GMWWUpdater", code: 7, userInfo: [NSLocalizedDescriptionKey: "Không tìm thấy Web runtime gốc trong IPA."])
                        }
                        try FileManager.default.copyItem(at: bundledWeb, to: temp)
                    } else {
                        throw NSError(domain: "GMWWUpdater", code: 8, userInfo: [NSLocalizedDescriptionKey: "Không tìm thấy tài nguyên ứng dụng."])
                    }

                    for path in manifest.delete ?? [] {
                        guard safeRelativePath(path) else { continue }
                        let target = temp.appendingPathComponent(path)
                        if FileManager.default.fileExists(atPath: target.path) {
                            try FileManager.default.removeItem(at: target)
                        }
                    }

                    for item in runtime.files {
                        guard safeRelativePath(item.path),
                              let remote = URL(string: item.url),
                              allowedRuntimeURL(remote) else {
                            throw NSError(domain: "GMWWUpdater", code: 2, userInfo: [NSLocalizedDescriptionKey: "File cập nhật không hợp lệ: \(item.path)"])
                        }
                        let (fileData, response) = try await URLSession.shared.data(from: remote)
                        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                            throw NSError(domain: "GMWWUpdater", code: 3, userInfo: [NSLocalizedDescriptionKey: "Không tải được \(item.path)."])
                        }
                        guard sha256(fileData).lowercased() == item.sha256.lowercased() else {
                            throw NSError(domain: "GMWWUpdater", code: 4, userInfo: [NSLocalizedDescriptionKey: "Checksum không khớp: \(item.path)"])
                        }

                        let target = temp.appendingPathComponent(item.path)
                        try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
                        try fileData.write(to: target, options: .atomic)
                    }

                    let html = temp.appendingPathComponent("GMWW.html")
                    guard FileManager.default.fileExists(atPath: html.path) else {
                        throw NSError(domain: "GMWWUpdater", code: 5, userInfo: [NSLocalizedDescriptionKey: "Gói cập nhật thiếu GMWW.html."])
                    }

                    let final = root.appendingPathComponent(version, isDirectory: true)
                    if FileManager.default.fileExists(atPath: final.path) {
                        try FileManager.default.removeItem(at: final)
                    }
                    try FileManager.default.moveItem(at: temp, to: final)
                    staging = nil
                    UserDefaults.standard.set(version, forKey: activeRuntimeKey)
                    sendResult(["ok": true, "action": "installRuntime", "version": version], to: webView)
                } catch {
                    if let staging { try? FileManager.default.removeItem(at: staging) }
                    sendResult(["ok": false, "action": "installRuntime", "error": error.localizedDescription], to: webView)
                }
            }
        }

        private func downloadIPA(urlString: String, fileName: String, webView: WKWebView) {
            guard let remote = URL(string: urlString), allowedIPAURL(remote) else {
                sendResult(["ok": false, "action": "downloadIPA", "error": "Đường dẫn IPA không hợp lệ."], to: webView)
                return
            }

            Task {
                do {
                    let (tempURL, response) = try await URLSession.shared.download(from: remote)
                    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                        throw NSError(domain: "GMWWUpdater", code: 6, userInfo: [NSLocalizedDescriptionKey: "Không tải được IPA."])
                    }
                    let safeName = fileName.isEmpty ? "GMWW.ipa" : fileName.replacingOccurrences(of: "/", with: "-")
                    let shareURL = FileManager.default.temporaryDirectory.appendingPathComponent(safeName)
                    try? FileManager.default.removeItem(at: shareURL)
                    try FileManager.default.moveItem(at: tempURL, to: shareURL)
                    await MainActor.run {
                        self.presentShare(fileURL: shareURL, from: webView)
                        self.sendResult(["ok": true, "action": "downloadIPA", "fileName": safeName], to: webView)
                    }
                } catch {
                    sendResult(["ok": false, "action": "downloadIPA", "error": error.localizedDescription], to: webView)
                }
            }
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "gmwwUpdater",
                  let body = message.body as? [String: Any],
                  let action = body["action"] as? String,
                  let webView else { return }

            switch action {
            case "installRuntime":
                guard let manifest = body["manifest"] as? [String: Any] else {
                    sendResult(["ok": false, "action": action, "error": "Thiếu manifest cập nhật."], to: webView)
                    return
                }
                installRuntime(manifestObject: manifest, webView: webView)
            case "downloadIPA":
                downloadIPA(urlString: body["url"] as? String ?? "", fileName: body["fileName"] as? String ?? "", webView: webView)
            case "restartRuntime":
                loadInitialRuntime(in: webView)
            case "rollbackRuntime":
                UserDefaults.standard.removeObject(forKey: activeRuntimeKey)
                loadInitialRuntime(in: webView)
                sendResult(["ok": true, "action": "rollbackRuntime"], to: webView)
            default:
                sendResult(["ok": false, "action": action, "error": "Hành động cập nhật không được hỗ trợ."], to: webView)
            }
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
