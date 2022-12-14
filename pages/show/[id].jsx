import Head from 'next/head'
import { useState } from "react";
// import tmdb from "../../client/tmdbClient";

export default function Show({ show }) {
    return (
        <div>
            <Head>
                <title>{show.name + ' - Tvology'}</title>
                <meta name="description" content="Generated by create next app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className=''>
                <h1 className='text-3xl text-center'>Name </h1><h2 className='text-center'>{show.name}</h2>
                <h1 className='text-3xl text-center'>Overview </h1><h2 className='text-center'>{show.overview}</h2>
                <h1 className='text-3xl text-center'>Seasons </h1>
                <div className='text-center'>
                    {show.seasons.map((s, i) =>
                        <span key={i}>
                            <span>{s.name}</span>
                            {(i < show.seasons.length - 1) &&
                                <span>, </span>
                            }
                        </span>
                    )}
                </div>
            </main>

        </div>
    )
}

export async function getServerSideProps({ params }) {
    const show = await fetchShow(params.id);
    return { props: { show } };
}

async function fetchShow(id) {
    const show = await fetch(`https://api.themoviedb.org/3/tv/${id}?&api_key=753c37ef2f0908507dca0d4f9299faa0`).then(res => res.json());
    return show;
}
