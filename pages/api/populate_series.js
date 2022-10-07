import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient;
import throttledQueue from 'throttled-queue';
const throttle = throttledQueue(1, 50);

async function fetchAndStoreFirstPage() {
    const pageToFetch = await getPageToFetch();
    const lastTvShowID = await getLastShowID();
    let tvShows = await fetchPage(pageToFetch);
    tvShows = tvShows.filter(s => s.id > lastTvShowID);
    await saveToDB(tvShows);
}

async function syncShowData() {
    const startFetchingFromPage = (await getPageToFetch()) + 1;
    const pagesToFetchInBurst = 30;

    try {
        await fetchAndStoreFirstPage();
    } catch (e) {
        return;
    }
    outerLoop:
    for (let page = startFetchingFromPage; true; page += pagesToFetchInBurst) {
        const allPromises = [];
        for (let index = 0; index < pagesToFetchInBurst; index++) {
            allPromises.push(fetchPage(page + index));
        }
        try {
            let results = await Promise.allSettled(allPromises);
            for (let index = 0; index < results.length; index++) {
                if (results[index].status == 'rejected') {
                    break outerLoop;
                }
                saveToDB(results[index].value);
            }

        } catch (e) {
            console.error("Error occurred")
        }
    }
}

async function getLastShowID() {
    const lastShow = (await prisma.tVShow.findFirst({
        orderBy: {
            externalID: "desc"
        },
        select: {
            externalID: true,
        },
        take: 1,
    }));

    if (lastShow == null) {
        return 0;
    }

    return lastShow.externalID;
}

async function getPageToFetch() {
    const lastTvShowID = await getLastShowID();
    return Math.floor(lastTvShowID / 250);
}

async function fetchPage(page) {
    return throttle(() => {
        // const abortController = new AbortController();
        // abortControllers[page] = abortController;
        return fetch(`https://api.tvmaze.com/shows?page=${page}`,
            // { signal: abortController.signal }
        )
            .then((res) => {
                if (res.ok) {
                    console.info(`Page ${page} fetched.`);
                    return res.json();
                }
                else if (res.status == 404) {
                    throw new Error(`Reached end of show index. Last show ${page}`, { cause: 404, });
                }
                throw new Error(`Network error ${res.status} for page ${page}`, { cause: 400 });
            });
    });
}

function convertShowsToPrismaData(tvShows) {
    return tvShows
        .map(s => {
            return {
                title: s.name,
                externalID: s.id,
                externalIDs: s.externals,
                averageRuntime: s.averageRuntime,
                image: s.image?.original,
                imageLowRes: s.image?.medium,
                averageRating: s.rating?.average,
                schedule: s.schedule
            }
        });
}

async function saveToDB(tvShows) {
    tvShows = convertShowsToPrismaData(tvShows);
    await prisma.tVShow.createMany({ data: tvShows, });
}

export default async function handler(req, res) {
    // syncShowData(300);
    syncShowData();

    res.status(200).json({ message: "Done updating data" });
}