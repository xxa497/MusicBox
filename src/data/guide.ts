// EXPORTS: IGuideSection, MOCK_GUIDE_SECTIONS
export interface IGuideSection {
  id: string
  title: string
  content: string
}

export const MOCK_GUIDE_SECTIONS: IGuideSection[] = [
  {
    id: '1',
    title: '顶部按钮',
    content: '左侧菜单按钮打开抽屉，右侧信息按钮查看更新日志。',
  },
  {
    id: '2',
    title: '乐谱区',
    content: '按下按键时音符条从底部向上生长，长度对应按住时长；同时按下的音从左到右分列显示。',
  },
  {
    id: '3',
    title: '音域与音量',
    content: '使用 ↑↓ 按钮切换八度，旋转音量旋钮调节音量大小，设置自动保存。',
  },
  {
    id: '4',
    title: '左侧工具栏',
    content: '八度切换、模式切换、清空瀑布流，所有操作即时生效。',
  },
  {
    id: '5',
    title: '正常模式',
    content: '九键按 123 / 456 / 7 高音1 高音2 排列，对应 C4 到 D5 九个音。',
  },
  {
    id: '6',
    title: '滑键模式',
    content: '中间为中立静音区，8 个音环绕排列，手指滑动可连续演奏经过的音。',
  },
]