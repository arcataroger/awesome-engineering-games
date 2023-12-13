import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {gfm} from 'micromark-extension-gfm'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import {zone} from 'mdast-zone'
import type {Nodes} from "mdast-util-from-markdown/lib";
import {filterDeep, omitDeep, reduceDeep} from 'deepdash-es/standalone'

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
    const nodesWithoutUselessKeys = omitDeep(nodes, ['position', 'align'], {
        onMatch: {
            cloneDeep: true,
            skipChildren: true,
            keepIfEmpty: false,
        },
    })

    // Write detailed JSON to a file
    console.log(`Writing ${nodesWithoutUselessKeys.length} nodes to outputs/nodes.json...`)
    writeFileSync(resolve(__dirname, "../outputs/nodes.json"), JSON.stringify(nodesWithoutUselessKeys, null, 2))

    // Also write a list of Steam IDs to a separate file
    const regex = new RegExp(/https:\/\/store.steampowered.com\/app\/(\d+).*/)
    const steamIds = reduceDeep(nodesWithoutUselessKeys, (acc, value, key) =>
    {
        if(key==='url') {
            if(typeof(value)==='string'){
                const match = value.match(regex)
                if(match) {
                    return [...acc, parseInt(match[1])]
                }
            }
        }
        return [...acc]
    }, [])

    console.log(`Writing ${steamIds.length} Steam IDs to outputs/steamIds.json...`)
    writeFileSync(resolve(__dirname, "../outputs/steamIds.json"), JSON.stringify(steamIds, null, 0))

}

// Extract the games from between the comment sections in the markdown: <!-- games-to-parse-into-json start/end --> and pass them to the output handler
zone(tree, 'games-to-parse-into-json', (_, nodes: Nodes[]) => processOutput(nodes))

