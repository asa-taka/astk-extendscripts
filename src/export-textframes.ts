/// <reference types="types-for-adobe/Illustrator/2015.3"/>

const SCRIPT_PROPS = {
  title: 'Export Text Contents',
}

const CONFIG = {
  defaultOutFileName: '~/Desktop/text-contents.json',
  indicatorWidth: 400,
}

// Array Utilities
// ---------------

const forEach = <T>(items: T[], fn: (item: T, index: number) => void) => {
  for (let i = 0; i < items.length; i++) fn(items[i], i)
}

const map = <T, R>(items: T[], fn: (item: T, index: number) => R) => {
  const res: R[] = []
  forEach(items, (item, i) => { res.push(fn(item, i)) })
  return res
}

const filter = <T>(items: T[], fn: (item: T, index: number) => boolean) => {
  const res: T[] = []
  forEach(items, (item, i) => { if (fn(item, i)) res.push(item) })
  return res
}

// Output Utilities
// ----------------

type JsonValue = Record<string, any> | Array<JsonValue> | string | number | boolean | undefined | null

const jsonStringify = (() => {
  const q = (s: string) => '"' + s + '"'
  const sp = (indent: number, lv: number) => (indent ? '\n' : '') + Array(lv * indent + 1).join(' ')
  const printObj = (lp: string, tokens: string[], rp: string, indent: number, lv: number) => {
    if (!tokens.length) return lp + rp
    return lp + sp(indent, lv + 1) + tokens.join(',' + sp(indent, lv + 1)) + sp(indent, lv) + rp
  }
  const stringify = (v: JsonValue, indent: number, lv: number, path: any[]): string => {
    if (!(v instanceof Object)) return typeof v === 'string' ? q(v) : '' + v
    for (let o of path) if (v === o) return q('[CIRCULAR]')
    const sv: string[] = []
    if (v instanceof Array) {
      for (let e of v) sv.push(stringify(e, indent, lv + 1, path.concat([v])))
      return printObj('[', sv, ']', indent, lv)
    }
    for (let k in v) sv.push(q(k) + ': ' + stringify(v[k], indent, lv + 1, path.concat([v])))
    return printObj('{', sv, '}', indent, lv)
  }
  return (v: JsonValue, indent?: number) => stringify(v, indent || 0, 0, [])
})()

const log = (...values: any[]) => {
  $.writeln(`${new Date().toTimeString()}: ${map(values, v => jsonStringify(v)).join(' ')}`)
}

type ExportDataAsOptions = {
  defaultFileName?: string
  promptMessage?: string
  filterExpression?: string
}

const exportDataAs = (output: string | string[], opts: ExportDataAsOptions = {}) => {
  const f = new File(opts.defaultFileName).saveDlg(
    opts.promptMessage,
    opts.filterExpression || 'All files:*.*'
  )
  if (f === null) {
    log(`Saving canceled`)
    return
  }
  
  log(`Export data as: ${f}`)
  f.encoding = 'UTF-8'
  f.lineFeed = 'Unix'
  f.open('w')
  f.write(output instanceof Array ? output.join('\n') : output)
  f.close()
}

/** Escape LF characters. */
const escapeLf = (s: string) => s.replace(/\r\n|\r|\n/g, '\\n')

// SupportedType
// -------------

/** Illustrator object class to be treated by this script. */
type SupportedItem = SymbolItem | TextFrame

const isSupportedItem = (item: any): item is SupportedItem => {
  return item instanceof SymbolItem || item instanceof TextFrame
}

const stringifyItem = (item: SupportedItem): string => {
  if (item instanceof SymbolItem) return item.symbol.name
  return item.contents
}

// TargetDefinition
// ----------------
// In this script, term "target" means what kind of
// Illustrator object class to be treated, and/or how treat them.

const targetKeys = ['allItems', 'firstItemPriorTextFrame'] as const
type TargetKey = typeof targetKeys[any]

type TargetDefinition = {
  label: string
  format: (items: SupportedItem[]) => string[]
}

const targetDefs: { [k in TargetKey]: TargetDefinition } = {
  allItems: {
    label: 'All items',
    format: items => map(items, stringifyItem)
  },
  firstItemPriorTextFrame: {
    label: 'First items (prior TextFrame than SymbolItem)',
    format: items => {
      if (items.length === 0) return []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item instanceof TextFrame) return [item.contents]
      }
      return [stringifyItem(items[items.length - 1])]
    }
  },
}

// OrderDefinition
// ---------------

const orderKeys = ['layer', 'positionX', 'positionY'] as const
type OrderKey = typeof orderKeys[any]

type OrderDefinition = {
  label: string,
  compare: (o1: SupportedItem, o2: SupportedItem) => -1 | 0 | 1,
}

const ascCompare = (a: number, b: number) => a === b ? 0 : a < b ? -1 : 1

const orderDefs: { [k in OrderKey]: OrderDefinition } = {
  layer: {
    label: 'Layer',
    compare: ({ zOrderPosition: z1 }, { zOrderPosition: z2 }) => ascCompare(z1, z2)
  },
  positionX: {
    label: 'Position(horizontal)',
    compare: ({ left: x1 }, { left: x2 }) => ascCompare(x1, x2)
  },
  positionY: {
    label: 'Position(vertical)',
    compare: ({ top: y1 }, { top: y2 }) => ascCompare(y1, y2)
  }
}

