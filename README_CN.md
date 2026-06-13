# WinBridge AI

[English](README.md) | [中文](README_CN.md)

通过 Mac 侧 AI 操作一台 Windows 电脑。

WinBridge AI 是一个本地优先的 Mac 到 Windows 控制桥。它可以配对 Windows
机器、执行 PowerShell 任务、收集日志、分发安装包、安装构建产物，并捕获
Windows 截图。Windows 端不需要预先安装 AI 运行环境，也不需要先配置完整开发
环境。你只需要在 Mac 上启动 WinBridge AI，然后在 Windows 浏览器里打开 Mac
打印出来的配对地址，复制页面里的命令到 PowerShell 运行，之后就可以从 Mac
控制 Windows。

## 当前状态

这个仓库是从 GitMemo 的 Windows 构建辅助工具中抽出来的独立产品种子版本。
当前版本适合局域网内开发、构建、验证和调试使用，还不是面向公网远程控制的
完整安全产品。

## 快速开始

在 Mac 上启动 WinBridge AI：

```bash
npm start
```

Mac 终端会打印一个或多个配对 URL，例如：

```text
http://192.168.0.110:47832/?token=...
```

在 Windows 电脑上：

1. 用 Windows 浏览器打开 Mac 终端打印出来的 URL。
2. 找到页面里的 **LAN Agent** 区域。
3. 点击 **Copy Agent Command**。
4. 把复制出来的命令粘贴到 Windows PowerShell 并运行。
5. 保持这个 PowerShell 窗口打开，Mac 才能继续控制 Windows。

这个页面还会提供几个可选命令：

- 启动不依赖 SSH 的轮询式 Windows Agent；
- 可选：初始化 OpenSSH Server；
- 可选：安装 Windows 构建环境。

当 Windows Agent 显示已连接后，回到 Mac。你可以使用浏览器里的控制台页面，
也可以使用 CLI：

```bash
npm run status
npm run run -- "hostname; whoami"
npm run screenshot
```

也就是说，正常使用流程是：

```text
Mac 启动 server -> Windows 浏览器打开 Mac URL -> Windows 复制并运行 Agent 命令 -> Mac 控制 Windows
```

## 运行时数据

默认情况下，运行时数据都保存在当前仓库目录内：

- 状态和日志：`.state/state.json`
- 配对 token：`.state/pairing-token`
- 生成的 SSH key：`.state/ssh/winbridge_windows_ed25519`
- 截图：`.state/screenshots/`
- 分发给 Windows 的文件：`artifacts/`

如果要让 Windows 安装某个构建产物，可以把安装包放到 `artifacts/`，然后在 Web
控制台点击 **Install Latest Artifact**，或在 Mac 上运行：

```bash
npm run install-artifact
```

## 环境变量

- `WINBRIDGE_PORT`：server 端口，默认 `47832`
- `WINBRIDGE_STATE_DIR`：自定义状态目录
- `WINBRIDGE_ARTIFACTS_DIR`：自定义 artifact 目录
- `WINBRIDGE_SSH_KEY`：自定义 SSH 私钥路径
- `WINBRIDGE_PAIRING_TOKEN`：覆盖自动生成的本地配对 token
- `WINBRIDGE_AUTH_DISABLED=1`：关闭 token 校验，仅用于可信本地测试

## 产品方向

WinBridge AI 的目标是成为一个通用的 Mac 到 Windows AI 操作层：

- 让 AI 工具执行 Windows 命令；
- 检查 Windows 环境和日志；
- 捕获截图用于视觉验证；
- 上传、分发、安装构建产物；
- 运行构建、测试、验证模板；
- 后续通过 MCP 暴露给 Codex、Claude、Cursor 等 Agent。

## 安全模型

WinBridge AI 默认绑定到 `0.0.0.0`，这样同一局域网里的 Windows 机器才能访问
Mac 上的控制服务。API 和 Agent 回调默认都受本地配对 token 保护。请把 Mac
终端打印出来的配对 URL 当作敏感信息，不要发到公开聊天、工单或日志里。只在
可信网络中使用，任务结束后停止 server。

如果要在可信局域网之外使用，请先阅读 [docs/security.md](docs/security.md)。

## 网站

独立产品网站位于 [website/](website/)。当前是静态站点，也可以直接打开：

```bash
open website/index.html
```

线上地址：

[https://sahadev.github.io/ai-windows-bridge/](https://sahadev.github.io/ai-windows-bridge/)
