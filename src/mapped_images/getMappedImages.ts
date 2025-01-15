import * as fs from 'fs';
import * as path from 'path';

interface MappedImagesResult {
    texturesFilesMappedImagesDictionary: Record<string, string[]>;
    mappedImages: string[];
    textures: string[];
    duplicateImages: { filename: string; image: string }[];
}

export function getMappedImages(folderPath: string): MappedImagesResult {
    const texturesFilesMappedImagesDictionary: Record<string, string[]> = {};
    const mappedImagesSet: Set<string> = new Set();
    const texturesSet: Set<string> = new Set();
    const duplicateImages: { filename: string; image: string }[] = [];

    const files = fs.readdirSync(folderPath);

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            const subResults = getMappedImages(filePath);
            Object.assign(texturesFilesMappedImagesDictionary, subResults.texturesFilesMappedImagesDictionary);
            subResults.mappedImages.forEach(image => mappedImagesSet.add(image));
            subResults.textures.forEach(texture => texturesSet.add(texture));
            duplicateImages.push(...subResults.duplicateImages);
        } else if (file.toLowerCase().endsWith('.ini') && file.toLowerCase() !== 'handcreatedmappedimages.ini') {
            const content = fs.readFileSync(filePath, 'utf-8');
            const matches = [...content.matchAll(/MappedImage (\S+)\s*(?:;.*?\n)?\s*Texture\s*=\s*(\S+)/g)];

            for (const match of matches) {
                const [_, image, texture] = match;

                if (!texturesFilesMappedImagesDictionary[texture]) {
                    texturesFilesMappedImagesDictionary[texture] = [];
                }

                texturesFilesMappedImagesDictionary[texture].push(image);
                texturesSet.add(texture);

                if (mappedImagesSet.has(image)) {
                    duplicateImages.push({ filename: file, image });
                } else {
                    mappedImagesSet.add(image);
                }
            }
        }
    }

    return {
        texturesFilesMappedImagesDictionary,
        mappedImages: Array.from(mappedImagesSet),
        textures: Array.from(texturesSet),
        duplicateImages,
    };
}
