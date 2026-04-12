# Google Play 上架准备指南

## 项目当前状态

- **包名**: `com.example.photogallery` (需要修改)
- **versionCode**: 1
- **versionName**: 1.0
- **minSdk**: 26
- **targetSdk**: 34
- **权限**: READ_MEDIA_IMAGES, READ_MEDIA_VISUAL_USER_SELECTED

---

## 一、必须手动完成的工作

### 1.1 Google Play 开发者账号注册

- 访问 [Google Play Console](https://play.google.com/console)
- 支付 $25 一次性注册费
- 完成账号验证和身份验证

### 1.2 应用签名密钥

- 在 Play Console 中设置 Google Play App Signing
- 可选择让 Google 托管密钥或自行管理
- 建议让 Google 托管，更安全便捷

### 1.3 隐私政策

**必须项**：应用请求了相册读取权限，上架时必须提供隐私政策链接。

隐私政策需包含：
- 收集的数据类型（相册访问）
- 数据使用目的（展示照片）
- 数据存储方式（本地处理，不上传服务器）
- 用户权利说明

发布方式：
- GitHub Pages（免费）
- 个人网站
- 第三方隐私政策托管服务

### 1.4 内容分级问卷

在 Play Console 填写问卷，确定应用分级：
- 是否包含暴力内容
- 是否包含成人内容
- 是否包含赌博元素
- 用户交互程度

### 1.5 商店素材准备

| 素材类型 | 尺寸要求 | 数量 |
|---------|---------|------|
| 手机截图 | 16:9 或 9:16, 320-3840px | 2-8 张 |
| 平板截图 | 16:9 或 9:16, 320-3840px | 2-8 张 |
| 高清图标 | 512x512 px | 1 张 |
| 宣传图（可选）| 1024x500 px | 1 张 |

### 1.6 商店描述

- **应用标题**: 最多 30 字符
- **简短描述**: 最多 80 字符
- **详细描述**: 最多 4000 字符

---

## 二、可自动化完成的工作

### 2.1 版本号管理

更新 `app/build.gradle.kts`:
```kotlin
versionCode = 1      // 每次发布 +1
versionName = "1.0"  // 语义化版本号
```

### 2.2 Release 签名配置

在 `app/build.gradle.kts` 添加签名配置:
```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file("release-keystore.jks")
            storePassword = "your_store_password"
            keyAlias = "your_key_alias"
            keyPassword = "your_key_password"
        }
    }
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

### 2.3 ProGuard/R8 混淆配置

创建 `app/proguard-rules.pro`:
```proguard
# Compose
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# 保持数据类
-keep class com.yourname.photogallery.data.** { *; }

# 保持 ViewModel
-keep class * extends androidx.lifecycle.ViewModel { *; }
```

### 2.4 构建 Release 包

```bash
# 构建 APK
./gradlew assembleRelease

# 构建 AAB (推荐，Google Play 要求)
./gradlew bundleRelease
```

输出位置:
- APK: `app/build/outputs/apk/release/`
- AAB: `app/build/outputs/bundle/release/`

---

## 三、当前项目需要修改的问题

### 3.1 包名修改

**问题**: `com.example.photogallery` 使用了 example 域名，无法上架

**解决方案**: 修改为你的域名
- 如果有域名: `com.yourdomain.photogallery`
- 如果没有域名: `io.github.yourusername.photogallery`

需要修改的文件:
- `app/build.gradle.kts` - applicationId
- `app/src/main/AndroidManifest.xml` - package 属性（如有）
- 所有 Kotlin 文件的 package 声明
- 目录结构

### 3.2 应用图标

当前使用默认图标，建议设计专属图标。

需要准备的尺寸:
- mipmap-mdpi: 48x48
- mipmap-hdpi: 72x72
- mipmap-xhdpi: 96x96
- mipmap-xxhdpi: 144x144
- mipmap-xxxhdpi: 192x192

### 3.3 权限说明

在 `strings.xml` 添加权限说明:
```xml
<string name="permission_reason">需要访问相册以展示您的照片</string>
```

---

## 四、上架工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                      上架工作流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 修改包名                                                 │
│     └── 更新 applicationId、目录结构、package 声明           │
│                                                             │
│  2. 配置签名                                                 │
│     └── 生成密钥、配置 build.gradle.kts                      │
│                                                             │
│  3. 启用混淆                                                 │
│     └── 创建 proguard-rules.pro、配置 buildTypes             │
│                                                             │
│  4. 构建 AAB                                                 │
│     └── ./gradlew bundleRelease                             │
│                                                             │
│  5. 准备商店素材                                             │
│     └── 截图、图标、宣传图、描述文案                          │
│                                                             │
│  6. 创建应用                                                 │
│     └── Play Console 创建应用、填写信息                       │
│                                                             │
│  7. 上传 AAB                                                 │
│     └── 上传构建产物、填写发布说明                            │
│                                                             │
│  8. 提交审核                                                 │
│     └── 等待审核结果（通常 1-3 天）                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、自动化命令清单

以下是可以让 AI 助手自动执行的命令:

| 序号 | 任务 | 命令/操作 |
|-----|------|----------|
| 1 | 生成签名密钥 | `keytool -genkey -v -keystore release-keystore.jks ...` |
| 2 | 构建 Release APK | `./gradlew assembleRelease` |
| 3 | 构建 Release AAB | `./gradlew bundleRelease` |
| 4 | 检查构建产物 | `ls app/build/outputs/bundle/release/` |
| 5 | 查看签名信息 | `keytool -list -v -keystore release-keystore.jks` |

---

## 六、检查清单

上架前确认:

- [ ] 包名已修改为正式域名
- [ ] 版本号已更新
- [ ] 签名密钥已配置
- [ ] Release 构建成功
- [ ] 应用图标已替换
- [ ] 隐私政策页面已发布
- [ ] 商店截图已准备
- [ ] 商店描述已撰写
- [ ] Google Play 开发者账号已注册

---

## 七、参考资源

- [Google Play Console](https://play.google.com/console)
- [应用签名指南](https://developer.android.com/studio/publish/app-signing)
- [R8 混淆配置](https://developer.android.com/build/shrink-code)
- [应用内容指南](https://play.google.com/about/developer-content-policy/)
