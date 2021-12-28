var SCRIPT_PROPS = {
  title: 'Export TextFrames',
}

var CONFIG = {
  defaultOutFileName: '~/Desktop/textframes.txt',
}

/**
 * @template T
 * @template R
 * @param {T[]} items
 * @param {(item: T, i: number) => R} fn
 * @returns {R[]}
 */
function map(items, fn) {
  var res = []
  for (var i = 0; i < items.length; i++) res[i] = fn(items[i], i)
  return res
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T, i: number) => boolean} fn
 * @returns {T[]}
 */
function filter(items, fn) {
  var res = []
  for (var i = 0; i < items.length; i++) {
    if (fn(items[i], i)) res.push(items[i])
  }
  return res
}

/**
 * @param {string} input
 */
function log(input) {
  var now = new Date()
  var output = now.toTimeString() + ': ' + input
  $.writeln(output)
}

function ProgressWindow(opt) {
  opt = opt || {}
  var w = (this.w = new Window('palette', opt.title))
  var t = (this.t = w.add('statictext'))
  t.preferredSize = [450, -1]

  var p = (this.p = w.add('progressbar', undefined, 0, 100))
  p.value = 0
  p.preferredSize = [450, -1]

  w.show()
}

ProgressWindow.prototype.set = function (progressRatio, message) {
  this.p.value = progressRatio * 100
  this.t.text = message
  this.w.update()
}

ProgressWindow.prototype.close = function () {
  this.w.close()
}

try {
  log('Start script')

  var outFile = new File(CONFIG.defaultOutFileName).saveDlg(
    'Export TextFrames',
    'All files:*.*'
  )
  $.write(outFile)

  /** @type {string[]} */
  var allTexts = []
  var pw = new ProgressWindow({ title: 'copy-textbox' })
  var doc = app.activeDocument

  for (var i = 0; i < doc.artboards.length; i++) {
    doc.selection = null
    doc.artboards.setActiveArtboardIndex(i)
    doc.selectObjectsOnActiveArtboard()

    /** @type {TextFrame[]} */
    var textFrames = filter(doc.selection, function (item) {
      return item instanceof TextFrame
    })

    var texts = map(textFrames, function (tf) {
      log('Artboard' + i + ': ' + tf.contents)
      return tf.contents
    })

    pw.set(
      i / doc.artboards.length,
      'Artboard ' + i + ': ' + texts.join(',').slice(0, 100)
    )
    allTexts = allTexts.concat(texts)
  }
  log('Detect ' + allTexts.length + ' textFrames total')

  allTexts = map(allTexts, function (text) {
    return text.replace(/\r\n|\r|\n/g, '\\n')
  })

  outFile.encoding = 'UTF-8'
  outFile.lineFeed = 'Unix'
  outFile.open('w')
  outFile.write(allTexts.join('\n'))
  outFile.close()
  pw.close()
} catch (e) {
  alert('Error: ' + e)
  $.writeln(e)
}
