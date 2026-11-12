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
    id: '1',
    version: 'v1.0.0',
    date: '',
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
