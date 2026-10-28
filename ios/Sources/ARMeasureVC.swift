import UIKit
import ARKit
import SceneKit

/// Kamerayla ölçüm ekranı. Danışman her odada köşelere nişan alıp dokunur.
/// Bütün daire tek oturumda ölçüldüğü için odalar gerçek konumlarıyla gelir.
/// Sonuç: ["rooms": [["t": tür, "pts": [[x,y,z]...]]], "acik": [["tip": "kapi"/"pencere", "a": [x,y,z], "b": [x,y,z]]], "square": Bool]
final class ARMeasureVC: UIViewController, ARSCNViewDelegate {
    var bitince: (([String: Any]) -> Void)?
    var baslangicTuru = "salon"

    static let turler: [(String, String)] = [
        ("salon", "Salon"), ("mutfak", "Mutfak"), ("yatak", "Yatak Odası"), ("cocuk", "Çocuk Odası"),
        ("banyo", "Banyo"), ("wc", "WC"), ("balkon", "Balkon"), ("antre", "Antre"),
        ("koridor", "Koridor"), ("giyinme", "Giyinme"), ("kiler", "Kiler")
    ]

    // Ölçüm durumu
    private var imlec: simd_float3?
    private var noktalar: [simd_float3] = []
    private var acikNoktalar: [simd_float3] = []
    private var odalar: [[String: Any]] = []
    private var odaCizgileri: [[simd_float3]] = []
    private var aciklar: [[String: Any]] = []
    private var mod = "kose"          // kose | kapi | pencere
    private var tur = "salon"
    private var duzDuvar = true
    private var zeminBulundu = false

    // Sahne
    private let sahne = ARSCNView()
    private let halka = SCNNode()
    private let canliDugum = SCNNode()
    private let bitenDugum = SCNNode()
    private var lastikDugum: SCNNode?
    private var odaDugumleri: [SCNNode] = []
    private var ekranSaati: CADisplayLink?
    private let titresim = UIImpactFeedbackGenerator(style: .medium)

    // Arayüz
    private let baslik = UILabel()
    private let altBaslik = UILabel()
    private let mesafe = DolguluEtiket()
    private let mini = MiniPlan()
    private var turDugmeleri: [UIButton] = []
    private let noktaDugme = UIButton(type: .system)
    private let geriDugme = UIButton(type: .system)
    private let bitirDugme = UIButton(type: .system)
    private let kapiDugme = UIButton(type: .system)
    private let pencereDugme = UIButton(type: .system)
    private let duzDugme = UIButton(type: .system)
    private let bittiDugme = UIButton(type: .system)

    private let kirmizi = UIColor(red: 0.86, green: 0.11, blue: 0.18, alpha: 1)
    private let lacivert = UIColor(red: 0, green: 0.24, blue: 0.65, alpha: 1)

    override var prefersStatusBarHidden: Bool { true }

