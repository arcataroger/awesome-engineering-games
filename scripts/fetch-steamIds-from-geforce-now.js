import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from "node:path";

/* This is the official API used by the GFN Games Page at https://www.nvidia.com/en-us/geforce-now/games/
While officially undocumented, a third-party developer, Ighor July (@JulyIghor at https://github.com/JulyIghor), documented its inner workings in a blog post: https://ighor.medium.com/i-unlocked-nvidia-geforce-now-and-stumbled-upon-pirates-dc48a3f8ff7
 */
const GFN_API_URL = "https://api-prod.nvidia.com/gfngames/v1/gameList";

const fetchGamesQuery = /*GraphQL*/ `

        # HUGE thanks to @JulyIghor for help optimizing this query!

        # Reusable fragment for the body that we want
        fragment queryFields on AppQueryType
        {

            # We don't need this pagination info anymore since we can just fetch multiple cursors in one query
            #            numberReturned
            #
            #            pageInfo {
            #                endCursor
            #                hasNextPage
            #            }

            items {
                variants
                {
                    storeId
                }
            }
        }

        {

            # Fetch games 0 to 1300
            page1: apps(country:"US" appStore:"STEAM" first:1300)
            {
                ...queryFields
            }

            # Fetch games 1300 to 2600, though there should only be about 1600 total games as of Sept 2023
            page2: apps(country:"US" appStore:"STEAM" first:1300 after:"MTMwMA==") # Base64 encoded "1300"
            {
                ...queryFields
            }

            # Future-proofing just in case. GFN probably won't grow by thousands THAT quickly
            page3: apps(country:"US" appStore:"STEAM" first:1300 after:"MjYwMA==") # Base64 encoded "2600"
            {
                ...queryFields
            }

        }
 `

/* Fetch the games from Nvidia by requesting several pages of GraphQL results, filtered for Steam support */
const getSteamIds = async () => {
    let steamIdsOfGamesOnGeForceNow = new Set();

    const fetchConfig = {
        body: fetchGamesQuery,
        method: "POST",
    };

    try {
        const fetchGamesResponse = await fetch(GFN_API_URL, fetchConfig);
        const responseJSON = await fetchGamesResponse.json();
        Object.values(responseJSON.data).forEach((page) => {
            page.items.forEach((game) => {
                if (!game.variants[0]?.storeId || typeof (game.variants[0].storeId) !== 'string') {
                    return;
                }
                const numericId = Number(game.variants[0].storeId)
                if (numericId && typeof (numericId === 'number')) { // Test on local node will sometimes make a "Fake" entry
                    steamIdsOfGamesOnGeForceNow.add(numericId);
                }
            });
        });
        if (steamIdsOfGamesOnGeForceNow.size < 1000) {
            throw Error("Unexpected decrease in number of games (fewer than 1000)")
        }
        return [...steamIdsOfGamesOnGeForceNow];
    } catch (error) {
        console.error("Failed to fetch games", error)
    }
};

getSteamIds().then((ids) => {
    const steamIdsOnGeForceNow = [...new Set(ids.sort())]
    writeFileSync(resolve(__dirname, `../outputs/games-on-geforce-now.json`), JSON.stringify(steamIdsOnGeForceNow))
});
