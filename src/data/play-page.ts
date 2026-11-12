// EXPORTS: IChangelogEntry, MOCK_CHANGELOGS
export interface IChangelogEntry {
  id: string
  version: string
  date: string
  items: {
    type: 'fix' | 'feature' | 'adjust'
    text: string
  }[]
}

export const MOCK_CHANGELOGS: IChangelogEntry[] = [
  {
    id: '1',
    version: 'v1.2.0',
    date: '2026-11-12',
    items: [
      { type: 'fix', text: '修复滑键模式下连续滑动经多键时音符条被错误分列的问题' },
      { type: 'adjust', text: '同时发声的音按先左后右排列，先弹在左、后弹在右' },
    ],
  },
  {
    id: '2',
    version: 'v1.1.0',
    date: '2026-11-12',
    items: [
      { type: 'feature', text: '新增更新日志页面' },
      { type: 'fix', text: '修复同时按下两音、松开一个时两音符条挤在同一列的问题' },
      { type: 'adjust', text: '滑键模式按键序号改为沿中立区绕一圈连续排列' },
    ],
  },
  {
    id: '3',
    version: 'v1.0.0',
    date: '2026-11-01',
    items: [
      { type: 'feature', text: '首个版本：九键演奏、反向瀑布流、音域音量调节' },
      { type: 'feature', text: '正常/滑键双模式，音色为大钢琴' },
    ],
  },
]