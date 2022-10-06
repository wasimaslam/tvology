import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient;
import throttledQueue from 'throttled-queue';
const throttle = throttledQueue(1, 50);

async function syncShowData(numberOfpagesToFetch = 10) {
    let lastTvShowID = await getLastShowID();
    let pageToFetch = await getPageToFetch(lastTvShowID);

    for (let index = 0; true; index++) {

    }
    for (let page = 0; page < 50; index++) {
        fetchPage(pageToFetch).then(async tvShows => {
            if (index === 0) {
                tvShows = tvShows.filter(s => s.id > lastTvShowID);
            }
            await saveToDB(tvShows);
        }).catch((e) => {
            console.log(e.message);
        });
        pageToFetch++;
    }

    console.log(`Queued all pages for fetching and storage`);
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
    return throttle(() => {
        return fetch(`https://api.tvmaze.com/shows?page=${page}`)
            .then((res) => {
                if (res.ok) {
                    console.log(`Page ${page} fetched.`);
                    return res.json();
                }
                else if (res.status == 404) {
                    throw new Error(`Reached end of show index. Last show ${page}`);
                }
                throw new Error(`Network error ${res.status} for page ${page}`);
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
    syncShowData(300);

    res.status(200).json({ message: "Done updating data" });
}