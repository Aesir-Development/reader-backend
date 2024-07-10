
/**
 * This plugin is for the Webtoon website
 * IT ONLY WORKS ON WEBTOON ORIGINALS
 * Only webtoons.com/en/... links work, other links will not work
 */


import { Plugin, Metadata, Manhwa, Chapter } from "../plugin-interface";
import {load} from 'cheerio';

export class WebtoonPlugin implements Plugin {
    siteName = 'Webtoon';
    siteUrl = 'https://www.webtoons.com/';
    siteLogo = 'https://www.webtoons.com/favicon.ico'; // Not the actual logo, just a placeholder
    siteDescription = '';
    pluginDeveloper = 'HollowHuu';

    async getManhwaList(title: string) {
        const url = `https://www.webtoons.com/en/search?keyword=${title}`;
        const response = await fetch(url);
        const html = await response.text();
        const $ = load(html);

        const manhwaList: Manhwa[] = [];
        const promiseList: Promise<Metadata>[] = [];
        const linkList: string[] = [];

        $('ul.card_lst').each((index, element) => {
            // Each li element is a manhwa
            // They contain an a tag that links to the manhwa page, which contains the metadata

            element.children.forEach((child) => {
                // Child is a li element
                const manhwaElement = $(child);
                const manhwaLink = manhwaElement.find('a').attr('href');
                if (!manhwaLink) return; // Skip if no link found
    
                promiseList.push(this.getManhwaMetadata(manhwaLink));
                linkList.push(manhwaLink);
            })
        });


        // Return a promise that resolves with the manhwaList after all the metadata has been fetched
        return await Promise.all(promiseList).then((metadataList) => {
            metadataList.forEach((metadata, index) => {                
                const manhwa: Manhwa = {
                    metadata,
                    chapters: [], // NOTE - We don't have chapter information here, we only have metadata. Make sure to fetch chapters when needed
                };

                manhwaList.push(manhwa);
            });
            return manhwaList;
        });
    }

    async getManhwaById(id: string) {
        const url = `https://www.webtoons.com/en/fantasy/your-throne/list?title_no=${id}`; // It redirects to the corresponding manhwa page when the title_no is provided
        const metadata = await this.getManhwaMetadata(url);
        const chapters = await this.getChapterList(url);

        const manhwa: Manhwa = {
            metadata,
            chapters,
        };

        return manhwa;
    }

    // WARNING - Untested
    async getChapterImages(url: string) {
        let response = await fetch(url);
        let html = await response.text();

        const $ = load(html);

        let images: string[] = [];
        $('div#_imageList > img').each((i, elem) => {
            const image = $(elem).attr('data-url');
            if (image) images.push(image);
        });

        return images;
    }

    // This is a private method that is only used within the plugin
    // It is not part of the Plugin interface, we just use it internally
    private async getManhwaMetadata(url: string): Promise<Metadata> {
        const response = await fetch(url);
        if (response.url !== url) {
            url = response.url; // If the url is redirected, update the url to the redirected url
        }
        const html = await response.text();
        const $ = load(html);

        const title = $('div.info h1').text();

        const author = $('div.author_area').text().replace(/\s+/g, ' ').replace('author info', '').replace(' ,', ',').trim();
        const description = $('p.summary').text();
        const genre = $('div.info h2').text();
        // Rating stored in id = _starScoreAverage
        const rating = $('em#_starScoreAverage').text();
        // Thumbnail is the background url of div class ="detail_body banner"
        let thumbnail = $('div.detail_body').css('background')
        if (thumbnail) {
            thumbnail = thumbnail.replace('url(', '').replace(')', '').split(" ")[1]; // Get the second element of the split array, the first is a colour code
        } else {
            thumbnail = 'NOT FOUND'; // Change to empty string if no thumbnail found, currently just for debugging
        }


        // Placeholder metadata
        const metadata: Metadata = {
            title: title,
            author: author,
            description: description,
            genre: genre,
            status: 'Unknown', // Webtoon does not provide status information, they republish completed series
            rating: rating,
            thumbnail: thumbnail,
            url: url,
        };

        return metadata;
    }

    private async getChapterList(url: string) {
        const response = await fetch(url);
        if (response.url !== url) {
            url = response.url; // If the url is redirected, update the url to the redirected url
        }
        const html = await response.text();
        const $ = load(html);

        const chapterList: Chapter[] = [];

        //
        let chapterNum = 0; // Placeholder for chapter number, we will get the actual chapter number from the chapter list

        // Get chapter list, stored in a ul with id _listUl
        let span = $('ul#_listUl li').first().find('span.tx') // ul -> li -> a -> span

        let chapter = span.text().replace('#', '').trim();
        chapterNum = parseInt(chapter);
        
        // Now we have the chapter number, from here we can figure out how many pages of chapters there are
        // chapterNum / 10 rounded up is the number of pages

        let pages = Math.ceil(chapterNum / 10);

        // Now get all the chapters
        for (let i = 1; i <= pages; i++) {
            const response = await fetch(`${url}&page=${i}`);

            const html = await response.text();
            const $ = load(html);

            $('ul#_listUl li').each((index, element) => {
                const chapterElement = $(element);
                const chapterLink = chapterElement.find('a').attr('href') ?? '';
                const chapterTitle = chapterElement.find('span.subj').first().text();
                const releaseDate = chapterElement.find('span.date').text();
                const chapterNum = parseInt(chapterElement.find('span.tx').text().replace('#', '').trim());

                const chapter: Chapter = {
                    title: chapterTitle,
                    url: chapterLink,
                    releaseDate: releaseDate,
                    chapterNumber: chapterNum,
                };

                chapterList.push(chapter);
            });
        }

        return chapterList;
    }

}

