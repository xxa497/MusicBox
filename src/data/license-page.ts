// EXPORTS: ILicenseSection, LICENSE_SECTIONS, LICENSE_META
export interface ILicenseSection {
  id: string
  title: string
  paragraphs: string[]
}

export const LICENSE_META = {
  name: 'Mozilla Public License 2.0',
  short: 'MPL-2.0',
  type: '弱 Copyleft（文件级）',
  repo: 'https://github.com/xxa497/MusicBox',
  licenseFile: 'https://github.com/xxa497/MusicBox/blob/main/LICENSE',
}

export const LICENSE_SECTIONS: ILicenseSection[] = [
  {
    id: '1',
    title: '本应用使用的协议',
    paragraphs: [
      'Music Box 以 Mozilla Public License 2.0（简称 MPL-2.0）发布。MPL-2.0 属于弱 Copyleft 协议，传染范围按「文件」计算，而不是按整个项目计算。',
      '完整协议原文见项目仓库根目录的 LICENSE 文件，以下为便于理解的要点说明；如与协议原文冲突，以协议原文为准。',
    ],
  },
  {
    id: '2',
    title: '你可以做什么',
    paragraphs: [
      '自由使用、复制、修改本项目，包括用于商业用途。',
      '把本项目与其他代码组合成更大的作品再分发，只要满足 MPL-2.0 对本项目代码部分的要求。',
      '以源码或编译后的形式分发本项目。',
    ],
  },
  {
    id: '3',
    title: '分发时需要遵守什么',
    paragraphs: [
      '修改了本项目原有的源文件，被修改过的那几个文件需要继续以 MPL-2.0 公开源码。',
      '随分发内容附上本协议副本，并说明源码受 MPL-2.0 约束。',
      '不得移除或修改原有的版权、专利、商标与署名声明。',
      '以编译形式分发时，需要同时提供对应源码，或在分发物与文档中显著说明获取源码的方式。',
    ],
  },
  {
    id: '4',
    title: '新增的独立文件',
    paragraphs: [
      '你自己新增的、独立于本项目原有文件的代码，可以采用其他许可证，包括闭源商业许可，不会被本项目的 MPL-2.0 连带。',
      '这也是本项目选择 MPL-2.0 而不是 GPL 的原因：改动要回馈，但不强制整个衍生项目全部开源。',
    ],
  },
  {
    id: '5',
    title: '专利条款',
    paragraphs: [
      '每个贡献者都授予使用者一项非独占、全球范围、免许可费的专利授权，覆盖其贡献必然涉及到的专利权利要求。',
      '如果使用者针对本项目发起专利侵权诉讼，其依据本协议获得的专利授权与版权授权将自诉讼提起之日起终止。',
    ],
  },
  {
    id: '6',
    title: '免责声明',
    paragraphs: [
      '本协议不提供任何明示或暗示的担保，包括适销性、特定用途适用性与不侵权的担保。',
      '软件按「现状」提供，使用本项目的质量与性能风险由使用者自行承担。在法律允许的范围内，贡献者不对使用或无法使用本项目造成的任何直接、间接、附带或后果性损失承担责任。',
    ],
  },
  {
    id: '7',
    title: '终止与恢复',
    paragraphs: [
      '未遵守协议条款时，本协议授予的权利自动终止。',
      '在得知不合规后的 30 天内恢复合规，权利可以恢复；再次违反则永久终止。',
      '已经授予的下级许可不因本协议终止而失效。',
    ],
  },
]
