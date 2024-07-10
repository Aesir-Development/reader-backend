// plugin-interface.ts

// This is the interface that all plugins must implement
// Refer to this to refresh data from the provider and to get the data from the provider
export interface Plugin {
    siteName: string;
    siteUrl: string;
    siteLogo: string;
    siteDescription: string;
    pluginDeveloper: string;

    getManhwaList(title: string): Promise<Manhwa[]>; // This is for when we want to search for manhwas
    getManhwaById(id: string): Promise<Manhwa>; // This for when we want to get a specific manhwa
    getChapterImages(url: string): Promise<string[]>; // This is for when we want to get the images of a chapter
}

export interface Metadata {
    title: string;
    author: string;
    description: string;
    genre: string;
    status: string;
    rating: string;
    thumbnail: string;
    url: string;
}

export interface Chapter {
    title: string;
    url: string;
    releaseDate: string;
    chapterNumber: number;
    // Images are not stored here, they are fetched from the plugin when needed. This is just metadata for listing purposes.

}

// Manhwa object is not stored in the database, it is just a temporary object that is used to store metadata and chapters
// It's just for structuring the data
export interface Manhwa {
    metadata: Metadata;
    chapters: Chapter[];
}