const messages = {
  en: {
    'nav.how': 'How it works',
    'nav.security': 'Security',
    'nav.start': 'Quick start',
    'hero.eyebrow': 'Mac control plane. Windows operation layer.',
    'hero.title': 'Operate Windows from your Mac-side AI.',
    'hero.lede':
      'WinBridge AI gives agents on your Mac a real execution surface on Windows: commands, scripts, files, processes, screenshots, logs, installers, diagnostics, and any workflow the connected Windows session can automate.',
    'hero.setupLink': 'Read setup',
    'console.agentLabel': 'paired agent',
    'console.lastSeenLabel': 'last seen',
    'console.lastSeenValue': '2s ago',
    'console.jobsLabel': 'queued jobs',
    'quick.eyebrow': 'Quick start',
    'quick.title': 'The actual pairing flow is browser first, command second.',
    'quick.step1Title': 'Start WinBridge AI on Mac',
    'quick.step1Body':
      'Run the local server on your Mac. The terminal prints the Mac console URL and LAN URLs that Windows can open.',
    'quick.step2Title': 'Open the Mac URL on Windows',
    'quick.step2Body':
      'Use a Windows browser to open the printed URL. In LAN Agent, copy the generated command and run it in PowerShell.',
    'quick.agentStatus': 'Ready to connect this Windows session',
    'quick.copyCommand': 'Copy Agent Command',
    'quick.step3Title': 'Operate Windows from Mac',
    'quick.step3Body':
      'Keep the Windows PowerShell agent open. Back on Mac, use /console to see agents, messages, screenshots, jobs, logs, and command output.',
    'quick.note':
      'Token entry is intentionally off by default for trusted LAN pairing. Enable token mode only when you need a stricter local session.',
    'how.eyebrow': 'How it works',
    'how.title': 'One bridge, two machines, a full Windows operation surface.',
    'how.step1Title': 'Start on Mac',
    'how.step1Body': 'Run the local server. It prints LAN pairing URLs and keeps all runtime state on your Mac.',
    'how.step2Title': 'Pair Windows',
    'how.step2Body': 'Open the URL on Windows and run the generated PowerShell agent command. The agent polls the Mac.',
    'how.step3Title': 'Let AI operate',
    'how.step3Body':
      'Use the web console, CLI, and future MCP tools to operate Windows through commands, files, processes, logs, screenshots, and task templates.',
    'capabilities.title': 'Not just builds. Operate the machine.',
    'capabilities.body':
      'Builds and installers are just examples. The product direction is a general Windows control surface for whatever the connected user permissions and automation tools allow.',
    'capabilities.item1': 'Run commands and scripts',
    'capabilities.item2': 'Inspect files, env, logs, and processes',
    'capabilities.item3': 'Capture screenshots for visual feedback',
    'capabilities.item4': 'Move files and operate artifacts',
    'capabilities.item5': 'Launch apps, installers, tests, and tools',
    'capabilities.item6': 'Expose the surface to AI agents',
    'security.eyebrow': 'Security model',
    'security.title': 'Local-first by default, token mode when you need it.',
    'security.body':
      'WinBridge AI is designed for trusted local networks first. The default pairing flow avoids manual token entry on Windows, while optional token mode can protect the console, API, and agent callbacks when you need a stricter LAN session.',
    'footer.security': 'Security notes',
    'footer.protocol': 'Protocol',
    metaDescription: 'Operate Windows from your Mac-side AI with a local-first bridge.',
    docHref: 'https://github.com/sahadev/ai-windows-bridge/blob/main/README.md',
  },
  zh: {
    'nav.how': '工作方式',
    'nav.security': '安全模型',
    'nav.start': '快速开始',
    'hero.eyebrow': 'Mac 控制面。Windows 操作层。',
    'hero.title': '用 Mac 侧 AI 操作 Windows。',
    'hero.lede':
      'WinBridge AI 让 Mac 上的 Agent 获得一个真实可用的 Windows 执行面：命令、脚本、文件、进程、截图、日志、安装器、诊断工具，以及连接后的 Windows 会话能够自动化的任何工作流。',
    'hero.setupLink': '查看中文文档',
    'console.agentLabel': '已连接 Agent',
    'console.lastSeenLabel': '最近在线',
    'console.lastSeenValue': '2 秒前',
    'console.jobsLabel': '队列任务',
    'quick.eyebrow': '快速开始',
    'quick.title': '实际配对流程是先用浏览器打开页面，再复制命令运行 Agent。',
    'quick.step1Title': '在 Mac 上启动 WinBridge AI',
    'quick.step1Body': '在 Mac 上启动本地服务。终端会打印 Mac 控制台 URL，以及 Windows 可以打开的局域网 URL。',
    'quick.step2Title': '在 Windows 打开 Mac URL',
    'quick.step2Body': '用 Windows 浏览器打开终端打印的 URL。在 LAN Agent 区域复制生成的命令，并粘贴到 PowerShell 运行。',
    'quick.agentStatus': '准备连接当前 Windows 会话',
    'quick.copyCommand': '复制 Agent 命令',
    'quick.step3Title': '回到 Mac 操作 Windows',
    'quick.step3Body': '保持 Windows PowerShell Agent 窗口打开。回到 Mac 后，用 /console 查看 Agent、消息、截图、Jobs、日志和命令输出。',
    'quick.note': '为了让可信局域网配对更顺手，token 默认关闭。只有需要更严格的本地会话时再开启 token 模式。',
    'how.eyebrow': '工作方式',
    'how.title': '一个桥接工具，两台机器，一个完整的 Windows 操作面。',
    'how.step1Title': '在 Mac 启动',
    'how.step1Body': '启动本地 server。它会打印局域网配对 URL，并把运行时数据留在 Mac 上。',
    'how.step2Title': '配对 Windows',
    'how.step2Body': '在 Windows 浏览器打开这个 URL，复制页面生成的 PowerShell Agent 命令并运行。',
    'how.step3Title': '让 AI 操作',
    'how.step3Body': '通过 Web 控制台、CLI 和未来的 MCP 工具，用命令、文件、进程、日志、截图和任务模板来操作 Windows。',
    'capabilities.title': '不只是构建。它是在操作整台机器。',
    'capabilities.body': '构建和安装只是示例。产品方向是通用的 Windows 控制面，能力边界取决于连接用户的权限和 Windows 上可用的自动化工具。',
    'capabilities.item1': '执行命令和脚本',
    'capabilities.item2': '检查文件、环境、日志和进程',
    'capabilities.item3': '捕获截图形成视觉反馈',
    'capabilities.item4': '移动文件并操作 artifacts',
    'capabilities.item5': '启动应用、安装器、测试和工具',
    'capabilities.item6': '把操作面暴露给 AI Agent',
    'security.eyebrow': '安全模型',
    'security.title': '默认本地优先，需要时再开启 token 模式。',
    'security.body':
      'WinBridge AI 优先面向可信局域网。默认配对流程不要求 Windows 端手动输入 token；如果需要更严格的局域网会话，可以开启 token 模式来保护控制台、API 和 Agent 回调。',
    'footer.security': '安全说明',
    'footer.protocol': '协议',
    metaDescription: '通过本地优先的桥接工具，用 Mac 侧 AI 操作 Windows。',
    docHref: 'https://github.com/sahadev/ai-windows-bridge/blob/main/README_CN.md',
  },
}

