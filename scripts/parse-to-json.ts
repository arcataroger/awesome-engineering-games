import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {gfm} from 'micromark-extension-gfm'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import {zone} from 'mdast-zone'
import type {Nodes} from "mdast-util-from-markdown/lib";
import {omitDeep} from 'deepdash-es/standalone'

// First read the file
const doc = readFileSync(resolve(__dirname, "../README.md"))

// Parse it into a mdast tree https://github.com/syntax-tree/mdast
const tree = fromMarkdown(doc, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()]
})

// Define our output handler function.
const processOutput = (nodes: Nodes[]): void => {

    // Filter out some of the keys we don't need
    const gamesWithoutUselessKeys = omitDeep(nodes, ['position', 'align'], {
        onMatch: {
            cloneDeep: true,
            skipChildren: true,
            keepIfEmpty: false,
        },
    })
    writeFileSync(resolve(__dirname, "../outputs/games.json"), JSON.stringify(gamesWithoutUselessKeys, null, 2))
}

// Extract the games from between the comment sections in the markdown: <!-- games-to-parse-into-json start/end --> and pass them to the output handler
zone(tree, 'games-to-parse-into-json', (_, nodes: Nodes[]) => processOutput(nodes))

