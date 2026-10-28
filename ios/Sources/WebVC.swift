import UIKit
import WebKit
import ARKit

/// Kat planı sayfasını (dogusportal.com/kat-plani.html) açar; sayfa "olcum" mesajı gönderince
/// yerel AR ölçüm ekranını açar, sonucu sayfaya geri verir. "paylas" mesajıyla dosyaları paylaşır.
final class WebVC: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    static let adres = URL(string: "https://dogusportal.com/kat-plani.html")!
    private var web: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let ar = ARWorldTrackingConfiguration.isSupported
        let lidar = ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
        let bayrak = "window.DOGUS_NATIVE={ar:\(ar ? "true" : "false"),lidar:\(lidar ? "true" : "false"),surum:'1.0'};"

        let uc = WKUserContentController()
        uc.addUserScript(WKUserScript(source: bayrak, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        uc.add(ZayifIsleyici(self), name: "olcum")
        uc.add(ZayifIsleyici(self), name: "paylas")

        let cfg = WKWebViewConfiguration()
        cfg.userContentController = uc
        cfg.allowsInlineMediaPlayback = true

        web = WKWebView(frame: .zero, configuration: cfg)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        let yenile = UIRefreshControl()
        yenile.addTarget(self, action: #selector(yenile(_:)), for: .valueChanged)
        web.scrollView.refreshControl = yenile

        web.load(URLRequest(url: Self.adres, cachePolicy: .reloadRevalidatingCacheData))
    }

    @objc private func yenile(_ s: UIRefreshControl) {
        web.reload()
        s.endRefreshing()
    }

    // MARK: Sayfadan gelen mesajlar
    func userContentController(_ uc: WKUserContentController, didReceive m: WKScriptMessage) {
        switch m.name {
        case "olcum":
            olcumAc((m.body as? [String: Any]) ?? [:])
        case "paylas":
            if let d = m.body as? [String: Any], let dosyalar = d["files"] as? [[String: Any]] {
                paylas(dosyalar)
            }
        default:
            break
        }
    }

    private func olcumAc(_ secenek: [String: Any]) {
        guard ARWorldTrackingConfiguration.isSupported else {
            uyari("Bu iPhone kamerayla ölçümü desteklemiyor.")
            return
        }
        let vc = ARMeasureVC()
        vc.baslangicTuru = (secenek["tur"] as? String) ?? "salon"
        vc.bitince = { [weak self] sonuc in
            guard let self,
                  let veri = try? JSONSerialization.data(withJSONObject: sonuc),
                  let metin = String(data: veri, encoding: .utf8) else { return }
            self.web.evaluateJavaScript("window.nativeOlcumSonuc && window.nativeOlcumSonuc(\(metin));")
        }
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true)
    }

    private func paylas(_ dosyalar: [[String: Any]]) {
        let klasor = FileManager.default.temporaryDirectory.appendingPathComponent("paylas", isDirectory: true)
        try? FileManager.default.removeItem(at: klasor)
        try? FileManager.default.createDirectory(at: klasor, withIntermediateDirectories: true)
        var adresler: [URL] = []
        for f in dosyalar {
            guard let ad = f["ad"] as? String,
                  let b64 = f["veri"] as? String,
                  let veri = Data(base64Encoded: b64) else { continue }
            let u = klasor.appendingPathComponent(ad)
            if (try? veri.write(to: u)) != nil { adresler.append(u) }
        }
        guard !adresler.isEmpty else { return }
        let av = UIActivityViewController(activityItems: adresler, applicationActivities: nil)
        av.popoverPresentationController?.sourceView = view
        present(av, animated: true)
    }

    private func uyari(_ mesaj: String) {
        let a = UIAlertController(title: nil, message: mesaj, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Tamam", style: .default))
        present(a, animated: true)
    }

    // MARK: Dış bağlantılar Safari'de açılsın
    func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = a.request.url {
            let sema = u.scheme?.lowercased() ?? ""
            if ["tel", "mailto", "sms", "whatsapp"].contains(sema) {
                UIApplication.shared.open(u)
                decisionHandler(.cancel)
                return
            }
            if a.navigationType == .linkActivated, let h = u.host, !h.hasSuffix("dogusportal.com") {
                UIApplication.shared.open(u)
                decisionHandler(.cancel)
                return
            }
        }
        decisionHandler(.allow)
    }

    // target=_blank bağlantıları
    func webView(_ w: WKWebView, createWebViewWith c: WKWebViewConfiguration,
                 for a: WKNavigationAction, windowFeatures f: WKWindowFeatures) -> WKWebView? {
        if let u = a.request.url { UIApplication.shared.open(u) }
        return nil
    }

    func webView(_ w: WKWebView, runJavaScriptAlertPanelWithMessage m: String,
                 initiatedByFrame f: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: m, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Tamam", style: .default) { _ in completionHandler() })
        present(a, animated: true)
    }

    func webView(_ w: WKWebView, runJavaScriptConfirmPanelWithMessage m: String,
                 initiatedByFrame f: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: m, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Vazgeç", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "Tamam", style: .default) { _ in completionHandler(true) })
        present(a, animated: true)
    }

    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { baglantiHatasi(e) }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { baglantiHatasi(e) }

    private func baglantiHatasi(_ e: Error) {
        let ns = e as NSError
        let agHatalari = [NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost, NSURLErrorTimedOut,
                          NSURLErrorCannotFindHost, NSURLErrorCannotConnectToHost, NSURLErrorDNSLookupFailed]
        guard ns.domain == NSURLErrorDomain, agHatalari.contains(ns.code) else { return }
        let html = """
        <html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head>
        <body style='font-family:-apple-system;padding:40px 24px;text-align:center;color:#152238'>
        <h2>İnternet bağlantısı yok</h2><p>Bağlantı gelince aşağı çekip yenile.</p></body></html>
        """
        web.loadHTMLString(html, baseURL: nil)
    }
}

/// WKUserContentController işleyiciyi güçlü tuttuğu için döngüyü kıran ara sınıf.
final class ZayifIsleyici: NSObject, WKScriptMessageHandler {
    weak var hedef: WKScriptMessageHandler?
    init(_ h: WKScriptMessageHandler) { hedef = h }
    func userContentController(_ uc: WKUserContentController, didReceive m: WKScriptMessage) {
        hedef?.userContentController(uc, didReceive: m)
    }
}
