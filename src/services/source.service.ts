import * as SourceRepository from '../repositories/source.repository';

export const getSources = async () => {
    return SourceRepository.getAllSources();
};

export const createSource = async (name: string, slug: string, apiUrl: string) => {
    return SourceRepository.createSource(name, slug, apiUrl);
};
