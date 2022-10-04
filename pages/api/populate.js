import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient;

async function syncShowData(numberOfpagesToFetch = 10) {
    const result = (await prisma.tVShow.findMany({
        orderBy: {
            externalID: "desc"
        },
        select: {
            externalID: true,
        },
        take: 1,
    }));

    let lastTvShowID = 0;
    let pageToFetch = 0;
    if (result.length !== 0) {
        lastTvShowID = result[0].externalID;
        pageToFetch = Math.floor(lastTvShowID / 250);
    }

    for (let index = 0; index < numberOfpagesToFetch; index++) {
        fetchPage(pageToFetch).then(tvShows => {
            if (index === 0) {
                tvShows = tvShows.filter(s => s.id > lastTvShowID);
            }
            saveToDB(tvShows);
        });
        pageToFetch++;
        await delay('30')
    }

    console.log("Queued all pages for fetching and storage");
}


async function fetchPage(page) {
    let tvShows = await fetch(`https://api.tvmaze.com/shows?page=${page}`).then((res) => res.ok ? res.json() : new Error("Failed to fetch"));
    console.log(`Page ${page} fetched.`);
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
            }
        });
}

async function saveToDB(tvShows) {
    tvShows = convertShowsToPrismaData(tvShows);
    await prisma.tVShow.createMany({ data: tvShows, });
    // console.log(`Saved page ${page} to DB`);
}

function delay(timeInMs) {
    return new Promise(resolve => setTimeout(resolve, timeInMs))
}


export default async function handler(req, res) {
    await syncShowData(100);


    // const result = (await prisma.tVShow.findMany({
    //     orderBy: {
    //         externalID: "desc"
    //     },
    //     select: {
    //         externalID: true,
    //     },
    //     take: 1,
    // }));

    // let lastTvShowID = 0;
    // let pageToFetch = 0;
    // if (result.length !== 0) {
    //     lastTvShowID = result[0].externalID;
    //     pageToFetch = Math.floor(lastTvShowID / 250);
    // }

    // const pageToFetchUpto = 100;
    // let pagesProcessed = 0;
    // for (let page = pageToFetch; page < pageToFetchUpto; page++) {
    //     let tvShows = [];
    //     try {
    //         tvShows = await fetch(`https://api.tvmaze.com/shows?page=${page}`).then((res) => res.ok ? res.json() : new Error("Failed to fetch"));
    //     } catch (e) {
    //         tvShows = [];
    //         break;
    //     }

    //     console.log(`Processing page no # ${page}`);


    //     if (page == pageToFetch) {
    //         tvShows = tvShows.filter(s => s.id > lastTvShowID);
    //     }

    //     const prismaRecords = tvShows
    //         .map(s => {
    //             return {
    //                 title: s.name,
    //                 externalID: s.id,
    //                 externalIDs: s.externals,
    //                 averageRuntime: s.averageRuntime,
    //                 image: s.image?.original,
    //                 imageLowRes: s.image?.medium,
    //                 averageRating: s.rating?.average,
    //             }
    //         });

    //     await prisma.tVShow.createMany({
    //         data: prismaRecords,
    //     });
    //     pagesProcessed++;
    // }




    res.status(200).json({ message: "Done updating data" });
}