// EXPORTS: IChangelogEntry, MOCK_CHANGELOGS
export interface IChangelogEntry {
  id: string
  version: string
  date: string
  items: {
    type: 'fix' | 'new' | 'adjust'
    text: string
  }[]
}

export const MOCK_CHANGELOGS: IChangelogEntry[] = [
  {
    id: '3',
    version: 'v1.1.1',
    date: '2026-11-12',
    items: [
      {
        type: 'fix',
        text: '滑键模式无法连续滑动的问题：手指从两个按键之间的缝隙滑过时，触点被误判成已经离开并丢失跟踪，后面整段滑动都不再响应；现在缝隙只停止发声，触点仍保持跟踪，滑回按键立刻恢复演奏。',
      },
      {
        type: 'adjust',
        text: '手指落在按键缝隙上时，就近吸附到最近的按键，滑动过渡更连贯，不再出现滑到一半声音断掉、怎么滑都没反应的情况。',
      },
      {
        type: 'adjust',
        text: '滑到中间中立区仍然只停音不发声，行为保持不变。',
      },
    ],
  },
  {
    id: '2',
    version: 'v1.0.1',
    date: '2026-11-12',
    items: [
      {
        type: 'fix',
        text: 'Android 安装版打开后停在「网页无法打开」，进不去界面的问题。Android 9 起系统默认禁止应用访问明文 HTTP 地址，应用改为只对本机回环地址放行。',
      },
      {
        type: 'adjust',
        text: '安装包版本号同步为 1.0.1。',
      },
    ],
  },
  {
    id: '1',
    version: 'v1.0.0',
    date: '2026-11-12',
    items: [
      {
        type: 'fix',
        text: '正常模式同时按下多个按键后，松开个别按键声音卡住不停、越按累计越多的问题；每个手指松开都能正确停止对应音。',
      },
      {
        type: 'fix',
        text: '滑键模式连续滑动时前一个音未停止、和后一个音一起响的问题；滑到新键即替换前一个音，经过中立区静音。',
      },
      {
        type: 'fix',
        text: '音域中文记法下标换算错误。',
      },
      {
        type: 'adjust',
        text: '配色改为深色暖调，按键为象牙白、按下琥珀高亮。',
      },
      {
        type: 'new',
        text: '九键演奏、反向瀑布流、音域与音量调节、正常／滑键双模式，音色为大钢琴。',
      },
    ],
  },
]
