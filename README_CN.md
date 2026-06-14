# WinBridge AI

[English](README.md) | [中文](README_CN.md)

通过 Mac 侧 AI 操作一台 Windows 电脑。

WinBridge AI 是一个本地优先的 Mac 到 Windows 操作层。它不是单一的构建或安
装工具，而是让 Mac 侧 AI 获得一个真实可用的 Windows 执行面：执行命令和脚本、
检查系统环境、移动文件、启动进程、安装软件、捕获截图、收集日志，并通过命令
输出或屏幕状态形成反馈闭环。Windows 端不需要预先安装 AI 运行环境，也不需要
先配置完整开发环境。你只需要在 Mac 上启动 WinBridge AI，然后在 Windows 浏览
器里打开 Mac 打印出来的配对地址，复制页面里的命令到 PowerShell 运行，之后就
可以从 Mac 控制 Windows。

## 当前状态

这个仓库是从 GitMemo 的 Windows 控制和构建辅助工具中抽出来的独立产品种子版
本。当前版本适合可信局域网内的操作、开发、调试、构建、QA 和验证流程，还不
是面向公网远程控制的完整安全产品。

## 快速开始

在 Mac 上启动 WinBridge AI：

```bash
npm start
```

Mac 终端会打印一个或多个配对 URL，例如：

```text
http://192.168.0.110:47832/
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
- 可选配对 token：`.state/pairing-token`
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
- `WINBRIDGE_AUTH_REQUIRED=1`：启用 token 校验，保护 Web 控制台、API 和 Windows Agent 回调
- `WINBRIDGE_AUTH=token`：另一种启用 token 校验的写法
- `WINBRIDGE_PAIRING_TOKEN`：指定固定 token，并自动启用 token 校验
- `WINBRIDGE_AUTH_DISABLED=1`：强制关闭 token 校验，即使同时存在其他认证环境变量

## 产品方向

WinBridge AI 的目标是成为一个通用的 Mac 到 Windows AI 操作层。核心定位不
是“构建自动化”，而是：一旦 Windows 机器建立连接，Mac 侧 AI 就应该能做当前
Windows 用户权限、PowerShell/脚本、文件、进程、已安装工具和屏幕反馈所允许
的事情。

典型能力包括：

- 让 AI 工具执行 Windows 命令；
- 检查系统状态、环境变量、文件、进程和日志；
- 在权限允许时上传、下载、创建、编辑、删除文件；
- 启动应用、安装器、测试、脚本和诊断工具；
- 捕获截图，让 AI 理解 Windows 桌面的可见状态；
- 安装软件或构建产物，但这只是其中一个使用场景；
- 运行构建、QA、问题复现、修复和运维模板；
- 后续通过 MCP 暴露给 Codex、Claude、Cursor 等 Agent。

它的边界取决于连接后的 Windows Agent 拥有的权限和可自动化能力。WinBridge
AI 不应该被描述成单一用途的构建或安装工具；构建和安装只是“从 Mac 操作
Windows”的具体示例。

## 安全模型

WinBridge AI 默认绑定到 `0.0.0.0`，这样同一局域网里的 Windows 机器才能访问
Mac 上的控制服务。为了让 Windows 端配对流程更顺手，token 校验默认关闭；
在可信局域网里，Windows 浏览器可以直接打开 Mac 打印出来的 URL，不需要手动
输入 token。

如果你希望启用 token 校验，可以这样启动：

```bash
WINBRIDGE_AUTH_REQUIRED=1 npm start
```

启用 token 后，Mac 终端打印出来的配对 URL 就是敏感信息，不要发到公开聊天、
工单或日志里。无论是否启用 token，都建议只在可信网络中使用，任务结束后停止
server。

如果要在可信局域网之外使用，请先阅读 [docs/security.md](docs/security.md)。

## 网站

独立产品网站位于 [website/](website/)。当前是静态站点，也可以直接打开：

```bash
open website/index.html
```

线上地址：

[https://sahadev.github.io/ai-windows-bridge/](https://sahadev.github.io/ai-windows-bridge/)
