/// <reference types="types-for-adobe/Illustrator/2015.3"/>

const SCRIPT_PROPS = {
  title: 'Export TextFrames',
}

const CONFIG = {
  defaultOutFileName: '~/Desktop/textframes.txt',
}

const map = <T, R>(items: T[], fn: (item: T, index: number) => R) => {
  const res: R[] = []
  for (let i = 0; i < items.length; i++) res[i] = fn(items[i], i)
  return res
}

const filter = <T>(items: T[], fn: (item: T, index: number) => boolean) => {
  const res: T[] = []
  for (let i = 0; i < items.length; i++) {
    if (fn(items[i], i)) res.push(items[i])
  }
  return res
}

type Stringer = string | {
  toString(): string
}

const log = (input: Stringer) => {
  $.writeln(`${new Date().toTimeString()}: ${input}`)
}

type ProgressWindowOptions = {
  title?: string
}

class ProgressWindow {
  w: Window
  t: StaticText
  p: Progressbar

  constructor(opts: ProgressWindowOptions = {}) {
    const w = this.w = new Window('palette', opts.title)
    const t = this.t = w.add('statictext')
    t.preferredSize = [450, -1]
  
    const p = this.p = w.add('progressbar', undefined, 0, 100)
    p.value = 0
    p.preferredSize = [450, -1]
  
    w.show()
  }

  set(progressRatio: number, message: string) {
    this.p.value = progressRatio * 100
    this.t.text = message;
    (this.w as any).update()
  }

  close() {
    this.w.close()
  }
}

type ExportDataAsOptions = {
  defaultFileName?: string
  promptMessage?: string
  filterExpression?: string
}

const exportDataAs = (output: string, opts: ExportDataAsOptions = {}) => {
  const f = new File(opts.defaultFileName).saveDlg(
    opts.promptMessage,
    opts.filterExpression || 'All files:*.*'
  )
  f.encoding = 'UTF-8'
  f.lineFeed = 'Unix'
  
  log(`Export data as: ${f}`)
  f.open('w')
  f.write(output)
  f.close()
}

try {
  log('Start script')
  const pw = new ProgressWindow({ title: 'copy-textbox' })
  const doc = app.activeDocument

  let allTexts: string[] = []
  for (let i = 0; i < doc.artboards.length; i++) {
    doc.selection = null
    doc.artboards.setActiveArtboardIndex(i)
    doc.selectObjectsOnActiveArtboard()

    const textFrames = filter(doc.selection, (item: any) => {
      return item instanceof TextFrame
    }) as TextFrame[]

    const texts = map(textFrames, (tf: TextFrame) => {
      log(`Artboard${i}: ${tf.contents}`)
      return tf.contents
    })

    pw.set(i / doc.artboards.length, `Artboard${i}: ${texts.join(', ').slice(0, 100)}`)
    allTexts = allTexts.concat(texts)
  }
  log(`Detect ${allTexts.length} textFrames total`)

  const output = map(allTexts, (text: string) => text.replace(/\r\n|\r|\n/g, '\\n')).join('\n')
  exportDataAs(output, {
    defaultFileName: CONFIG.defaultOutFileName,
    promptMessage: 'Export TextFrames As'
  })
  pw.close()
} catch (e) {
  alert(e as string)
  $.writeln(e)
}
