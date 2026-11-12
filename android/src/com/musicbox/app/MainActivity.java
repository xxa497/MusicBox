package com.musicbox.app;

import android.app.Activity;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;

public class MainActivity extends Activity {

    private WebView webView;
    private AssetServer server;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.parseColor("#14110F"));
        getWindow().setNavigationBarColor(Color.parseColor("#14110F"));

        server = new AssetServer(getAssets(), "www");
        server.start();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#14110F"));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setTextZoom(100);

        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient());

        setContentView(webView);
        webView.loadUrl(server.baseUrl() + "index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (server != null) server.stop();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    /** 极简本地 HTTP 服务：把 assets/www 以 http 形式提供，避免 file:// 下 ES module 被 CORS 拦截。 */
    private static class AssetServer {
        private final AssetManager assets;
        private final String root;
        private ServerSocket serverSocket;
        private volatile boolean running;
        private Thread thread;

        AssetServer(AssetManager assets, String root) {
            this.assets = assets;
            this.root = root;
        }

        void start() {
            try {
                serverSocket = new ServerSocket(0, 16, InetAddress.getByName("127.0.0.1"));
            } catch (IOException e) {
                throw new RuntimeException("无法启动本地资源服务", e);
            }
            running = true;
            thread = new Thread(new Runnable() {
                @Override
                public void run() {
                    loop();
                }
            });
            thread.setDaemon(true);
            thread.start();
        }

        String baseUrl() {
            return "http://127.0.0.1:" + serverSocket.getLocalPort() + "/";
        }

        void stop() {
            running = false;
            try {
                if (serverSocket != null) serverSocket.close();
            } catch (IOException ignored) {
            }
        }

        private void loop() {
            while (running) {
                Socket client = null;
                try {
                    client = serverSocket.accept();
                    handle(client);
                } catch (IOException e) {
                    if (!running) return;
                } finally {
                    if (client != null) {
                        try { client.close(); } catch (IOException ignored) {}
                    }
                }
            }
        }

        private void handle(Socket client) {
            try {
                InputStream in = new BufferedInputStream(client.getInputStream());
                String requestLine = readLine(in);
                if (requestLine == null) return;
                while (true) {
                    String header = readLine(in);
                    if (header == null || header.length() == 0) break;
                }

                String[] parts = requestLine.split(" ");
                String path = parts.length > 1 ? parts[1] : "/";
                int q = path.indexOf('?');
                if (q >= 0) path = path.substring(0, q);
                if (path.startsWith("/")) path = path.substring(1);
                if (path.isEmpty()) path = "index.html";

                byte[] body = readAsset(path);
                if (body == null) {
                    body = readAsset("index.html");
                    path = "index.html";
                }
                if (body == null) body = "Not Found".getBytes("UTF-8");

                OutputStream out = client.getOutputStream();
                String head = "HTTP/1.1 200 OK\r\n"
                        + "Content-Type: " + contentType(path) + "\r\n"
                        + "Content-Length: " + body.length + "\r\n"
                        + "Cache-Control: no-store\r\n"
                        + "Access-Control-Allow-Origin: *\r\n"
                        + "Connection: close\r\n\r\n";
                out.write(head.getBytes("UTF-8"));
                out.write(body);
                out.flush();
            } catch (IOException ignored) {
            }
        }

        private byte[] readAsset(String path) {
            InputStream is = null;
            try {
                is = assets.open(root + "/" + path);
                byte[] buf = new byte[is.available() > 0 ? Math.max(is.available(), 8192) : 8192];
                int len = 0;
                int read;
                byte[] chunk = new byte[8192];
                while ((read = is.read(chunk)) > 0) {
                    if (len + read > buf.length) {
                        byte[] bigger = new byte[Math.max(buf.length * 2, len + read)];
                        System.arraycopy(buf, 0, bigger, 0, len);
                        buf = bigger;
                    }
                    System.arraycopy(chunk, 0, buf, len, read);
                    len += read;
                }
                byte[] result = new byte[len];
                System.arraycopy(buf, 0, result, 0, len);
                return result;
            } catch (IOException e) {
                return null;
            } finally {
                if (is != null) { try { is.close(); } catch (IOException ignored) {} }
            }
        }

        private static String readLine(InputStream in) throws IOException {
            StringBuilder sb = new StringBuilder();
            int c;
            while ((c = in.read()) != -1) {
                if (c == '\n') break;
                if (c != '\r') sb.append((char) c);
                if (sb.length() > 8192) break;
            }
            if (c == -1 && sb.length() == 0) return null;
            return sb.toString();
        }

        private static String contentType(String path) {
            String p = path.toLowerCase();
            if (p.endsWith(".html")) return "text/html; charset=utf-8";
            if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript; charset=utf-8";
            if (p.endsWith(".css")) return "text/css; charset=utf-8";
            if (p.endsWith(".json")) return "application/json; charset=utf-8";
            if (p.endsWith(".svg")) return "image/svg+xml";
            if (p.endsWith(".png")) return "image/png";
            if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
            if (p.endsWith(".woff2")) return "font/woff2";
            if (p.endsWith(".woff")) return "font/woff";
            if (p.endsWith(".map")) return "application/json; charset=utf-8";
            return "application/octet-stream";
        }
    }
}
