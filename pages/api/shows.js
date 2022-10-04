import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient;

export default async function handler(req, res) {
    let searchString = req.query.q;
    const results = await prisma.tVShow.findMany({
        where: {
            title: {
                contains: searchString,
            }
        },
        take: 20,
    });
    res.status(200).json({ data: results });
}