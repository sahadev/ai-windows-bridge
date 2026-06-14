const messages = {
  en: {
    'nav.how': 'How it works',
    'nav.security': 'Security',
    'nav.start': 'Quick start',
    'hero.eyebrow': 'Mac control plane. Windows execution surface.',
    'hero.title': 'Control Windows from your Mac-side AI.',
    'hero.lede':
      'WinBridge AI connects a Windows PC to your Mac so agents can run commands, capture screenshots, install artifacts, inspect logs, and drive verification without installing an AI environment on Windows.',
    'hero.setupLink': 'Read setup',
    'console.agentLabel': 'paired agent',
    'console.lastSeenLabel': 'last seen',
    'console.lastSeenValue': '2s ago',
    'console.jobsLabel': 'queued jobs',
    'how.eyebrow': 'How it works',
    'how.title': 'One bridge, two machines, no Windows-side AI setup.',
    'how.step1Title': 'Start on Mac',
    'how.step1Body': 'Run the local server. It prints LAN pairing URLs and keeps all runtime state on your Mac.',
    'how.step2Title': 'Pair Windows',
    'how.step2Body': 'Open the URL on Windows and run the generated PowerShell agent command. The agent polls the Mac.',
    'how.step3Title': 'Let AI operate',
    'how.step3Body':
      'Use the web console, CLI, and future MCP tools to run jobs, collect logs, inspect screenshots, and install builds.',
    'capabilities.title': 'Built for real Windows work.',
    'capabilities.body':
      'The first release focuses on the operations AI agents need when macOS is the thinking environment and Windows is the execution target.',
    'capabilities.item1': 'PowerShell command queueing',
    'capabilities.item2': 'Progress logs and exit codes',
    'capabilities.item3': 'Screenshot capture',
    'capabilities.item4': 'Artifact serving and installer execution',
    'capabilities.item5': 'Optional OpenSSH bootstrap',
    'capabilities.item6': 'CLI-first automation surface',
    'security.eyebrow': 'Security model',
    'security.title': 'Local-first by default, token mode when you need it.',
    'security.body':
      'WinBridge AI is designed for trusted local networks first. The default pairing flow avoids manual token entry on Windows, while optional token mode can protect the console, API, and agent callbacks when you need a stricter LAN session.',
    'footer.security': 'Security notes',
    'footer.protocol': 'Protocol',
    metaDescription: 'Control Windows from your Mac-side AI with a local-first bridge.',
    docHref: 'https://github.com/sahadev/ai-windows-bridge/blob/main/README.md',
  },
  zh: {
    'nav.how': '工作方式',
    'nav.security': '安全模型',
    'nav.start': '快速开始',
    'hero.eyebrow': 'Mac 控制面。Windows 执行端。',
    'hero.title': '用 Mac 侧 AI 操作 Windows。',
    'hero.lede':
      'WinBridge AI 把 Windows 电脑连接到 Mac，让 Agent 可以执行命令、捕获截图、安装构建产物、查看日志并完成验证，而不需要在 Windows 上安装 AI 环境。',
    'hero.setupLink': '查看中文文档',
    'console.agentLabel': '已连接 Agent',
    'console.lastSeenLabel': '最近在线',
    'console.lastSeenValue': '2 秒前',
    'console.jobsLabel': '队列任务',
    'how.eyebrow': '工作方式',
    'how.title': '一个桥接工具，两台机器，Windows 端不需要 AI 环境。',
    'how.step1Title': '在 Mac 启动',
    'how.step1Body': '启动本地 server。它会打印局域网配对 URL，并把运行时数据留在 Mac 上。',
    'how.step2Title': '配对 Windows',
    'how.step2Body': '在 Windows 浏览器打开这个 URL，复制页面生成的 PowerShell Agent 命令并运行。',
    'how.step3Title': '让 AI 操作',
    'how.step3Body': '通过 Web 控制台、CLI 和未来的 MCP 工具运行任务、收集日志、查看截图并安装构建产物。',
    'capabilities.title': '为真实 Windows 工作流而生。',
    'capabilities.body': '首个版本聚焦 AI Agent 在 macOS 负责思考、Windows 负责执行时真正需要的操作能力。',
    'capabilities.item1': 'PowerShell 命令队列',
    'capabilities.item2': '进度日志和退出码',
    'capabilities.item3': '截图捕获',
    'capabilities.item4': 'Artifact 分发与安装',
    'capabilities.item5': '可选 OpenSSH 初始化',
    'capabilities.item6': 'CLI 优先的自动化接口',
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
