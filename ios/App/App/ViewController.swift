import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController, WKUIDelegate {
    override func viewDidLoad() {
        super.viewDidLoad()
        self.webView?.uiDelegate = self
    }
    
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsPictureInPictureMediaPlayback = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        return config
    }

    // Block all ad popup windows created by third-party embed scripts
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil {
            // Popup ad attempted via window.open / target="_blank" -> Blocked!
            return nil
        }
        return nil
    }
}
