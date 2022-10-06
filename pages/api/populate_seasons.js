import throttledQueue from 'throttled-queue';
const throttle = throttledQueue(1, 50);
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient;

async function startFetchingFromID() {
    return (await prisma.tVShow.findMany({
        where: {
            seasons: { none: {} },
        },
        orderBy: {
            id: 'asc'
        },
        take: 1,
    }))[0].id;
}

async function getTVShowsPaginated(pageSize, pageNumber, startingID = 1) {
    const cursorID = (pageSize * pageNumber) + 1;
    if (pageSize == 0) {
        return [];
    }

    return await prisma.tVShow.findMany({
        orderBy: {
            id: "asc",
        },
        take: pageSize,
        cursor: {
            id: cursorID,
        }
    });
}

async function fetchAndStoreSeasonsForShow(show) {
    return throttle(() => {
        return fetch(`https://api.tvmaze.com/shows/${show.externalID}/seasons`)
            .then(res => {
                if (res.ok) {
                    return res.json();
                }

                return new Error(`Couldn't fetch seasons for ID: ${show.id}, ExternalID: ${show.externalID}, Name: ${show.name}`);
            });
    })
        .then((seasons) => {
            console.log(`${show.id} ${show.title} Seasons fetched`);
            seasons = convertSeasonsToPrismaData(show, seasons);
            prisma.season.createMany({
                data: seasons,
            }).then(() => console.log(`${show.id} ${show.title} Seasons stored`));
        })
        .catch((e) => {
            console.log(e.message);
        });
}

function convertSeasonsToPrismaData(show, seasons) {
    return seasons.map(season => {
        return {
            name: `Season ${season.number}`,
            summary: season.summary,
            premierDate: new Date(season.premiereDate),
            endDate: new Date(season.endDate),
            image: season.image?.original,
            imageLowRes: season.image?.medium,
            showID: show.id,
        };
    });
}

async function getNumberOfStoredTVShows() {
    return (await prisma.tVShow.aggregate({
        _count: {
            id: true,
        }
    }))._count.id;
}

async function syncSeasonData() {
    const pageSize = 250;
    const totalTVShows = await getNumberOfStoredTVShows();
    const lastPage = Math.ceil(totalTVShows / 250);
    for (let pageNumber = 0; pageNumber < lastPage; pageNumber++) {
        const tvShows = await getTVShowsPaginated(pageSize, pageNumber);
        await Promise.all(tvShows.map(s => fetchAndStoreSeasonsForShow(s)));
    }
}


export default async function handler(req, res) {
    syncSeasonData();

    res.status(200).json({ message: "Done updating data" });
}