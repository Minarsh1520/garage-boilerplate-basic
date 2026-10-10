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
    // Word only. Word shows auto-numbered headings counting on through the document, but
    // mammoth starts a new HTML list after every paragraph in between. true = keep one
    // count across all top-level numbered lists. A browser restarts each <ol> at 1 (or at
    // its `start`), so for real HTML files this stays false.
    numberAcrossLists?: boolean
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

export function htmlToLines(html: string, options: HtmlToLinesOptions = {}): string {
    const lines: string[] = []
    const lists: { type: 'ol' | 'ul'; next: number }[] = []
    let acrossCount = 0 // numberAcrossLists: top-level numbered items so far in the document
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
    for (const [, closing, tag, attrs, text] of cleaned.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+|<)/g)) {
        if (text !== undefined) {
            // In HTML, a run of spaces and line breaks shows as one space.
            current += decodeEntities(text.replace(/\s+/g, ' '))
            continue
        }
        const name = tag?.toLowerCase() ?? ''
        if (name === 'ol' || name === 'ul') {
            if (closing) {
                lists.pop()
            } else {
                const start = Number(/\bstart\s*=\s*["']?(-?\d+)/i.exec(attrs ?? '')?.[1] ?? 1)
                lists.push({ type: name, next: Number.isFinite(start) ? start : 1 })
            }
        } else if (name === 'li' && !closing) {
            endLine()
            const list = lists.at(-1)
            if (lists.length === 1 && list?.type === 'ol') {
                current = options.numberAcrossLists ? `${++acrossCount}. ` : `${list.next++}. `
            } else {
                current = '- '
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
        } else if (BLOCK.test(name) && (closing || name === 'br' || name === 'hr' || /^(p|div|h[1-6]|tr|blockquote|pre)$/.test(name))) {
            // Opening a block starts a new line too, so "<p>a<div>b</div>" doesn't run together.
            endLine()
        } else if (name === 'td' || name === 'th') {
            if (closing) current += ' | ' // table cells side by side on one line
        }
    }
    endLine()
    // A table row ends with " |": tidy that away.
    return lines.map((line) => line.replace(/\s*\|\s*$/, '')).join('\n')
}
