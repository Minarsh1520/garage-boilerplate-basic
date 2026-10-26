import { decodeEntities } from './html'

// Markdown (.md) → plain lines of text, in the shape the policy layout reader expects.
// Markdown is only READ for its words: the marks around them are removed, so
//   "# Leave Policy"            → "Leave Policy"           (a # mark doesn't make a heading:
//   "## 1. Requesting leave"    → "1. Requesting leave"     the number does, as in every file type)
//   "**two weeks**"             → "two weeks"
//   "* item", "+ item"          → "- item"
//   "[the portal](https://x)"   → "the portal (https://x)"
// A paragraph written over several lines (Markdown joins them on screen) becomes one line.
// Blank lines, block starts (headings, list items, quotes, tables) end a paragraph.

const FENCE = /^\s*(```|~~~)/
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/ // --- *** ___
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/
const BLOCK_START = /^\s*(#{1,6}\s|[-*+]\s|\d{1,2}[.)]\s|>|\|)/

function inline(text: string): string {
    return decodeEntities(
        text
            .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images: no words to keep
            // Links keep their address unless it just repeats the text.
            .replace(/\[([^\]]+)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, (_m, label: string, href: string) => {
                const tidy = (s: string) => s.replace(/^mailto:/i, '').replace(/\/$/, '').toLowerCase()
                return tidy(label) === tidy(href) || href.startsWith('#') ? label : `${label} (${href.replace(/^mailto:/i, '')})`
            })
            .replace(/<(https?:\/\/[^>]+|[^@\s>]+@[^>\s]+)>/g, '$1') // <https://...> autolinks
            .replace(/<\/?[a-zA-Z][^>]*>/g, '') // stray inline HTML tags
            .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2') // bold
            .replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?!\w)/g, '$1$2') // *italic*
            .replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, '$1$2') // _italic_ (not snake_case)
            .replace(/~~(.+?)~~/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, '$1') // \* → *
    )
}

export function markdownToLines(markdown: string): string {
    const out: string[] = []
    let paragraph: string[] = []
    let inFence = false
    const flush = () => {
        if (paragraph.length) out.push(paragraph.join(' '))
        paragraph = []
    }

    const source = markdown.replace(/^﻿/, '').replace(/<!--[\s\S]*?-->/g, '')
    for (const raw of source.split(/\r?\n/)) {
        if (FENCE.test(raw)) {
            flush()
            inFence = !inFence
            continue
        }
        if (inFence) {
            // Code block: kept line by line, inside backticks, so a line like "2. something"
            // can never be read as a section heading.
            if (raw.trim()) out.push(`\`${raw.trim()}\``)
            continue
        }
        if (!raw.trim() || RULE.test(raw) || TABLE_DIVIDER.test(raw)) {
            flush()
            continue
        }
        // "Leave Policy" underlined with === or --- is a heading too (setext style).
        if (/^\s*=+\s*$/.test(raw)) {
            flush()
            continue
        }

        let line = raw.trim()
        if (BLOCK_START.test(raw)) {
            flush()
            line = line
                .replace(/^#{1,6}\s+/, '')
                .replace(/\s+#+\s*$/, '') // "## Heading ##"
                .replace(/^(>\s?)+/, '')
                .replace(/^[-*+]\s+/, '- ')
            if (line.startsWith('|')) line = line.replace(/^\|\s*/, '').replace(/\s*\|\s*$/, '').replace(/\s*\|\s*/g, ' | ')
            const text = inline(line)
            if (text.trim()) out.push(text)
            continue
        }
        paragraph.push(inline(line))
    }
    flush()
    return out.join('\n')
}
