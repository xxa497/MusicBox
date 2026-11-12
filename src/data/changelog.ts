// EXPORTS: IChangelogEntry, MOCK_CHANGELOGS
export interface IChangelogEntry {
  id: string
  version: string
  date: string
  items: {
    type: 'fix' | 'feat' | 'adjust'
    content: string
  }[]
}

export const MOCK_CHANGELOGS: IChangelogEntry[] = [
  {
    id: '1',
    version: 'v1.2.0',
    date: '2026-11-12',
    items: [
      {
        type: 'fix',
        content: '滑键模式下连续滑动经过多个按键时，音符条会被错误分成多列；现在只有真正同时按下才分列。'
      },
      {
        type: 'adjust',
        content: '同时发声的音按先左后右排列，先弹的在左、后弹的在右。'
      }
    ]
  },
  {
    id: '2',
    version: 'v1.1.0',
    date: '2026-11-12',
    items: [
      {
        type: 'feat',
        content: '新增更新日志。'
      },
      {
        type: 'fix',
        content: '同时按下两个音、松开其中一个时，两条音符条会挤在同一列、看起来像合并成一个音。'
      },
      {
        type: 'adjust',
        content: '滑键模式按键序号改为 1–7 再接高音 1，沿中间中立区绕一圈连续排列；键上数字就是实际发出的音。'
      }
    ]
  },
  {
    id: '3',
    version: 'v1.0.0',
    date: '',
    items: [
      {
        type: 'feat',
        content: '首个版本：九键演奏、反向瀑布流、音域与音量调节、正常／滑键双模式，音色为大钢琴。'
      }
    ]
  }
]