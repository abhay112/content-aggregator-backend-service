import prisma from '../prisma';

export const getAllSources = async () => {
    return prisma.source.findMany({
        orderBy: { name: 'asc' }
    });
};

export const createSource = async (name: string, slug: string, apiUrl: string) => {
    return prisma.source.create({
        data: { name, slug, apiUrl }
    });
};
