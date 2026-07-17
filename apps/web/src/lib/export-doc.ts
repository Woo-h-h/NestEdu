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
  VerticalAlign,
} from 'docx'
import type { WeeklyPlan } from '@/types/weeklyPlan'
import { weeklyPlanFileName } from '@/lib/weeklyPlanText'

/** 按华科附幼样表导出：快乐一周 + 自主学习/游戏/生活/运动，文件名如「小四班第7周计划.docx」 */
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
      width?: number
    } = {}
  ): TableCell {
    const lines = (text || '').split('\n')
    return new TableCell({
      children: lines.map(
        (line) =>
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: options.bold ?? false,
                size: (options.fontSize ?? 18) * 2,
                font: 'Microsoft YaHei',
              }),
            ],
            alignment: options.alignment ?? AlignmentType.LEFT,
            spacing: { before: 20, after: 20 },
          })
      ),
      width: { size: options.width ?? 1800, type: WidthType.DXA },
      borders: cellBorders,
      columnSpan: options.colSpan,
      shading: options.shading
        ? { fill: options.shading, type: 'clear' as const }
        : undefined,
      verticalAlign: VerticalAlign.CENTER,
    })
  }

  const rows: TableRow[] = []

  rows.push(
    new TableRow({
      children: [
        makeCell('周工作\n重点', {
          bold: true,
          alignment: AlignmentType.CENTER,
          shading: 'F5F7FA',
          width: 900,
        }),
        makeCell(plan.weeklyFocus, { colSpan: 4, width: 7200 }),
      ],
    })
  )

  rows.push(
    new TableRow({
      children: [
        makeCell('日期', { bold: true, alignment: AlignmentType.CENTER, shading: 'F5F7FA', width: 900 }),
        makeCell('自主学习', {
          bold: true,
          alignment: AlignmentType.CENTER,
          shading: 'F5F7FA',
        }),
        makeCell('自主游戏', {
          bold: true,
          alignment: AlignmentType.CENTER,
          shading: 'F5F7FA',
        }),
        makeCell('自主生活', {
          bold: true,
          alignment: AlignmentType.CENTER,
          shading: 'F5F7FA',
        }),
        makeCell('自主运动', {
          bold: true,
          alignment: AlignmentType.CENTER,
          shading: 'F5F7FA',
        }),
      ],
    })
  )

  for (const dp of plan.dailyPlans) {
    rows.push(
      new TableRow({
        children: [
          makeCell(dp.day, { bold: true, alignment: AlignmentType.CENTER, width: 900 }),
          makeCell(dp.collectiveLearning),
          makeCell(dp.regionalGames),
          makeCell(dp.dailyLife),
          makeCell(dp.outdoorSports),
        ],
      })
    )
  }

  rows.push(
    new TableRow({
      children: [
        makeCell('实施\n建议', {
          bold: true,
          alignment: AlignmentType.CENTER,
          shading: 'F5F7FA',
          width: 900,
        }),
        makeCell(plan.suggestions, { colSpan: 4, width: 7200 }),
      ],
    })
  )

  const table = new Table({
    rows,
    width: { size: 8100, type: WidthType.DXA },
    columnWidths: [900, 1800, 1800, 1800, 1800],
  })

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Microsoft YaHei',
            size: 18 * 2,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: 'landscape',
              width: 16838,
              height: 11906,
            },
          },
        },
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
                text: `主题名称：${plan.themeName}`,
                size: 22 * 2,
                font: 'Microsoft YaHei',
              }),
              new TextRun({
                text: '          ',
                size: 22 * 2,
              }),
              new TextRun({
                text: `班级：${plan.className}`,
                size: 22 * 2,
                font: 'Microsoft YaHei',
              }),
              new TextRun({
                text: '       ',
                size: 22 * 2,
              }),
              new TextRun({
                text: `第${plan.weekNumber}周`,
                size: 22 * 2,
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
  a.download = weeklyPlanFileName(plan)
  a.click()
  URL.revokeObjectURL(url)
}