const supportedLanguages = ['en', 'zh']

function isSupportedLanguage(language) {
  return supportedLanguages.includes(language)
}

function normalizeLanguage(value) {
  const language = String(value || '').toLowerCase()
  if (language.startsWith('zh')) return 'zh'
  if (language.startsWith('en')) return 'en'
  return ''
}

function languageFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return normalizeLanguage(params.get('lang'))
}

function languageFromStorage() {
  try {
    return normalizeLanguage(window.localStorage.getItem('winbridge-site-language'))
  } catch {
    return ''
  }
}

function languageFromNavigator() {
  return normalizeLanguage(window.navigator.language)
}

function resolveInitialLanguage() {
  const candidates = [languageFromUrl(), languageFromStorage(), languageFromNavigator(), 'en']
  return candidates.find(isSupportedLanguage) || 'en'
}

function persistLanguage(language) {
  try {
    window.localStorage.setItem('winbridge-site-language', language)
  } catch {
    // Ignore storage failures; language switching still works for this page load.
  }
}

function applyLanguage(language) {
  const dictionary = messages[language] || messages.en
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n')
    if (key && dictionary[key]) element.textContent = dictionary[key]
  })
  document.querySelector('meta[name="description"]')?.setAttribute('content', dictionary.metaDescription)
  document.querySelectorAll('[data-doc-link]').forEach((element) => {
    element.setAttribute('href', dictionary.docHref)
  })
  document.querySelectorAll('[data-lang-option]').forEach((button) => {
    const active = button.getAttribute('data-lang-option') === language
    button.setAttribute('aria-pressed', String(active))
  })
}

function setLanguage(language) {
  if (!isSupportedLanguage(language)) return
  persistLanguage(language)
  applyLanguage(language)
}

document.querySelectorAll('[data-lang-option]').forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.getAttribute('data-lang-option')))
})

applyLanguage(resolveInitialLanguage())
