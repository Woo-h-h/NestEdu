import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  HeadingLevel,
} from 'docx'
import type { WeeklyPlan } from '@/types/weeklyPlan'

export async function exportToDoc(plan: WeeklyPlan): Promise<void> {
  const border = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '000000',
  }

  const cellBorders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
  }

  function makeCell(
    text: string,
    options: {
      bold?: boolean
      alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]
      fontSize?: number
      colSpan?: number
      shading?: string
    } = {}
  ): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: text || '',
              bold: options.bold ?? false,
              size: (options.fontSize ?? 20) * 2,
              font: 'Microsoft YaHei',
            }),
          ],
          alignment: options.alignment ?? AlignmentType.LEFT,
          spacing: { before: 40, after: 40 },
        }),
      ],
      width: { size: 2000, type: WidthType.DXA },
      borders: cellBorders,
      columnSpan: options.colSpan,
      shading: options.shading
        ? { fill: options.shading, type: 'solid' }
        : undefined,
      verticalAlign: 'center',
    })
  }

  const rows: TableRow[] = []

  rows.push(
    new TableRow({
      children: [
        makeCell('周工作\n重点', { bold: true, alignment: AlignmentType.CENTER, shading: 'F5F7FA' }),
        makeCell(plan.weeklyFocus, { colSpan: 4 }),
        makeCell('', { colSpan: 0 }),
        makeCell('', { colSpan: 0 }),
        makeCell('', { colSpan: 0 }),
      ],
    })
  )

  rows.push(
    new TableRow({
      children: [
        makeCell('时间', { bold: true, alignment: AlignmentType.CENTER, shading: 'F5F7FA' }),
        makeCell('集体学习', { bold: true, alignment: AlignmentType.CENTER, shading: 'F5F7FA' }),
        makeCell('区域游戏', { bold: true, alignment: AlignmentType.CENTER, shading: 'F5F7FA' }),
        makeCell('日常生活', { bold: true, alignment: AlignmentType.CENTER, shading: 'F5F7FA' }),
        makeCell('户外运动', { bold: true, alignment: AlignmentType.CENTER, shading: 'F5F7FA' }),
      ],
    })
  )

  plan.dailyPlans.forEach((dp) => {
    rows.push(
      new TableRow({
        children: [
          makeCell(dp.day, { bold: true, alignment: AlignmentType.CENTER }),
          makeCell(dp.collectiveLearning),
          makeCell(dp.regionalGames),
          makeCell(dp.dailyLife),
          makeCell(dp.outdoorSports),
        ],
      })
    )
  })

  rows.push(
    new TableRow({
      children: [
        makeCell('实施\n建议', { bold: true, alignment: AlignmentType.CENTER, shading: 'F5F7FA' }),
        makeCell(plan.suggestions, { colSpan: 4 }),
        makeCell('', { colSpan: 0 }),
        makeCell('', { colSpan: 0 }),
        makeCell('', { colSpan: 0 }),
      ],
    })
  )

  const table = new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Microsoft YaHei',
            size: 20 * 2,
          },
        },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            text: '快乐一周',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `主题名称：${plan.themeName}          `,
                size: 24 * 2,
                font: 'Microsoft YaHei',
              }),
              new TextRun({
                text: `班级：${plan.className}       `,
                size: 24 * 2,
                font: 'Microsoft YaHei',
              }),
              new TextRun({
                text: `第${plan.weekNumber}周`,
                size: 24 * 2,
                font: 'Microsoft YaHei',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          table,
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `周计划_${plan.themeName}_${plan.className}_第${plan.weekNumber}周.docx`
  a.click()
  URL.revokeObjectURL(url)
}
