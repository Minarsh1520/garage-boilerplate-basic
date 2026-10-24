// HTML → plain lines of text, in the shape the policy layout reader expects. Used for
// uploaded .html files, and for Word files (mammoth turns .docx into simple HTML first).
//
// The HTML is only READ for its words, never shown or run: <script>, <style>, <head>,
// comments and every attribute except a link's address are thrown away.
//
//   - One line per paragraph, heading, list item, table row or <br>.
//   - Numbered lists are written out as they appear on screen ("1. ", "2. "...).
//   - Bullet lists, and any list inside another list, become "- ".
//   - A link keeps its address when the address isn't already its text: "the portal (https://...)".

export interface HtmlToLinesOptions {
    // Word files (mammoth's HTML). Word shows auto-numbered headings counting on through the
    // document, but mammoth starts a new HTML list after every paragraph in between, so:
    //   - a ONE-item numbered list is a heading, numbered by one count across the document;
    //   - a numbered list of TWO or more items is a list inside a section, numbered 1, 2, 3
    //     on its own and not counted as headings;
    //   - a Heading 1 paragraph is a section heading too: Word's heading numbers aren't
    //     saved as text, so the next number is added (unless one was typed).
    // A browser restarts each <ol> at 1 (or its `start`), so for web pages this stays off.
    word?: boolean
    // Web pages: the policy starts at the first <h1>. Anything before it (a site banner,
    // "Skip to content", a logo's alt text) is dropped, so it can't become the title.
    startAtFirstH1?: boolean
}

// Blocks that end a line. Anything not listed (span, strong, em...) is inline.
const BLOCK = /^(p|div|h[1-6]|li|tr|br|section|article|header|footer|main|aside|nav|blockquote|pre|dt|dd|figcaption|caption|hr|title)$/
// Everything inside these is dropped, not just the tags. <nav> is a page's menu ("Home | HR |
// Contact"): kept, it would become the policy title on a page saved from an intranet.
const SKIPPED = /<(script|style|head|template|noscript|svg|nav)\b[^>]*>[\s\S]*?<\/\1\s*>/gi

const NAMED_ENTITIES: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™',
}
export function decodeEntities(text: string): string {
    return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, code: string) => {
        if (code[0] === '#') {
            const n = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
            return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match
        }
        return NAMED_ENTITIES[code.toLowerCase()] ?? match
    })
}

// Same address once "mailto:" and a trailing slash are ignored.
const sameAddress = (text: string, href: string) => {
    const tidy = (s: string) => s.trim().replace(/^mailto:/i, '').replace(/\/$/, '').toLowerCase()
    return tidy(text) === tidy(href)
}

type Token = [string, string | undefined, string | undefined, string | undefined, string | undefined]

// How many items a list has at its own level (nested lists' items not counted).
function topLevelItems(tokens: Token[], openAt: number): number {
    let depth = 0
    let items = 0
    for (let i = openAt; i < tokens.length; i++) {
        const [, closing, tag] = tokens[i] ?? []
        const name = tag?.toLowerCase()
        if (name === 'ol' || name === 'ul') {
            depth += closing ? -1 : 1
            if (depth === 0) break
        } else if (name === 'li' && !closing && depth === 1) {
            items++
        }
    }
    return items
}

export function htmlToLines(html: string, options: HtmlToLinesOptions = {}): string {
    const lines: string[] = []
    const lists: { type: 'ol' | 'ul'; next: number; heading: boolean }[] = []
    let headingCount = 0 // Word: section headings so far in the document
    let inHeadingOne = false
    let firstH1Line: number | null = null
    let cellDepth = 0 // inside a table cell, paragraphs stay on the row's one line
    let current = ''
    let link: { href: string; startsAt: number } | null = null
    const endLine = () => {
        if (current.trim()) lines.push(current.trim())
        current = ''
    }

    const cleaned = html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<![^>]*>|<\?[^>]*>/g, '') // <!doctype ...>, <?xml ...?>
        .replace(SKIPPED, '')
    const tokens = [...cleaned.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+|<)/g)] as unknown as Token[]
    tokens.forEach(([, closing, tag, attrs, text], index) => {
        if (text !== undefined) {
            // In HTML, a run of spaces and line breaks shows as one space.
            current += decodeEntities(text.replace(/\s+/g, ' '))
            return
        }
        const name = tag?.toLowerCase() ?? ''
        if (name === 'ol' || name === 'ul') {
            if (closing) {
                lists.pop()
            } else {
                const start = Number(/\bstart\s*=\s*["']?(-?\d+)/i.exec(attrs ?? '')?.[1] ?? 1)
                // Word: a one-item numbered list at the top level is a heading (see options.word).
                const heading = !!options.word && name === 'ol' && lists.length === 0 && topLevelItems(tokens, index) === 1
                lists.push({ type: name, next: Number.isFinite(start) ? start : 1, heading })
            }
        } else if (name === 'li' && !closing) {
            endLine()
            const list = lists.at(-1)
            if (lists.length === 1 && list?.type === 'ol') {
                current = list.heading ? `${++headingCount}. ` : `${list.next++}. `
            } else {
                current = '- '
            }
        } else if (name === 'h1' && options.word) {
            if (!closing) {
                endLine()
                inHeadingOne = true
            } else if (inHeadingOne) {
                inHeadingOne = false
                const typed = /^\s*(\d{1,2})[.)]\s/.exec(current)
                if (typed?.[1]) headingCount = Number(typed[1])
                else if (current.trim()) current = `${++headingCount}. ${current.trim()}`
                endLine()
            }
        } else if (name === 'a') {
            if (!closing) {
                const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs ?? '')
                link = href ? { href: decodeEntities(href[1] ?? href[2] ?? href[3] ?? ''), startsAt: current.length } : null
            } else if (link) {
                const linkText = current.slice(link.startsAt)
                // Keep an address the reader would need ("the portal" alone says nothing), but
                // not one that just repeats the text, and never a page-internal "#anchor".
                if (link.href && !link.href.startsWith('#') && !/^javascript:/i.test(link.href) && !sameAddress(linkText, link.href)) {
                    current += ` (${link.href.replace(/^mailto:/i, '')})`
                }
                link = null
            }
        } else if (cellDepth > 0 && /^(p|div|br)$/.test(name)) {
            // Word puts every table cell's text in its own paragraph: keep the cell on one line.
            if (current && !current.endsWith(' ')) current += ' '
        } else if (BLOCK.test(name) && (closing || name === 'br' || name === 'hr' || /^(p|div|h[1-6]|tr|blockquote|pre)$/.test(name))) {
            // Opening a block starts a new line too, so "<p>a<div>b</div>" doesn't run together.
            endLine()
            if (name === 'h1' && !closing && firstH1Line === null) firstH1Line = lines.length
        } else if (name === 'td' || name === 'th') {
            cellDepth = Math.max(0, cellDepth + (closing ? -1 : 1))
            if (closing) current = `${current.trimEnd()} | ` // table cells side by side on one line
        }
    })
    endLine()
    const kept = options.startAtFirstH1 && firstH1Line !== null ? lines.slice(firstH1Line) : lines
    // A table row ends with " |": tidy that away.
    return kept.map((line) => line.replace(/\s*\|\s*$/, '')).join('\n')
}
