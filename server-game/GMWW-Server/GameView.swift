import SwiftUI
import WebKit
import UIKit
import AudioToolbox
import CryptoKit
import UniformTypeIdentifiers

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
        config.userContentController.add(context.coordinator, name: "gmwwHaptic")
        config.userContentController.add(context.coordinator, name: "gmwwScreen")

        let shellVersion = (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0"
        let escapedVersion = shellVersion.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
        // A freshly installed IPA contains a complete runtime with the same version.
        // Do not let a stale Application Support runtime from an older install override it.
        if let active = UserDefaults.standard.string(forKey: "GMWWActiveRuntimeVersion"),
           String(active.split(separator: "-").first ?? "").compare(shellVersion, options: .numeric) == .orderedAscending {
            UserDefaults.standard.removeObject(forKey: "GMWWActiveRuntimeVersion")
        }
        let bridgeScript = "window.GMWW_NATIVE_SHELL_VERSION='\(escapedVersion)';window.GMWW_NATIVE_UPDATER=true;window.GMWW_NATIVE_MANUAL_RUNTIME=true;window.GMWW_NATIVE_GITHUB_OTA=true;"
        config.userContentController.addUserScript(WKUserScript(source: bridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.isOpaque = false
        web.backgroundColor = .black
        context.coordinator.webView = web
        context.coordinator.observeAppState()
        context.coordinator.loadInitialRuntime(in: web)
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "gmwwUpdater")
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "gmwwHaptic")
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "gmwwScreen")
        coordinator.stopObservingAppState()
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, UIDocumentPickerDelegate {
        weak var webView: WKWebView?
        private let activeRuntimeKey = "GMWWActiveRuntimeVersion"
        private var demoAwakeRequested = false
        private var runtimeInstallBusy = false
        private let previousRuntimeKey = "GMWWPreviousRuntimeVersion"

        // Keep the display awake only while DEMO is actively playing in the foreground.
        func observeAppState() {
            NotificationCenter.default.addObserver(self, selector: #selector(appWillResignActive(_:)),
                                                   name: UIApplication.willResignActiveNotification, object: nil)
            NotificationCenter.default.addObserver(self, selector: #selector(appDidBecomeActive(_:)),
                                                   name: UIApplication.didBecomeActiveNotification, object: nil)
        }

        func stopObservingAppState() {
            NotificationCenter.default.removeObserver(self)
            demoAwakeRequested = false
            UIApplication.shared.isIdleTimerDisabled = false
        }

        private func syncIdleTimer() {
            UIApplication.shared.isIdleTimerDisabled =
                demoAwakeRequested && UIApplication.shared.applicationState == .active
        }

        @objc private func appWillResignActive(_ notification: Notification) {
            UIApplication.shared.isIdleTimerDisabled = false
        }

        @objc private func appDidBecomeActive(_ notification: Notification) {
            syncIdleTimer()
        }

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
            let minimumShellVersion: String?
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
            guard !path.isEmpty, !path.hasPrefix("/"), !path.contains(".."), !path.contains("\\") else { return false }
            return path.split(separator: "/").allSatisfy { !$0.isEmpty && $0 != "." }
        }

        private func installRuntime(manifestObject: [String: Any], webView: WKWebView, localFiles: [String: (offset: UInt64, size: Int)]? = nil, packageURL: URL? = nil) {
            guard JSONSerialization.isValidJSONObject(manifestObject),
                  let data = try? JSONSerialization.data(withJSONObject: manifestObject),
                  let manifest = try? JSONDecoder().decode(UpdateManifest.self, from: data),
                  let runtime = manifest.runtime,
                  !runtime.files.isEmpty else {
                sendResult(["ok": false, "action": "installRuntime", "error": "Gói cập nhật runtime không hợp lệ."], to: webView)
                return
            }

            let version = (manifest.runtimeVersion ?? manifest.releaseVersion ?? "").replacingOccurrences(of: "V", with: "")
            guard version.range(of: "^[0-9]+\\.[0-9]+(?:\\.[0-9]+)?$", options: .regularExpression) != nil else {
                sendResult(["ok": false, "action": "installRuntime", "error": "Thiếu phiên bản runtime."], to: webView)
                return
            }

            guard !runtimeInstallBusy else { return }
            runtimeInstallBusy = true
            Task {
                defer {
                    runtimeInstallBusy = false
                    if let packageURL { try? FileManager.default.removeItem(at: packageURL) }
                }
                var staging: URL?
                do {
                    let packageHandle = try packageURL.map { try FileHandle(forReadingFrom: $0) }
                    defer { try? packageHandle?.close() }
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
                        let fileData: Data
                        if let localFiles {
                            guard let entry = localFiles[item.path], let packageHandle else {
                                throw NSError(domain: "GMWWUpdater", code: 9, userInfo: [NSLocalizedDescriptionKey: "Gói thủ công thiếu file hoặc dữ liệu hỏng: \(item.path)"])
                            }
                            try packageHandle.seek(toOffset: entry.offset)
                            fileData = try packageHandle.read(upToCount: entry.size) ?? Data()
                            guard fileData.count == entry.size else { throw manualError("File cập nhật bị cắt ngắn.") }
                        } else {
                            let (downloaded, response) = try await URLSession.shared.data(from: remote)
                            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                                throw NSError(domain: "GMWWUpdater", code: 3, userInfo: [NSLocalizedDescriptionKey: "Không tải được \(item.path)."])
                            }
                            fileData = downloaded
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

                    // Commit to a unique directory: never remove the active runtime before success.
                    let installedDirectory = version + "-" + UUID().uuidString
                    let final = root.appendingPathComponent(installedDirectory, isDirectory: true)
                    if FileManager.default.fileExists(atPath: final.path) {
                        try FileManager.default.removeItem(at: final)
                    }
                    try FileManager.default.moveItem(at: temp, to: final)
                    staging = nil
                    UserDefaults.standard.set(UserDefaults.standard.string(forKey: activeRuntimeKey), forKey: previousRuntimeKey)
                    UserDefaults.standard.set(installedDirectory, forKey: activeRuntimeKey)
                    sendResult(["ok": true, "action": "installRuntime", "version": version], to: webView)
                } catch {
                    if let staging { try? FileManager.default.removeItem(at: staging) }
                    sendResult(["ok": false, "action": "installRuntime", "error": error.localizedDescription], to: webView)
                }
            }
        }


        // GitHub distribution is independently verified: official release tag,
        // exact asset names/paths, whole-container digest, and each embedded file.
        // No Cloudflare connection is needed to download or install this package.
        private struct GitHubAsset: Decodable {
            let name: String
            let browser_download_url: String
        }
        private struct GitHubRelease: Decodable {
            let tag_name: String
            let draft: Bool
            let prerelease: Bool
            let assets: [GitHubAsset]
        }
        private func installedRuntimeVersion() -> String {
            let shell = (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0"
            let active = (UserDefaults.standard.string(forKey: activeRuntimeKey) ?? "").components(separatedBy: "-").first ?? ""
            return active.compare(shell, options: .numeric) == .orderedDescending ? active : shell
        }
        private func officialAsset(_ raw: String, version: String, name: String) -> URL? {
            guard let url = URL(string: raw),
                  url.scheme == "https", url.host == "github.com",
                  url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
                  url.path == "/WilliamPham0702/GMWW-V2.00/releases/download/gmww-runtime-v\(version)/\(name)"
            else { return nil }
            return url
        }
        private func githubError(_ description: String, integrity: Bool = false) -> NSError {
            NSError(domain: integrity ? "GMWWUpdaterIntegrity" : "GMWWUpdaterNetwork", code: 11,
                    userInfo: [NSLocalizedDescriptionKey: description])
        }
        private func digestFile(_ url: URL) throws -> String {
            let handle = try FileHandle(forReadingFrom: url)
            defer { try? handle.close() }
            var hasher = SHA256()
            while let block = try handle.read(upToCount: 1024 * 1024), !block.isEmpty {
                hasher.update(data: block)
            }
            return hasher.finalize().map { String(format: "%02x", $0) }.joined()
        }
        private func verifyManualContainer(_ packageURL: URL, expectedSHA: String? = nil,
                                           expectedVersion: String? = nil)
            throws -> (manifest: [String: Any], files: [String: (offset: UInt64, size: Int)],
                       version: String, notes: String) {
            let fileSize = try packageURL.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard fileSize > 0, fileSize <= 515 * 1024 * 1024 else {
                throw manualError("File cập nhật quá lớn hoặc rỗng.")
            }
            if let expectedSHA {
                guard expectedSHA.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
                      try digestFile(packageURL) == expectedSHA else {
                    throw githubError("SHA-256 toàn bộ gói GitHub không khớp.", integrity: true)
                }
            }
            let handle = try FileHandle(forReadingFrom: packageURL)
            defer { try? handle.close() }
            let magic = Data("GMWWRUNTIME2\n".utf8)
            guard try handle.read(upToCount: magic.count) == magic,
                  let sizeBytes = try handle.read(upToCount: 4), sizeBytes.count == 4 else {
                throw manualError("Không phải gói GMWW hợp lệ.")
            }
            let headerSize = sizeBytes.reduce(0) { ($0 << 8) | Int($1) }
            guard headerSize > 0, headerSize <= 2 * 1024 * 1024,
                  let data = try handle.read(upToCount: headerSize), data.count == headerSize,
                  let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  object["format"] as? String == "gmww-runtime-2",
                  let manifestObject = object["manifest"] as? [String: Any],
                  let lengths = object["lengths"] as? [String: Int],
                  let manifestData = try? JSONSerialization.data(withJSONObject: manifestObject),
                  let manifest = try? JSONDecoder().decode(UpdateManifest.self, from: manifestData),
                  let version = manifest.runtimeVersion,
                  version.range(of: "^[0-9]+\\.[0-9]+(?:\\.[0-9]+)?$", options: .regularExpression) != nil,
                  let entries = manifest.runtime?.files, !entries.isEmpty else {
                throw manualError("Header hoặc danh sách file Runtime không hợp lệ.")
            }
            if let expectedVersion, expectedVersion != version {
                throw githubError("Phiên bản GitHub không khớp dữ liệu gói.", integrity: true)
            }
            let shell = (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0"
            guard shell.compare(manifest.minimumShellVersion ?? "0", options: .numeric) != .orderedAscending,
                  version.compare(shell, options: .numeric) != .orderedAscending else {
                throw manualError("Gói Runtime không tương thích với IPA hiện tại.")
            }
            let paths = entries.map { $0.path }
            guard Set(paths).count == paths.count, Set(paths) == Set(lengths.keys),
                  ["GMWW.html","app.js","style.css"].allSatisfy({paths.contains($0)}),
                  (manifest.delete ?? []).isEmpty else {
                throw githubError("Gói có file trùng, thiếu hoặc yêu cầu xóa dữ liệu.", integrity: true)
            }
            var total = 0
            var offset = UInt64(magic.count + 4 + headerSize)
            var files: [String: (offset: UInt64, size: Int)] = [:]
            for entry in entries {
                guard safeRelativePath(entry.path),
                      let url = URL(string: entry.url), allowedRuntimeURL(url),
                      let length = lengths[entry.path], length >= 0, length <= 16 * 1024 * 1024,
                      let bytes = try handle.read(upToCount: length), bytes.count == length,
                      sha256(bytes) == entry.sha256.lowercased() else {
                    throw githubError("SHA-256 hoặc đường dẫn không hợp lệ: \(entry.path)", integrity: true)
                }
                files[entry.path] = (offset, length)
                offset += UInt64(length)
                total += length
                guard total <= 512 * 1024 * 1024 else {
                    throw githubError("Dung lượng gói vượt giới hạn.", integrity: true)
                }
            }
            guard offset == UInt64(fileSize) else {
                throw githubError("Gói cập nhật có dữ liệu thừa hoặc bị thiếu.", integrity: true)
            }
            return (manifestObject,files,version,
                    (manifestObject["releaseNotes"] as? [String] ?? []).prefix(3).joined(separator: "\n"))
        }

        private func checkGithubRuntime(from webView: WKWebView) {
            guard !runtimeInstallBusy else {
                sendResult(["ok": false,"action":"checkGithubRuntime","error":"Đang cập nhật Runtime."], to:webView)
                return
            }
            Task {
                do {
                    let api = URL(string:"https://api.github.com/repos/WilliamPham0702/GMWW-V2.00/releases?per_page=50")!
                    var request = URLRequest(url:api)
                    request.timeoutInterval = 15
                    request.setValue("application/vnd.github+json", forHTTPHeaderField:"Accept")
                    let (data,response) = try await URLSession.shared.data(for:request)
                    guard let http = response as? HTTPURLResponse, http.statusCode == 200,
                          data.count < 2 * 1024 * 1024 else {
                        throw githubError("GitHub chưa phản hồi danh sách bản phát hành.")
                    }
                    let releases = try JSONDecoder().decode([GitHubRelease].self,from:data)
                    let current = installedRuntimeVersion()
                    let options = releases.compactMap { release -> (String,URL,URL)? in
                        guard !release.draft && !release.prerelease,
                              release.tag_name.hasPrefix("gmww-runtime-v") else { return nil }
                        let version = String(release.tag_name.dropFirst("gmww-runtime-v".count))
                        guard version.range(of:"^[0-9]+\\.[0-9]+(?:\\.[0-9]+)?$",options:.regularExpression) != nil else { return nil }
                        let name = "GMWW-Runtime-V\(version).gmwwupdate"
                        guard let package = release.assets.first(where:{$0.name == name}),
                              let checksum = release.assets.first(where:{$0.name == name+".sha256"}),
                              let packageURL=officialAsset(package.browser_download_url,version:version,name:name),
                              let checksumURL=officialAsset(checksum.browser_download_url,version:version,name:name+".sha256") else { return nil }
                        return (version,packageURL,checksumURL)
                    }.sorted { $0.0.compare($1.0,options:.numeric) == .orderedDescending }
                    guard let latest = options.first else {
                        sendResult(["ok":true,"action":"checkGithubRuntime","status":"fallback",
                                    "reason":"no_official_release"],to:webView)
                        return
                    }
                    guard latest.0.compare(current,options:.numeric) == .orderedDescending else {
                        sendResult(["ok":true,"action":"checkGithubRuntime","status":"current",
                                    "version":latest.0],to:webView)
                        return
                    }
                    let version=latest.0
                    sendResult(["ok":true,"action":"checkGithubRuntime","status":"available",
                                "version":version],to:webView)
                    let alert=UIAlertController(title:"GitHub Runtime V"+version,
                        message:"Đã tìm thấy bản Runtime mới trên GitHub chính thức. Tải và kiểm tra SHA-256 trước khi cài? Runtime cũ sẽ được giữ lại để khôi phục.",
                        preferredStyle:.alert)
                    alert.addAction(UIAlertAction(title:"Để sau",style:.cancel){ _ in
                        self.sendResult(["cancelled":true,"action":"checkGithubRuntime",
                                         "version":version],to:webView)
                    })
                    alert.addAction(UIAlertAction(title:"Tải và cập nhật",style:.default){ _ in
                        self.installGithubRelease(version:version,packageURL:latest.1,
                                                  checksumURL:latest.2,webView:webView)
                    })
                    present(alert,from:webView)
                }catch {
                    sendResult(["ok":true,"action":"checkGithubRuntime","status":"fallback",
                                "error":error.localizedDescription],to:webView)
                }
            }
        }
        private func installGithubRelease(version:String,packageURL:URL,
                                          checksumURL:URL,webView:WKWebView) {
            guard !runtimeInstallBusy else { return }
            runtimeInstallBusy=true
            sendResult(["ok":true,"action":"checkGithubRuntime","status":"installing",
                        "version":version],to:webView)
            Task {
                var retained: URL?
                defer {
                    runtimeInstallBusy=false
                    if let retained { try? FileManager.default.removeItem(at:retained) }
                }
                do {
                    guard version.compare(installedRuntimeVersion(),options:.numeric) == .orderedDescending else {
                        throw githubError("Đã có Runtime bằng hoặc mới hơn.", integrity:true)
                    }
                    var req=URLRequest(url:checksumURL);req.timeoutInterval=20
                    let (hashBytes,hashResponse)=try await URLSession.shared.data(for:req)
                    guard let hr=hashResponse as? HTTPURLResponse,hr.statusCode == 200,
                          hashBytes.count <= 256,
                          let value=String(data:hashBytes,encoding:.utf8),
                          let checksum=value.split(whereSeparator:\.isWhitespace).first.map(String.init),
                          checksum.range(of:"^[a-f0-9]{64}$",options:.regularExpression) != nil,
                          value.contains("GMWW-Runtime-V\(version).gmwwupdate") else {
                        throw githubError("Checksum GitHub không hợp lệ.",integrity:true)
                    }
                    req=URLRequest(url:packageURL);req.timeoutInterval=180
                    let (temp,response)=try await URLSession.shared.download(for:req)
                    retained=temp
                    guard let http=response as? HTTPURLResponse,http.statusCode == 200 else {
                        throw githubError("Không tải được gói Runtime từ GitHub.")
                    }
                    let verified=try verifyManualContainer(temp,expectedSHA:checksum,expectedVersion:version)
                    // installRuntime owns the temporary file once verification succeeds.
                    retained=nil
                    runtimeInstallBusy=false
                    installRuntime(manifestObject:verified.manifest,webView:webView,
                                   localFiles:verified.files,packageURL:temp)
                }catch {
                    let domain = (error as NSError).domain
                    // Only transport/service failures may fall back to Cloudflare.
                    // A downloaded file with invalid SHA, manifest, size or paths
                    // must NEVER be installed from an alternate source silently.
                    if domain == NSURLErrorDomain || domain == "GMWWUpdaterNetwork" {
                        sendResult(["ok":true,"action":"checkGithubRuntime",
                                    "status":"fallback","error":error.localizedDescription],
                                   to:webView)
                    }else {
                        sendResult(["ok":false,"action":"checkGithubRuntime",
                                    "integrityFailure":true,"error":error.localizedDescription],
                                   to:webView)
                    }
                }
            }
        }

        private func pickRuntimePackage(from webView: WKWebView) {
            guard !runtimeInstallBusy, var controller = webView.window?.rootViewController else { return }
            while let presented = controller.presentedViewController { controller = presented }
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.data], asCopy: true)
            picker.allowsMultipleSelection = false
            picker.delegate = self
            controller.present(picker, animated: true)
        }

        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            if let webView { sendResult(["cancelled": true, "action": "installRuntime"], to: webView) }
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first, let webView else { return }
            // Import only an explicitly chosen file. Parsing runs away from UI rendering.
            DispatchQueue.global(qos: .userInitiated).async {
                let scoped = url.startAccessingSecurityScopedResource()
                defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                var retainedPackage: URL?
                do {
                    let copy = FileManager.default.temporaryDirectory.appendingPathComponent("GMWW-manual-" + UUID().uuidString)
                    try FileManager.default.copyItem(at: url, to: copy)
                    retainedPackage = copy
                    let verified = try self.verifyManualContainer(copy)
                    let version = verified.version
                    let manifestObject = verified.manifest
                    let verifiedFiles = verified.files
                    let notes = verified.notes
                    DispatchQueue.main.async {
                        let alert = UIAlertController(title: "Cài Runtime V" + version + "?", message: notes + "\n\nChỉ cài file nhận từ bản phát hành GMWW tin cậy. SHA-256 đã khớp; dữ liệu ván được giữ nguyên.", preferredStyle: .alert)
                        alert.addAction(UIAlertAction(title: "Hủy", style: .cancel) { _ in try? FileManager.default.removeItem(at: copy); self.sendResult(["cancelled": true, "action": "installRuntime"], to: webView) })
                        alert.addAction(UIAlertAction(title: "Cài cập nhật", style: .default) { _ in self.installRuntime(manifestObject: manifestObject, webView: webView, localFiles: verifiedFiles, packageURL: copy) })
                        self.present(alert, from: webView)
                    }
                } catch {
                    if let retainedPackage { try? FileManager.default.removeItem(at: retainedPackage) }
                    self.sendResult(["ok": false, "action": "installRuntime", "error": error.localizedDescription], to: webView)
                }
            }
        }

        private func manualError(_ message: String) -> NSError {
            NSError(domain: "GMWWUpdater", code: 10, userInfo: [NSLocalizedDescriptionKey: message])
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
            if message.name == "gmwwScreen" {
                guard message.frameInfo.isMainFrame,
                      let body = message.body as? [String: Any],
                      body["action"] as? String == "setDemoAwake",
                      let enabled = body["enabled"] as? Bool else { return }
                DispatchQueue.main.async { [weak self] in
                    self?.demoAwakeRequested = enabled
                    self?.syncIdleTimer()
                }
                return
            }
            if message.name == "gmwwHaptic" {
                guard message.frameInfo.isMainFrame,
                      let body = message.body as? [String: Any],
                      body["event"] as? String == "action-confirmed" else { return }
                DispatchQueue.main.async {
                    // UIKit tap feedback can be subtle on some iPhones. Add native
                    // system vibration for a confirmed action, not for every render.
                    let feedback = UINotificationFeedbackGenerator()
                    feedback.prepare()
                    feedback.notificationOccurred(.success)
                    if UIDevice.current.userInterfaceIdiom == .phone {
                        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
                    }
                }
                return
            }
            guard message.name == "gmwwUpdater",
                  let body = message.body as? [String: Any],
                  let action = body["action"] as? String,
                  let webView else { return }

            switch action {
            case "checkGithubRuntime":
                checkGithubRuntime(from:webView)
            case "pickRuntimePackage":
                pickRuntimePackage(from: webView)
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
                UserDefaults.standard.set(UserDefaults.standard.string(forKey: previousRuntimeKey), forKey: activeRuntimeKey)
                UserDefaults.standard.removeObject(forKey: previousRuntimeKey)
                loadInitialRuntime(in: webView)
                sendResult(["ok": true, "action": "rollbackRuntime"], to: webView)
            default:
                sendResult(["ok": false, "action": action, "error": "Hành động cập nhật không được hỗ trợ."], to: webView)
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            demoAwakeRequested = false
            syncIdleTimer()
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            demoAwakeRequested = false
            syncIdleTimer()
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
