import prisma from "../../../client/prismaClient";

const lastID = (await prisma.tVShow.findMany({
    orderBy: {
        id: "desc"
    },
    select: {
        id: true,
    },
    take: 1,
}))[0].id;

const pageToFetch = Math.floor(lastID / 250);

const tvShows = await fetch(`https://api.tvmaze.com/shows?page=${pageToFetch}`).then((res) => res.json());