    override func viewDidLoad() {
        super.viewDidLoad()
        tur = Self.turler.contains(where: { $0.0 == baslangicTuru }) ? baslangicTuru : "salon"
        view.backgroundColor = .black

        sahne.translatesAutoresizingMaskIntoConstraints = false
        sahne.delegate = self
        sahne.automaticallyUpdatesLighting = true
        view.addSubview(sahne)
        NSLayoutConstraint.activate([
            sahne.topAnchor.constraint(equalTo: view.topAnchor),
            sahne.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            sahne.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            sahne.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        halkaKur()
        sahne.scene.rootNode.addChildNode(halka)
        sahne.scene.rootNode.addChildNode(canliDugum)
        sahne.scene.rootNode.addChildNode(bitenDugum)

        let rehber = ARCoachingOverlayView()
        rehber.session = sahne.session
        rehber.goal = .horizontalPlane
        rehber.activatesAutomatically = true
        rehber.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(rehber)
        NSLayoutConstraint.activate([
            rehber.topAnchor.constraint(equalTo: view.topAnchor),
            rehber.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            rehber.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            rehber.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        arayuzKur()
        arayuzGuncelle()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        let cfg = ARWorldTrackingConfiguration()
        cfg.planeDetection = [.horizontal]
        if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            cfg.sceneReconstruction = .mesh
        }
        sahne.session.run(cfg)
        UIApplication.shared.isIdleTimerDisabled = true
        ekranSaati = CADisplayLink(target: self, selector: #selector(tik))
        ekranSaati?.preferredFramesPerSecond = 30
        ekranSaati?.add(to: .main, forMode: .common)
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        ekranSaati?.invalidate()
        ekranSaati = nil
        sahne.session.pause()
        UIApplication.shared.isIdleTimerDisabled = false
    }

    // MARK: Her karede: ekranın ortasından zemine ışın
    private var sonEtiket: CFTimeInterval = 0
    @objc private func tik(_ dl: CADisplayLink) {
        let orta = CGPoint(x: sahne.bounds.midX, y: sahne.bounds.midY)
        var sonuc: ARRaycastResult?
        if let q = sahne.raycastQuery(from: orta, allowing: .existingPlaneGeometry, alignment: .horizontal) {
            sonuc = sahne.session.raycast(q).first
        }
        if sonuc == nil, let q = sahne.raycastQuery(from: orta, allowing: .estimatedPlane, alignment: .horizontal) {
            sonuc = sahne.session.raycast(q).first
        }
        if let r = sonuc {
            let t = r.worldTransform
            imlec = simd_float3(t.columns.3.x, t.columns.3.y, t.columns.3.z)
            halka.simdPosition = imlec!
            halka.isHidden = false
            if !zeminBulundu { zeminBulundu = true; arayuzGuncelle() }
        } else {
            imlec = nil
            halka.isHidden = true
        }
        lastikGuncelle()
        if dl.timestamp - sonEtiket > 0.12 {
            sonEtiket = dl.timestamp
            mesafeGuncelle()
            miniGuncelle()
        }
    }

    // MARK: Eylemler
    @objc private func noktaBas() {
        guard let p = imlec else {
            altBaslik.text = "Halka yere oturmadı. Telefonu biraz gezdir, sonra köşeye nişan al."
            return
        }
        titresim.impactOccurred()
        if mod == "kose" {
            if noktalar.count >= 3, let ilk = noktalar.first, yatayMesafe(p, ilk) < 0.25 {
                odayiBitir()
                return
            }
            noktalar.append(p)
        } else {
            acikNoktalar.append(p)
            if acikNoktalar.count == 2 { acikKaydet(); return }
        }
        canliCiz()
        arayuzGuncelle()
    }

    @objc private func geriAl() {
        if mod != "kose" {
            if !acikNoktalar.isEmpty { acikNoktalar.removeLast() }
        } else if !noktalar.isEmpty {
            noktalar.removeLast()
        } else if !odalar.isEmpty {
            odalar.removeLast()
            odaCizgileri.removeLast()
            odaDugumleri.removeLast().removeFromParentNode()
            altBaslik.text = "Son oda silindi."
        }
        canliCiz()
        arayuzGuncelle()
    }

    @objc private func odayiBitir() {
        guard noktalar.count >= 3 else { return }
        odalar.append(["t": tur, "pts": noktalar.map { [Double($0.x), Double($0.y), Double($0.z)] }])
        odaCizgileri.append(noktalar)
        let d = SCNNode()
        for (i, a) in noktalar.enumerated() {
            let b = noktalar[(i + 1) % noktalar.count]
            d.addChildNode(cizgi(a, b, renk: UIColor(red: 0.18, green: 0.44, blue: 1, alpha: 1)))
        }
        bitenDugum.addChildNode(d)
        odaDugumleri.append(d)
        let ad = Self.turler.first(where: { $0.0 == tur })?.1 ?? "Oda"
        let alan = alanHesapla(noktalar)
        noktalar = []
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        canliCiz()
        arayuzGuncelle()
        altBaslik.text = "\(ad) eklendi · \(String(format: "%.1f", alan).replacingOccurrences(of: ".", with: ",")) m². Diğer odaya geç, türünü seç."
    }

    private func acikKaydet() {
        guard !odalar.isEmpty, acikNoktalar.count == 2 else {
            acikNoktalar = []
            altBaslik.text = "Önce bir odayı bitir, sonra kapı ya da pencere ekle."
            modSec("kose")
            return
        }
        let a = acikNoktalar[0], b = acikNoktalar[1]
        aciklar.append(["tip": mod,
                        "a": [Double(a.x), Double(a.y), Double(a.z)],
                        "b": [Double(b.x), Double(b.y), Double(b.z)]])
        let renk: UIColor = mod == "kapi" ? .systemOrange : .systemTeal
        let n = cizgi(a, b, renk: renk)
        bitenDugum.addChildNode(n)
        let ad = mod == "kapi" ? "Kapı" : "Pencere"
        acikNoktalar = []
        modSec("kose")
        altBaslik.text = "\(ad) eklendi · \(String(format: "%.2f", yatayMesafe(a, b)).replacingOccurrences(of: ".", with: ",")) m"
    }

    @objc private func kapiBas() { modSec(mod == "kapi" ? "kose" : "kapi") }
    @objc private func pencereBas() { modSec(mod == "pencere" ? "kose" : "pencere") }

    private func modSec(_ m: String) {
        mod = m
        acikNoktalar = []
        canliCiz()
        arayuzGuncelle()
    }

    @objc private func duzBas() {
        duzDuvar.toggle()
        arayuzGuncelle()
        altBaslik.text = duzDuvar ? "Duvarlar dik açıya düzlenecek." : "Ölçüldüğü gibi bırakılacak."
    }

    @objc private func bittiBas() {
        if noktalar.count >= 3 { odayiBitir() }
        let sonuc: [String: Any] = ["rooms": odalar, "acik": aciklar, "square": duzDuvar]
        let bos = odalar.isEmpty
        dismiss(animated: true) { [bitince] in
            if !bos { bitince?(sonuc) }
        }
    }

    @objc private func turBas(_ b: UIButton) {
        tur = Self.turler[b.tag].0
        arayuzGuncelle()
    }

    // MARK: 3B çizim
    private func halkaKur() {
        let tor = SCNTorus(ringRadius: 0.07, pipeRadius: 0.004)
        tor.firstMaterial?.diffuse.contents = UIColor.white
        tor.firstMaterial?.lightingModel = .constant
        halka.addChildNode(SCNNode(geometry: tor))
        let nokta = SCNCylinder(radius: 0.012, height: 0.002)
        nokta.firstMaterial?.diffuse.contents = kirmizi
        nokta.firstMaterial?.lightingModel = .constant
        halka.addChildNode(SCNNode(geometry: nokta))
        halka.isHidden = true
    }

    private func cizgi(_ a: simd_float3, _ b: simd_float3, renk: UIColor) -> SCNNode {
        let v = b - a
        let uz = simd_length(v)
        let silindir = SCNCylinder(radius: 0.006, height: CGFloat(max(uz, 0.001)))
        silindir.firstMaterial?.diffuse.contents = renk
        silindir.firstMaterial?.lightingModel = .constant
        let n = SCNNode(geometry: silindir)
        n.simdPosition = (a + b) / 2 + simd_float3(0, 0.005, 0)
        if uz > 0.0001 {
            n.simdOrientation = simd_quatf(from: simd_float3(0, 1, 0), to: simd_normalize(v))
        }
        return n
    }

    private func isaret(_ p: simd_float3, renk: UIColor) -> SCNNode {
        let s = SCNCylinder(radius: 0.022, height: 0.004)
        s.firstMaterial?.diffuse.contents = renk
        s.firstMaterial?.lightingModel = .constant
        let n = SCNNode(geometry: s)
        n.simdPosition = p + simd_float3(0, 0.004, 0)
        return n
    }

    private func canliCiz() {
        canliDugum.childNodes.forEach { $0.removeFromParentNode() }
        lastikDugum = nil
        let liste = mod == "kose" ? noktalar : acikNoktalar
        let renk: UIColor = mod == "kose" ? kirmizi : (mod == "kapi" ? .systemOrange : .systemTeal)
        for p in liste { canliDugum.addChildNode(isaret(p, renk: renk)) }
        if liste.count > 1 {
            for i in 0..<(liste.count - 1) { canliDugum.addChildNode(cizgi(liste[i], liste[i + 1], renk: renk)) }
        }
    }

    private func lastikGuncelle() {
        lastikDugum?.removeFromParentNode()
        lastikDugum = nil
        let liste = mod == "kose" ? noktalar : acikNoktalar
        guard let son = liste.last, let c = imlec else { return }
        let n = cizgi(son, c, renk: .white)
        canliDugum.addChildNode(n)
        lastikDugum = n
    }

    // MARK: Arayüz
    private func arayuzKur() {
        // üst durum kutusu
        let ust = cam()
        baslik.font = .systemFont(ofSize: 17, weight: .bold)
        baslik.textColor = .white
        baslik.numberOfLines = 1
        altBaslik.font = .systemFont(ofSize: 13.5, weight: .medium)
        altBaslik.textColor = UIColor.white.withAlphaComponent(0.88)
        altBaslik.numberOfLines = 3
        let yazi = UIStackView(arrangedSubviews: [baslik, altBaslik])
        yazi.axis = .vertical
        yazi.spacing = 3
        yazi.translatesAutoresizingMaskIntoConstraints = false
        ust.contentView.addSubview(yazi)
        NSLayoutConstraint.activate([
            yazi.topAnchor.constraint(equalTo: ust.contentView.topAnchor, constant: 12),
            yazi.bottomAnchor.constraint(equalTo: ust.contentView.bottomAnchor, constant: -12),
            yazi.leadingAnchor.constraint(equalTo: ust.contentView.leadingAnchor, constant: 14),
            yazi.trailingAnchor.constraint(equalTo: ust.contentView.trailingAnchor, constant: -14)
        ])

        let miniKutu = cam()
        mini.translatesAutoresizingMaskIntoConstraints = false
        mini.backgroundColor = .clear
        miniKutu.contentView.addSubview(mini)
        NSLayoutConstraint.activate([
            mini.topAnchor.constraint(equalTo: miniKutu.contentView.topAnchor),
            mini.bottomAnchor.constraint(equalTo: miniKutu.contentView.bottomAnchor),
            mini.leadingAnchor.constraint(equalTo: miniKutu.contentView.leadingAnchor),
            mini.trailingAnchor.constraint(equalTo: miniKutu.contentView.trailingAnchor),
            miniKutu.widthAnchor.constraint(equalToConstant: 112),
            miniKutu.heightAnchor.constraint(equalToConstant: 112)
        ])

        let ustSatir = UIStackView(arrangedSubviews: [ust, miniKutu])
        ustSatir.spacing = 10
        ustSatir.alignment = .top
        ustSatir.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(ustSatir)

        // orta nişangâh
        let nisan = UIView()
        nisan.translatesAutoresizingMaskIntoConstraints = false
        nisan.isUserInteractionEnabled = false
        nisan.layer.borderColor = UIColor.white.cgColor
        nisan.layer.borderWidth = 2
        nisan.layer.cornerRadius = 17
        let nokta = UIView()
        nokta.translatesAutoresizingMaskIntoConstraints = false
        nokta.backgroundColor = kirmizi
        nokta.layer.cornerRadius = 3
        nisan.addSubview(nokta)
        view.addSubview(nisan)
        mesafe.translatesAutoresizingMaskIntoConstraints = false
        mesafe.font = .monospacedDigitSystemFont(ofSize: 22, weight: .heavy)
        mesafe.textColor = .white
        mesafe.backgroundColor = UIColor(white: 0.05, alpha: 0.7)
        mesafe.layer.cornerRadius = 12
        mesafe.clipsToBounds = true
        mesafe.isHidden = true
        view.addSubview(mesafe)

        // tür seçici
        let turKaydir = UIScrollView()
        turKaydir.showsHorizontalScrollIndicator = false
        let turSatir = UIStackView()
        turSatir.spacing = 6
        turSatir.translatesAutoresizingMaskIntoConstraints = false
        for (i, t) in Self.turler.enumerated() {
            var c = UIButton.Configuration.plain()
            c.title = t.1
            c.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)
            c.background.cornerRadius = 18
            c.background.strokeWidth = 1.5
            c.background.strokeColor = UIColor.white.withAlphaComponent(0.4)
            let b = UIButton(configuration: c)
            b.tag = i
            b.addTarget(self, action: #selector(turBas(_:)), for: .touchUpInside)
            turDugmeleri.append(b)
            turSatir.addArrangedSubview(b)
        }
        turKaydir.addSubview(turSatir)
        let turKutu = cam()
        turKaydir.translatesAutoresizingMaskIntoConstraints = false
        turKutu.contentView.addSubview(turKaydir)
        NSLayoutConstraint.activate([
            turSatir.topAnchor.constraint(equalTo: turKaydir.contentLayoutGuide.topAnchor),
            turSatir.bottomAnchor.constraint(equalTo: turKaydir.contentLayoutGuide.bottomAnchor),
            turSatir.leadingAnchor.constraint(equalTo: turKaydir.contentLayoutGuide.leadingAnchor, constant: 8),
            turSatir.trailingAnchor.constraint(equalTo: turKaydir.contentLayoutGuide.trailingAnchor, constant: -8),
            turSatir.heightAnchor.constraint(equalTo: turKaydir.frameLayoutGuide.heightAnchor),
            turKaydir.topAnchor.constraint(equalTo: turKutu.contentView.topAnchor, constant: 8),
            turKaydir.bottomAnchor.constraint(equalTo: turKutu.contentView.bottomAnchor, constant: -8),
            turKaydir.leadingAnchor.constraint(equalTo: turKutu.contentView.leadingAnchor),
            turKaydir.trailingAnchor.constraint(equalTo: turKutu.contentView.trailingAnchor),
            turKaydir.heightAnchor.constraint(equalToConstant: 38)
        ])

        dugmeStili(geriDugme, "Geri al", arka: UIColor(white: 0.05, alpha: 0.72), boyut: 15)
        dugmeStili(noktaDugme, "Köşe", arka: kirmizi, boyut: 20)
        dugmeStili(bitirDugme, "Odayı bitir", arka: lacivert, boyut: 15)
        geriDugme.addTarget(self, action: #selector(geriAl), for: .touchUpInside)
        noktaDugme.addTarget(self, action: #selector(noktaBas), for: .touchUpInside)
        bitirDugme.addTarget(self, action: #selector(odayiBitir), for: .touchUpInside)
        let ana = UIStackView(arrangedSubviews: [geriDugme, noktaDugme, bitirDugme])
        ana.spacing = 8
        ana.distribution = .fill
        geriDugme.widthAnchor.constraint(equalTo: bitirDugme.widthAnchor).isActive = true
        noktaDugme.widthAnchor.constraint(equalTo: geriDugme.widthAnchor, multiplier: 1.5).isActive = true
        noktaDugme.heightAnchor.constraint(equalToConstant: 64).isActive = true

        for (b, ad) in [(kapiDugme, "Kapı"), (pencereDugme, "Pencere"), (duzDugme, "Düz duvar"), (bittiDugme, "Bitti")] {
            dugmeStili(b, ad, arka: UIColor(white: 0.05, alpha: 0.72), boyut: 14)
            b.heightAnchor.constraint(equalToConstant: 44).isActive = true
        }
        kapiDugme.addTarget(self, action: #selector(kapiBas), for: .touchUpInside)
        pencereDugme.addTarget(self, action: #selector(pencereBas), for: .touchUpInside)
        duzDugme.addTarget(self, action: #selector(duzBas), for: .touchUpInside)
        bittiDugme.addTarget(self, action: #selector(bittiBas), for: .touchUpInside)
        let alt = UIStackView(arrangedSubviews: [kapiDugme, pencereDugme, duzDugme, bittiDugme])
        alt.spacing = 8
        alt.distribution = .fillEqually

        let altBlok = UIStackView(arrangedSubviews: [turKutu, ana, alt])
        altBlok.axis = .vertical
        altBlok.spacing = 10
        altBlok.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(altBlok)

        let g = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            ustSatir.topAnchor.constraint(equalTo: g.topAnchor, constant: 10),
            ustSatir.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 12),
            ustSatir.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -12),
            nisan.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            nisan.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            nisan.widthAnchor.constraint(equalToConstant: 34),
            nisan.heightAnchor.constraint(equalToConstant: 34),
            nokta.centerXAnchor.constraint(equalTo: nisan.centerXAnchor),
            nokta.centerYAnchor.constraint(equalTo: nisan.centerYAnchor),
            nokta.widthAnchor.constraint(equalToConstant: 6),
            nokta.heightAnchor.constraint(equalToConstant: 6),
            mesafe.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            mesafe.topAnchor.constraint(equalTo: nisan.bottomAnchor, constant: 10),
            altBlok.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 12),
            altBlok.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -12),
            altBlok.bottomAnchor.constraint(equalTo: g.bottomAnchor, constant: -10)
        ])
    }

    private func cam() -> UIVisualEffectView {
        let v = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterialDark))
        v.layer.cornerRadius = 16
        v.clipsToBounds = true
        return v
    }

    private func dugmeStili(_ b: UIButton, _ ad: String, arka: UIColor, boyut: CGFloat) {
        var c = UIButton.Configuration.filled()
        c.title = ad
        c.baseBackgroundColor = arka
        c.baseForegroundColor = .white
        c.cornerStyle = .large
        c.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { a in
            var a = a
            a.font = UIFont.systemFont(ofSize: boyut, weight: .heavy)
            return a
        }
        b.configuration = c
    }

    private func dugmeRengi(_ b: UIButton, secili: Bool) {
        guard var c = b.configuration else { return }
        c.baseBackgroundColor = secili ? .white : UIColor(white: 0.05, alpha: 0.72)
        c.baseForegroundColor = secili ? UIColor(red: 0.08, green: 0.13, blue: 0.22, alpha: 1) : .white
        b.configuration = c
    }

    private func arayuzGuncelle() {
        let ad = Self.turler.first(where: { $0.0 == tur })?.1 ?? "Oda"
        if !zeminBulundu {
            baslik.text = "Zemin aranıyor…"
            altBaslik.text = "Telefonu yere doğru tut, yavaşça sağa sola gezdir."
        } else if mod == "kapi" {
            baslik.text = acikNoktalar.isEmpty ? "Kapının bir kenarı" : "Kapının öbür kenarı"
            altBaslik.text = "Kapı boşluğunun yerle birleştiği noktaya nişan al, Nokta'ya bas."
        } else if mod == "pencere" {
            baslik.text = acikNoktalar.isEmpty ? "Pencerenin bir kenarı" : "Pencerenin öbür kenarı"
            altBaslik.text = "Pencerenin altındaki duvar dibine nişan al, Nokta'ya bas."
        } else if noktalar.isEmpty {
            baslik.text = "\(ad): ilk köşe"
            altBaslik.text = "Duvarların yerle birleştiği köşeye halkayı getir, Köşe'ye bas."
        } else {
            baslik.text = "\(ad): \(noktalar.count + 1). köşe"
            altBaslik.text = noktalar.count >= 3
                ? "Sıradaki köşe ya da Odayı bitir. İlk köşeye dokunmak da odayı kapatır."
                : "Duvar boyunca sıradaki köşeye yürü."
        }
        noktaDugme.configuration?.title = mod == "kose" ? "Köşe" : "Nokta"
        bitirDugme.isEnabled = mod == "kose" && noktalar.count >= 3
        bitirDugme.alpha = bitirDugme.isEnabled ? 1 : 0.45
        dugmeRengi(kapiDugme, secili: mod == "kapi")
        dugmeRengi(pencereDugme, secili: mod == "pencere")
        dugmeRengi(duzDugme, secili: duzDuvar)
        for b in turDugmeleri {
            let secili = Self.turler[b.tag].0 == tur
            b.configuration?.baseForegroundColor = secili ? UIColor(red: 0.08, green: 0.13, blue: 0.22, alpha: 1) : .white
            b.configuration?.background.backgroundColor = secili ? .white : .clear
        }
    }

    private func mesafeGuncelle() {
        let liste = mod == "kose" ? noktalar : acikNoktalar
        if let son = liste.last, let c = imlec {
            mesafe.isHidden = false
            mesafe.text = String(format: "%.2f m", yatayMesafe(son, c)).replacingOccurrences(of: ".", with: ",")
        } else {
            mesafe.isHidden = true
        }
    }

    private func miniGuncelle() {
        mini.odalar = odaCizgileri.map { $0.map { CGPoint(x: CGFloat($0.x), y: CGFloat($0.z)) } }
        mini.simdiki = noktalar.map { CGPoint(x: CGFloat($0.x), y: CGFloat($0.z)) }
        mini.imlec = imlec.map { CGPoint(x: CGFloat($0.x), y: CGFloat($0.z)) }
        mini.setNeedsDisplay()
    }

    // MARK: Yardımcılar
    private func yatayMesafe(_ a: simd_float3, _ b: simd_float3) -> Float {
        hypotf(a.x - b.x, a.z - b.z)
    }

    private func alanHesapla(_ p: [simd_float3]) -> Float {
        var a: Float = 0
        for i in 0..<p.count {
            let q = p[(i + 1) % p.count]
            a += p[i].x * q.z - q.x * p[i].z
        }
        return abs(a) / 2
    }
}

/// Sağ üstteki küçük canlı plan.
final class MiniPlan: UIView {
    var odalar: [[CGPoint]] = []
    var simdiki: [CGPoint] = []
    var imlec: CGPoint?

    override func draw(_ rect: CGRect) {
        guard let g = UIGraphicsGetCurrentContext() else { return }
        var hepsi = odalar.flatMap { $0 } + simdiki
        if let c = imlec { hepsi.append(c) }
        guard !hepsi.isEmpty else {
            let s = NSAttributedString(string: "Plan", attributes: [
                .font: UIFont.systemFont(ofSize: 13, weight: .semibold),
                .foregroundColor: UIColor.white.withAlphaComponent(0.6)])
            let b = s.size()
            s.draw(at: CGPoint(x: rect.midX - b.width / 2, y: rect.midY - b.height / 2))
            return
        }
        let mnx = hepsi.map(\.x).min()!, mxx = hepsi.map(\.x).max()!
        let mny = hepsi.map(\.y).min()!, mxy = hepsi.map(\.y).max()!
        let sc = min((rect.width - 16) / max(mxx - mnx, 2), (rect.height - 16) / max(mxy - mny, 2))
        let ox = rect.midX - (mnx + mxx) / 2 * sc, oy = rect.midY - (mny + mxy) / 2 * sc
        func p(_ q: CGPoint) -> CGPoint { CGPoint(x: ox + q.x * sc, y: oy + q.y * sc) }

        g.setLineWidth(2)
        for oda in odalar where oda.count > 2 {
            g.beginPath()
            g.move(to: p(oda[0]))
            oda.dropFirst().forEach { g.addLine(to: p($0)) }
            g.closePath()
            g.setFillColor(UIColor.white.withAlphaComponent(0.18).cgColor)
            g.setStrokeColor(UIColor.white.cgColor)
            g.drawPath(using: .fillStroke)
        }
        let kirmizi = UIColor(red: 1, green: 0.3, blue: 0.37, alpha: 1)
        if !simdiki.isEmpty {
            g.beginPath()
            g.move(to: p(simdiki[0]))
            simdiki.dropFirst().forEach { g.addLine(to: p($0)) }
            if let c = imlec { g.addLine(to: p(c)) }
            g.setStrokeColor(kirmizi.cgColor)
            g.strokePath()
        }
        if let c = imlec {
            let m = p(c)
            g.setFillColor(kirmizi.cgColor)
            g.fillEllipse(in: CGRect(x: m.x - 4, y: m.y - 4, width: 8, height: 8))
        }
    }
}

/// İç boşluklu etiket (mesafe göstergesi).
final class DolguluEtiket: UILabel {
    override func drawText(in rect: CGRect) {
        super.drawText(in: rect.inset(by: UIEdgeInsets(top: 4, left: 12, bottom: 4, right: 12)))
    }
    override var intrinsicContentSize: CGSize {
        let s = super.intrinsicContentSize
        return CGSize(width: s.width + 24, height: s.height + 8)
    }
}
