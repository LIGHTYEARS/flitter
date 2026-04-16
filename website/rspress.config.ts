import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: 'docs',
  title: 'Flitter',
  description: 'Flutter-for-Terminal AI Agent 框架',
  lang: 'zh',
  logo: '/logo.svg',
  themeConfig: {
    footer: {
      message: '© 2025 Flitter Project. MIT License.',
    },
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/user/flitter',
      },
    ],
    lastUpdated: true,
  },
  markdown: {
    defaultWrapCode: true,
  },
});
