import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {gfm} from 'micromark-extension-gfm'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfmFromMarkdown} from 'mdast-util-gfm'

const doc = readFileSync(resolve(__dirname, "../README.md"))

const tree = fromMarkdown(doc, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()]
})

writeFileSync(resolve(__dirname, "../outputs/games.json"), JSON.stringify(tree, null, 2))