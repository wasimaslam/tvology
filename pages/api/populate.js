import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient;
import logger from "js-logger";

async function syncShowData(numberOfpagesToFetch = 10) {
    let lastTvShowID = await getLastShowID();
    let pageToFetch = await getPageToFetch(lastTvShowID);

    for (let index = 0; index < numberOfpagesToFetch; index++) {
        fetchPage(pageToFetch).then(async tvShows => {
            if (index === 0) {
                tvShows = tvShows.filter(s => s.id > lastTvShowID);
            }
            await saveToDB(tvShows);
        });
        pageToFetch++;
        await delay('100');
    }

    logger.INFO(`Queued all pages for fetching and storage`);
}

async function getLastShowID() {
    const result = (await prisma.tVShow.findMany({
        orderBy: {
            externalID: "desc"
        },
        select: {
            externalID: true,
        },
        take: 1,
    }));

    if (result.length == 0) {
        return 0;
    }

    return result[0].externalID;
}

async function getPageToFetch(lastShowID) {
    return Math.floor(lastShowID / 250);
}

async function fetchPage(page) {
    let tvShows = await fetch(`https://api.tvmaze.com/shows?page=${page}`).then((res) => res.ok ? res.json() : new Error("Failed to fetch"));
    logger.info(`Page ${page} fetched.`);
    return tvShows;
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

function delay(timeInMs) {
    return new Promise(resolve => setTimeout(resolve, timeInMs))
}


export default async function handler(req, res) {
    await syncShowData(100);

    res.status(200).json({ message: "Done updating data" });
}