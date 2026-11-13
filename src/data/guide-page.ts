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
    content: '左侧菜单按钮打开抽屉（使用说明、更新日志），右侧信息按钮打开开源协议页面。'
  },
  {
    id: '2',
    title: '乐谱区',
    content: '反向瀑布流显示演奏音符，按住时音符条向上生长，松开后继续上移消失。每个按键固定占一条音轨，轨道底部标着对应的音（按音高排列，正常模式 9 条、滑键模式 8 条）。'
  },
  {
    id: '3',
    title: '音域与音量',
    content: '音域框按乐理记法显示当前模式实际可达的音高范围：正常模式为 c¹ – d²（C4 – D5），滑键模式最高只到高音 1，为 c¹ – c²（C4 – C5）；其中 c¹ 即中央 C。下一行为国际记法。音量框显示百分比，圆形旋钮可沿圆周拖动、或用滚轮、方向键调节。演奏中音域与模式仍可切换，清空按钮会暂时置灰。'
  },
  {
    id: '4',
    title: '左侧工具栏',
    content: '上下箭头切换八度，切换按钮在正常与滑键模式间切换，清空按钮清除音符记录。'
  },
  {
    id: '5',
    title: '正常模式',
    content: '3×3 按键按 123 / 456 / 7 高音1 高音2 排列，点击即发声，长按延长音。'
  },
  {
    id: '6',
    title: '滑键模式',
    content: '中间为中立区不发声，周围 8 键环绕排列，手指滑动连续经过不同按键连续发音。'
  }
]