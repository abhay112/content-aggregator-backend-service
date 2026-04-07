import prisma from '../src/prisma';


const sources = [
    {
        name: 'Hacker News',
        slug: 'hacker-news',
        apiUrl: 'https://hacker-news.firebaseio.com/v0/newstories.json',
        active: true,
    },
    {
        name: 'Dev.to',
        slug: 'devto',
        apiUrl: 'https://dev.to/api/articles?per_page=10&top=1',
        active: true,
    },
    {
        name: 'Reddit Programming',
        slug: 'reddit-programming',
        apiUrl: 'https://www.reddit.com/r/programming/new.json?limit=10',
        active: true,
    },
    {
        name: 'Lobste.rs',
        slug: 'lobsters',
        apiUrl: 'https://lobste.rs/newest.json',
        active: true,
    }
];

async function main() {
    console.log('Seeding sources...');
    for (const source of sources) {
        await prisma.source.upsert({
            where: { slug: source.slug },
            update: {
                apiUrl: source.apiUrl,
                active: source.active,
            },
            create: source,
        });
    }
    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
