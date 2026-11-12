# Android APK 打包说明

`android/` 是 Music Box 的 WebView 壳工程，不含 Gradle，用 Android SDK 自带工具直接打包。

## 结构

```
AndroidManifest.xml            清单（包名 com.musicbox.app，minSdk 21，targetSdk 33）
src/com/musicbox/app/MainActivity.java
                               主界面：启动本地 HTTP 服务 + WebView 加载 assets/www
res/values/strings.xml         应用名
res/mipmap-*/ic_launcher.png   图标
assets/www/                    前端构建产物（不放仓库，打包前自己拷进去）
```

## 打包步骤

需要：JDK 11+、Android SDK 的 `platforms/android-33/android.jar` 与 `build-tools/<ver>/`（含 aapt2、d8、zipalign、apksigner）。

```bash
# 0. 前端：用相对路径 + Hash 路由构建一次
npx vite build --outDir dist/apk --emptyOutDir --base ./
mkdir -p android/assets/www
cp -r dist/apk/. android/assets/www/
rm -f android/assets/www/**/*.map          # 可选：去掉 sourcemap 减小体积

cd android
BT=$ANDROID_SDK/build-tools/33.0.2
PLAT=$ANDROID_SDK/platforms/android-33/android.jar
mkdir -p build/classes build/dex

# 1. 编译 + dex
javac -source 8 -target 8 -bootclasspath $PLAT -classpath $PLAT -d build/classes src/com/musicbox/app/MainActivity.java
$BT/d8 --lib $PLAT --min-api 21 --output build/dex build/classes/com/musicbox/app/*.class

# 2. 编译资源 + 链接（把 assets 一起打进去）
$BT/aapt2 compile --dir res -o build/res.zip
$BT/aapt2 link -o build/base.apk -I $PLAT --manifest AndroidManifest.xml -R build/res.zip \
  --auto-add-overlay --min-sdk-version 21 --target-sdk-version 33 -A assets

# 3. 加 dex、对齐
cp build/base.apk build/app.apk
(cd build/dex && zip -q ../app.apk classes.dex)
$BT/zipalign -f -p 4 build/app.apk build/app-aligned.apk

# 4. 签名（示例用自签名证书；正式分发请换成自己的 keystore 并妥善保管）
keytool -genkeypair -keystore keystore.jks -alias musicbox -keyalg RSA -keysize 2048 \
  -validity 10000 -storepass <口令> -keypass <口令> -dname "CN=Music Box, O=MusicBox, C=CN"
$BT/apksigner sign --ks keystore.jks --ks-pass pass:<口令> --key-pass pass:<口令> \
  --out build/MusicBox-v1.0.0.apk build/app-aligned.apk

# 5. 校验
$BT/apksigner verify build/MusicBox-v1.0.0.apk
```

## 为什么内置 HTTP 服务

前端产物是 ES module（`<script type="module">`）。WebView 直接加载 `file://` 时，模块脚本会因 CORS（origin 为 null）被拒绝，`localStorage` 也会受限。`MainActivity` 在本机回环地址上起一个只读静态服务提供 `assets/www`，WebView 用 `http://127.0.0.1:<port>/index.html` 加载，模块、DOM Storage、Web Audio 都正常。

## 明文 HTTP 放行（重要）

Android 9（API 28）起默认禁止明文 HTTP。应用走的是 `http://127.0.0.1`，不放行会直接报 `net::ERR_CLEARTEXT_NOT_PERMITTED`、页面打不开。

`res/xml/network_security_config.xml` 只对本机回环地址放行明文，其他域名仍然禁止：

```xml
<base-config cleartextTrafficPermitted="false" />
<domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">127.0.0.1</domain>
    <domain includeSubdomains="false">localhost</domain>
</domain-config>
```

Manifest 里通过 `android:networkSecurityConfig="@xml/network_security_config"` 引用，并保留 `android:usesCleartextTraffic="true"`。