const sort = (order: OrderKey, items: SupportedItem[]): SupportedItem[] => {
  const comparator = orderDefs[order].compare
  const sortedItems = [...items]
  return sortedItems.sort(comparator)
}

// Radiobuttons
// ------------

type ButtonDef<T> = { key: T, title: string }

type RadioButtonsOptions<T> = {
  parent: Window
  title: string
  items: ButtonDef<T>[]
}

class RadioButtons<T extends string> {
  buttons: Partial<Record<T, RadioButton>> = {}
  buttonDefs: ButtonDef<T>[]

  constructor(opts: RadioButtonsOptions<T>) {
    const st = opts.parent.add('statictext', undefined, opts.title)
    st.preferredSize = [CONFIG.indicatorWidth, -1]

    const g = opts.parent.add('group', undefined)
    g.orientation = 'column'
    g.preferredSize = [CONFIG.indicatorWidth, -1]

    this.buttonDefs = opts.items
    forEach(opts.items, (item, i) => {
      const btn = g.add('radiobutton', undefined, item.title)
      btn.preferredSize = [CONFIG.indicatorWidth, -1]
      this.buttons[item.key] = btn
    });
    (this.buttons[opts.items[0].key] as RadioButton).value = true
  }

  getSelectedValue() {
    for (let e of this.buttonDefs) {
      if (this.buttons[e.key]?.value) return e.key
    }
    throw new Error('Unexpected Error')
  }
}

// Buttons
// -------

type ButtonsOptions = {
  parent: Window | Group
  items: { label: string, onClick: () => void }[]
}

class Buttons {
  constructor(opts: ButtonsOptions) {
    const g = opts.parent.add('group', undefined)
    g.orientation = 'row'

    forEach(opts.items, item => {
      const btn = g.add('button', undefined, item.label)
      btn.addEventListener('click', item.onClick)
    });
  }
}

// OptionDialog
// ------------

type OptionDialogOptions = {
  title?: string
}

// Polyfill type for Types-for-Adobe, used by `for ... in` statements.
type Extract<T1, T2> = T1

type UserOptions = {
  target: TargetKey
  order: OrderKey
}

const optionDialog = (opts: OptionDialogOptions = {}): UserOptions | undefined => {
  const w = new Window('dialog', opts.title, undefined, { closeButton: true })
  const targetBtns = new RadioButtons({
    parent: w,
    title: 'Export Targets',
    items: map(targetKeys, k => ({ key: k, title: targetDefs[k].label })),
  })
  const orderBtns = new RadioButtons({
    parent: w,
    title: 'Order',
    items: map(orderKeys, k => ({ key: k, title: orderDefs[k].label })),
  })

  let result: UserOptions | undefined = undefined
  new Buttons({
    parent: w,
    items: [
      { label: 'Cancle', onClick: () => { w.close() } },
      {
        label: 'Extract contents',
        onClick: () => {
          result = {
            target: targetBtns.getSelectedValue(),
            order: orderBtns.getSelectedValue(),
          }
          w.close()
        },
      },
    ]
  })

  w.center()
  w.show() // w.show() blocks until w.close() called.
  return result
}

// ProgressPalette
// ---------------

type ProgressPaletteOptions = {
  title?: string
}

class ProgressPalette {
  private w: Window
  private t: StaticText
  private p: Progressbar

  constructor(opts: ProgressPaletteOptions = {}) {
    const w = this.w = new Window('palette', opts.title, undefined, { closeButton: true })
    const t = this.t = w.add('statictext')
    t.preferredSize = [CONFIG.indicatorWidth, -1]
  
    const p = this.p = w.add('progressbar', undefined, 0, 1)
    p.value = 0
    p.preferredSize = [CONFIG.indicatorWidth, -1]
  
    w.show()
  }

  set(progress: number, message: string) {
    this.p.value = progress
    this.t.text = message;
  }

  close() {
    this.w.close()
  }
}

// Main Procedure
// --------------

const main = () => {
  log('Start script')

  const userOpts = optionDialog({ title: SCRIPT_PROPS.title })
  if (!userOpts) return
  log('UserOptions:', userOpts)

  const pp = new ProgressPalette({ title: SCRIPT_PROPS.title })
  const doc = app.activeDocument

  const res: Record<string, string[]> = {}
  for (let i = 0; i < doc.artboards.length; i++) {
    doc.selection = null
    doc.artboards.setActiveArtboardIndex(i)
    doc.selectObjectsOnActiveArtboard()

    const targets: SupportedItem[] = filter(doc.selection, isSupportedItem)
    const sortedTargets = sort(userOpts.order, targets)
    const strItems = map(targetDefs[userOpts.target].format(sortedTargets), escapeLf)
    res[doc.artboards[i].name] = strItems
    log('Artboards', i, strItems)
    pp.set(i / doc.artboards.length, `Artboard${i}: ${strItems.join(', ').slice(0, 100)}`)
  }
  pp.close()

  exportDataAs(jsonStringify(res, 2), {
    defaultFileName: CONFIG.defaultOutFileName,
    promptMessage: 'Export TextFrames As'
  })
}

try {
  main()
} catch (e) {
  alert(e as string)
  $.writeln(e)
}
