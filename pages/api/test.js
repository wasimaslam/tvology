// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient;


export default async function handler(req, res) {
    let showsWithoutSeasons = prisma.tVShow.findMany({
        where: {
            seasons: { none: {} },
        },
    });

    let showsWithoutEpisodes = prisma.season.findMany({
        where: {
            episodes: { none: {} }
        },
    });

    res.status(200).json({ showsWithoutSeasons: await showsWithoutSeasons, showsWithoutEpisodes: await showsWithoutEpisodes });
}
